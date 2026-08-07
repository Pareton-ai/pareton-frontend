"use client";

import { useState } from "react";

type CopyableMonoProps = {
  value: string;
  display?: string;
  className?: string;
};

export function CopyableMono({
  value,
  display,
  className = "",
}: CopyableMonoProps) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      // Clipboard can fail in insecure contexts; leave the visible value alone.
    }
  }

  return (
    <button
      type="button"
      onClick={onCopy}
      title={copied ? "Copied" : `Copy ${value}`}
      className={`group inline-flex max-w-full items-center gap-2 font-mono text-body-sm tracking-tight text-secondary transition-colors hover:text-foreground ${className}`}
    >
      <span className="truncate">{display ?? value}</span>
      <span className="shrink-0 text-caption uppercase tracking-caps text-muted opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
        {copied ? "copied" : "copy"}
      </span>
    </button>
  );
}
