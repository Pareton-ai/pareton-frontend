import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

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

/** Prev/next row for a paged dashboard table. Hidden when there is one page. */
export function TablePageControls({
  page,
  totalPages,
  pageHref,
  label,
}: {
  page: number;
  totalPages: number;
  pageHref: (page: number) => string;
  label: string;
}) {
  if (totalPages <= 1) return null;

  return (
    <nav
      aria-label={label}
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
          href={page > 1 ? pageHref(page - 1) : null}
          direction="prev"
        >
          Prev
        </PageControl>
        <PageControl
          href={page < totalPages ? pageHref(page + 1) : null}
          direction="next"
        >
          Next
        </PageControl>
      </div>
    </nav>
  );
}
