/** Wire -> domain narrowing. Pure (no server-only / I/O) so tests can call it. */

import {
  isBenchPhase,
  type Campaign,
  type CampaignBench,
  type CampaignBenchCorrectness,
  type CampaignBenchModel,
  type CampaignSla,
  type CampaignStatus,
  type CustomerSignoff,
  type Leader,
  type Round,
  type RoundDetail,
  type RoundEntry,
  type RoundsPage,
  type ScoreProgressEntry,
  type ScoreProgressPoint,
  type ScoreProgressSeries,
  type ScoringRule,
  type Submission,
  type SubmissionDetail,
  type SubmissionEvent,
  type SubmissionJob,
  type SubmissionRound,
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

function asNullableBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

/**
 * Score on the wire. 0.0 is a real score (baseline speed). null stays null;
 * do not coerce missing or invalid values to 0.
 */
export function parseScore(value: unknown): number | null {
  return asNullableNumber(value);
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

function parseScoringRule(value: unknown): ScoringRule {
  return { name: asString(asRecord(value).name) };
}

function parseBench(value: unknown): CampaignBench {
  const o = asRecord(value);
  return {
    model: parseBenchModel(o.model),
    gpu_count: asNumber(o.gpu_count, 1),
    serve_args: Array.isArray(o.serve_args)
      ? o.serve_args.filter((a): a is string => typeof a === "string")
      : null,
    correctness: parseCorrectness(o.correctness),
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
    scoring_rule: parseScoringRule(o.scoring_rule),
  };
}

export function parseCampaigns(value: unknown): Campaign[] {
  return asArray(asRecord(value).campaigns).map(parseCampaign);
}

/** Preserve unknown states; do not coerce them to `committed`. */
export function parseSubmissionState(value: unknown): SubmissionStateName {
  return typeof value === "string" && value ? value : "committed";
}

export function parseSubmissionRound(value: unknown): SubmissionRound | null {
  if (value == null) return null;
  const o = asRecord(value);
  const round_id = asString(o.round_id);
  if (!round_id) return null;
  return {
    round_id,
    ordinal: asNumber(o.ordinal),
    status: asString(o.status),
    score: parseScore(o.score),
    disqualify_reason: asNullableString(o.disqualify_reason),
  };
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
    round: parseSubmissionRound(o.round),
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

export function parseSubmissionJob(value: unknown): SubmissionJob {
  const o = asRecord(value);
  // Unknown phase names have no label; drop the live block with them.
  const phase = isBenchPhase(o.phase) ? o.phase : null;
  return {
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
    jobs: asArray(o.jobs).map(parseSubmissionJob),
    round: parseSubmissionRound(o.round),
    latest_state: resolveLatestState(o.latest_state, events),
  };
}

export function parseLeader(value: unknown): Leader {
  const o = asRecord(value);
  return {
    campaign_id: asString(o.campaign_id),
    submission_id: asString(o.submission_id),
    patch_hash: asString(o.patch_hash),
    hotkey: asString(o.hotkey),
    engine_image_ref: asString(o.engine_image_ref),
    won_at_round_id: asString(o.won_at_round_id),
    won_at_ordinal: asNumber(o.won_at_ordinal),
    last_score: asNumber(o.last_score),
    last_scored_round_id: asNullableString(o.last_scored_round_id),
    updated_at: asString(o.updated_at),
  };
}

function parseRoundSummary(value: unknown): Round {
  const o = asRecord(value);
  return {
    id: asString(o.id),
    ordinal: asNumber(o.ordinal),
    status: asString(o.status),
    void_reason: asNullableString(o.void_reason),
    gpu_sku: asString(o.gpu_sku),
    seed_block: asNumber(o.seed_block),
    seed_block_hash: asString(o.seed_block_hash),
    entry_count: asNumber(o.entry_count),
    leader_changed: asNullableBoolean(o.leader_changed),
    created_at: asString(o.created_at),
    completed_at: asNullableString(o.completed_at),
  };
}

export function parseRoundsPage(
  value: unknown,
  fallback: { campaign_id: string; limit: number; offset: number }
): RoundsPage {
  const o = asRecord(value);
  return {
    campaign_id: asString(o.campaign_id, fallback.campaign_id),
    total: asNumber(o.total),
    limit: asNumber(o.limit, fallback.limit),
    offset: asNumber(o.offset, fallback.offset),
    rounds: asArray(o.rounds).map(parseRoundSummary),
  };
}

export function parseRoundEntry(value: unknown): RoundEntry {
  const o = asRecord(value);
  return {
    id: asNumber(o.id),
    submission_id: asNullableString(o.submission_id),
    patch_hash: asNullableString(o.patch_hash),
    hotkey: asNullableString(o.hotkey),
    role: asString(o.role),
    engine_image_ref: asString(o.engine_image_ref),
    status: asString(o.status),
    score: parseScore(o.score),
    disqualify_reason: asNullableString(o.disqualify_reason),
    started_at: asNullableString(o.started_at),
    completed_at: asNullableString(o.completed_at),
  };
}

export function parseRoundDetail(value: unknown): RoundDetail {
  const o = asRecord(value);
  const phase = isBenchPhase(o.phase) ? o.phase : null;
  return {
    id: asString(o.id),
    campaign_id: asString(o.campaign_id),
    ordinal: asNumber(o.ordinal),
    status: asString(o.status),
    void_reason: asNullableString(o.void_reason),
    gpu_sku: asString(o.gpu_sku),
    seed_block: asNumber(o.seed_block),
    seed_block_hash: asString(o.seed_block_hash),
    seed_hex: asString(o.seed_hex),
    sampled_trace_sha256: asString(o.sampled_trace_sha256),
    scoring_rule: asRecord(o.scoring_rule),
    incumbent_submission_id: asNullableString(o.incumbent_submission_id),
    winner_submission_id: asNullableString(o.winner_submission_id),
    leader_changed: asNullableBoolean(o.leader_changed),
    baseline_drift: asNullableNumber(o.baseline_drift),
    phase,
    phase_started_at:
      phase === null ? null : asNullableString(o.phase_started_at),
    heartbeat_at: phase === null ? null : asNullableString(o.heartbeat_at),
    progress:
      phase !== null && o.progress !== null && typeof o.progress === "object"
        ? asRecord(o.progress)
        : null,
    created_at: asString(o.created_at),
    started_at: asNullableString(o.started_at),
    completed_at: asNullableString(o.completed_at),
    entries: asArray(o.entries).map(parseRoundEntry),
  };
}

function parseScoreProgressEntry(value: unknown): ScoreProgressEntry {
  const o = asRecord(value);
  return {
    submission_id: asString(o.submission_id),
    hotkey: asNullableString(o.hotkey),
    role: asString(o.role),
    status: asString(o.status),
    score: parseScore(o.score),
  };
}

function parseScoreProgressPoint(value: unknown): ScoreProgressPoint {
  const o = asRecord(value);
  return {
    round_id: asString(o.round_id),
    ordinal: asNumber(o.ordinal),
    status: asString(o.status),
    leader_score: parseScore(o.leader_score),
    entries: asArray(o.entries).map(parseScoreProgressEntry),
  };
}

export function parseScoreProgress(
  value: unknown,
  fallbackCampaignId = ""
): ScoreProgressSeries {
  const o = asRecord(value);
  return {
    campaign_id: asString(o.campaign_id, fallbackCampaignId),
    points: asArray(o.points).map(parseScoreProgressPoint),
  };
}
