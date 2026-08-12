import type { CampaignStatus } from "@/lib/api/types";
import {
  getBenchVerdictMeta,
  getStageVerdictTone,
  getSubmissionStateMeta,
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

export function PipelineChip({ state }: { state: SubmissionState | string }) {
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
    return <span className="font-mono text-body-sm text-muted">—</span>;
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
    return <span className="font-mono text-body-sm text-muted">—</span>;
  }
  return (
    <span
      className={`${chipClassName} ${toneClass[getStageVerdictTone(verdict)]}`}
    >
      {verdict.replaceAll("_", " ")}
    </span>
  );
}
