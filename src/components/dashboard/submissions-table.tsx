import { ChevronLeft, ChevronRight, Layers } from "lucide-react";
import Link from "next/link";
import { SubmissionRow } from "@/components/dashboard/submission-row";
import { EmptyState } from "@/components/ui/empty-state";
import { campaignHref, submissionHref } from "@/lib/routes";
import type { CampaignStatus, SubmissionsPage } from "@/lib/api/types";

export const PAGE_SIZE = 10;

export function EmptySubmissions({ status }: { status: CampaignStatus }) {
  const copy =
    status === "open"
      ? {
          title: "Awaiting first submission",
          body: "This campaign is open. Miner patches will appear here as they move through commit → verify → build → bench.",
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

function PageControl({
  href,
  direction,
  children,
}: {
  href: string | null;
  direction: "prev" | "next";
  children: string;
}) {
  const Icon = direction === "prev" ? ChevronLeft : ChevronRight;
  const className =
    "inline-flex min-h-9 min-w-20 items-center justify-center gap-1.5 border border-border px-3 font-mono text-body uppercase tracking-caps transition-colors";

  if (!href) {
    return (
      <span
        aria-disabled="true"
        className={`${className} cursor-not-allowed text-muted/50`}
      >
        {direction === "prev" ? <Icon className="size-4" aria-hidden /> : null}
        {children}
        {direction === "next" ? <Icon className="size-4" aria-hidden /> : null}
      </span>
    );
  }

  return (
    <Link
      href={href}
      className={`${className} text-muted hover:border-border-strong hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent`}
    >
      {direction === "prev" ? <Icon className="size-4" aria-hidden /> : null}
      {children}
      {direction === "next" ? <Icon className="size-4" aria-hidden /> : null}
    </Link>
  );
}

/**
 * Submission list for one campaign page.
 *
 * Presentational: the route loads the page of rows so the summary tiles and the
 * table agree on a single fetch.
 */
export function SubmissionsTable({
  campaignId,
  page,
  data,
}: {
  campaignId: string;
  page: number;
  data: SubmissionsPage;
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

      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left">
          <thead>
            <tr className="whitespace-nowrap border-b border-border font-mono text-caption uppercase tracking-caps text-muted">
              <th className="px-4 py-2.5 font-normal sm:px-5">Miner</th>
              <th className="px-3 py-2.5 font-normal">Patch</th>
              {/* Zone omitted to keep the column narrow; each cell carries the
                  full UTC timestamp as a tooltip. */}
              <th className="px-3 py-2.5 font-normal">Submitted</th>
              <th className="px-3 py-2.5 font-normal">Pipeline</th>
              <th className="px-3 py-2.5 font-normal">Verdict</th>
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

      {totalPages > 1 ? (
        <nav
          aria-label="Submissions pages"
          className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 sm:px-5"
        >
          <p className="font-mono text-body text-muted">
            Page{" "}
            <span className="text-foreground">
              {page} / {totalPages}
            </span>
          </p>
          <div className="flex items-center gap-2">
            <PageControl
              href={
                page > 1 ? `${campaignHref(campaignId)}?page=${page - 1}` : null
              }
              direction="prev"
            >
              Prev
            </PageControl>
            <PageControl
              href={
                page < totalPages
                  ? `${campaignHref(campaignId)}?page=${page + 1}`
                  : null
              }
              direction="next"
            >
              Next
            </PageControl>
          </div>
        </nav>
      ) : null}
    </section>
  );
}
