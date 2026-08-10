import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type FieldProps = {
  label: string;
  children: ReactNode;
  className?: string;
};

/** Mono caps label over a value. The metadata unit on both detail pages. */
export function Field({ label, children, className }: FieldProps) {
  return (
    <div className={cn("px-5 py-5 sm:px-6", className)}>
      <p className="font-mono text-caption uppercase tracking-caps text-muted">
        {label}
      </p>
      <div className="mt-2 text-body-lg leading-relaxed text-foreground">
        {children}
      </div>
    </div>
  );
}

/**
 * Two-column field grid with hairline rules between cells.
 *
 * The gap trick draws the rules: the container background bleeds through a
 * 1px grid gap, so cells stay flush without per-cell border bookkeeping.
 */
export function FieldGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-px bg-border sm:grid-cols-2">{children}</div>;
}

/** Cell wrapper for `FieldGrid`, restoring the page background over the grid. */
export function FieldGridItem({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <Field label={label} className="bg-background">
      {children}
    </Field>
  );
}
