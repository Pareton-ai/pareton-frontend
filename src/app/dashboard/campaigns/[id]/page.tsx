import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { CampaignDetailHeader } from "@/components/dashboard/campaign-detail";
import { SectionUnavailable } from "@/components/dashboard/section-unavailable";
import { SubmissionsTable } from "@/components/dashboard/submissions-table";
import { getCampaign } from "@/lib/api/endpoints";
import { isNotFound, isUnavailable } from "@/lib/api/errors";
import type { Campaign } from "@/lib/api/types";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
};

function SubmissionsFallback() {
  return (
    <div
      className="h-64 animate-pulse border border-border bg-border/10"
      aria-label="Loading submissions"
    />
  );
}

async function loadCampaign(
  id: string
): Promise<
  | { ok: true; campaign: Campaign }
  | { ok: false; kind: "not_found" | "unavailable" | "error" }
> {
  try {
    const campaign = await getCampaign(id);
    return { ok: true, campaign };
  } catch (error) {
    if (isNotFound(error)) return { ok: false, kind: "not_found" };
    if (isUnavailable(error)) return { ok: false, kind: "unavailable" };
    return { ok: false, kind: "error" };
  }
}

async function CampaignHeader({ id }: { id: string }) {
  const result = await loadCampaign(id);
  if (!result.ok) {
    if (result.kind === "not_found") notFound();
    if (result.kind === "unavailable") {
      return (
        <SectionUnavailable message="Campaign manifest is temporarily unavailable (API/DB)." />
      );
    }
    throw new Error(`Failed to load campaign ${id}`);
  }
  return <CampaignDetailHeader campaign={result.campaign} />;
}

async function CampaignSubmissions({ id, page }: { id: string; page: number }) {
  const result = await loadCampaign(id);
  if (!result.ok) {
    if (result.kind === "not_found") notFound();
    if (result.kind === "unavailable") {
      return (
        <SectionUnavailable message="Campaign is temporarily unavailable (API/DB)." />
      );
    }
    throw new Error(`Failed to load campaign ${id}`);
  }

  return (
    <SubmissionsTable
      campaignId={id}
      page={page}
      campaignStatus={result.campaign.status}
    />
  );
}

export default async function CampaignPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const sp = await searchParams;
  const page = Number.parseInt(sp.page ?? "1", 10);

  return (
    <div className="space-y-8">
      <Link
        href="/dashboard"
        className="inline-flex font-mono text-[12px] uppercase tracking-[0.14em] text-muted transition-colors hover:text-foreground"
      >
        ← All campaigns
      </Link>

      <Suspense
        fallback={
          <div className="h-56 animate-pulse border border-border bg-border/10" />
        }
      >
        <CampaignHeader id={id} />
      </Suspense>

      <Suspense fallback={<SubmissionsFallback />}>
        <CampaignSubmissions id={id} page={page} />
      </Suspense>
    </div>
  );
}
