import { ArrowDownWideNarrow, ArrowUpNarrowWide } from "lucide-react";
import Link from "next/link";

/**
 * Table controls as links rather than a select or client state, matching the
 * tab strip: each view is shareable, the back button steps through it, and the
 * server renders only what it is about to show.
 */
export type FilterOption = {
  value: string;
  label: string;
  href: string;
  /** Row count for this option, when the set is known. */
  count?: number;
};

/**
 * One-of-N filter, styled as quiet text with only the active option marked.
 *
 * Bordering every option would put more ink on the controls than on the rows
 * they filter, and with seven outcomes it reads as a second tab strip. Chips
 * are also laid out with a plain gap rather than hairlines over a background,
 * so a wrapped row leaves no filler behind the short line.
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
    <div className="flex min-w-0 flex-wrap items-center gap-x-1 gap-y-1">
      <span className="mr-1 shrink-0 font-mono text-caption uppercase tracking-caps text-muted/70">
        {label}
      </span>
      {options.map((option) => {
        const isActive = option.value === active;
        return (
          <Link
            key={option.value}
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
            {option.count != null ? (
              <span
                className={`font-serif text-body leading-none italic ${
                  isActive ? "text-secondary" : "text-muted/70"
                }`}
              >
                {option.count.toLocaleString("en-US")}
              </span>
            ) : null}
          </Link>
        );
      })}
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
      {label}
    </Link>
  );
}

/** One bar above a table: filters on the left, sort and page size trailing. */
export function TableFilterBar({
  children,
  trailing,
}: {
  children: React.ReactNode;
  trailing?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-border px-4 py-2.5 sm:px-5">
      {children}
      {trailing ? (
        /* ml-auto rather than relying on justify-between: once the filters
           fill the row the trailing group wraps, and without it that group
           would restart at the left edge under them. */
        <div className="ml-auto flex flex-wrap items-center gap-x-4 gap-y-2">
          {trailing}
        </div>
      ) : null}
    </div>
  );
}
