"use client";

import { Check, Copy } from "lucide-react";
import { useState, type MouseEvent } from "react";
import { cn } from "@/lib/cn";

type CopyableMonoProps = {
  value: string;
  display?: string;
  /** When set, the text becomes an external link and only the icon copies. */
  href?: string;
  /** Hint shown in the hover tooltip; also labels the link for screen readers. */
  hint?: string;
  className?: string;
  iconOnly?: boolean;
};

export function CopyableMono({
  value,
  display,
  href,
  hint,
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

  const copyIcon = (
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
  );

  const shell = cn(
    "group inline-flex max-w-full items-center gap-2 font-mono text-body tracking-tight text-secondary transition-colors",
    className
  );

  if (href) {
    return (
      /* `title` would only surface after the browser's hover delay, so the hint
         is a real element that shows the moment the pointer lands. */
      <span className={cn(shell, "relative")}>
        {hint ? (
          <span
            role="tooltip"
            className="pointer-events-none absolute bottom-full left-0 z-20 mb-1.5 hidden whitespace-nowrap border border-border bg-background px-2 py-1 font-mono text-caption text-secondary group-hover:block group-focus-within:block"
          >
            {hint}
          </span>
        ) : null}
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          aria-label={hint ?? `Open ${value}`}
          className="truncate underline decoration-border underline-offset-4 transition-colors hover:text-foreground"
        >
          {display ?? value}
        </a>
        <button
          type="button"
          onClick={onCopy}
          aria-label={label}
          className="cursor-pointer inline-flex hover:text-foreground"
        >
          {copyIcon}
        </button>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={onCopy}
      title={label}
      aria-label={label}
      className={cn(
        iconOnly ? "inline-flex" : "group inline-flex",
        "max-w-full cursor-pointer items-center gap-2 font-mono text-body tracking-tight text-secondary transition-colors hover:text-foreground",
        className
      )}
    >
      {iconOnly ? null : <span className="truncate">{display ?? value}</span>}
      {copyIcon}
    </button>
  );
}
