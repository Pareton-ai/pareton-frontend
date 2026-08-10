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
  "picked_up",
  "fetched",
  "verified",
  "applied",
  "surface_ok",
  "building",
  "image_pushed",
  "built",
  "bench_queued",
  "correct",
  "screened",
  "benched",
  "rejected",
] as const;

export type SubmissionState = (typeof SUBMISSION_STATES)[number];

/**
 * A state name off the wire. Unknown values are preserved rather than coerced,
 * so a state added on the backend shows up verbatim instead of masquerading as
 * an earlier stage.
 */
export type SubmissionStateName = SubmissionState | string;

/** Ordered happy-path stages (excludes terminal `rejected`). */
export const SUBMISSION_STAGE_ORDER = [
  "committed",
  "picked_up",
  "fetched",
  "verified",
  "applied",
  "surface_ok",
  "building",
  "image_pushed",
  "built",
  "bench_queued",
  "correct",
  "screened",
  "benched",
] as const satisfies readonly Exclude<SubmissionState, "rejected">[];

/** Happy-path stages grouped into the three phases the timeline renders. */
export const SUBMISSION_PHASES = [
  {
    id: "intake",
    label: "Intake & gates",
    states: [
      "committed",
      "picked_up",
      "fetched",
      "verified",
      "applied",
      "surface_ok",
    ],
  },
  {
    id: "build",
    label: "Build",
    states: ["building", "image_pushed", "built"],
  },
  {
    id: "bench",
    label: "Benchmark",
    states: ["bench_queued", "correct", "screened", "benched"],
  },
] as const satisfies readonly {
  id: string;
  label: string;
  states: readonly Exclude<SubmissionState, "rejected">[];
}[];

export type SubmissionPhase = (typeof SUBMISSION_PHASES)[number];

/** Terminal bench failures the API reports via `bench_verdict`. */
export const BENCH_FAIL_REASONS = [
  "fail_correctness",
  "fail_perf_screen",
  "fail_sla",
  "fail_engine_candidate",
  "fail_cross_env_speedup",
] as const;

export type BenchFailReason = (typeof BENCH_FAIL_REASONS)[number];

/** `pass`, a specific failure reason, or null while bench is still pending. */
export type BenchVerdict = "pass" | BenchFailReason | null;

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
  /** API field `committed_at`: when the patch hash landed on chain. */
  committed_at: string;
  latest_state: SubmissionStateName;
  bench_verdict: BenchVerdict;
};

export type SubmissionsPage = {
  campaign_id: string;
  total: number;
  limit: number;
  offset: number;
  submissions: SubmissionRow[];
};

export type Submission = {
  id: string;
  campaign_id: string;
  patch_hash: string;
  hotkey: string;
  baseline_commit: string;
  retrieval_url: string;
  commit_block: number | null;
  committed_at: string;
  engine_image_ref: string | null;
  created_at: string;
};

export type SubmissionEvent = {
  state: SubmissionStateName;
  created_at: string;
  /** Free-form JSONB written by the worker; shape varies per state. */
  detail: Record<string, unknown>;
  evidence_ref: string | null;
};

export const BENCH_STAGES = [
  "correctness",
  "perf_screen",
  "sla_bench",
] as const;

export type BenchStage = (typeof BENCH_STAGES)[number] | string;

export type BenchReport = {
  task_id: string;
  stage: BenchStage;
  verdict: string;
  report: Record<string, unknown>;
  evidence_s3_url: string | null;
  gpu_sku: string | null;
  mock: boolean;
  created_at: string;
};

export type SubmissionDetail = {
  submission: Submission;
  events: SubmissionEvent[];
  bench_reports: BenchReport[];
  bench_verdict: BenchVerdict;
  /** Convenience: state of the most recent event. */
  latest_state: SubmissionStateName;
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
  description: string;
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
  picked_up: {
    state: "picked_up",
    label: "Picked up",
    description: "A worker claimed the submission and started the pipeline.",
    tone: "progress",
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
  image_pushed: {
    state: "image_pushed",
    label: "Image pushed",
    description: "Candidate engine image pushed to the registry.",
    tone: "progress",
  },
  built: {
    state: "built",
    label: "Built",
    description: "Candidate engine image built and digest pinned.",
    tone: "progress",
  },
  bench_queued: {
    state: "bench_queued",
    label: "Bench queued",
    description: "Waiting for a GPU host to run the benchmark.",
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
  pass: {
    verdict: "pass",
    label: "Pass",
    description: "Cleared correctness, perf screen, and the SLA bench.",
    tone: "success",
  },
  fail_correctness: {
    verdict: "fail_correctness",
    label: "Fail: correctness",
    description: "Output diverged from the baseline engine beyond tolerance.",
    tone: "danger",
  },
  fail_perf_screen: {
    verdict: "fail_perf_screen",
    label: "Fail: perf screen",
    description: "Throughput did not beat the baseline in the cheap screen.",
    tone: "danger",
  },
  fail_sla: {
    verdict: "fail_sla",
    label: "Fail: SLA",
    description: "Missed the campaign p99 latency or goodput gates.",
    tone: "danger",
  },
  fail_engine_candidate: {
    verdict: "fail_engine_candidate",
    label: "Fail: engine",
    description: "Candidate engine did not come up cleanly under bench.",
    tone: "danger",
  },
  fail_cross_env_speedup: {
    verdict: "fail_cross_env_speedup",
    label: "Fail: cross-env",
    description: "Speedup did not hold across every target GPU SKU.",
    tone: "danger",
  },
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
    label: state.replaceAll("_", " ") || "unknown",
    description: "Pipeline state not yet known to the dashboard.",
    tone: "neutral",
  };
}

export function isBenchVerdict(
  value: unknown
): value is NonNullable<BenchVerdict> {
  return (
    value === "pass" ||
    (typeof value === "string" &&
      (BENCH_FAIL_REASONS as readonly string[]).includes(value))
  );
}

export function getBenchVerdictMeta(
  verdict: BenchVerdict
): BenchVerdictMeta | null {
  if (verdict == null) return null;
  return BENCH_VERDICT_META[verdict] ?? null;
}

/** Tone for a per-stage `bench_reports[].verdict`, which is looser than the
 *  submission-level verdict and can carry harness error strings. */
export function getStageVerdictTone(
  verdict: string
): "neutral" | "success" | "danger" | "warn" {
  if (verdict === "pass") return "success";
  if (verdict === "error") return "warn";
  if (verdict.startsWith("fail")) return "danger";
  return "neutral";
}

/** Position of a state on the happy path, or -1 for `rejected`/unknown. */
export function stageIndex(state: string): number {
  return (SUBMISSION_STAGE_ORDER as readonly string[]).indexOf(state);
}

/** States after which no further pipeline events are expected. */
export function isTerminalState(state: string): boolean {
  return state === "benched" || state === "rejected";
}

/** Whether the pipeline got far enough for a build log to exist. */
export function reachedBuild(states: readonly string[]): boolean {
  const buildIndex = stageIndex("building");
  return states.some((state) => stageIndex(state) >= buildIndex);
}
