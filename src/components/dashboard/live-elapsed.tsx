"use client";

import { useEffect, useState } from "react";
import { formatDuration } from "@/lib/api/format";

/**
 * Ticking "time since" for a submission still moving through the pipeline.
 *
 * Renders the server-known span first so the markup hydrates identically, then
 * starts counting from the client clock.
 */
export function LiveElapsed({
  since,
  initialMs,
  className = "",
}: {
  since: string;
  initialMs: number;
  className?: string;
}) {
  const [ms, setMs] = useState(initialMs);

  useEffect(() => {
    const start = new Date(since).getTime();
    if (Number.isNaN(start)) return;

    const tick = () => setMs(Date.now() - start);
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [since]);

  return (
    <span className={className} suppressHydrationWarning>
      {formatDuration(ms)}
    </span>
  );
}
