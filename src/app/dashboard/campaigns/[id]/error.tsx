"use client";

import Link from "next/link";

export default function CampaignError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="border border-border px-6 py-14 text-center">
      <p className="font-mono text-[12px] uppercase tracking-[0.16em] text-rust">
        Campaign error
      </p>
      <p className="mx-auto mt-4 max-w-md text-[14px] leading-[1.7] text-secondary">
        This campaign could not be loaded. It may be missing, or the API may be
        temporarily unavailable.
      </p>
      <div className="mt-8 flex items-center justify-center gap-6">
        <button
          type="button"
          onClick={reset}
          className="font-mono text-[12px] uppercase tracking-[0.14em] text-accent transition-colors hover:text-foreground"
        >
          Retry
        </button>
        <Link
          href="/dashboard"
          className="font-mono text-[12px] uppercase tracking-[0.14em] text-muted transition-colors hover:text-foreground"
        >
          All campaigns
        </Link>
      </div>
    </div>
  );
}
