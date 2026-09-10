/**
 * Sorting, filtering and paging for the submissions table.
 *
 * The API pages with `limit` and `offset` and nothing else: no sort, no
 * status filter. Sorting one page at a time would reorder the rows you happen
 * to be looking at and call it a ranking, so the page fetches the campaign's
 * submissions in full and this module does the work over the whole set.
 *
 * Pure (no server-only / I/O) so tests can call it.
 */

import type { SubmissionRow } from "@/lib/api/types";

export const SUBMISSION_SORTS = ["newest", "oldest"] as const;
export type SubmissionSort = (typeof SUBMISSION_SORTS)[number];
export const DEFAULT_SUBMISSION_SORT: SubmissionSort = "newest";

export const PAGE_SIZES = [10, 25, 50] as const;
export type PageSize = (typeof PAGE_SIZES)[number];
export const DEFAULT_PAGE_SIZE: PageSize = 10;

/** `all` is the absence of a filter, not a state a submission can be in. */
export const ALL_OUTCOMES = "all";

/** Longer than any hotkey or patch hash; anything past this is not a search. */
const MAX_QUERY = 128;

export type SubmissionsView = {
  /** True when a filter or search is narrowing the list. */
  filtered: boolean;
  /** The rows for the requested page, already filtered and sorted. */
  rows: SubmissionRow[];
  /** Rows matching the filter, which is what the pager counts. */
  total: number;
  totalPages: number;
  /** Clamped: a filter that shrinks the list must not strand you on page 9. */
  page: number;
  offset: number;
  /** Every outcome present in the unfiltered set, with its row count. */
  outcomes: { value: string; count: number }[];
};

export function parseSubmissionSort(value: string | undefined): SubmissionSort {
  return (
    SUBMISSION_SORTS.find((sort) => sort === value) ?? DEFAULT_SUBMISSION_SORT
  );
}

export function parsePageSize(value: string | undefined): PageSize {
  const parsed = Number(value);
  return PAGE_SIZES.find((size) => size === parsed) ?? DEFAULT_PAGE_SIZE;
}

/**
 * Read an outcome filter.
 *
 * Any state the API can return is accepted rather than checked against a fixed
 * list: `latest_state` is unconstrained text on the backend, and a value that
 * matches nothing shows an empty table, which is the honest answer.
 */
export function parseOutcome(value: string | undefined): string {
  return value && value !== ALL_OUTCOMES ? value : ALL_OUTCOMES;
}

/** Read a search box value. Trimmed and bounded; empty means no search. */
export function parseSearch(value: string | undefined): string {
  return (value ?? "").trim().slice(0, MAX_QUERY);
}

/**
 * Does this row answer the search?
 *
 * Hotkey and patch hash both match, because a miner arrives holding one or the
 * other: their own key when scanning for their runs, a hash when chasing one
 * submission someone quoted. Matching is case-insensitive and anywhere in the
 * string, so a pasted hash finds its row with or without the `sha256:` prefix
 * and a partial key still narrows.
 */
function matchesSearch(row: SubmissionRow, needle: string): boolean {
  return (
    row.hotkey.toLowerCase().includes(needle) ||
    row.patch_hash.toLowerCase().includes(needle)
  );
}

/** Newest first by commit time, with the chain block breaking ties. */
function byCommittedAt(a: SubmissionRow, b: SubmissionRow): number {
  const at = Date.parse(a.committed_at);
  const bt = Date.parse(b.committed_at);
  // An unparseable timestamp sorts last rather than poisoning the comparison.
  if (Number.isNaN(at) && Number.isNaN(bt)) return 0;
  if (Number.isNaN(at)) return 1;
  if (Number.isNaN(bt)) return -1;
  if (at !== bt) return bt - at;
  return a.patch_hash.localeCompare(b.patch_hash);
}

function countOutcomes(rows: readonly SubmissionRow[]) {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const state = row.latest_state;
    if (typeof state !== "string" || state === "") continue;
    counts.set(state, (counts.get(state) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
}

export function buildSubmissionsView(
  all: readonly SubmissionRow[],
  query: {
    page: number;
    size: PageSize;
    sort: SubmissionSort;
    outcome: string;
    search?: string;
  }
): SubmissionsView {
  const outcomes = countOutcomes(all);
  const needle = (query.search ?? "").trim().toLowerCase();

  let rows =
    query.outcome === ALL_OUTCOMES
      ? [...all]
      : all.filter((row) => row.latest_state === query.outcome);
  if (needle) rows = rows.filter((row) => matchesSearch(row, needle));
  const filtered = rows;

  // One comparator, reversed for "oldest": two sorts would be two chances to
  // disagree about how ties break.
  filtered.sort(byCommittedAt);
  if (query.sort === "oldest") filtered.reverse();

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / query.size));
  const page = Math.min(Math.max(1, query.page), totalPages);
  const offset = (page - 1) * query.size;

  return {
    rows: filtered.slice(offset, offset + query.size),
    filtered: query.outcome !== ALL_OUTCOMES || needle.length > 0,
    total,
    totalPages,
    page,
    offset,
    outcomes,
  };
}
