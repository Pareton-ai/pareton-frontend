import "server-only";

import { apiFetch, apiFetchText } from "@/lib/api/client";
import type {
  BenchReport,
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
  Submission,
  SubmissionDetail,
  SubmissionEvent,
  SubmissionRow,
  SubmissionsPage,
  SubmissionStateName,
} from "@/lib/api/types";
import { isBenchVerdict, isSubmissionState } from "@/lib/api/types";

/** Match Cloudflare cache on /v1/* for live-ish lists. */
const SHORT_REVALIDATE = 30;

/** Build logs move while a build runs, so they refresh faster than lists. */
const BUILD_LOG_REVALIDATE = 10;

/** Server-side cap from api/server.py. */
export const BUILD_LOG_MAX_TAIL = 2000;

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
    priority_metric: asString(o.priority_metric),
    success_threshold: asString(o.success_threshold),
    bench: parseBench(o.bench),
  };
}

function parseBenchVerdict(value: unknown): BenchVerdict {
  return isBenchVerdict(value) ? value : null;
}

/**
 * Keep unrecognised states verbatim. Coercing them to `committed` would render
 * a submission as earlier in the pipeline than it actually is.
 */
function parseSubmissionState(value: unknown): SubmissionStateName {
  if (isSubmissionState(value)) return value;
  return typeof value === "string" && value ? value : "committed";
}

function parseSubmissionRow(value: unknown): SubmissionRow {
  const o = asRecord(value);
  return {
    id: asString(o.id),
    patch_hash: asString(o.patch_hash),
    campaign_id: asString(o.campaign_id),
    hotkey: asString(o.hotkey),
    committed_at: asString(o.committed_at),
    latest_state: parseSubmissionState(o.latest_state),
    bench_verdict: parseBenchVerdict(o.bench_verdict),
  };
}

function parseSubmissionEvent(value: unknown): SubmissionEvent {
  const o = asRecord(value);
  return {
    state: parseSubmissionState(o.state),
    created_at: asString(o.created_at),
    detail: asRecord(o.detail),
    evidence_ref: asNullableString(o.evidence_ref),
  };
}

function parseSubmission(value: unknown): Submission {
  const o = asRecord(value);
  return {
    id: asString(o.id),
    campaign_id: asString(o.campaign_id),
    patch_hash: asString(o.patch_hash),
    hotkey: asString(o.hotkey),
    baseline_commit: asString(o.baseline_commit),
    retrieval_url: asString(o.retrieval_url),
    commit_block:
      typeof o.commit_block === "number" && Number.isFinite(o.commit_block)
        ? o.commit_block
        : null,
    committed_at: asString(o.committed_at),
    engine_image_ref: asNullableString(o.engine_image_ref),
    created_at: asString(o.created_at),
  };
}

function parseBenchReport(value: unknown): BenchReport {
  const o = asRecord(value);
  return {
    task_id: asString(o.task_id),
    stage: asString(o.stage),
    verdict: asString(o.verdict),
    report: asRecord(o.report),
    evidence_s3_url: asNullableString(o.evidence_s3_url),
    gpu_sku: asNullableString(o.gpu_sku),
    mock: o.mock === true,
    created_at: asString(o.created_at),
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

function parseSubmissionDetail(data: unknown): SubmissionDetail {
  const o = asRecord(data);
  const rawEvents = Array.isArray(o.events) ? o.events : [];
  const rawReports = Array.isArray(o.bench_reports) ? o.bench_reports : [];

  const events = rawEvents
    .map(parseSubmissionEvent)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));

  return {
    submission: parseSubmission(o.submission),
    events,
    bench_reports: rawReports.map(parseBenchReport),
    bench_verdict: parseBenchVerdict(o.bench_verdict),
    latest_state: events.at(-1)?.state ?? "committed",
  };
}

/**
 * Campaign-scoped submission detail.
 *
 * `patch_hash` is only unique with `campaign_id` (UNIQUE pair in the DB), so
 * callers must pass both. Prefer this over the bare-hash API, which 409s when
 * the same hash appears in more than one campaign.
 */
export async function getSubmission(
  campaignId: string,
  patchHash: string
): Promise<SubmissionDetail> {
  const data = await apiFetch<unknown>(
    `/v1/campaigns/${encodeURIComponent(campaignId)}/submissions/${encodeURIComponent(patchHash)}`,
    {
      revalidate: SHORT_REVALIDATE,
      tags: [
        "submissions",
        `submission:${campaignId}:${patchHash}`,
        `campaign-submissions:${campaignId}`,
      ],
    }
  );
  return parseSubmissionDetail(data);
}

/**
 * Tail of the durable build log, as plain text.
 *
 * The log lives on the worker host's disk, so a submission that has not
 * reached the build phase (or a build whose log was never written) returns
 * 404. Callers should treat that as "nothing yet" rather than an error.
 */
export async function getSubmissionBuildLog(
  campaignId: string,
  patchHash: string,
  opts?: { tail?: number }
): Promise<string> {
  const tail = Math.min(Math.max(opts?.tail ?? 200, 1), BUILD_LOG_MAX_TAIL);
  return await apiFetchText(
    `/v1/campaigns/${encodeURIComponent(campaignId)}/submissions/${encodeURIComponent(patchHash)}/build-log`,
    {
      revalidate: BUILD_LOG_REVALIDATE,
      tags: [`submission-build-log:${campaignId}:${patchHash}`],
      searchParams: { tail },
    }
  );
}

export type { CampaignsResponse };
