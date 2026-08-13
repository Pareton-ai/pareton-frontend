import type { ComponentType, ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Any icon that takes a className, so brand marks sit beside Lucide glyphs. */
export type DashboardIcon = ComponentType<{ className?: string }>;

/**
 * Bordered panel with a mono caps header.
 *
 * `bodyClassName` switches between the stacked form and the wide hairline grid
 * used for the reference band, where the 1px gap over a border background draws
 * the rules between cells.
 */
export function Panel({
  icon: Icon,
  title,
  meta,
  bodyClassName = "divide-y divide-border",
  children,
}: {
  icon: DashboardIcon;
  title: string;
  /** Count or hint pinned to the right of the header rule. */
  meta?: ReactNode;
  bodyClassName?: string;
  children: ReactNode;
}) {
  return (
    <section aria-label={title} className="border border-border">
      <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Icon className="size-3.5 shrink-0 text-muted" aria-hidden />
          <h2 className="font-mono text-caption uppercase tracking-caps text-muted">
            {title}
          </h2>
        </div>
        {meta ? (
          <p className="font-mono text-body-sm text-muted">{meta}</p>
        ) : null}
      </header>
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

/** Row of stat tiles separated by hairlines; `className` sets the columns. */
export function StatStrip({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-label={label}
      className={cn("grid gap-px border border-border bg-border", className)}
    >
      {children}
    </section>
  );
}

export function StatTile({
  icon: Icon,
  label,
  value,
  hint,
  children,
}: {
  icon: DashboardIcon;
  label: string;
  value: ReactNode;
  hint?: string;
  children?: ReactNode;
}) {
  return (
    <div className="bg-background px-5 py-4">
      <div className="flex items-center gap-2">
        <Icon className="size-3.5 shrink-0 text-muted" aria-hidden />
        <p className="font-mono text-caption uppercase tracking-caps text-muted">
          {label}
        </p>
      </div>
      <p className="mt-3 font-mono text-title text-foreground">{value}</p>
      {children}
      {hint ? (
        <p className="mt-2 font-mono text-body-sm text-muted">{hint}</p>
      ) : null}
    </div>
  );
}
