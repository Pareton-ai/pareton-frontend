"use client";

export default function DashboardError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="border border-border px-6 py-14 text-center">
      <p className="font-mono text-[12px] uppercase tracking-[0.16em] text-rust">
        Dashboard error
      </p>
      <p className="mx-auto mt-4 max-w-md text-[14px] leading-[1.7] text-secondary">
        Something went wrong loading this page. Individual sections usually
        degrade on their own — try again if the problem persists.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-8 font-mono text-[12px] uppercase tracking-[0.14em] text-accent transition-colors hover:text-foreground"
      >
        Retry
      </button>
    </div>
  );
}
