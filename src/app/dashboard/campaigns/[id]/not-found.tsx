import Link from "next/link";

export default function CampaignNotFound() {
  return (
    <div className="border border-border px-6 py-14 text-center">
      <p className="font-mono text-[12px] uppercase tracking-[0.16em] text-muted">
        Not found
      </p>
      <p className="mx-auto mt-4 max-w-md text-[14px] leading-[1.7] text-secondary">
        No campaign exists for this id.
      </p>
      <Link
        href="/dashboard"
        className="mt-8 inline-flex font-mono text-[12px] uppercase tracking-[0.14em] text-accent transition-colors hover:text-foreground"
      >
        ← Back to campaigns
      </Link>
    </div>
  );
}
