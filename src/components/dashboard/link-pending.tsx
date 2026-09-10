"use client";

import { useLinkStatus } from "next/link";
import { Loader2 } from "lucide-react";

/**
 * Pending spinner for the link that is currently navigating.
 *
 * A campaign tab is a real link, so the browser stays on the old panel until
 * the server responds. On a cold fetch that gap is a second or two with no
 * feedback, which reads as a dead click. `useLinkStatus` reports the pending
 * state of the enclosing `Link`, so this only works rendered inside one.
 */
function Spinner() {
  return (
    <Loader2
      role="status"
      aria-label="Loading"
      className="size-3.5 shrink-0 animate-spin text-accent"
    />
  );
}

/**
 * The tab's row count, swapped for a spinner while that tab is loading.
 *
 * One component rather than a spinner beside the count: showing both would
 * widen the tab mid-navigation and shift the whole strip sideways.
 */
export function LinkPendingCount({
  count,
  className,
}: {
  count: number | null | undefined;
  className?: string;
}) {
  const { pending } = useLinkStatus();

  if (pending) return <Spinner />;
  if (count == null) return null;

  return (
    <span className={`font-serif text-body leading-none italic ${className}`}>
      {count.toLocaleString("en-US")}
    </span>
  );
}

/** Standalone spinner for a link with no count of its own. */
export function LinkPending() {
  const { pending } = useLinkStatus();
  return pending ? <Spinner /> : null;
}
