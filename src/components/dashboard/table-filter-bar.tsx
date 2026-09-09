import Link from "next/link";

/**
 * Segmented link group for a table control.
 *
 * Links rather than a select or client state, matching the tab strip: each
 * view is shareable, the back button steps through it, and the server renders
 * only the page it is about to show. No JavaScript is needed to change one.
 */
export type FilterOption = {
  value: string;
  label: string;
  href: string;
  /** Row count for this option, when the set is known. */
  count?: number;
};

export function FilterGroup({
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
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <span className="font-mono text-caption uppercase tracking-caps text-muted">
        {label}
      </span>
      {/* gap-px over a border background draws the hairlines between chips. */}
      <div className="flex flex-wrap gap-px bg-border">
        {options.map((option) => {
          const isActive = option.value === active;
          return (
            <Link
              key={option.value}
              href={option.href}
              aria-current={isActive ? "true" : undefined}
              scroll={false}
              className={`inline-flex min-h-8 items-center gap-1.5 px-2.5 font-mono text-caption uppercase tracking-caps transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent ${
                isActive
                  ? "bg-accent-dim text-foreground"
                  : "bg-background text-muted hover:bg-border/20 hover:text-foreground"
              }`}
            >
              {option.label}
              {option.count != null ? (
                <span
                  className={`font-serif text-body leading-none italic ${
                    isActive ? "text-secondary" : "text-muted"
                  }`}
                >
                  {option.count.toLocaleString("en-US")}
                </span>
              ) : null}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

/** Bar that holds a table's filter and sort groups above its rows. */
export function TableFilterBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-border px-4 py-3 sm:px-5">
      {children}
    </div>
  );
}
