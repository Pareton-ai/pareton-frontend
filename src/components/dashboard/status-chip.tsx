import type { CampaignStatus } from "@/lib/api/types";
import {
  BENCH_PHASE_META,
  getBenchVerdictMeta,
  getStageVerdictTone,
  getSubmissionStateMeta,
  type BenchPhase,
  type BenchVerdict,
  type SubmissionState,
} from "@/lib/api/types";

const toneClass = {
  neutral: "border-border text-muted",
  progress: "border-accent/40 text-accent",
  // Filled success so Pass isolates among many outlined fail chips (Von Restorff).
  success: "border-accent/50 bg-accent/15 text-foreground",
  danger: "border-rust/50 text-rust",
  warn: "border-rust/40 text-rust",
} as const;

const chipClassName =
  "inline-flex border px-2 py-0.5 font-mono text-caption uppercase tracking-caps";

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

export function PipelineChip({
  state,
  benchPhase = null,
}: {
  state: SubmissionState | string;
  /**
   * Phase of a bench running right now. Wins over `state` because the event
   * trail records nothing between `sampled` and a result, so without it a run
   * in progress and one that died hours ago both read as SAMPLED.
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

export function BenchVerdictChip({ verdict }: { verdict: BenchVerdict }) {
  const meta = getBenchVerdictMeta(verdict);
  if (!meta) {
    return <span className="font-mono text-body text-muted">—</span>;
  }
  return (
    <span
      className={`${chipClassName} ${toneClass[meta.tone]}`}
      title={meta.description}
    >
      {meta.label}
    </span>
  );
}

/** Per-stage verdict from `bench_reports[]`, which can carry harness errors. */
export function StageVerdictChip({ verdict }: { verdict: string }) {
  if (!verdict) {
    return <span className="font-mono text-body text-muted">—</span>;
  }
  return (
    <span
      className={`${chipClassName} ${toneClass[getStageVerdictTone(verdict)]}`}
    >
      {verdict.replaceAll("_", " ")}
    </span>
  );
}
