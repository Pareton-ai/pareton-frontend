import "server-only";

import { apiFetch } from "@/lib/api/client";
import type {
  BenchVerdict,
  Campaign,
  CampaignBench,
  CampaignBenchCrossEnv,
  CampaignBenchModel,
  CampaignsResponse,
  CampaignSla,
  CampaignStatus,
  CampaignWindow,
  CustomerSignoff,
  StatsResponse,
  SubmissionDetail,
  SubmissionEvent,
  SubmissionRow,
  SubmissionsPage,
  SubmissionState,
} from "@/lib/api/types";
import { isSubmissionState, SUBMISSION_STATES } from "@/lib/api/types";

/** Match Cloudflare cache on /v1/* for live-ish lists. */
const SHORT_REVALIDATE = 30;
/** Closed manifests are immutable once signed off. */
const LONG_REVALIDATE = 3600;

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function asNullableString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function parseStatus(value: unknown): CampaignStatus {
  if (value === "draft" || value === "open" || value === "closed") return value;
  return "draft";
}

function parseSla(value: unknown): CampaignSla {
  const o = asRecord(value);
  return {
    p99_ttft_ms: asNumber(o.p99_ttft_ms),
    p99_itl_ms: asNumber(o.p99_itl_ms),
    quality_floor_spec: asString(o.quality_floor_spec),
  };
}

function parseWindow(value: unknown): CampaignWindow {
  const o = asRecord(value);
  return {
    opens_at: asString(o.opens_at),
    closes_at: asString(o.closes_at),
  };
}

function parseBenchModel(value: unknown): CampaignBenchModel {
  const o = asRecord(value);
  return {
    hf_repo: asString(o.hf_repo),
    hf_revision: asString(o.hf_revision),
    dtype: asString(o.dtype),
    quantization: asNullableString(o.quantization),
    max_model_len: asNumber(o.max_model_len),
  };
}

function parseCrossEnv(value: unknown): CampaignBenchCrossEnv {
  const o = asRecord(value);
  return {
    aggregate: asString(o.aggregate),
    speedup_metric: asString(o.speedup_metric),
    min_speedup_each: asNumber(o.min_speedup_each, 1),
  };
}

function parseBench(value: unknown): CampaignBench {
  const o = asRecord(value);
  return {
    model: parseBenchModel(o.model),
    cross_env: parseCrossEnv(o.cross_env),
    gpu_count: asNumber(o.gpu_count, 1),
    serve_args: Array.isArray(o.serve_args)
      ? o.serve_args.filter((a): a is string => typeof a === "string")
      : null,
    correctness: o.correctness ?? null,
    perf_screen: o.perf_screen ?? null,
    baseline_engine_image_digest: asString(o.baseline_engine_image_digest),
  };
}

function parseSignoff(value: unknown): CustomerSignoff | null {
  if (value == null) return null;
  const o = asRecord(value);
  return {
    approved_manifest_hash: asString(o.approved_manifest_hash),
    approver: asString(o.approver),
    timestamp: asString(o.timestamp),
  };
}

function parseCampaign(value: unknown): Campaign {
  const o = asRecord(value);
  return {
    campaign_id: asString(o.campaign_id),
    profile_id: asString(o.profile_id),
    status: parseStatus(o.status),
    baseline_repo: asString(o.baseline_repo),
    baseline_commit: asString(o.baseline_commit),
    base_image_digest: asString(o.base_image_digest),
    gpu_skus: asStringArray(o.gpu_skus),
    workload_trace_sha256: asString(o.workload_trace_sha256),
    workload_trace_url: asString(o.workload_trace_url),
    sla: parseSla(o.sla),
    scoring_config_sha256: asNullableString(o.scoring_config_sha256),
    scoring_config_url: asNullableString(o.scoring_config_url),
    allowed_paths: asStringArray(o.allowed_paths),
    denied_paths: asStringArray(o.denied_paths),
    window: parseWindow(o.window),
    manifest_hash: asString(o.manifest_hash),
    customer_signoff: parseSignoff(o.customer_signoff),
    bench: parseBench(o.bench),
  };
}

function parseBenchVerdict(value: unknown): BenchVerdict {
  if (value == null) return null;
  if (
    value === "pass" ||
    value === "fail" ||
    value === "error" ||
    value === "pending"
  ) {
    return value;
  }
  return null;
}

function parseSubmissionState(value: unknown): SubmissionState {
  if (isSubmissionState(value)) return value;
  return "committed";
}

function parseSubmissionRow(value: unknown): SubmissionRow {
  const o = asRecord(value);
  return {
    patch_hash: asString(o.patch_hash),
    campaign_id: asString(o.campaign_id),
    hotkey: asString(o.hotkey),
    submitted_at: asString(o.submitted_at),
    latest_state: parseSubmissionState(o.latest_state),
    bench_verdict: parseBenchVerdict(o.bench_verdict),
  };
}

function parseSubmissionEvent(value: unknown): SubmissionEvent {
  const o = asRecord(value);
  return {
    state: parseSubmissionState(o.state),
    at: asString(o.at ?? o.timestamp),
    detail: o.detail,
  };
}

function emptyStateCounts(): Record<SubmissionState, number> {
  return Object.fromEntries(SUBMISSION_STATES.map((s) => [s, 0])) as Record<
    SubmissionState,
    number
  >;
}

function parseStats(value: unknown): StatsResponse {
  const o = asRecord(value);
  const campaigns = asRecord(o.campaigns);
  const byStatus = asRecord(campaigns.by_status);
  const submissions = asRecord(o.submissions);
  const byState = asRecord(submissions.by_latest_state);
  const stateCounts = emptyStateCounts();
  for (const state of SUBMISSION_STATES) {
    stateCounts[state] = asNumber(byState[state], 0);
  }
  return {
    campaigns: {
      total: asNumber(campaigns.total),
      by_status: {
        draft: asNumber(byStatus.draft, 0),
        open: asNumber(byStatus.open, 0),
        closed: asNumber(byStatus.closed, 0),
      },
    },
    submissions: {
      total: asNumber(submissions.total),
      by_latest_state: stateCounts,
    },
  };
}

export async function getCampaigns(opts?: {
  status?: CampaignStatus | string;
}): Promise<Campaign[]> {
  const data = await apiFetch<unknown>("/v1/campaigns", {
    revalidate: SHORT_REVALIDATE,
    tags: ["campaigns"],
    searchParams: { status: opts?.status },
  });
  const campaigns = asRecord(data).campaigns;
  if (!Array.isArray(campaigns)) return [];
  return campaigns.map(parseCampaign);
}

export async function getCampaign(campaignId: string): Promise<Campaign> {
  const data = await apiFetch<unknown>(
    `/v1/campaigns/${encodeURIComponent(campaignId)}`,
    {
      revalidate: SHORT_REVALIDATE,
      tags: ["campaigns", `campaign:${campaignId}`],
    }
  );
  return parseCampaign(data);
}

export async function getCampaignSubmissions(
  campaignId: string,
  opts?: { limit?: number; offset?: number }
): Promise<SubmissionsPage> {
  const limit = opts?.limit ?? 50;
  const offset = opts?.offset ?? 0;
  const data = await apiFetch<unknown>(
    `/v1/campaigns/${encodeURIComponent(campaignId)}/submissions`,
    {
      revalidate: SHORT_REVALIDATE,
      tags: ["submissions", `campaign-submissions:${campaignId}`],
      searchParams: { limit, offset },
    }
  );
  const o = asRecord(data);
  const rows = Array.isArray(o.submissions) ? o.submissions : [];
  return {
    campaign_id: asString(o.campaign_id, campaignId),
    total: asNumber(o.total),
    limit: asNumber(o.limit, limit),
    offset: asNumber(o.offset, offset),
    submissions: rows.map(parseSubmissionRow),
  };
}

export async function getStats(): Promise<StatsResponse> {
  const data = await apiFetch<unknown>("/v1/stats", {
    revalidate: SHORT_REVALIDATE,
    tags: ["stats"],
  });
  return parseStats(data);
}

export async function getSubmission(
  patchHash: string
): Promise<SubmissionDetail> {
  const data = await apiFetch<unknown>(
    `/v1/submissions/${encodeURIComponent(patchHash)}`,
    {
      revalidate: SHORT_REVALIDATE,
      tags: ["submissions", `submission:${patchHash}`],
    }
  );
  const o = asRecord(data);
  const events = Array.isArray(o.events) ? o.events : [];
  return {
    patch_hash: asString(o.patch_hash, patchHash),
    campaign_id: asString(o.campaign_id),
    hotkey: asString(o.hotkey),
    submitted_at: asString(o.submitted_at),
    latest_state: parseSubmissionState(o.latest_state),
    bench_verdict: parseBenchVerdict(o.bench_verdict),
    events: events.map(parseSubmissionEvent),
  };
}

/** Prefer long cache for manifests that can no longer change. */
export function campaignRevalidateSeconds(campaign: Campaign): number {
  return campaign.status === "closed" ? LONG_REVALIDATE : SHORT_REVALIDATE;
}

export type { CampaignsResponse };
