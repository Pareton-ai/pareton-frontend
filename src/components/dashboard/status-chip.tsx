import type { CampaignStatus } from "@/lib/api/types";
import {
  getBenchVerdictMeta,
  getSubmissionStateMeta,
  type BenchVerdict,
  type SubmissionState,
} from "@/lib/api/types";

const toneClass = {
  neutral: "border-border text-muted",
  progress: "border-accent/40 text-accent",
  success: "border-accent/50 text-foreground",
  danger: "border-rust/50 text-rust",
  warn: "border-rust/40 text-rust",
} as const;

export function CampaignStatusChip({ status }: { status: CampaignStatus }) {
  const tone =
    status === "open" ? "progress" : status === "closed" ? "neutral" : "warn";
  return (
    <span
      className={`inline-flex border px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.14em] ${toneClass[tone]}`}
    >
      {status}
    </span>
  );
}

export function PipelineChip({ state }: { state: SubmissionState | string }) {
  const meta = getSubmissionStateMeta(state);
  return (
    <span
      className={`inline-flex border px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.12em] ${toneClass[meta.tone]}`}
      title={meta.description}
    >
      {meta.label}
    </span>
  );
}

export function BenchVerdictChip({ verdict }: { verdict: BenchVerdict }) {
  const meta = getBenchVerdictMeta(verdict);
  if (!meta) {
    return <span className="font-mono text-[12px] text-muted">—</span>;
  }
  return (
    <span
      className={`inline-flex border px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.12em] ${toneClass[meta.tone]}`}
    >
      {meta.label}
    </span>
  );
}
