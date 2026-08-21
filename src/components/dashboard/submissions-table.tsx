import { Layers } from "lucide-react";
import { SubmissionRow } from "@/components/dashboard/submission-row";
import { TablePageControls } from "@/components/dashboard/table-page-controls";
import { EmptyState } from "@/components/ui/empty-state";
import { submissionHref } from "@/lib/routes";
import type { CampaignStatus, SubmissionsPage } from "@/lib/api/types";

export const PAGE_SIZE = 10;

export function EmptySubmissions({ status }: { status: CampaignStatus }) {
  const copy =
    status === "open"
      ? {
          title: "Awaiting first submission",
          body: "This campaign is open. Miner patches will appear here as they move through commit → verify → build → round.",
        }
      : status === "draft"
        ? {
            title: "No submissions yet",
            body: "This campaign has not opened. Submissions will appear here once it does.",
          }
        : {
            title: "No submissions",
            body: "This campaign closed without recorded submissions.",
          };

  return <EmptyState tone="accent" title={copy.title} message={copy.body} />;
}

/**
 * Submission list for one campaign page.
 *
 * Outcome and round only. No score column: scores are per-round and sorting
 * them here would invite a cross-round comparison (PAR-87 option 2).
 */
export function SubmissionsTable({
  campaignId,
  page,
  data,
  pageHref,
}: {
  campaignId: string;
  page: number;
  data: SubmissionsPage;
  pageHref: (page: number) => string;
}) {
  const totalPages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));
  const showingFrom = data.offset + 1;
  const showingTo = Math.min(data.offset + data.submissions.length, data.total);

  return (
    <section aria-label="Submissions" className="border border-border">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3.5 sm:px-5">
        <div className="flex items-center gap-2">
          <Layers className="size-3.5 shrink-0 text-muted" aria-hidden />
          <h2 className="font-mono text-caption uppercase tracking-caps text-muted">
            Submissions
          </h2>
        </div>
        <p className="font-mono text-body text-muted">
          {showingFrom}–{showingTo} of {data.total}
        </p>
      </div>

      {/* contain-paint keeps transformed row overlays from expanding the page;
          the min-width table still scrolls inside this pane. */}
      <div className="overflow-x-auto contain-paint">
        <table className="w-full min-w-[560px] text-left">
          <thead>
            <tr className="whitespace-nowrap border-b border-border font-mono text-caption uppercase tracking-caps text-muted">
              <th className="px-4 py-2.5 font-normal sm:px-5">Miner</th>
              <th className="px-3 py-2.5 font-normal">Patch</th>
              {/* Zone omitted to keep the column narrow; each cell carries the
                  full UTC timestamp as a tooltip. */}
              <th className="px-3 py-2.5 font-normal">Submitted</th>
              <th className="px-3 py-2.5 font-normal">Round</th>
              <th className="px-3 py-2.5 font-normal">Outcome</th>
              <th className="w-8 px-2 py-2.5 font-normal">
                <span className="sr-only">Open</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {data.submissions.map((row) => (
              <SubmissionRow
                key={row.patch_hash}
                href={submissionHref(campaignId, row.patch_hash)}
                row={row}
              />
            ))}
          </tbody>
        </table>
      </div>

      <TablePageControls
        page={page}
        totalPages={totalPages}
        pageHref={pageHref}
        label="Submissions pages"
      />
    </section>
  );
}
