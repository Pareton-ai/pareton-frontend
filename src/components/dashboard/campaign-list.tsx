import {
  Archive,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Hash,
} from "lucide-react";
import Link from "next/link";
import { CopyableMono } from "@/components/dashboard/copyable-mono";
import { GpuMark, shortSku } from "@/components/dashboard/gpu";
import { type DashboardIcon } from "@/components/dashboard/panel";
import { SectionUnavailable } from "@/components/dashboard/section-unavailable";
import { EmptyState } from "@/components/ui/empty-state";
import { getCampaigns } from "@/lib/api/endpoints";
import { isUnavailable } from "@/lib/api/errors";
import { truncateMiddle } from "@/lib/api/format";
import { campaignHref } from "@/lib/routes";
import type { Campaign, CampaignStatus } from "@/lib/api/types";

function msAt(iso: string): number {
  const ms = new Date(iso).getTime();
  return Number.isNaN(ms) ? 0 : ms;
}

/**
 * Newest first within a group. Campaigns run open ended — they carry no
 * deadline to rank by, so recency is the only ordering left.
 */
function byNewest(a: Campaign, b: Campaign): number {
  return msAt(b.created_at) - msAt(a.created_at);
}

/** Reading order: what is live, what finished, what is history. */
const GROUPS: {
  status: CampaignStatus;
  title: string;
  icon: DashboardIcon;
  defaultOpen: boolean;
}[] = [
  { status: "open", title: "Open", icon: CircleDot, defaultOpen: true },
  {
    status: "closed",
    title: "Closed",
    icon: CheckCircle2,
    defaultOpen: false,
  },
  {
    status: "archived",
    title: "Archived",
    icon: Archive,
    defaultOpen: false,
  },
];

function CampaignRow({ campaign }: { campaign: Campaign }) {
  const { model, gpu_count } = campaign.bench;
  const baselineRepo = campaign.baseline_repo.toLowerCase();
  const engines = [
    ...(baselineRepo.includes("vllm") ? ["vLLM"] : []),
    ...(baselineRepo.includes("sglang") ? ["SGLang"] : []),
  ];

  return (
    <div className="group relative px-5 py-5 transition-colors [clip-path:inset(0)] [transform:translate(0)] hover:bg-accent-dim/30 focus-within:bg-accent-dim/30">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="min-w-0 text-title font-medium tracking-tight wrap-break-word text-foreground">
            <Link
              href={campaignHref(campaign.campaign_id)}
              className="outline-none after:absolute after:inset-0 focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-accent"
            >
              {model.hf_repo}
              <span className="sr-only">
                {` @${truncateMiddle(model.hf_revision, 8, 6)} campaign details`}
              </span>
            </Link>
            <CopyableMono
              value={model.hf_revision}
              display={`@${truncateMiddle(model.hf_revision, 8, 6)}`}
              className="relative z-10 ml-1 font-sans text-title font-normal text-muted"
            />
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 font-mono text-body text-secondary">
            {engines.map((engine) => (
              <span
                key={engine}
                className="inline-flex items-center border border-border bg-accent-dim px-2 py-0.5 text-caption text-accent"
              >
                {engine}
              </span>
            ))}
            <span
              className="inline-flex items-center gap-1.5"
              title={`${gpu_count}× GPU per bench: ${campaign.gpu_skus.join(", ") || "—"}`}
            >
              <GpuMark
                skus={campaign.gpu_skus}
                className="size-3.5 shrink-0 text-muted"
              />
              {`${gpu_count}× ${campaign.gpu_skus.map(shortSku).join(" · ") || "—"}`}
            </span>
            <span
              className="inline-flex items-center gap-1.5"
              title={campaign.campaign_id}
            >
              <Hash className="size-3.5 shrink-0 text-muted" aria-hidden />
              {truncateMiddle(campaign.campaign_id, 10, 6)}
            </span>
          </div>
        </div>

        <ChevronRight
          className="size-4 shrink-0 text-muted transition-colors group-hover:text-foreground"
          aria-hidden
        />
      </div>
    </div>
  );
}

function EmptyCampaigns() {
  return (
    <EmptyState
      tone="accent"
      title="No campaigns"
      message="There are no campaigns to list yet. When a campaign opens, it will appear here with its model and GPU SKUs."
    />
  );
}

function CampaignListView({ campaigns }: { campaigns: Campaign[] }) {
  if (campaigns.length === 0) return <EmptyCampaigns />;

  return (
    <div className="space-y-8">
      {GROUPS.map((group) => {
        const rows = campaigns
          .filter((campaign) => campaign.status === group.status)
          .sort(byNewest);
        if (rows.length === 0) return null;

        return (
          <details
            key={group.status}
            open={group.defaultOpen}
            aria-label={group.title}
            className="group border border-border"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent [&::-webkit-details-marker]:hidden">
              <div className="flex items-center gap-2">
                <group.icon
                  className="size-3.5 shrink-0 text-muted"
                  aria-hidden
                />
                <h2 className="font-mono text-caption uppercase tracking-caps text-muted">
                  {group.title}
                </h2>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-serif text-body-lg italic text-muted">
                  {`${rows.length} campaign${rows.length === 1 ? "" : "s"}`}
                </span>
                <ChevronRight
                  className="size-4 shrink-0 text-muted transition-transform group-open:rotate-90"
                  aria-hidden
                />
              </div>
            </summary>
            <div className="divide-y divide-border border-t border-border">
              {rows.map((campaign) => (
                <CampaignRow key={campaign.campaign_id} campaign={campaign} />
              ))}
            </div>
          </details>
        );
      })}
    </div>
  );
}

const statuses = ["open", "closed", "archived"] as const;

export async function CampaignList() {
  let campaigns: Campaign[] | null = null;
  let error: unknown = null;
  try {
    const groups = await Promise.all(
      statuses.map(async (status) => ({
        status,
        campaigns: await getCampaigns({ status }),
      }))
    );
    campaigns = groups.flatMap((group) => group.campaigns);
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
