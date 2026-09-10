import { ArrowDownWideNarrow, ArrowUpNarrowWide } from "lucide-react";
import Link from "next/link";
import { TabScroller } from "@/components/dashboard/tab-scroller";

/**
 * Table controls as links rather than a select or client state, matching the
 * tab strip: each view is shareable, the back button steps through it, and the
 * server renders only what it is about to show.
 */
export type FilterOption = {
  value: string;
  label: string;
  href: string;
};

/**
 * One-of-N filter: a single scrolling row of icon chips.
 *
 * It scrolls rather than wraps for the reason the tab strip above it does.
 * Seven outcomes wrap to three lines on a phone, which turns a control into a
 * block of text taller than the rows it filters. Counts are left off: the
 * header already reports the filtered total, and repeating it seven times
 * competes with the labels.
 */
export function FilterChips({
  label,
  options,
  active,
}: {
  label: string;
  options: readonly FilterOption[];
  active: string;
}) {
  if (options.length < 2) return null;

  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      {/* The chips repeat the Outcome column's own words, so on a phone the
          label is the first thing that can go. */}
      <span className="hidden shrink-0 font-mono text-caption uppercase tracking-caps text-muted/70 sm:inline">
        {label}
      </span>
      <TabScroller
        activeKey={active}
        className="-mx-1 flex min-w-0 items-center gap-1 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {options.map((option) => {
          const isActive = option.value === active;
          return (
            <li key={option.value} className="shrink-0">
              <Link
                href={option.href}
                aria-current={isActive ? "true" : undefined}
                scroll={false}
                className={`inline-flex items-center gap-1.5 px-2 py-1 font-mono text-caption uppercase tracking-caps transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent ${
                  isActive
                    ? "bg-accent-dim text-foreground"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {option.label}
              </Link>
            </li>
          );
        })}
      </TabScroller>
    </div>
  );
}

/**
 * Two-way sort as a single control that shows the current order.
 *
 * A binary choice does not need two chips: one of them is always the state you
 * are already in, so the pair spends width telling you what you can see. This
 * names the order in force and flips it when clicked.
 */
export function SortToggle({
  href,
  label,
  descending,
  title,
}: {
  href: string;
  label: string;
  descending: boolean;
  title: string;
}) {
  const Icon = descending ? ArrowDownWideNarrow : ArrowUpNarrowWide;
  return (
    <Link
      href={href}
      title={title}
      scroll={false}
      className="inline-flex min-h-8 shrink-0 items-center gap-1.5 border border-border px-2.5 font-mono text-caption uppercase tracking-caps text-secondary transition-colors hover:border-border-strong hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      <Icon className="size-3.5 shrink-0 text-muted" aria-hidden />
      {/* The word is the state, not the action, so it is worth keeping on a
          phone; the arrow alone would not say which way the rows run. */}
      {label}
    </Link>
  );
}

/**
 * Toolbar above a table.
 *
 * Search grows and the pickers keep their width, so on a desktop the row reads
 * left to right in one line and on a phone the search takes the first line
 * with the pickers under it. Nothing scrolls sideways, which is what a row of
 * chips could not promise.
 */
export function TableFilterBar({
  children,
  trailing,
}: {
  children: React.ReactNode;
  trailing?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2.5 sm:gap-3 sm:px-5">
      {children}
      {trailing ? (
        <div className="flex shrink-0 items-center gap-2">{trailing}</div>
      ) : null}
    </div>
  );
}
