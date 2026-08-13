import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type MeterTone = "accent" | "rust" | "neutral";

const fillClassName: Record<MeterTone, string> = {
  accent: "bg-accent",
  rust: "bg-rust",
  neutral: "bg-border-strong",
};

const valueClassName: Record<MeterTone, string> = {
  accent: "text-foreground",
  rust: "text-rust",
  neutral: "text-muted",
};

/**
 * Hairline bar for one value against its budget, where the full track is the
 * budget. Over-budget clamps to full and leans on tone plus the printed value,
 * since a bar that overflows its track reads as a rendering bug.
 */
export function Meter({
  fraction,
  tone = "accent",
  label,
  className,
}: {
  /** Share of the track to fill, clamped to 0…1. */
  fraction: number;
  tone?: MeterTone;
  label: string;
  className?: string;
}) {
  const percent = Number.isFinite(fraction)
    ? Math.max(0, Math.min(1, fraction)) * 100
    : 0;

  return (
    <div
      className={cn("h-1 w-full bg-border", className)}
      role="img"
      aria-label={label}
    >
      <div
        className={`h-full ${fillClassName[tone]}`}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

/** Labelled meter: caption and value on one line, bar beneath. */
export function MeterRow({
  label,
  value,
  fraction,
  tone = "accent",
  hint,
  title,
}: {
  label: string;
  value: ReactNode;
  fraction: number;
  tone?: MeterTone;
  hint?: string;
  title?: string;
}) {
  return (
    <div title={title}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-mono text-caption uppercase tracking-caps text-muted">
          {label}
        </span>
        <span className={`font-mono text-body-sm ${valueClassName[tone]}`}>
          {value}
        </span>
      </div>
      <Meter
        className="mt-1.5"
        fraction={fraction}
        tone={tone}
        label={`${label}: ${typeof value === "string" ? value : ""}`}
      />
      {hint ? (
        <p className="mt-1.5 font-mono text-caption text-muted">{hint}</p>
      ) : null}
    </div>
  );
}
