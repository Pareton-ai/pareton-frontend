import Link from "next/link";
import { Countdown } from "@/components/dashboard/countdown";
import { CampaignStatusChip } from "@/components/dashboard/status-chip";
import { SectionUnavailable } from "@/components/dashboard/section-unavailable";
import { getCampaigns } from "@/lib/api/endpoints";
import { isUnavailable } from "@/lib/api/errors";
import { formatUtc, truncateHash, truncateMiddle } from "@/lib/api/format";
import type { Campaign } from "@/lib/api/types";

function CampaignRow({ campaign }: { campaign: Campaign }) {
  const model = `${campaign.bench.model.hf_repo}`;
  const revision = truncateMiddle(campaign.bench.model.hf_revision, 8, 6);

  return (
    <Link
      href={`/dashboard/campaigns/${campaign.campaign_id}`}
      className="group grid grid-cols-1 gap-4 px-5 py-6 transition-colors hover:bg-accent-dim/40 sm:col-span-full sm:grid-cols-subgrid sm:items-center sm:px-6"
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-3">
          <CampaignStatusChip status={campaign.status} />
          <span className="font-mono text-body-sm text-muted">
            {truncateMiddle(campaign.campaign_id, 8, 6)}
          </span>
        </div>
        <p className="mt-3 truncate text-ui font-medium tracking-tight text-foreground">
          {model}
          <span className="text-muted"> @{revision}</span>
        </p>
        <p className="mt-2 font-mono text-body-sm text-secondary">
          {campaign.gpu_skus.join(" · ") || "—"}
        </p>
      </div>

      <div className="min-w-0 space-y-1.5 font-mono text-body-sm text-secondary">
        <p>
          <span className="text-muted">Opens </span>
          {formatUtc(campaign.window.opens_at)}
        </p>
        <p>
          <span className="text-muted">Closes </span>
          {formatUtc(campaign.window.closes_at)}
        </p>
        <p className="truncate">
          <span className="text-muted">Manifest </span>
          {truncateHash(campaign.manifest_hash)}
        </p>
      </div>

      <div className="flex items-center justify-between gap-6 sm:flex-col sm:items-end sm:justify-center">
        {campaign.status === "open" ? (
          // Render-time window check for the public dashboard snapshot.
          // eslint-disable-next-line react-hooks/purity -- Date.now is the open/closed boundary
          new Date(campaign.window.closes_at).getTime() > Date.now() ? (
            <div className="text-right">
              <p className="font-mono text-caption uppercase tracking-caps text-muted">
                Remaining
              </p>
              <Countdown
                closesAt={campaign.window.closes_at}
                className="mt-1 text-accent"
              />
            </div>
          ) : (
            <p className="font-mono text-body-sm uppercase tracking-caps text-muted">
              Closing
            </p>
          )
        ) : campaign.status === "draft" ? (
          <p className="font-mono text-body-sm uppercase tracking-caps text-muted">
            Not opened
          </p>
        ) : (
          <p className="font-mono text-body-sm uppercase tracking-caps text-muted">
            Window ended
          </p>
        )}
        <span className="font-mono text-body-sm uppercase tracking-caps text-muted transition-colors group-hover:text-foreground">
          View →
        </span>
      </div>
    </Link>
  );
}

function EmptyCampaigns() {
  return (
    <div className="border border-border px-5 py-14 text-center sm:px-6">
      <p className="font-mono text-body-sm uppercase tracking-caps text-accent">
        No campaigns
      </p>
      <p className="mx-auto mt-4 max-w-md text-body-lg leading-relaxed text-secondary">
        There are no campaigns to list yet. When a campaign opens, it will
        appear here with its model, GPU SKUs, and window.
      </p>
    </div>
  );
}

function CampaignListView({ campaigns }: { campaigns: Campaign[] }) {
  if (campaigns.length === 0) return <EmptyCampaigns />;

  return (
    <section
      aria-label="Campaigns"
      className="divide-y divide-border border border-border sm:grid sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1.6fr)_minmax(8.5rem,8.5rem)] sm:gap-x-4"
    >
      {campaigns.map((campaign) => (
        <CampaignRow key={campaign.campaign_id} campaign={campaign} />
      ))}
    </section>
  );
}

function orderCampaigns(campaigns: Campaign[]): Campaign[] {
  return [...campaigns].sort((a, b) => {
    const rank = (s: Campaign["status"]) =>
      s === "open" ? 0 : s === "draft" ? 1 : 2;
    const byStatus = rank(a.status) - rank(b.status);
    if (byStatus !== 0) return byStatus;
    return (
      new Date(b.window.opens_at).getTime() -
      new Date(a.window.opens_at).getTime()
    );
  });
}

export async function CampaignList() {
  let campaigns: Campaign[] | null = null;
  let error: unknown = null;
  try {
    campaigns = orderCampaigns(await getCampaigns());
  } catch (err) {
    error = err;
  }

  if (error || !campaigns) {
    return (
      <SectionUnavailable
        message={
          isUnavailable(error)
            ? "Campaign list is temporarily unavailable (API/DB)."
            : "Could not load campaigns."
        }
      />
    );
  }

  return <CampaignListView campaigns={campaigns} />;
}
