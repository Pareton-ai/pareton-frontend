"use client";

import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { monoLinkClassName } from "@/components/ui/mono-link";

export default function RoundError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <EmptyState
      title="Round error"
      tone="rust"
      message="This round could not be loaded. It may be missing, or the API may be temporarily unavailable."
    >
      <button
        type="button"
        onClick={reset}
        className={monoLinkClassName({ tone: "accent" })}
      >
        Retry
      </button>
      <Link href="/dashboard" className={monoLinkClassName({ tone: "muted" })}>
        All campaigns
      </Link>
    </EmptyState>
  );
}
