/**
 * Hand-narrowed domain types for the shapes the dashboard actually renders.
 *
 * FastAPI's OpenAPI schema types most response bodies as bare objects, so the
 * generated `schema.d.ts` is useful for path/param contracts but not for
 * display models. Narrow at the fetch boundary in `endpoints.ts`.
 */

/** Submission pipeline states, mirroring gate/types.py on the backend. */
export const SUBMISSION_STATES = [
  "committed",
  "fetched",
  "verified",
  "applied",
  "surface_ok",
  "building",
  "built",
  "correct",
  "screened",
  "benched",
  "rejected",
] as const;

export type SubmissionState = (typeof SUBMISSION_STATES)[number];

/** Ordered happy-path stages (excludes terminal `rejected`). */
export const SUBMISSION_STAGE_ORDER = [
  "committed",
  "fetched",
  "verified",
  "applied",
  "surface_ok",
  "building",
  "built",
  "correct",
  "screened",
  "benched",
] as const satisfies readonly Exclude<SubmissionState, "rejected">[];

export type BenchVerdict = "pass" | "fail" | "error" | "pending" | null;

export type CampaignStatus = "draft" | "open" | "closed";

export type CampaignSla = {
  p99_ttft_ms: number;
  p99_itl_ms: number;
  quality_floor_spec: string;
};

export type CampaignWindow = {
  opens_at: string;
  closes_at: string;
};

export type CampaignBenchModel = {
  hf_repo: string;
  hf_revision: string;
  dtype: string;
  quantization: string | null;
  max_model_len: number;
};

export type CampaignBenchCrossEnv = {
  aggregate: string;
  speedup_metric: string;
  min_speedup_each: number;
};

export type CampaignBench = {
  model: CampaignBenchModel;
  cross_env: CampaignBenchCrossEnv;
  gpu_count: number;
  serve_args: string[] | null;
  correctness: unknown | null;
  perf_screen: unknown | null;
  baseline_engine_image_digest: string;
};

export type CustomerSignoff = {
  approved_manifest_hash: string;
  approver: string;
  timestamp: string;
};

export type Campaign = {
  campaign_id: string;
  profile_id: string;
  status: CampaignStatus;
  baseline_repo: string;
  baseline_commit: string;
  base_image_digest: string;
  gpu_skus: string[];
  workload_trace_sha256: string;
  workload_trace_url: string;
  sla: CampaignSla;
  scoring_config_sha256: string | null;
  scoring_config_url: string | null;
  allowed_paths: string[];
  denied_paths: string[];
  window: CampaignWindow;
  manifest_hash: string;
  customer_signoff: CustomerSignoff | null;
  /** What the campaign optimizes for (throughput, gpu_hours, …). */
  priority_metric: string;
  /** Human-readable win condition for the pilot. */
  success_threshold: string;
  bench: CampaignBench;
};

export type CampaignsResponse = {
  campaigns: Campaign[];
};

export type SubmissionRow = {
  /** Submission UUID — secondary support identifier (build logs, Axiom). */
  id: string;
  patch_hash: string;
  campaign_id: string;
  hotkey: string;
  submitted_at: string;
  latest_state: SubmissionState;
  bench_verdict: BenchVerdict;
};

export type SubmissionsPage = {
  campaign_id: string;
  total: number;
  limit: number;
  offset: number;
  submissions: SubmissionRow[];
};

export type SubmissionEvent = {
  state: SubmissionState;
  at: string;
  detail?: unknown;
};

export type SubmissionDetail = {
  /** Submission UUID — secondary support identifier (build logs, Axiom). */
  id: string;
  patch_hash: string;
  campaign_id: string;
  hotkey: string;
  submitted_at: string;
  latest_state: SubmissionState;
  bench_verdict: BenchVerdict;
  events: SubmissionEvent[];
};

export type SubmissionStateMeta = {
  state: SubmissionState;
  label: string;
  /** Short description for tooltips / empty copy. */
  description: string;
  tone: "neutral" | "progress" | "success" | "danger";
};

export type BenchVerdictMeta = {
  verdict: NonNullable<BenchVerdict>;
  label: string;
  tone: "neutral" | "success" | "danger" | "warn";
};

export const SUBMISSION_STATE_META: Record<
  SubmissionState,
  SubmissionStateMeta
> = {
  committed: {
    state: "committed",
    label: "Committed",
    description: "Patch hash recorded; awaiting fetch.",
    tone: "neutral",
  },
  fetched: {
    state: "fetched",
    label: "Fetched",
    description: "Patch artifact retrieved from object storage.",
    tone: "progress",
  },
  verified: {
    state: "verified",
    label: "Verified",
    description: "Integrity and path constraints checked.",
    tone: "progress",
  },
  applied: {
    state: "applied",
    label: "Applied",
    description: "Patch applied onto the baseline checkout.",
    tone: "progress",
  },
  surface_ok: {
    state: "surface_ok",
    label: "Surface OK",
    description: "Public API / surface compatibility held.",
    tone: "progress",
  },
  building: {
    state: "building",
    label: "Building",
    description: "Hermetic engine image build in progress.",
    tone: "progress",
  },
  built: {
    state: "built",
    label: "Built",
    description: "Candidate engine image built successfully.",
    tone: "progress",
  },
  correct: {
    state: "correct",
    label: "Correct",
    description: "Correctness gate passed against baseline.",
    tone: "progress",
  },
  screened: {
    state: "screened",
    label: "Screened",
    description: "Performance screen cleared; full bench queued.",
    tone: "progress",
  },
  benched: {
    state: "benched",
    label: "Benched",
    description: "Full benchmark complete; verdict available.",
    tone: "success",
  },
  rejected: {
    state: "rejected",
    label: "Rejected",
    description: "Failed a gate; no further progression.",
    tone: "danger",
  },
};

export const BENCH_VERDICT_META: Record<
  NonNullable<BenchVerdict>,
  BenchVerdictMeta
> = {
  pass: { verdict: "pass", label: "Pass", tone: "success" },
  fail: { verdict: "fail", label: "Fail", tone: "danger" },
  error: { verdict: "error", label: "Error", tone: "warn" },
  pending: { verdict: "pending", label: "Pending", tone: "neutral" },
};

export function isSubmissionState(value: unknown): value is SubmissionState {
  return (
    typeof value === "string" &&
    (SUBMISSION_STATES as readonly string[]).includes(value)
  );
}

export function getSubmissionStateMeta(state: string): SubmissionStateMeta {
  if (isSubmissionState(state)) return SUBMISSION_STATE_META[state];
  return {
    state: "committed",
    label: state,
    description: "Unknown pipeline state.",
    tone: "neutral",
  };
}

export function getBenchVerdictMeta(
  verdict: BenchVerdict
): BenchVerdictMeta | null {
  if (verdict == null) return null;
  return (
    BENCH_VERDICT_META[verdict] ?? {
      verdict: "pending",
      label: String(verdict),
      tone: "neutral",
    }
  );
}
