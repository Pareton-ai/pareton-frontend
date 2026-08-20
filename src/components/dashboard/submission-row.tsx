import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { CopyableMono } from "@/components/dashboard/copyable-mono";
import { PipelineChip } from "@/components/dashboard/status-chip";
import {
  formatUtc,
  formatUtcShort,
  truncateDigest,
  truncateMiddle,
} from "@/lib/api/format";
import {
  stageIndex,
  SUBMISSION_PHASES,
  type SubmissionRow as SubmissionRowData,
  type SubmissionStateName,
} from "@/lib/api/types";

/**
 * Pipeline progress as three segments: intake, build, round.
 */
function PhaseMeter({ state }: { state: SubmissionStateName }) {
  const failed = state === "rejected" || state === "disqualified";
  const reached = stageIndex(state);
  if (reached < 0) return <span className="w-12 shrink-0" aria-hidden />;

  return (
    <span
      className="flex w-12 shrink-0 gap-0.5"
      aria-hidden
      title="Pipeline progress: intake → build → bench"
    >
      {SUBMISSION_PHASES.map((phase) => {
        const done = phase.states.filter(
          (s) => stageIndex(s) <= reached
        ).length;
        return (
          <span key={phase.id} className="h-1 flex-1 bg-border">
            <span
              className={`block h-full ${failed ? "bg-rust" : "bg-accent"}`}
              style={{ width: `${(done / phase.states.length) * 100}%` }}
            />
          </span>
        );
      })}
    </span>
  );
}

export function SubmissionRow({
  href,
  row,
}: {
  href: string;
  row: SubmissionRowData;
}) {
  return (
    // Safari ignores `position: relative` on a <tr> (WebKit 240961, fixed only
    // in 2026), so the stretched link would escape to the viewport. `transform`
    // makes the row a containing block and `clip-path` keeps the overlay inside
    // it; both are no-ops where `relative` already works.
    <tr className="group relative border-t border-border/80 transition-colors [clip-path:inset(0)] [transform:translate(0)] hover:bg-accent-dim/30 focus-within:bg-accent-dim/30">
      <td className="whitespace-nowrap px-4 py-3.5 font-mono text-body text-foreground sm:px-5">
        {/* Stretched link: the anchor's ::after covers the row, so the row is a
            real link and cmd/middle-click still open it in a new tab. */}
        <Link
          href={href}
          className="outline-none after:absolute after:inset-0 focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-accent"
        >
          {truncateMiddle(row.hotkey, 6, 4)}
          <span className="sr-only"> submission details</span>
        </Link>
      </td>
      <td className="px-3 py-3.5">
        <CopyableMono
          value={row.patch_hash}
          display={truncateDigest(row.patch_hash, 7, 5)}
          className="relative z-10 group-hover:text-foreground"
        />
      </td>
      <td
        className="whitespace-nowrap px-3 py-3.5 font-mono text-body text-secondary"
        title={formatUtc(row.committed_at)}
      >
        {formatUtcShort(row.committed_at)}
      </td>
      <td className="whitespace-nowrap px-3 py-3.5">
        <span className="flex items-center gap-2.5">
          <PhaseMeter state={row.latest_state} />
          <PipelineChip state={row.latest_state} />
        </span>
      </td>
      <td className="whitespace-nowrap px-3 py-3.5">
        {row.round == null ? (
          <span className="font-mono text-body text-muted">—</span>
        ) : row.round.score === null ? (
          <span className="font-mono text-body text-muted">
            {row.round.status.replaceAll("_", " ")}
          </span>
        ) : (
          <span className="font-mono text-body tabular-nums">
            {row.round.score}
          </span>
        )}
      </td>
      <td
        aria-hidden
        className="px-2 py-3.5 text-right text-muted opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
      >
        <ChevronRight className="ml-auto size-4" />
      </td>
    </tr>
  );
}
