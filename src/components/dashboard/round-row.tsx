import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { CopyableMono } from "@/components/dashboard/copyable-mono";
import { shortSku } from "@/components/dashboard/gpu";
import { RoundStatusChip } from "@/components/dashboard/status-chip";
import {
  elapsedBetween,
  formatDuration,
  truncateMiddle,
} from "@/lib/api/format";
import type { Round } from "@/lib/api/types";

function leaderChangedLabel(value: boolean | null): string {
  if (value == null) return "—";
  return value ? "yes" : "no";
}

function durationLabel(row: Round, nowIso: string): string {
  const end = row.completed_at ?? nowIso;
  const ms = elapsedBetween(row.created_at, end);
  if (ms == null) return "—";
  return formatDuration(ms);
}

export function RoundRow({
  href,
  row,
  nowIso,
}: {
  href: string;
  row: Round;
  nowIso: string;
}) {
  return (
    // Safari ignores `position: relative` on a <tr> (WebKit 240961, fixed only
    // in 2026), so the stretched link would escape to the viewport. `transform`
    // makes the row a containing block and `clip-path` keeps the overlay inside
    // it; both are no-ops where `relative` already works.
    <tr className="group relative border-t border-border/80 transition-colors [clip-path:inset(0)] [transform:translate(0)] hover:bg-accent-dim/30 focus-within:bg-accent-dim/30">
      <td className="whitespace-nowrap px-4 py-3.5 font-mono text-body text-foreground sm:px-5">
        <Link
          href={href}
          className="outline-none after:absolute after:inset-0 focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-accent"
        >
          #{row.ordinal}
          <span className="sr-only"> round details</span>
        </Link>
      </td>
      <td className="whitespace-nowrap px-3 py-3.5 font-mono text-body tabular-nums text-secondary">
        {row.seed_block}
      </td>
      <td className="px-3 py-3.5">
        <CopyableMono
          value={row.seed_block_hash}
          display={truncateMiddle(row.seed_block_hash, 8, 6)}
          className="relative z-10 group-hover:text-foreground"
        />
      </td>
      <td className="whitespace-nowrap px-3 py-3.5 font-mono text-body text-secondary">
        {shortSku(row.gpu_sku)}
      </td>
      <td className="whitespace-nowrap px-3 py-3.5 font-mono text-body tabular-nums text-secondary">
        {row.entry_count}
      </td>
      <td className="whitespace-nowrap px-3 py-3.5 font-mono text-body text-secondary">
        {leaderChangedLabel(row.leader_changed)}
      </td>
      <td className="px-3 py-3.5">
        <span className="flex w-72 max-w-72 items-center gap-2">
          <span className="shrink-0">
            <RoundStatusChip status={row.status} />
          </span>
          {row.status === "void" && row.void_reason ? (
            <span
              className="min-w-0 truncate font-mono text-caption text-muted"
              title={row.void_reason}
            >
              {row.void_reason.replaceAll("_", " ")}
            </span>
          ) : null}
        </span>
      </td>
      <td className="whitespace-nowrap px-3 py-3.5 font-mono text-body tabular-nums text-secondary">
        {durationLabel(row, nowIso)}
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
