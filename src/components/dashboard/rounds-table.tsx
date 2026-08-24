import { Repeat2 } from "lucide-react";
import { RoundRow } from "@/components/dashboard/round-row";
import { PAGE_SIZE } from "@/components/dashboard/submissions-table";
import { TablePageControls } from "@/components/dashboard/table-page-controls";
import { EmptyState } from "@/components/ui/empty-state";
import type { CampaignStatus, RoundsPage } from "@/lib/api/types";
import { roundHref } from "@/lib/routes";

export function EmptyRounds({ status }: { status: CampaignStatus }) {
  const copy =
    status === "open"
      ? {
          title: "Awaiting first round",
          body: "This campaign is open. Rounds appear here once the watcher seats a cohort.",
        }
      : status === "draft"
        ? {
            title: "No rounds yet",
            body: "This campaign has not opened. Rounds will appear here once it does.",
          }
        : {
            title: "No rounds",
            body: "This campaign closed without recorded rounds.",
          };

  return <EmptyState tone="accent" title={copy.title} message={copy.body} />;
}

/**
 * Round list for one campaign page.
 *
 * Presentational: the route loads the page of rows. Void rounds stay in the
 * list with their reason; ordinals are not compacted.
 */
export function RoundsTable({
  campaignId,
  page,
  data,
  pageHref,
}: {
  campaignId: string;
  page: number;
  data: RoundsPage;
  pageHref: (page: number) => string;
}) {
  const totalPages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));
  const showingFrom = data.offset + 1;
  const showingTo = Math.min(data.offset + data.rounds.length, data.total);
  const nowIso = new Date().toISOString();

  return (
    <section aria-label="Rounds" className="border border-border">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3.5 sm:px-5">
        <div className="flex items-center gap-2">
          <Repeat2 className="size-3.5 shrink-0 text-muted" aria-hidden />
          <h2 className="font-mono text-caption uppercase tracking-caps text-muted">
            Rounds
          </h2>
        </div>
        <p className="font-mono text-body text-muted">
          {showingFrom}–{showingTo} of {data.total}
        </p>
      </div>

      {/* contain-paint keeps transformed row overlays from expanding the page;
          the min-width table still scrolls inside this pane. */}
      <div className="overflow-x-auto contain-paint">
        <table className="w-full min-w-[800px] text-left">
          <thead>
            <tr className="whitespace-nowrap border-b border-border font-mono text-caption uppercase tracking-caps text-muted">
              <th className="px-4 py-2.5 font-normal sm:px-5">Round</th>
              <th className="px-3 py-2.5 font-normal">Seed block</th>
              <th className="px-3 py-2.5 font-normal">Seed hash</th>
              <th className="px-3 py-2.5 font-normal">GPU</th>
              <th className="px-3 py-2.5 font-normal">Entries</th>
              <th className="px-3 py-2.5 font-normal">Leader</th>
              <th className="px-3 py-2.5 font-normal">Status</th>
              <th className="px-3 py-2.5 font-normal">Duration</th>
              <th className="w-8 px-2 py-2.5 font-normal">
                <span className="sr-only">Open</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {data.rounds.map((row) => (
              <RoundRow
                key={row.id}
                href={roundHref(campaignId, row.ordinal)}
                row={row}
                nowIso={nowIso}
              />
            ))}
          </tbody>
        </table>
      </div>

      <TablePageControls
        page={page}
        totalPages={totalPages}
        pageHref={pageHref}
        label="Rounds pages"
      />
    </section>
  );
}
