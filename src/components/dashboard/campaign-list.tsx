import {
  Archive,
  CalendarClock,
  ChevronRight,
  CircleDot,
  Hash,
} from "lucide-react";
import Link from "next/link";
import { CopyableMono } from "@/components/dashboard/copyable-mono";
import { GpuMark, shortSku } from "@/components/dashboard/gpu";
import { Panel, type DashboardIcon } from "@/components/dashboard/panel";
import { SectionUnavailable } from "@/components/dashboard/section-unavailable";
import { getCampaigns } from "@/lib/api/endpoints";
import { isUnavailable } from "@/lib/api/errors";
import { truncateMiddle } from "@/lib/api/format";
import { campaignHref } from "@/lib/routes";
import type { Campaign, CampaignStatus } from "@/lib/api/types";

function msAt(iso: string): number {
  const ms = new Date(iso).getTime();
  return Number.isNaN(ms) ? 0 : ms;
}

/** Reading order: what is live, what is coming, what is history. */
const GROUPS: {
  status: CampaignStatus;
  title: string;
  icon: DashboardIcon;
  /** Most urgent first within the group. */
  compare: (a: Campaign, b: Campaign) => number;
}[] = [
  {
    status: "open",
    title: "Open",
    icon: CircleDot,
    compare: (a, b) => msAt(a.window.closes_at) - msAt(b.window.closes_at),
  },
  {
    status: "draft",
    title: "Upcoming",
    icon: CalendarClock,
    compare: (a, b) => msAt(a.window.opens_at) - msAt(b.window.opens_at),
  },
  {
    status: "closed",
    title: "Closed",
    icon: Archive,
    compare: (a, b) => msAt(b.window.closes_at) - msAt(a.window.closes_at),
  },
];

function CampaignRow({ campaign }: { campaign: Campaign }) {
  const { model } = campaign.bench;

  return (
    <div className="group relative px-4 py-4 transition-colors [clip-path:inset(0)] [transform:translate(0)] hover:bg-accent-dim/30 focus-within:bg-accent-dim/30">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="min-w-0 text-ui font-medium tracking-tight wrap-break-word text-foreground">
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
              className="relative z-10 ml-1 font-sans text-ui font-medium text-muted"
            />
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 font-mono text-body-sm text-secondary">
            <span
              className="inline-flex w-32 shrink-0 items-center gap-1.5 truncate"
              title={campaign.gpu_skus.join(", ")}
            >
              <GpuMark
                skus={campaign.gpu_skus}
                className="size-3.5 shrink-0 text-muted"
              />
              {campaign.gpu_skus.map(shortSku).join(" · ") || "—"}
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
    <div className="border border-border px-5 py-14 text-center sm:px-6">
      <p className="font-mono text-body-sm uppercase tracking-caps text-accent">
        No campaigns
      </p>
      <p className="mx-auto mt-4 max-w-md text-body-lg leading-relaxed text-secondary">
        There are no campaigns to list yet. When a campaign opens, it will
        appear here with its model and GPU SKUs.
      </p>
    </div>
  );
}

function CampaignListView({ campaigns }: { campaigns: Campaign[] }) {
  if (campaigns.length === 0) return <EmptyCampaigns />;

  return (
    <div className="space-y-8">
      {GROUPS.map((group) => {
        const rows = campaigns
          .filter((campaign) => campaign.status === group.status)
          .sort(group.compare);
        if (rows.length === 0) return null;

        return (
          <Panel
            key={group.status}
            icon={group.icon}
            title={group.title}
            meta={`${rows.length} campaign${rows.length === 1 ? "" : "s"}`}
          >
            {rows.map((campaign) => (
              <CampaignRow key={campaign.campaign_id} campaign={campaign} />
            ))}
          </Panel>
        );
      })}
    </div>
  );
}

export async function CampaignList() {
  let campaigns: Campaign[] | null = null;
  let error: unknown = null;
  try {
    campaigns = await getCampaigns();
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
