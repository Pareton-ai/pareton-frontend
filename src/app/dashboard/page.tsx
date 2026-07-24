import { Suspense } from "react";
import { CampaignList } from "@/components/dashboard/campaign-list";
import { StatsStrip } from "@/components/dashboard/stats-strip";

function PanelFallback({ label }: { label: string }) {
  return (
    <div
      className="h-40 animate-pulse border border-border bg-border/10"
      aria-label={`Loading ${label}`}
    />
  );
}

export default function DashboardPage() {
  return (
    <div className="space-y-10">
      <header>
        <p className="font-mono text-[13px] uppercase tracking-[0.18em] text-accent">
          Public dashboard
        </p>
        <h1 className="mt-4 text-[clamp(1.6rem,3vw,2.1rem)] font-medium tracking-[-0.03em] text-foreground">
          Campaigns
        </h1>
        <p className="mt-3 max-w-xl text-[14px] leading-[1.7] text-secondary">
          Open and closed optimization campaigns on SN10. Select a campaign for
          SLA gates, pinned model revision, and the submission pipeline.
        </p>
      </header>

      <Suspense fallback={<PanelFallback label="stats" />}>
        <StatsStrip />
      </Suspense>

      <Suspense fallback={<PanelFallback label="campaigns" />}>
        <CampaignList />
      </Suspense>
    </div>
  );
}
