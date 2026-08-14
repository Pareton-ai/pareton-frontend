"use client";

import { Check, Copy } from "lucide-react";
import { useState, type MouseEvent } from "react";
import { cn } from "@/lib/cn";

type CopyableMonoProps = {
  value: string;
  display?: string;
  className?: string;
  iconOnly?: boolean;
};

export function CopyableMono({
  value,
  display,
  className = "",
  iconOnly = false,
}: CopyableMonoProps) {
  const [copied, setCopied] = useState(false);

  async function onCopy(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {}
  }

  const label = copied ? "Copied" : `Copy ${value}`;

  return (
    <button
      type="button"
      onClick={onCopy}
      title={label}
      aria-label={label}
      className={cn(
        iconOnly ? "inline-flex" : "group inline-flex",
        "max-w-full cursor-pointer items-center gap-2 font-mono text-body-sm tracking-tight text-secondary transition-colors hover:text-foreground",
        className
      )}
    >
      {iconOnly ? null : <span className="truncate">{display ?? value}</span>}
      <span
        className={`cursor-pointer inline-flex shrink-0 text-muted transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 ${
          copied ? "opacity-100" : "opacity-0"
        }`}
      >
        {copied ? (
          <Check className="size-3.5" aria-hidden />
        ) : (
          <Copy className="size-3.5" aria-hidden />
        )}
      </span>
    </button>
  );
}
