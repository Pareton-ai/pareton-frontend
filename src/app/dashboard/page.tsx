import { Suspense } from "react";
import { CampaignList } from "@/components/dashboard/campaign-list";

function CampaignsFallback() {
  return (
    <div className="space-y-8" aria-label="Loading campaigns">
      <div className="h-64 animate-pulse border border-border bg-border/10" />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="display-serif text-display-section leading-display text-foreground">
          Campaigns
        </h1>
        <p className="mt-4 max-w-[46ch] text-body-lg leading-relaxed text-secondary">
          Public snapshot of open campaigns, hardware targets, and miner
          submissions.
        </p>
      </header>

      <Suspense fallback={<CampaignsFallback />}>
        <CampaignList />
      </Suspense>
    </div>
  );
}
