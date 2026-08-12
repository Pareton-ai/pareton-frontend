"use client";

import { useEffect, useState } from "react";
import { formatDurationRemaining } from "@/lib/api/format";
import { cn } from "@/lib/cn";

type CountdownProps = {
  closesAt: string;
  className?: string;
};

export function Countdown({ closesAt, className = "" }: CountdownProps) {
  const [label, setLabel] = useState(() => formatDurationRemaining(closesAt));

  useEffect(() => {
    const tick = () => setLabel(formatDurationRemaining(closesAt));
    tick();

    const end = new Date(closesAt).getTime();
    const msLeft = Number.isNaN(end) ? NaN : end - Date.now();

    // Coarse updates while far out; fire exactly at close so we don't show
    // stale "Xm" for up to 30s after closes_at.
    const intervalId = window.setInterval(tick, 30_000);
    let timeoutId: number | undefined;
    if (Number.isFinite(msLeft) && msLeft > 0) {
      timeoutId = window.setTimeout(tick, msLeft);
    }

    return () => {
      window.clearInterval(intervalId);
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    };
  }, [closesAt]);

  return (
    <span className={cn("font-mono text-body tracking-wider", className)}>
      {label}
    </span>
  );
}
