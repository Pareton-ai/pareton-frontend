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
 * `gate/types.py`. Regenerated from the local FastAPI OpenAPI (PAR-84);
 * do not edit by hand.
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
  "round_assigned",
  "infra_failed",
  "scored",
  "disqualified",
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
    label: "Round",
    states: ["bench_queued", "round_assigned", "scored"],
  },
] as const satisfies readonly {
  id: string;
  label: string;
  states: readonly Exclude<SubmissionState, "rejected">[];
}[];

export type SubmissionPhase = (typeof SUBMISSION_PHASES)[number];

/**
 * The 12 happy-path stages, flattened from `SUBMISSION_PHASES`.
 *
 * `SUBMISSION_STAGE_ORDER` orders every state, including off-path ones like
 * `infra_failed` and the alternative terminal `disqualified`; this list is
 * what progress counters count, so a scored submission reads 12 of 12.
 */
export const SUBMISSION_HAPPY_PATH = SUBMISSION_PHASES.flatMap(
  (phase) => phase.states
);

/** Position on the happy path, or -1 for off-path states. */
export function happyPathIndex(state: string): number {
  return (SUBMISSION_HAPPY_PATH as readonly string[]).indexOf(state);
}

/** `rounds.status`. From `db/schema.sql`. */
export const ROUND_STATUSES = [
  "pending",
  "running",
  "complete",
  "void",
] as const;

export type RoundStatus = (typeof ROUND_STATUSES)[number] | string;

/** `round_entries.role`. From `round/rank.py` `ENTRY_ROLES`. */
export const ENTRY_ROLES = ["baseline", "leader", "challenger"] as const;

export type EntryRole = (typeof ENTRY_ROLES)[number] | string;

/** `round_entries.status`. From `round/rank.py` `ENTRY_STATUSES`. */
export const ENTRY_STATUSES = [
  "pending",
  "running",
  "scored",
  "disqualified",
  "infra_failed",
] as const;

export type EntryStatus = (typeof ENTRY_STATUSES)[number] | string;

/**
 * Known `rounds.void_reason` values. From `round/rank.py` `VOID_*` plus
 * `round/store.py` `VOID_HEARTBEAT_STALE`. The runner may write others, so the
 * field on the wire is `string | null`, not this union.
 */
export const VOID_REASONS = [
  "baseline_failed",
  "leader_infra_failed",
  "no_surviving_challenger",
  "baseline_drift",
  "heartbeat_stale",
] as const;

export type VoidReason = (typeof VOID_REASONS)[number] | string;

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
  gpu_count: number;
  serve_args: string[] | null;
  correctness: CampaignBenchCorrectness | null;
  baseline_engine_image_digest: string;
};

export type ScoringRule = {
  name: string;
};

/** Campaign pin: each round draws prompts from this HuggingFace dataset. */
export type SamplingRule = {
  type: "hf_rows";
  dataset: string;
  revision: string;
  config: string;
  split: string;
  n_rows: number;
  n_prompts: number;
  max_tokens: number;
  algo_version: number;
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
  /** HuggingFace row sampler. Null if the API omitted it. */
  sampling_rule: SamplingRule | null;
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
  scoring_rule: ScoringRule;
};

export type CampaignsResponse = {
  campaigns: Campaign[];
};

/**
 * A submission's newest non-void round entry.
 *
 * `score` is null for a disqualified or infra-failed entry. 0.0 is a real
 * score and means the image matched baseline speed.
 */
export type SubmissionRound = {
  round_id: string;
  ordinal: number;
  status: EntryStatus;
  score: number | null;
  disqualify_reason: string | null;
};

export type SubmissionRow = {
  /** Submission UUID. Secondary support identifier (build logs, Axiom). */
  id: string;
  patch_hash: string;
  campaign_id: string;
  hotkey: string;
  /** API field `committed_at`: when the patch hash landed on chain. */
  committed_at: string;
  latest_state: SubmissionStateName;
  round: SubmissionRound | null;
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
 * Mirrors `bench/phases.py` `BenchPhase`.
 */
export const BENCH_PHASES = [
  "provisioning",
  "bootstrapping",
  "pulling_image",
  "downloading_model",
  "starting_engine",
  "correctness",
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

/** A `submission_jobs` row from the detail response. Status is widened
 *  to `string` so new DB CHECK values still render. */
export type SubmissionJob = {
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

export type SubmissionDetail = {
  submission: Submission;
  events: SubmissionEvent[];
  /** Worker job status; the only signal for infra-level failures. */
  jobs: SubmissionJob[];
  round: SubmissionRound | null;
  /** API-reported furthest state, falling back to the last event. */
  latest_state: SubmissionStateName;
};

export type Leader = {
  campaign_id: string;
  submission_id: string;
  patch_hash: string;
  hotkey: string;
  engine_image_ref: string;
  won_at_round_id: string;
  won_at_ordinal: number;
  last_score: number;
  last_scored_round_id: string | null;
  updated_at: string;
};

/** One row of `GET /v1/campaigns/{id}/rounds`. */
export type Round = {
  id: string;
  ordinal: number;
  status: RoundStatus;
  void_reason: string | null;
  gpu_sku: string;
  seed_block: number;
  seed_block_hash: string;
  entry_count: number;
  leader_changed: boolean | null;
  created_at: string;
  completed_at: string | null;
};

export type RoundsPage = {
  campaign_id: string;
  total: number;
  limit: number;
  offset: number;
  rounds: Round[];
};

export type RoundEntry = {
  id: number;
  submission_id: string | null;
  patch_hash: string | null;
  hotkey: string | null;
  role: EntryRole;
  engine_image_ref: string;
  status: EntryStatus;
  score: number | null;
  disqualify_reason: string | null;
  started_at: string | null;
  completed_at: string | null;
};

/** `GET /v1/rounds/{round_id}`. */
export type RoundDetail = {
  id: string;
  campaign_id: string;
  ordinal: number;
  status: RoundStatus;
  void_reason: string | null;
  gpu_sku: string;
  seed_block: number;
  seed_block_hash: string;
  seed_hex: string;
  sampled_trace_sha256: string;
  scoring_rule: Record<string, unknown>;
  incumbent_submission_id: string | null;
  winner_submission_id: string | null;
  leader_changed: boolean | null;
  baseline_drift: number | null;
  phase: BenchPhase | null;
  phase_started_at: string | null;
  heartbeat_at: string | null;
  progress: Record<string, unknown> | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  entries: RoundEntry[];
};

export type ScoreProgressEntry = {
  submission_id: string;
  hotkey: string | null;
  role: EntryRole;
  status: EntryStatus;
  score: number | null;
};

export type ScoreProgressPoint = {
  round_id: string;
  ordinal: number;
  status: RoundStatus;
  leader_score: number | null;
  entries: ScoreProgressEntry[];
};

/** `GET /v1/campaigns/{id}/score-progress`. */
export type ScoreProgressSeries = {
  campaign_id: string;
  points: ScoreProgressPoint[];
};

export type SubmissionStateMeta = {
  state: SubmissionStateName;
  label: string;
  /** Short description for tooltips / empty copy. */
  description: string;
  tone: "neutral" | "progress" | "success" | "danger";
};

/**
 * Local presentation metadata: labels, tones, descriptions. Not the wire
 * vocabulary. Partial by design: a state added on the backend needs no edit
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
    description: "Waiting to be seated in a round.",
    tone: "progress",
  },
  round_assigned: {
    state: "round_assigned",
    label: "Round assigned",
    description: "Seated in a round; waiting to run or running.",
    tone: "progress",
  },
  infra_failed: {
    state: "infra_failed",
    label: "Infra failed",
    description: "The image never ran because of infrastructure; one requeue.",
    tone: "danger",
  },
  scored: {
    state: "scored",
    label: "Scored",
    description: "The image ran and holds a round score.",
    tone: "success",
  },
  disqualified: {
    state: "disqualified",
    label: "Disqualified",
    description: "The image ran and produced wrong output.",
    tone: "danger",
  },
  rejected: {
    state: "rejected",
    label: "Rejected",
    description: "Failed a gate; no further progression.",
    tone: "danger",
  },
} satisfies Partial<Record<SubmissionState, SubmissionStateMeta>>;

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

/** Position of a state on the happy path, or -1 for `rejected`/unknown. */
export function stageIndex(state: string): number {
  return (SUBMISSION_STAGE_ORDER as readonly string[]).indexOf(state);
}

/** States after which no further pipeline events are expected. */
export function isTerminalState(state: string): boolean {
  return state === "scored" || state === "disqualified" || state === "rejected";
}

/** A round still moving: waiting to be seated on a pod, or running on one. */
export function isLiveRound(status: RoundStatus): boolean {
  return status === "pending" || status === "running";
}

/**
 * Terminal failure. `infra_failed` is not included: that state requeues once
 * and must not paint as a red halt.
 */
export function isFailedState(state: string): boolean {
  return state === "disqualified" || state === "rejected";
}

/**
 * Whether a campaign-list row is still expected to change.
 *
 * List payloads have no job array, so a queued wait (`bench_queued` /
 * `sampled` with no `bench_phase` yet) cannot be told from a stall. Treat
 * every non-terminal state as live; a stuck row polling once a minute is
 * cheaper than freezing the table through the GPU wait and the whole bench.
 */
export function isLiveSubmissionRow(row: { latest_state: string }): boolean {
  return !isTerminalState(row.latest_state);
}

/** Whether the pipeline got far enough for a build log to exist. */
export function reachedBuild(states: readonly string[]): boolean {
  const buildIndex = stageIndex("building");
  return states.some((state) => stageIndex(state) >= buildIndex);
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
  phase: BenchPhase;
  label: string;
  description: string;
  /** When the current phase started, for a ticking elapsed reading. */
  since: string | null;
  heartbeatAgeMs: number | null;
  /** Worker stopped proving it is alive; the phase is history, not now. */
  stale: boolean;
};

/**
 * The phase columns a worker writes while it runs. A submission reads them off
 * its job row; a round carries them itself.
 */
type PhaseColumns = Pick<
  SubmissionJob,
  "phase" | "phase_started_at" | "heartbeat_at"
>;

function toLiveActivity(
  source: PhaseColumns,
  now: string
): LiveActivity | null {
  if (source.phase === null) return null;

  const meta = BENCH_PHASE_META[source.phase];
  const heartbeatAgeMs = source.heartbeat_at
    ? elapsedBetween(source.heartbeat_at, now)
    : null;

  return {
    phase: source.phase,
    label: meta.label,
    description: meta.description,
    since: source.phase_started_at,
    heartbeatAgeMs,
    stale: heartbeatAgeMs === null || heartbeatAgeMs > HEARTBEAT_STALE_AFTER_MS,
  };
}

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
  if (!job) return null;
  return toLiveActivity(job, now);
}

/** Live activity for a round mid-flight (PAR-88), or null once it settles. */
export function getRoundActivity(
  round: RoundDetail,
  now: string
): LiveActivity | null {
  // The backend settle paths (complete/void/reap) leave the phase column
  // populated, so a settled round would otherwise paint as live forever.
  if (!isLiveRound(round.status)) return null;
  return toLiveActivity(round, now);
}
