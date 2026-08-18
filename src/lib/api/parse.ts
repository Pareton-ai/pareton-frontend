/** Wire -> domain narrowing. Pure (no server-only / I/O) so tests can call it. */

import {
  isBenchPhase,
  isBenchVerdict,
  SUBMISSION_JOB_KINDS,
  type BenchReport,
  type BenchVerdict,
  type Campaign,
  type CampaignBench,
  type CampaignBenchCorrectness,
  type CampaignBenchCrossEnv,
  type CampaignBenchModel,
  type CampaignSla,
  type CampaignStatus,
  type CustomerSignoff,
  type Submission,
  type SubmissionDetail,
  type SubmissionEvent,
  type SubmissionJob,
  type SubmissionRow,
  type SubmissionsPage,
  type SubmissionStateName,
} from "@/lib/api/types";

export function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

export function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

export function asNumber(value: unknown, fallback = 0): number {
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

function asNullableNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
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

function parseCorrectness(value: unknown): CampaignBenchCorrectness | null {
  if (value == null) return null;
  const t = asRecord(asRecord(value).thresholds);
  const argmax_mismatch_rate = asNullableNumber(t.argmax_mismatch_rate);
  const mean_abs_logprob_diff = asNullableNumber(t.mean_abs_logprob_diff);
  const max_abs_logprob_diff = asNullableNumber(t.max_abs_logprob_diff);
  if (
    argmax_mismatch_rate == null ||
    mean_abs_logprob_diff == null ||
    max_abs_logprob_diff == null
  ) {
    return null;
  }
  return {
    thresholds: {
      argmax_mismatch_rate,
      mean_abs_logprob_diff,
      max_abs_logprob_diff,
    },
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
    correctness: parseCorrectness(o.correctness),
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

export function parseCampaign(value: unknown): Campaign {
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
    created_at: asString(o.created_at),
    manifest_hash: asString(o.manifest_hash),
    customer_signoff: parseSignoff(o.customer_signoff),
    priority_metric: asString(o.priority_metric),
    success_threshold: asString(o.success_threshold),
    bench: parseBench(o.bench),
  };
}

export function parseCampaigns(value: unknown): Campaign[] {
  return asArray(asRecord(value).campaigns).map(parseCampaign);
}

export function parseBenchVerdict(value: unknown): BenchVerdict {
  return isBenchVerdict(value) ? value : null;
}

/** Preserve unknown states; do not coerce them to `committed`. */
export function parseSubmissionState(value: unknown): SubmissionStateName {
  return typeof value === "string" && value ? value : "committed";
}

export function parseSubmissionRow(value: unknown): SubmissionRow {
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

export function parseSubmissionsPage(
  value: unknown,
  fallback: { campaign_id: string; limit: number; offset: number }
): SubmissionsPage {
  const o = asRecord(value);
  return {
    campaign_id: asString(o.campaign_id, fallback.campaign_id),
    total: asNumber(o.total),
    limit: asNumber(o.limit, fallback.limit),
    offset: asNumber(o.offset, fallback.offset),
    submissions: asArray(o.submissions).map(parseSubmissionRow),
  };
}

export function parseSubmissionEvent(value: unknown): SubmissionEvent {
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
    commit_block: asNullableNumber(o.commit_block),
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

export function parseSubmissionJob(value: unknown): SubmissionJob {
  const o = asRecord(value);
  // Unknown phase names have no label; drop the live block with them.
  const phase = isBenchPhase(o.phase) ? o.phase : null;
  return {
    kind: asString(o.kind),
    status: asString(o.status),
    last_error: asNullableString(o.last_error),
    phase,
    phase_started_at:
      phase === null ? null : asNullableString(o.phase_started_at),
    heartbeat_at: phase === null ? null : asNullableString(o.heartbeat_at),
    progress:
      phase !== null && o.progress !== null && typeof o.progress === "object"
        ? asRecord(o.progress)
        : null,
  };
}

/** Sort into pipeline order; the API returns jobs alphabetically by kind. */
function parseSubmissionJobs(value: unknown): SubmissionJob[] {
  const known: readonly string[] = SUBMISSION_JOB_KINDS;
  const rank = (kind: string) => {
    const index = known.indexOf(kind);
    return index === -1 ? known.length : index;
  };
  return asArray(value)
    .map(parseSubmissionJob)
    .sort(
      (a, b) => rank(a.kind) - rank(b.kind) || a.kind.localeCompare(b.kind)
    );
}

/** Prefer API `latest_state`; fall back to the last event. */
function resolveLatestState(
  value: unknown,
  events: readonly SubmissionEvent[]
): SubmissionStateName {
  if (typeof value === "string" && value) return value;
  return events.at(-1)?.state ?? "committed";
}

export function parseSubmissionDetail(value: unknown): SubmissionDetail {
  const o = asRecord(value);

  const events = asArray(o.events)
    .map(parseSubmissionEvent)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));

  return {
    submission: parseSubmission(o.submission),
    events,
    jobs: parseSubmissionJobs(o.jobs),
    bench_reports: asArray(o.bench_reports).map(parseBenchReport),
    bench_verdict: parseBenchVerdict(o.bench_verdict),
    latest_state: resolveLatestState(o.latest_state, events),
  };
}
