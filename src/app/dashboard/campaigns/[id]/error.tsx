"use client";

import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { monoLinkClassName } from "@/components/ui/mono-link";

export default function CampaignError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <EmptyState
      title="Campaign error"
      tone="rust"
      message="This campaign could not be loaded. It may be missing, or the API may be temporarily unavailable."
    >
      <button
        type="button"
        onClick={reset}
        className={monoLinkClassName({
          size: "sm",
          tone: "accent",
        })}
      >
        Retry
      </button>
      <Link
        href="/dashboard"
        className={monoLinkClassName({
          size: "sm",
          tone: "muted",
        })}
      >
        All campaigns
      </Link>
    </EmptyState>
  );
}
