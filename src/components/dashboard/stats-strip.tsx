import { getStats } from "@/lib/api/endpoints";
import { isUnavailable } from "@/lib/api/errors";
import { SectionUnavailable } from "@/components/dashboard/section-unavailable";
import type { StatsResponse } from "@/lib/api/types";

function StatCell({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="px-5 py-5 sm:px-6">
      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
        {label}
      </p>
      <p className="mt-2 font-mono text-[22px] tracking-[-0.03em] text-foreground">
        {value}
      </p>
    </div>
  );
}

function StatsStripView({ stats }: { stats: StatsResponse }) {
  return (
    <section
      aria-label="Network stats"
      className="grid grid-cols-2 border border-border sm:grid-cols-4"
    >
      <StatCell label="Campaigns" value={stats.campaigns.total} />
      <StatCell label="Open" value={stats.campaigns.by_status.open} />
      <StatCell label="Closed" value={stats.campaigns.by_status.closed} />
      <StatCell label="Submissions" value={stats.submissions.total} />
    </section>
  );
}

export async function StatsStrip() {
  let stats: StatsResponse | null = null;
  let error: unknown = null;
  try {
    stats = await getStats();
  } catch (err) {
    error = err;
  }

  if (error || !stats) {
    return (
      <SectionUnavailable
        message={
          isUnavailable(error)
            ? "Stats are temporarily unavailable (API/DB)."
            : "Could not load network stats."
        }
      />
    );
  }

  return <StatsStripView stats={stats} />;
}
