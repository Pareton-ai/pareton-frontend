"use client";

import { useRouter } from "next/navigation";
import type { KeyboardEvent } from "react";
import { CopyableMono } from "@/components/dashboard/copyable-mono";
import {
  BenchVerdictChip,
  PipelineChip,
} from "@/components/dashboard/status-chip";
import { formatUtc, truncateHash, truncateMiddle } from "@/lib/api/format";
import type { SubmissionRow as SubmissionRowData } from "@/lib/api/types";

export function SubmissionRow({
  href,
  row,
}: {
  href: string;
  row: SubmissionRowData;
}) {
  const router = useRouter();

  function open() {
    router.push(href);
  }

  function onKeyDown(event: KeyboardEvent<HTMLTableRowElement>) {
    if (event.key !== "Enter" && event.key !== " ") return;
    if (event.target !== event.currentTarget) return;
    event.preventDefault();
    open();
  }

  return (
    <tr
      role="link"
      tabIndex={0}
      onClick={open}
      onKeyDown={onKeyDown}
      className="group cursor-pointer border-t border-border/80 transition-colors hover:bg-accent-dim/30 focus-visible:bg-accent-dim/30 focus-visible:outline-none"
    >
      <td className="px-5 py-3.5 font-mono text-body-sm text-secondary sm:px-6">
        {truncateMiddle(row.hotkey, 8, 6)}
      </td>
      <td className="px-3 py-3.5">
        <CopyableMono
          value={row.patch_hash}
          display={truncateHash(row.patch_hash)}
          className="group-hover:text-foreground"
        />
      </td>
      <td className="px-3 py-3.5 font-mono text-body-sm text-secondary">
        {formatUtc(row.committed_at)}
      </td>
      <td className="px-3 py-3.5">
        <PipelineChip state={row.latest_state} />
      </td>
      <td className="px-3 py-3.5">
        <BenchVerdictChip verdict={row.bench_verdict} />
      </td>
      <td
        aria-hidden
        className="px-5 py-3.5 text-right font-mono text-body-sm text-muted opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 sm:px-6"
      >
        →
      </td>
    </tr>
  );
}
