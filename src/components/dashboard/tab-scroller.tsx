"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Horizontal scroller that keeps the current tab in view.
 *
 * On a narrow viewport the tab row scrolls, and the section you are on can
 * start off-screen, which leaves the strip looking like nothing is selected.
 * Only this element's own `scrollLeft` is touched, never the page's, so it
 * cannot steal the reading position.
 */
export function TabScroller({
  activeKey,
  className,
  children,
}: {
  /** Changing this re-centres the strip, e.g. after switching sections. */
  activeKey: string;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const current = node.querySelector('[aria-current="page"]');
    if (!(current instanceof HTMLElement)) return;
    // Already fully visible (the common desktop case): leave it alone.
    if (
      current.offsetLeft >= node.scrollLeft &&
      current.offsetLeft + current.offsetWidth <=
        node.scrollLeft + node.clientWidth
    ) {
      return;
    }
    node.scrollLeft = Math.max(
      0,
      current.offsetLeft - (node.clientWidth - current.offsetWidth) / 2
    );
  }, [activeKey]);

  return (
    <ul ref={ref} className={className}>
      {children}
    </ul>
  );
}
