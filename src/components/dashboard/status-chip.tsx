import type { CampaignStatus, EntryStatus, RoundStatus } from "@/lib/api/types";
import {
  BENCH_PHASE_META,
  getSubmissionStateMeta,
  type BenchPhase,
  type SubmissionState,
} from "@/lib/api/types";

const toneClass = {
  neutral: "border-border text-muted",
  progress: "border-accent/40 text-accent",
  success: "border-accent/50 bg-accent/15 text-foreground",
  danger: "border-rust/50 text-rust",
  warn: "border-rust/40 text-rust",
} as const;

export function CampaignStatusChip({ status }: { status: CampaignStatus }) {
  const tone =
    status === "open" ? "progress" : status === "closed" ? "neutral" : "warn";
  return (
    <span
      className={`inline-flex border px-2 py-0.5 font-mono text-caption uppercase tracking-caps ${toneClass[tone]}`}
    >
      {status}
    </span>
  );
}

export function RoundStatusChip({ status }: { status: RoundStatus }) {
  const tone =
    status === "running"
      ? "progress"
      : status === "complete"
        ? "success"
        : status === "void"
          ? "danger"
          : "neutral";
  return (
    <span
      className={`inline-flex border px-2 py-0.5 font-mono text-caption uppercase tracking-caps ${toneClass[tone]}`}
    >
      {status.replaceAll("_", " ")}
    </span>
  );
}

/**
 * One image's outcome inside a round.
 *
 * `infra_failed` reads as a warning rather than a verdict: the pod died, which
 * says nothing about the patch.
 */
export function EntryStatusChip({ status }: { status: EntryStatus }) {
  const tone =
    status === "running"
      ? "progress"
      : status === "scored"
        ? "success"
        : status === "disqualified"
          ? "danger"
          : status === "infra_failed"
            ? "warn"
            : "neutral";
  return (
    <span
      className={`inline-flex border px-2 py-0.5 font-mono text-caption uppercase tracking-caps ${toneClass[tone]}`}
    >
      {status.replaceAll("_", " ")}
    </span>
  );
}

export function PipelineChip({
  state,
  benchPhase = null,
}: {
  state: SubmissionState | string;
  /**
   * Phase of a job running right now. Wins over `state` because the event
   * trail records nothing between `round_assigned` and a result, so without
   * it a run in progress and one that died hours ago both read as assigned.
   */
  benchPhase?: BenchPhase | null;
}) {
  if (benchPhase) {
    const phase = BENCH_PHASE_META[benchPhase];
    return (
      <span
        className={`inline-flex border px-2 py-0.5 font-mono text-caption uppercase tracking-caps ${toneClass.progress}`}
        title={phase.description}
      >
        {phase.label}
      </span>
    );
  }
  const meta = getSubmissionStateMeta(state);
  return (
    <span
      className={`inline-flex border px-2 py-0.5 font-mono text-caption uppercase tracking-caps ${toneClass[meta.tone]}`}
      title={meta.description}
    >
      {meta.label}
    </span>
  );
}
