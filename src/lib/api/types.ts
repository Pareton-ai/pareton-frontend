/**
 * Hand-narrowed domain types for the shapes the dashboard actually renders.
 *
 * The pipeline state union is generated from the backend enum via
 * `schema.d.ts` (PAR-46). Everything else is narrowed at the fetch boundary in
 * `parse.ts`, because FastAPI types most response bodies as bare objects.
 */

import { elapsedBetween } from "@/lib/api/format";
import type { components } from "@/lib/api/schema";

/**
 * Pipeline states, generated from `SubmissionState` in the backend
 * `gate/types.py`. Regenerate with `npm run api:types` — never edit by hand.
 */
export type SubmissionState = components["schemas"]["SubmissionState"];

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
  // Only sampling campaigns emit this, so it is deliberately absent from
  // SUBMISSION_PHASES: a phase step that can never fill would leave older
  // campaigns' finished submissions reading 4/5 forever. Ordered here so
  // stageIndex resolves and the row meter renders at all.
  "sampled",
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

export type CampaignBenchCorrectnessThresholds = {
  argmax_mismatch_rate: number;
  mean_abs_logprob_diff: number;
  max_abs_logprob_diff: number;
};

export type CampaignBenchCorrectness = {
  thresholds: CampaignBenchCorrectnessThresholds;
};

export type CampaignBench = {
  model: CampaignBenchModel;
  cross_env: CampaignBenchCrossEnv;
  gpu_count: number;
  serve_args: string[] | null;
  correctness: CampaignBenchCorrectness | null;
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
  /** Row creation time. Campaigns run open ended, so this is the only date
   *  they carry and the key the list orders on. */
  created_at: string;
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
  /**
   * Phase of a bench running right now, else null. Read live from the job row
   * by the API, so it clears itself when the work stops. The event trail has
   * nothing between `sampled` and a result, so `latest_state` alone cannot tell
   * a run in progress from one that died hours ago.
   */
  bench_phase: BenchPhase | null;
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

/** Work units the worker claims per submission, in pipeline order. */
export const SUBMISSION_JOB_KINDS = ["gates", "bench"] as const;

export type SubmissionJobKind = (typeof SUBMISSION_JOB_KINDS)[number];

export const SUBMISSION_JOB_STATUSES = [
  "pending",
  "running",
  "done",
  "failed",
] as const;

export type SubmissionJobStatus = (typeof SUBMISSION_JOB_STATUSES)[number];

/**
 * Live bench operations. Unknown names are dropped at parse time rather than
 * rendered: they originate on a GPU pod running miner-supplied code.
 */
export const BENCH_PHASES = [
  "provisioning",
  "bootstrapping",
  "pulling_image",
  "downloading_model",
  "starting_engine",
  "correctness",
  "perf_screen",
  "sla_bench",
  "teardown",
] as const;

export type BenchPhase = (typeof BENCH_PHASES)[number];

export function isBenchPhase(value: unknown): value is BenchPhase {
  return (
    typeof value === "string" &&
    (BENCH_PHASES as readonly string[]).includes(value)
  );
}

/** A `submission_jobs` row from the detail response. Kind/status are widened
 *  to `string` so new DB CHECK values still render. */
export type SubmissionJob = {
  kind: SubmissionJobKind | string;
  status: SubmissionJobStatus | string;
  /** Machine-readable failure code, e.g. `bench_exit_bad_request`. */
  last_error: string | null;
  /** Current operation; null once the job settles. */
  phase: BenchPhase | null;
  phase_started_at: string | null;
  /** Last proof of life from the worker. Absent or old means it went away. */
  heartbeat_at: string | null;
  progress: Record<string, unknown> | null;
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
  /** Per-kind worker job status; the only signal for infra-level failures. */
  jobs: SubmissionJob[];
  bench_reports: BenchReport[];
  bench_verdict: BenchVerdict;
  /** API-reported furthest state, falling back to the last event. */
  latest_state: SubmissionStateName;
};

export type SubmissionStateMeta = {
  state: SubmissionStateName;
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

/**
 * Local presentation metadata: labels, tones, descriptions. Not the wire
 * vocabulary. Partial by design — a state added on the backend needs no edit
 * here and renders verbatim via `getSubmissionStateMeta` (PAR-46).
 */
export const SUBMISSION_STATE_META = {
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
  sampled: {
    state: "sampled",
    label: "Sampled",
    description: "Per-submission workload trace drawn for this campaign.",
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
} satisfies Partial<Record<SubmissionState, SubmissionStateMeta>>;

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
    label: "Correctness",
    description: "Output diverged from the baseline engine beyond tolerance.",
    tone: "danger",
  },
  fail_perf_screen: {
    verdict: "fail_perf_screen",
    label: "Perf screen",
    description: "Throughput did not beat the baseline in the cheap screen.",
    tone: "danger",
  },
  fail_sla: {
    verdict: "fail_sla",
    label: "SLA",
    description: "Missed the campaign p99 latency or goodput gates.",
    tone: "danger",
  },
  fail_engine_candidate: {
    verdict: "fail_engine_candidate",
    label: "Engine",
    description: "Candidate engine did not come up cleanly under bench.",
    tone: "danger",
  },
  fail_cross_env_speedup: {
    verdict: "fail_cross_env_speedup",
    label: "Cross-env",
    description: "Speedup did not hold across every target GPU SKU.",
    tone: "danger",
  },
};

/** States that have local presentation metadata. Narrower than `SubmissionState`. */
type StateWithMeta = keyof typeof SUBMISSION_STATE_META;

function hasStateMeta(value: string): value is StateWithMeta {
  return Object.hasOwn(SUBMISSION_STATE_META, value);
}

/** Metadata for any state, known or not. Unknown states render verbatim so a
 *  backend addition never masquerades as an earlier stage. */
export function getSubmissionStateMeta(state: string): SubmissionStateMeta {
  if (hasStateMeta(state)) return SUBMISSION_STATE_META[state];
  return {
    state,
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

export function getSubmissionJob(
  jobs: readonly SubmissionJob[],
  kind: SubmissionJobKind | string
): SubmissionJob | null {
  return jobs.find((job) => job.kind === kind) ?? null;
}

/**
 * First event recorded per state.
 *
 * A state can repeat (a retried fetch, say); the first occurrence is when the
 * stage was actually reached, so later ones are dropped.
 */
export function firstEventByState(
  events: readonly SubmissionEvent[]
): Map<string, SubmissionEvent> {
  const byState = new Map<string, SubmissionEvent>();
  for (const event of events) {
    if (!byState.has(event.state)) byState.set(event.state, event);
  }
  return byState;
}

/** First job with `status=failed`, if any. Infra failures append no event, so
 *  the trail can stop at `bench_queued` while only the job row records it. */
export function getFailedSubmissionJob(
  jobs: readonly SubmissionJob[]
): SubmissionJob | null {
  return jobs.find((job) => job.status === "failed") ?? null;
}

/** Non-terminal state, but the job backing the current stage already failed. */
export function isStalled(
  latestState: string,
  jobs: readonly SubmissionJob[]
): boolean {
  return !isTerminalState(latestState) && getFailedSubmissionJob(jobs) !== null;
}

/** Plain-language copy for each live phase. */
export const BENCH_PHASE_META: Record<
  BenchPhase,
  { label: string; description: string }
> = {
  provisioning: {
    label: "Renting a GPU pod",
    description: "Waiting on a provider to hand over a machine.",
  },
  bootstrapping: {
    label: "Preparing the pod",
    description: "Installing the harness and shipping the repo.",
  },
  pulling_image: {
    label: "Pulling engine images",
    description: "Fetching the baseline and candidate engine images.",
  },
  downloading_model: {
    label: "Downloading model weights",
    description: "Staging the campaign model onto the pod.",
  },
  starting_engine: {
    label: "Starting the engine",
    description: "Loading weights and waiting for the server to answer.",
  },
  correctness: {
    label: "Running correctness",
    description: "Comparing candidate output against the baseline engine.",
  },
  perf_screen: {
    label: "Running perf screen",
    description: "Cheap throughput check before the full bench.",
  },
  sla_bench: {
    label: "Running the SLA bench",
    description: "Full workload replay against the latency gates.",
  },
  teardown: {
    label: "Releasing the pod",
    description: "Destroying the pod and its volume.",
  },
};

/** Missing heartbeat older than this: the phase is no longer "now". Worker beats every 12s. */
export const HEARTBEAT_STALE_AFTER_MS = 60_000;

export type LiveActivity = {
  job: SubmissionJob;
  phase: BenchPhase;
  label: string;
  description: string;
  /** When the current phase started, for a ticking elapsed reading. */
  since: string | null;
  heartbeatAgeMs: number | null;
  /** Worker stopped proving it is alive; the phase is history, not now. */
  stale: boolean;
};

export function getRunningSubmissionJob(
  jobs: readonly SubmissionJob[]
): SubmissionJob | null {
  return (
    jobs.find((job) => job.status === "running" && job.phase !== null) ?? null
  );
}

/** Live activity for the detail page, or null. `now` is injected so SSR and tests agree. */
export function getLiveActivity(
  jobs: readonly SubmissionJob[],
  now: string
): LiveActivity | null {
  const job = getRunningSubmissionJob(jobs);
  if (!job || job.phase === null) return null;

  const meta = BENCH_PHASE_META[job.phase];
  const heartbeatAgeMs = job.heartbeat_at
    ? elapsedBetween(job.heartbeat_at, now)
    : null;

  return {
    job,
    phase: job.phase,
    label: meta.label,
    description: meta.description,
    since: job.phase_started_at,
    heartbeatAgeMs,
    stale: heartbeatAgeMs === null || heartbeatAgeMs > HEARTBEAT_STALE_AFTER_MS,
  };
}
