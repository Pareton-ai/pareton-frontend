import { Suspense } from "react";
import { CampaignList } from "@/components/dashboard/campaign-list";

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
        <h1 className="text-display-section font-medium tracking-tight text-foreground">
          Campaigns
        </h1>
      </header>

      <Suspense fallback={<PanelFallback label="campaigns" />}>
        <CampaignList />
      </Suspense>
    </div>
  );
}
