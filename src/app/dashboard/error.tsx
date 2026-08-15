"use client";

import { EmptyState } from "@/components/ui/empty-state";
import { monoLinkClassName } from "@/components/ui/mono-link";

export default function DashboardError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <EmptyState
      title="Dashboard error"
      tone="rust"
      message="Something went wrong loading this page. Individual sections usually degrade on their own — try again if the problem persists."
    >
      <button
        type="button"
        onClick={reset}
        className={monoLinkClassName({ tone: "accent" })}
      >
        Retry
      </button>
    </EmptyState>
  );
}
