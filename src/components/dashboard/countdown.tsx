"use client";

import { useEffect, useState } from "react";
import { formatDurationRemaining } from "@/lib/api/format";
import { cn } from "@/lib/cn";

type CountdownProps = {
  /** ISO timestamp to count down to: a window close, or a window open. */
  targetAt: string;
  /** Stand-in once the target is in the past. */
  pastLabel?: string;
  className?: string;
};

function remainingLabel(targetAt: string, pastLabel: string): string {
  const target = new Date(targetAt).getTime();
  if (Number.isNaN(target)) return "—";
  if (target <= Date.now()) return pastLabel;
  return formatDurationRemaining(targetAt);
}

/** Live remaining time. The call site owns the type size. */
export function Countdown({
  targetAt,
  pastLabel = "Closed",
  className = "",
}: CountdownProps) {
  const [label, setLabel] = useState(() => remainingLabel(targetAt, pastLabel));

  useEffect(() => {
    const tick = () => setLabel(remainingLabel(targetAt, pastLabel));
    tick();

    const end = new Date(targetAt).getTime();
    const msLeft = Number.isNaN(end) ? NaN : end - Date.now();

    // Coarse updates while far out; fire exactly at the target so we don't show
    // stale "Xm" for up to 30s after it passes.
    const intervalId = window.setInterval(tick, 30_000);
    let timeoutId: number | undefined;
    if (Number.isFinite(msLeft) && msLeft > 0) {
      timeoutId = window.setTimeout(tick, msLeft);
    }

    return () => {
      window.clearInterval(intervalId);
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    };
  }, [targetAt, pastLabel]);

  return (
    <span className={cn("font-mono tracking-wider", className)}>{label}</span>
  );
}
