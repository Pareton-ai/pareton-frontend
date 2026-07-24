"use client";

import { useEffect, useState } from "react";
import { formatDurationRemaining } from "@/lib/api/format";

type CountdownProps = {
  closesAt: string;
  className?: string;
};

export function Countdown({ closesAt, className = "" }: CountdownProps) {
  const [label, setLabel] = useState(() => formatDurationRemaining(closesAt));

  useEffect(() => {
    const tick = () => setLabel(formatDurationRemaining(closesAt));
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, [closesAt]);

  return (
    <span className={`font-mono text-[13px] tracking-[0.04em] ${className}`}>
      {label}
    </span>
  );
}
