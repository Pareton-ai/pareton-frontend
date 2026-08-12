import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { CampaignTitle } from "@/components/dashboard/campaign-detail";
import {
  CampaignReference,
  CampaignRequirements,
} from "@/components/dashboard/campaign-spec";
import { CampaignStats } from "@/components/dashboard/campaign-stats";
import { SectionUnavailable } from "@/components/dashboard/section-unavailable";
import {
  EmptySubmissions,
  PAGE_SIZE,
  SubmissionsTable,
} from "@/components/dashboard/submissions-table";
import { getCampaign, getCampaignSubmissions } from "@/lib/api/endpoints";
import { isNotFound, isUnavailable } from "@/lib/api/errors";
import { campaignHref } from "@/lib/routes";
import type { Campaign, SubmissionsPage } from "@/lib/api/types";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
};

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

function campaignLoadUnavailable(kind: "unavailable" | "error") {
  return (
    <SectionUnavailable
      message={
        kind === "unavailable"
          ? "Campaign is temporarily unavailable (API/DB)."
          : "Could not load campaign."
      }
    />
  );
}

async function CampaignHeading({ id }: { id: string }) {
  const result = await loadCampaign(id);
  if (!result.ok) {
    if (result.kind === "not_found") notFound();
    return (
      <p className="font-mono text-body-sm uppercase tracking-caps text-muted">
        Campaign {id}
      </p>
    );
  }
  return <CampaignTitle campaign={result.campaign} />;
}

async function CampaignBody({ id, page }: { id: string; page: number }) {
  const result = await loadCampaign(id);
  if (!result.ok) {
    if (result.kind === "not_found") notFound();
    return campaignLoadUnavailable(result.kind);
  }
  const { campaign } = result;

  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  let data: SubmissionsPage | null = null;
  let submissionsError: unknown = null;
  try {
    data = await getCampaignSubmissions(id, {
      limit: PAGE_SIZE,
      offset: (safePage - 1) * PAGE_SIZE,
    });
  } catch (error) {
    submissionsError = error;
  }

  if (data) {
    const totalPages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));
    if (safePage > totalPages) {
      redirect(`${campaignHref(id)}?page=${totalPages}`);
    }
  }

  return (
    <div className="space-y-8">
      <CampaignStats campaign={campaign} submissions={data} />

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_17rem] xl:items-start">
        <div className="min-w-0">
          {data === null ? (
            <SectionUnavailable
              message={
                isUnavailable(submissionsError)
                  ? "Submissions are temporarily unavailable (API/DB)."
                  : "Could not load submissions."
              }
            />
          ) : data.total === 0 ? (
            <EmptySubmissions status={campaign.status} />
          ) : (
            <SubmissionsTable campaignId={id} page={safePage} data={data} />
          )}
        </div>

        <CampaignRequirements campaign={campaign} />
      </div>

      <CampaignReference campaign={campaign} />
    </div>
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
      <div className="flex items-start gap-4">
        {/* Rendered outside the Suspense boundary so the way back is never
            gated on the campaign fetch. */}
        <Link
          href="/dashboard"
          aria-label="All campaigns"
          title="All campaigns"
          className="mt-1 inline-flex size-8 shrink-0 items-center justify-center border border-border text-muted transition-colors hover:border-border-strong hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <ArrowLeft className="size-4" aria-hidden />
        </Link>

        <Suspense
          fallback={
            <div className="mt-1 h-8 w-72 animate-pulse bg-border/50" />
          }
        >
          <CampaignHeading id={id} />
        </Suspense>
      </div>

      <Suspense
        fallback={
          <div className="space-y-8">
            <div className="h-28 animate-pulse border border-border bg-border/10" />
            <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_17rem]">
              <div className="h-72 animate-pulse border border-border bg-border/10" />
              <div className="h-72 animate-pulse border border-border bg-border/10" />
            </div>
          </div>
        }
      >
        <CampaignBody id={id} page={page} />
      </Suspense>
    </div>
  );
}
