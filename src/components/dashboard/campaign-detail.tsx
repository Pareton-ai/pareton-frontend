import { CopyableMono } from "@/components/dashboard/copyable-mono";
import { CampaignStatusChip } from "@/components/dashboard/status-chip";
import { truncateMiddle } from "@/lib/api/format";
import type { Campaign } from "@/lib/api/types";

/**
 * Page title block, sitting inline with the back control.
 *
 * Identity only: the model under optimization plus the ids you need to quote.
 * Gates go in the stat strip, spec detail in the sidebar.
 */
export function CampaignTitle({ campaign }: { campaign: Campaign }) {
  const { model } = campaign.bench;

  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h1 className="text-display-section font-medium leading-display tracking-tight text-foreground">
          {model.hf_repo}
        </h1>
        <CampaignStatusChip status={campaign.status} />
      </div>
      <div className="mt-2 flex flex-col flex-wrap items-start gap-x-4 gap-y-1 font-mono text-body-sm text-muted">
        <span className="text-secondary">
          Model revision: @{truncateMiddle(model.hf_revision, 12, 6)}
        </span>
        <span className="text-secondary">
          Campaign ID:{" "}
          <CopyableMono
            value={campaign.campaign_id}
            display={truncateMiddle(campaign.campaign_id, 14, 8)}
          />
        </span>
      </div>
    </div>
  );
}
