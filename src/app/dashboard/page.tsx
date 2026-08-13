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
        <h1 className="text-display-section font-medium leading-display tracking-tight text-foreground">
          Campaigns
        </h1>
        <p className="mt-2 font-mono text-body-sm text-secondary">
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
