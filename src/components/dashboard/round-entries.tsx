import { FlaskConical } from "lucide-react";
import Link from "next/link";
import { CopyableMono } from "@/components/dashboard/copyable-mono";
import { EntryStatusChip } from "@/components/dashboard/status-chip";
import {
  elapsedBetween,
  formatDuration,
  formatScore,
  truncateDigest,
  truncateMiddle,
} from "@/lib/api/format";
import { roundEntryReportHref, submissionHref } from "@/lib/routes";
import type { RoundEntry } from "@/lib/api/types";

function EntryDuration({
  entry,
  nowIso,
}: {
  entry: RoundEntry;
  nowIso: string;
}) {
  if (entry.started_at === null) return <span className="text-muted">—</span>;

  const ms = elapsedBetween(entry.started_at, entry.completed_at ?? nowIso);
  if (ms === null) return <span className="text-muted">—</span>;

  return <span className="tabular-nums">{formatDuration(ms)}</span>;
}

function EntryRow({
  campaignId,
  ordinal,
  entry,
  nowIso,
}: {
  campaignId: string;
  ordinal: number;
  entry: RoundEntry;
  nowIso: string;
}) {
  return (
    <tr className="border-t border-border/80">
      <td className="whitespace-nowrap px-4 py-3.5 font-mono text-body sm:px-5">
        {entry.patch_hash === null ? (
          <span className="text-foreground">
            {entry.role.replaceAll("_", " ")}
          </span>
        ) : (
          <Link
            href={submissionHref(campaignId, entry.patch_hash)}
            className="text-foreground underline decoration-border underline-offset-4 transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {entry.role.replaceAll("_", " ")}
          </Link>
        )}
      </td>
      <td className="whitespace-nowrap px-3 py-3.5 font-mono text-body text-secondary">
        {/* The baseline is the campaign's own image, so it has no miner. */}
        {entry.hotkey === null ? (
          <span className="text-muted">—</span>
        ) : (
          <CopyableMono
            value={entry.hotkey}
            display={truncateMiddle(entry.hotkey, 6, 4)}
          />
        )}
      </td>
      <td className="px-3 py-3.5">
        {entry.patch_hash === null ? (
          <span className="font-mono text-body text-muted">—</span>
        ) : (
          <span className="flex items-center gap-2">
            <Link
              href={submissionHref(campaignId, entry.patch_hash)}
              className="font-mono text-body text-secondary underline decoration-border underline-offset-4 transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {truncateDigest(entry.patch_hash, 7, 5)}
            </Link>
            <CopyableMono value={entry.patch_hash} iconOnly />
          </span>
        )}
      </td>
      <td className="px-3 py-3.5">
        <span className="flex w-72 max-w-72 items-center gap-2">
          <span className="shrink-0">
            <EntryStatusChip status={entry.status} />
          </span>
          {entry.disqualify_reason ? (
            <span
              className="min-w-0 truncate font-mono text-caption text-muted"
              title={entry.disqualify_reason}
            >
              {entry.disqualify_reason.replaceAll("_", " ")}
            </span>
          ) : null}
        </span>
      </td>
      <td className="whitespace-nowrap px-3 py-3.5 font-mono text-body text-secondary">
        {/* The score is the claim, so it is also the link to the arithmetic
            behind it. A row that never scored links from the same cell: its
            reason and correctness grades are what its miner came to read. */}
        <Link
          href={roundEntryReportHref(campaignId, ordinal, entry.id)}
          aria-label={`Score breakdown for ${entry.role.replaceAll("_", " ")}`}
          className="underline decoration-border underline-offset-4 transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {/* Null is "no score", never zero: 0.0 means the image matched
              baseline speed, which is a real result. */}
          {entry.score === null ? (
            <span className="text-muted">—</span>
          ) : (
            <span className="tabular-nums">{formatScore(entry.score)}</span>
          )}
        </Link>
      </td>
      <td className="whitespace-nowrap px-3 py-3.5 font-mono text-body text-secondary">
        <EntryDuration entry={entry} nowIso={nowIso} />
      </td>
    </tr>
  );
}

/**
 * Every image the round ran, baseline first as the API returns them.
 *
 * Not sorted by score: the order is the order they were seated, and the
 * baseline row is the reference the rest are read against.
 */
export function RoundEntries({
  campaignId,
  ordinal,
  entries,
  nowIso,
}: {
  campaignId: string;
  ordinal: number;
  entries: readonly RoundEntry[];
  nowIso: string;
}) {
  return (
    <section aria-label="Round entries" className="border border-border">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3.5 sm:px-5">
        <div className="flex items-center gap-2">
          <FlaskConical className="size-3.5 shrink-0 text-muted" aria-hidden />
          <h2 className="font-mono text-caption uppercase tracking-caps text-muted">
            Entries
          </h2>
        </div>
        <p className="font-mono text-body text-muted">{entries.length}</p>
      </div>

      {entries.length === 0 ? (
        <p className="px-4 py-8 text-center font-mono text-body text-muted sm:px-5">
          No images seated yet.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left">
            <thead>
              <tr className="whitespace-nowrap border-b border-border font-mono text-caption uppercase tracking-caps text-muted">
                <th className="px-4 py-2.5 font-normal sm:px-5">Role</th>
                <th className="px-3 py-2.5 font-normal">Miner</th>
                <th className="px-3 py-2.5 font-normal">Patch</th>
                <th className="px-3 py-2.5 font-normal">Status</th>
                <th className="px-3 py-2.5 font-normal">Score</th>
                <th className="px-3 py-2.5 font-normal">Duration</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <EntryRow
                  key={entry.id}
                  campaignId={campaignId}
                  ordinal={ordinal}
                  entry={entry}
                  nowIso={nowIso}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
