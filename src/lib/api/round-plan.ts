/**
 * The round run plan, derived on the client from `round.entries`.
 *
 * The shape is fixed (`bench/main.py` `plan_round_starts`): four setup
 * phases, one `starting_engine` + bench pair per seated entry, the shared
 * scorer, the closing drift baseline, then teardown. Scorer and drift have
 * no `round_entries` row. Engine starts = `entries.length + 2`.
 *
 * Locating "now" prefers `rounds.phase` plus `progress`, then entry
 * `started_at` / status. A step is done when the next one has started.
 */

import { elapsedBetween } from "@/lib/api/format";
import {
  BENCH_PHASE_META,
  HEARTBEAT_STALE_AFTER_MS,
  isLiveRound,
  type BenchPhase,
  type RoundDetail,
  type RoundEntry,
} from "@/lib/api/types";

export const SETUP_PHASES: readonly BenchPhase[] = [
  "provisioning",
  "bootstrapping",
  "pulling_image",
  "downloading_model",
];

/** Rank-time voids: the pod finished the plan, then the round was thrown out. */
const RANK_VOID_REASONS = new Set([
  "baseline_failed",
  "leader_infra_failed",
  "no_surviving_challenger",
  "baseline_drift",
]);

const PRE_POD_VOID_REASONS = new Set([
  "pod_provision_failed",
  "trace_unavailable",
  "leader_image_missing",
]);

export type PlanStepStatus =
  "done" | "current" | "stalled" | "pending" | "halted";

export type RoundPlanStep = {
  id: string;
  groupId: string;
  groupLabel: string;
  phase: BenchPhase;
  /** Combined label, e.g. `Candidate 3 of 6, running SLA`. */
  label: string;
  description: string;
  entryId: number | null;
};

export type AnnotatedRoundPlanStep = RoundPlanStep & {
  status: PlanStepStatus;
  at: string | null;
  sincePrevious: number | null;
};

function isSettledEntry(entry: RoundEntry): boolean {
  return (
    entry.status === "scored" ||
    entry.status === "disqualified" ||
    entry.status === "infra_failed"
  );
}

function entryReached(entry: RoundEntry): boolean {
  return (
    entry.started_at !== null ||
    entry.status === "running" ||
    isSettledEntry(entry)
  );
}

function entryFinished(entry: RoundEntry): boolean {
  return entry.completed_at !== null || isSettledEntry(entry);
}

function allEntriesFinished(entries: readonly RoundEntry[]): boolean {
  return entries.length > 0 && entries.every(entryFinished);
}

/** Shared scorer already graded someone; a later starting_engine is drift. */
function scorerAlreadyJudged(entries: readonly RoundEntry[]): boolean {
  return entries.some((row) => row.disqualify_reason === "fail_correctness");
}

function lastReachedIndex(entries: readonly RoundEntry[]): number {
  let last = -1;
  for (let i = 0; i < entries.length; i += 1) {
    if (entryReached(entries[i])) last = i;
  }
  return last;
}

function actionLabel(phase: BenchPhase): string {
  if (phase === "starting_engine") return "starting the engine";
  if (phase === "sla_bench") return "running SLA";
  if (phase === "correctness") return "running the shared scorer";
  return BENCH_PHASE_META[phase].label;
}

function entrySubject(
  entry: RoundEntry,
  entries: readonly RoundEntry[]
): string {
  if (entry.role === "baseline") return "Baseline";
  if (entry.role === "leader") return "Incumbent";
  const challengers = entries.filter((row) => row.role === "challenger");
  const index = challengers.findIndex((row) => row.id === entry.id);
  if (index === -1) {
    const others = entries.filter((row) => row.role !== "baseline");
    const fallback = others.findIndex((row) => row.id === entry.id);
    return `Candidate ${fallback + 1} of ${others.length}`;
  }
  return `Candidate ${index + 1} of ${challengers.length}`;
}

function engineStep(
  groupId: string,
  groupLabel: string,
  subject: string,
  phase: BenchPhase,
  entryId: number | null
): RoundPlanStep {
  return {
    id: `${groupId}:${phase}`,
    groupId,
    groupLabel,
    phase,
    label: `${subject}, ${actionLabel(phase)}`,
    description: BENCH_PHASE_META[phase].description,
    entryId,
  };
}

function setupStep(phase: BenchPhase): RoundPlanStep {
  const meta = BENCH_PHASE_META[phase];
  return {
    id: `setup:${phase}`,
    groupId: "setup",
    groupLabel: "Setup",
    phase,
    label: meta.label,
    description: meta.description,
    entryId: null,
  };
}

/** Full plan for this cohort, including steps not yet reached. */
export function buildRoundPlan(
  entries: readonly RoundEntry[]
): RoundPlanStep[] {
  const steps: RoundPlanStep[] = SETUP_PHASES.map(setupStep);

  for (const entry of entries) {
    const subject = entrySubject(entry, entries);
    const groupId = `entry:${entry.id}`;
    steps.push(
      engineStep(groupId, subject, subject, "starting_engine", entry.id)
    );
    steps.push(engineStep(groupId, subject, subject, "sla_bench", entry.id));
  }

  steps.push(engineStep("scorer", "Scorer", "Scorer", "starting_engine", null));
  steps.push(engineStep("scorer", "Scorer", "Scorer", "correctness", null));
  steps.push(
    engineStep(
      "drift",
      "Drift baseline",
      "Drift baseline",
      "starting_engine",
      null
    )
  );
  steps.push(
    engineStep("drift", "Drift baseline", "Drift baseline", "sla_bench", null)
  );

  const teardown = BENCH_PHASE_META.teardown;
  steps.push({
    id: "teardown:teardown",
    groupId: "teardown",
    groupLabel: "Teardown",
    phase: "teardown",
    label: teardown.label,
    description: teardown.description,
    entryId: null,
  });

  return steps;
}

type EngineKind = "entry" | "scorer" | "drift";

type ProgressHint = {
  entryIndex: number | null;
  kind: EngineKind | null;
};

/**
 * Read PAR-98-shaped progress. `entry` is a 0-based index into `entries`
 * (the running fixture uses `{ entry: 2 }` for the third row). `role` matches
 * `EngineStart.role` when that lands: `baseline`, `candidate-N`, `scorer`,
 * `baseline-drift`. `step` is the 1-based plan position the harness stamps
 * (`enumerate(starts, 1)`); seated rows are `1..N`, scorer is `N+1`, drift
 * is `N+2`.
 */
export function readProgressHint(
  progress: Record<string, unknown> | null,
  entries: readonly RoundEntry[]
): ProgressHint {
  if (progress === null) return { entryIndex: null, kind: null };

  let kind: EngineKind | null = null;
  let entryIndex: number | null = null;

  const role =
    typeof progress.role === "string"
      ? progress.role
      : typeof progress.kind === "string"
        ? progress.kind
        : null;

  if (role === "scorer") {
    kind = "scorer";
  } else if (role === "drift" || role === "baseline-drift") {
    kind = "drift";
  } else if (role === "baseline") {
    kind = "entry";
    const index = entries.findIndex((entry) => entry.role === "baseline");
    entryIndex = index === -1 ? 0 : index;
  } else if (role !== null) {
    const match = /^candidate-(\d+)$/.exec(role);
    if (match) {
      const candidateIndex = Number(match[1]);
      const candidates = entries
        .map((entry, index) => ({ entry, index }))
        .filter(({ entry }) => entry.role !== "baseline");
      if (candidateIndex >= 0 && candidateIndex < candidates.length) {
        kind = "entry";
        entryIndex = candidates[candidateIndex].index;
      }
    }
  }

  if (typeof progress.entry === "number" && Number.isInteger(progress.entry)) {
    const n = progress.entry;
    if (n >= 0 && n < entries.length) {
      entryIndex = n;
      kind = kind ?? "entry";
    } else if (n === entries.length) {
      kind = kind ?? "scorer";
    } else if (n === entries.length + 1) {
      kind = kind ?? "drift";
    }
  }

  if (typeof progress.step === "number" && Number.isInteger(progress.step)) {
    const step = progress.step;
    if (step >= 1 && step <= entries.length) {
      entryIndex = entryIndex ?? step - 1;
      kind = kind ?? "entry";
    } else if (step === entries.length + 1) {
      if (kind === null || kind === "entry") kind = "scorer";
    } else if (step === entries.length + 2) {
      if (kind === null || kind === "entry") kind = "drift";
    }
  }

  return { entryIndex, kind };
}

type Position =
  | { type: "pending" }
  | { type: "complete" }
  | { type: "at"; index: number; halted: boolean }
  /** Infra void after a finished engine: done through `lastDone`, rest halted. */
  | { type: "cut"; lastDone: number };

function indexOf(
  steps: readonly RoundPlanStep[],
  groupId: string,
  phase: BenchPhase
): number {
  return steps.findIndex(
    (step) => step.groupId === groupId && step.phase === phase
  );
}

function entryGroupId(entry: RoundEntry): string {
  return `entry:${entry.id}`;
}

function inferEntryIndex(
  entries: readonly RoundEntry[],
  hint: ProgressHint
): number | null {
  if (hint.entryIndex !== null) return hint.entryIndex;
  const last = lastReachedIndex(entries);
  return last === -1 ? null : last;
}

function locatePosition(
  round: RoundDetail,
  steps: readonly RoundPlanStep[]
): Position {
  const halted = round.status === "void";
  const at = (index: number): Position => ({
    type: "at",
    index: Math.max(0, index),
    halted,
  });

  if (round.status === "pending") return { type: "pending" };
  if (round.status === "complete") return { type: "complete" };
  if (
    round.status === "void" &&
    round.void_reason !== null &&
    RANK_VOID_REASONS.has(round.void_reason)
  ) {
    return { type: "complete" };
  }

  const { phase, entries } = round;
  const hint = readProgressHint(round.progress, entries);

  if (phase !== null && (SETUP_PHASES as readonly string[]).includes(phase)) {
    return at(indexOf(steps, "setup", phase));
  }
  if (phase === "teardown") return at(indexOf(steps, "teardown", "teardown"));
  if (phase === "correctness") {
    return at(indexOf(steps, "scorer", "correctness"));
  }

  if (hint.kind === "scorer") {
    const scorerPhase =
      phase === "starting_engine" ? "starting_engine" : "correctness";
    return at(indexOf(steps, "scorer", scorerPhase));
  }
  if (hint.kind === "drift") {
    const driftPhase =
      phase === "starting_engine" ? "starting_engine" : "sla_bench";
    return at(indexOf(steps, "drift", driftPhase));
  }

  if (phase === "starting_engine" || phase === "sla_bench") {
    // Scorer and drift have no entry row. A leftover progress.entry after the
    // cohort has settled must not pin the cursor on that finished image.
    if (allEntriesFinished(entries)) {
      if (phase === "starting_engine") {
        // Same phase name starts the scorer and the drift baseline. After
        // the scorer has judged, this start is drift; otherwise it is the
        // scorer. Mapping every unhinted start to the scorer walks the
        // cursor back onto an engine that already ran.
        if (scorerAlreadyJudged(entries)) {
          return at(indexOf(steps, "drift", "starting_engine"));
        }
        return at(indexOf(steps, "scorer", "starting_engine"));
      }
      return at(indexOf(steps, "drift", "sla_bench"));
    }

    const entryIndex = inferEntryIndex(entries, hint);
    if (entryIndex !== null) {
      const entry = entries[entryIndex];
      const hintedHere = hint.entryIndex === entryIndex;
      // Live sla_bench still belongs to this image. Jumping to the next
      // starting_engine would drop the phase we are actually in.
      if (
        !hintedHere &&
        entryFinished(entry) &&
        entryIndex < entries.length - 1 &&
        phase === "starting_engine"
      ) {
        return at(
          indexOf(
            steps,
            entryGroupId(entries[entryIndex + 1]),
            "starting_engine"
          )
        );
      }
      return at(indexOf(steps, entryGroupId(entry), phase));
    }

    if (entries.length > 0) {
      return at(indexOf(steps, entryGroupId(entries[0]), phase));
    }
  }

  const reached = lastReachedIndex(entries);
  if (reached !== -1) {
    const entry = entries[reached];
    if (halted) {
      const lastPhase: BenchPhase = entryFinished(entry)
        ? "sla_bench"
        : "starting_engine";
      const index = indexOf(steps, entryGroupId(entry), lastPhase);
      if (entryFinished(entry)) {
        return { type: "cut", lastDone: Math.max(0, index) };
      }
      return at(index);
    }
    if (entryFinished(entry) && reached === entries.length - 1) {
      return at(indexOf(steps, "scorer", "starting_engine"));
    }
    if (entryFinished(entry) && reached < entries.length - 1) {
      return at(
        indexOf(steps, entryGroupId(entries[reached + 1]), "starting_engine")
      );
    }
    return at(indexOf(steps, entryGroupId(entry), "sla_bench"));
  }

  if (
    halted &&
    round.void_reason !== null &&
    PRE_POD_VOID_REASONS.has(round.void_reason)
  ) {
    return at(indexOf(steps, "setup", "provisioning"));
  }

  if (round.status === "running") {
    return at(indexOf(steps, "setup", "provisioning"));
  }

  if (halted) return at(0);
  return { type: "pending" };
}

function timestampFor(
  step: RoundPlanStep,
  round: RoundDetail,
  isCurrent: boolean
): string | null {
  if (step.entryId !== null) {
    const entry = round.entries.find((row) => row.id === step.entryId);
    if (entry === undefined) return null;
    if (step.phase === "starting_engine") return entry.started_at;
    if (step.phase === "sla_bench") {
      if (entry.completed_at !== null) return entry.completed_at;
      if (isCurrent) return round.phase_started_at;
      return null;
    }
  }
  if (isCurrent) return round.phase_started_at;
  if (
    step.phase === "teardown" &&
    round.status === "complete" &&
    round.completed_at !== null
  ) {
    return round.completed_at;
  }
  return null;
}

function heartbeatStale(round: RoundDetail, now: string): boolean {
  if (!isLiveRound(round.status) || round.status === "pending") return false;
  if (round.heartbeat_at === null) return true;
  const age = elapsedBetween(round.heartbeat_at, now);
  return age === null || age > HEARTBEAT_STALE_AFTER_MS;
}

/**
 * Full plan with a status on every step. Complete and rank-voided rounds
 * render the same list, fully done. Infra voids stop at how far they got.
 */
export function annotateRoundPlan(
  round: RoundDetail,
  now: string
): AnnotatedRoundPlanStep[] {
  const steps = buildRoundPlan(round.entries);
  const position = locatePosition(round, steps);
  const stale = heartbeatStale(round, now);

  const annotated: AnnotatedRoundPlanStep[] = steps.map((step, index) => {
    let status: PlanStepStatus;
    if (position.type === "pending") {
      status = "pending";
    } else if (position.type === "complete") {
      status = "done";
    } else if (position.type === "cut") {
      status = index <= position.lastDone ? "done" : "halted";
    } else if (index < position.index) {
      status = "done";
    } else if (index === position.index) {
      if (position.halted) status = "stalled";
      else if (stale) status = "stalled";
      else status = "current";
    } else {
      status = position.halted ? "halted" : "pending";
    }

    return {
      ...step,
      status,
      at: timestampFor(
        step,
        round,
        status === "current" || status === "stalled"
      ),
      sincePrevious: null,
    };
  });

  let previousAt: string | null = null;
  for (const step of annotated) {
    if (step.at !== null) {
      step.sincePrevious =
        previousAt === null ? null : elapsedBetween(previousAt, step.at);
      previousAt = step.at;
    }
  }

  return annotated;
}

export function roundPlanProgress(steps: readonly AnnotatedRoundPlanStep[]): {
  done: number;
  total: number;
} {
  const done = steps.filter(
    (step) =>
      step.status === "done" ||
      step.status === "current" ||
      step.status === "stalled"
  ).length;
  return { done, total: steps.length };
}

export type RoundPlanGroup = {
  id: string;
  label: string;
  steps: AnnotatedRoundPlanStep[];
};

export function groupRoundPlan(
  steps: readonly AnnotatedRoundPlanStep[]
): RoundPlanGroup[] {
  const groups: RoundPlanGroup[] = [];
  for (const step of steps) {
    const last = groups.at(-1);
    if (last && last.id === step.groupId) last.steps.push(step);
    else {
      groups.push({
        id: step.groupId,
        label: step.groupLabel,
        steps: [step],
      });
    }
  }
  return groups;
}
