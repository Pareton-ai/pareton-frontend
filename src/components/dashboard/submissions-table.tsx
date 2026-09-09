import { Layers } from "lucide-react";
import { SubmissionRow } from "@/components/dashboard/submission-row";
import {
  FilterChips,
  SortToggle,
  TableFilterBar,
  type FilterOption,
} from "@/components/dashboard/table-filter-bar";
import { TablePageControls } from "@/components/dashboard/table-page-controls";
import { EmptyState } from "@/components/ui/empty-state";
import { submissionHref } from "@/lib/routes";
import {
  ALL_OUTCOMES,
  PAGE_SIZES,
  type PageSize,
  type SubmissionSort,
  type SubmissionsView,
} from "@/lib/api/submissions-view";
import { getSubmissionStateMeta, type CampaignStatus } from "@/lib/api/types";

export const PAGE_SIZE = 10;

const SORT_LABELS: Record<SubmissionSort, string> = {
  newest: "Newest",
  oldest: "Oldest",
};

/** The order a click would switch to, which is the other one. */
const NEXT_SORT: Record<SubmissionSort, SubmissionSort> = {
  newest: "oldest",
  oldest: "newest",
};

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
 * Outcome is the latest pipeline state. Score lives on the round page (same
 * prompt set) and the submission page (one entry). A column here would rank
 * numbers from different rounds.
 */
export function SubmissionsTable({
  campaignId,
  view,
  sort,
  size,
  outcome,
  pageHref,
  sortHref,
  sizeHref,
  outcomeHref,
}: {
  campaignId: string;
  view: SubmissionsView;
  sort: SubmissionSort;
  size: PageSize;
  outcome: string;
  pageHref: (page: number) => string;
  sortHref: (sort: SubmissionSort) => string;
  sizeHref: (size: PageSize) => string;
  outcomeHref: (outcome: string) => string;
}) {
  const showingFrom = view.total === 0 ? 0 : view.offset + 1;
  const showingTo = Math.min(view.offset + view.rows.length, view.total);

  const sizeOptions: FilterOption[] = PAGE_SIZES.map((value) => ({
    value: String(value),
    label: String(value),
    href: sizeHref(value),
  }));
  // Only outcomes the campaign actually produced, so the bar never offers a
  // filter that leads to an empty table.
  const outcomeOptions: FilterOption[] = [
    {
      value: ALL_OUTCOMES,
      label: "All",
      href: outcomeHref(ALL_OUTCOMES),
      count: view.outcomes.reduce((sum, entry) => sum + entry.count, 0),
    },
    ...view.outcomes.map((entry) => ({
      value: entry.value,
      label: getSubmissionStateMeta(entry.value).label,
      href: outcomeHref(entry.value),
      count: entry.count,
    })),
  ];

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
          {showingFrom}–{showingTo} of {view.total}
        </p>
      </div>

      <TableFilterBar
        trailing={
          <SortToggle
            href={sortHref(NEXT_SORT[sort])}
            label={SORT_LABELS[sort]}
            descending={sort === "newest"}
            title={`Sort by ${SORT_LABELS[NEXT_SORT[sort]].toLowerCase()} first`}
          />
        }
      >
        <FilterChips
          label="Outcome"
          options={outcomeOptions}
          active={outcome}
        />
      </TableFilterBar>

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
              <th className="px-3 py-2.5 font-normal">Outcome</th>
              <th className="w-8 px-2 py-2.5 font-normal">
                <span className="sr-only">Open</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {/* The chips only offer outcomes the campaign produced, so this is
                reachable by a hand-typed filter rather than by clicking. */}
            {view.rows.length === 0 ? (
              <tr className="border-t border-border/80">
                <td
                  colSpan={5}
                  className="px-4 py-10 text-center font-mono text-body text-muted sm:px-5"
                >
                  No submission matches this outcome.
                </td>
              </tr>
            ) : (
              view.rows.map((row) => (
                <SubmissionRow
                  key={row.patch_hash}
                  href={submissionHref(campaignId, row.patch_hash)}
                  row={row}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      <TablePageControls
        page={view.page}
        totalPages={view.totalPages}
        pageHref={pageHref}
        label="Submissions pages"
        leading={
          <FilterChips
            label="Per page"
            options={sizeOptions}
            active={String(size)}
          />
        }
      />
    </section>
  );
}
