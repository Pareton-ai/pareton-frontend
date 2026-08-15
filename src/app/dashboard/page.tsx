import { Suspense } from "react";
import { TriangleAlert } from "lucide-react";
import { CampaignList } from "@/components/dashboard/campaign-list";

/**
 * Pre-launch notice. Remove when mining and emissions are open. This is hard-coded to describe the network, not a campaign.
 */
function PreLaunchNotice() {
  return (
    <aside className="flex items-start gap-3 border border-rust/40 bg-rust/10 px-5 py-4">
      <TriangleAlert className="mt-0.5 size-4 shrink-0 text-rust" aria-hidden />
      <div>
        <p className="font-mono text-caption uppercase tracking-caps text-rust">
          Not open yet
        </p>
        <p className="mt-2 max-w-[64ch] text-body-lg leading-relaxed text-secondary">
          Mining & emissions have not opened yet. Please do not submit at this
          time.
        </p>
      </div>
    </aside>
  );
}

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

      <PreLaunchNotice />

      <Suspense fallback={<CampaignsFallback />}>
        <CampaignList />
      </Suspense>
    </div>
  );
}
