import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { BackLink } from "@/components/dashboard/back-link";
import { CampaignTitle } from "@/components/dashboard/campaign-detail";
import {
  CampaignReference,
  CampaignRequirements,
} from "@/components/dashboard/campaign-spec";
import { CampaignStats } from "@/components/dashboard/campaign-stats";
import {
  LiveCampaignPoll,
  LiveCampaignPollHost,
} from "@/components/dashboard/live-campaign-poll";
import { EmptyRounds, RoundsTable } from "@/components/dashboard/rounds-table";
import { SectionUnavailable } from "@/components/dashboard/section-unavailable";
import {
  EmptySubmissions,
  PAGE_SIZE,
  SubmissionsTable,
} from "@/components/dashboard/submissions-table";
import {
  getCampaign,
  getCampaignSubmissions,
  getRounds,
} from "@/lib/api/endpoints";
import { isNotFound, isUnavailable } from "@/lib/api/errors";
import { campaignListHref } from "@/lib/routes";
import {
  isLiveCampaignPage,
  type Campaign,
  type RoundsPage,
  type SubmissionsPage,
} from "@/lib/api/types";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string; submissions?: string }>;
};

function parsePage(value: string | undefined): number {
  const n = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 1;
}

function safePageNumber(page: number): number {
  return page > 0 && Number.isFinite(page) ? Math.floor(page) : 1;
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

async function loadRounds(
  id: string,
  page: number
): Promise<
  | { ok: true; data: RoundsPage }
  | { ok: false; error: unknown }
> {
  try {
    const data = await getRounds(id, {
      limit: PAGE_SIZE,
      offset: (safePageNumber(page) - 1) * PAGE_SIZE,
    });
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error };
  }
}

async function loadSubmissions(
  id: string,
  page: number
): Promise<
  | { ok: true; data: SubmissionsPage }
  | { ok: false; error: unknown }
> {
  try {
    const data = await getCampaignSubmissions(id, {
      limit: PAGE_SIZE,
      offset: (safePageNumber(page) - 1) * PAGE_SIZE,
    });
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error };
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
      <p className="font-mono text-body uppercase tracking-caps text-muted">
        Campaign {id}
      </p>
    );
  }
  return <CampaignTitle campaign={result.campaign} />;
}

/**
 * Starts the three list fetches together so a slow rounds query does not
 * sit behind the campaign row, then enables polling once we know whether
 * anything is still moving.
 */
async function CampaignPollGate({
  id,
  page,
  submissionsPage,
}: {
  id: string;
  page: number;
  submissionsPage: number;
}) {
  const [campaignResult, roundsResult, submissionsResult] = await Promise.all([
    loadCampaign(id),
    loadRounds(id, page),
    loadSubmissions(id, submissionsPage),
  ]);
  if (!campaignResult.ok) {
    return <LiveCampaignPoll enabled />;
  }
  return (
    <LiveCampaignPoll
      enabled={isLiveCampaignPage({
        campaignStatus: campaignResult.campaign.status,
        submissions: submissionsResult.ok
          ? submissionsResult.data.submissions
          : null,
        rounds: roundsResult.ok ? roundsResult.data.rounds : null,
      })}
    />
  );
}

async function CampaignStatsSection({
  id,
  submissionsPage,
}: {
  id: string;
  submissionsPage: number;
}) {
  const [campaignResult, submissionsResult] = await Promise.all([
    loadCampaign(id),
    loadSubmissions(id, submissionsPage),
  ]);
  if (!campaignResult.ok) {
    if (campaignResult.kind === "not_found") notFound();
    return campaignLoadUnavailable(campaignResult.kind);
  }
  return (
    <CampaignStats
      campaign={campaignResult.campaign}
      submissions={submissionsResult.ok ? submissionsResult.data : null}
    />
  );
}

async function RoundsSection({
  id,
  page,
  submissionsPage,
}: {
  id: string;
  page: number;
  submissionsPage: number;
}) {
  const [campaignResult, roundsResult] = await Promise.all([
    loadCampaign(id),
    loadRounds(id, page),
  ]);
  if (!campaignResult.ok) {
    if (campaignResult.kind === "not_found") notFound();
    return campaignLoadUnavailable(campaignResult.kind);
  }
  if (!roundsResult.ok) {
    return (
      <SectionUnavailable
        message={
          isUnavailable(roundsResult.error)
            ? "Rounds are temporarily unavailable (API/DB)."
            : "Could not load rounds."
        }
      />
    );
  }
  const { data: rounds } = roundsResult;
  const safePage = safePageNumber(page);
  const safeSubmissionsPage = safePageNumber(submissionsPage);
  const totalPages = Math.max(1, Math.ceil(rounds.total / PAGE_SIZE));
  if (safePage > totalPages) {
    redirect(
      campaignListHref(id, {
        page: totalPages,
        submissions: safeSubmissionsPage,
      })
    );
  }
  if (rounds.total === 0) {
    return <EmptyRounds status={campaignResult.campaign.status} />;
  }
  return (
    <RoundsTable
      campaignId={id}
      page={safePage}
      data={rounds}
      pageHref={(next) =>
        campaignListHref(id, {
          page: next,
          submissions: safeSubmissionsPage,
        })
      }
    />
  );
}

async function SubmissionsSection({
  id,
  page,
  submissionsPage,
}: {
  id: string;
  page: number;
  submissionsPage: number;
}) {
  const [campaignResult, submissionsResult] = await Promise.all([
    loadCampaign(id),
    loadSubmissions(id, submissionsPage),
  ]);
  if (!campaignResult.ok) {
    if (campaignResult.kind === "not_found") notFound();
    return campaignLoadUnavailable(campaignResult.kind);
  }
  if (!submissionsResult.ok) {
    return (
      <SectionUnavailable
        message={
          isUnavailable(submissionsResult.error)
            ? "Submissions are temporarily unavailable (API/DB)."
            : "Could not load submissions."
        }
      />
    );
  }
  const { data } = submissionsResult;
  const safePage = safePageNumber(page);
  const safeSubmissionsPage = safePageNumber(submissionsPage);
  const totalPages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));
  if (safeSubmissionsPage > totalPages) {
    redirect(
      campaignListHref(id, {
        page: safePage,
        submissions: totalPages,
      })
    );
  }
  if (data.total === 0) {
    return <EmptySubmissions status={campaignResult.campaign.status} />;
  }
  return (
    <SubmissionsTable
      campaignId={id}
      page={safeSubmissionsPage}
      data={data}
      pageHref={(next) =>
        campaignListHref(id, {
          page: safePage,
          submissions: next,
        })
      }
    />
  );
}

async function CampaignRequirementsSection({ id }: { id: string }) {
  const result = await loadCampaign(id);
  if (!result.ok) {
    if (result.kind === "not_found") notFound();
    return null;
  }
  return <CampaignRequirements campaign={result.campaign} />;
}

async function CampaignReferenceSection({ id }: { id: string }) {
  const result = await loadCampaign(id);
  if (!result.ok) {
    if (result.kind === "not_found") notFound();
    return null;
  }
  return <CampaignReference campaign={result.campaign} />;
}

export default async function CampaignPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const sp = await searchParams;
  const page = parsePage(sp.page);
  const submissionsPage = parsePage(sp.submissions);

  return (
    <LiveCampaignPollHost>
      <div className="space-y-8">
        <Suspense fallback={null}>
          <CampaignPollGate
            id={id}
            page={page}
            submissionsPage={submissionsPage}
          />
        </Suspense>

        <div className="flex items-start gap-4">
          {/* Rendered outside the Suspense boundary so the way back is never
              gated on the campaign fetch. */}
          <BackLink href="/dashboard" label="All campaigns" />

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
            <div className="h-28 animate-pulse border border-border bg-border/10" />
          }
        >
          <CampaignStatsSection id={id} submissionsPage={submissionsPage} />
        </Suspense>

        <Suspense
          fallback={
            <div className="h-72 animate-pulse border border-border bg-border/10" />
          }
        >
          <RoundsSection
            id={id}
            page={page}
            submissionsPage={submissionsPage}
          />
        </Suspense>

        <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_17rem] xl:items-start">
          <div className="min-w-0">
            <Suspense
              fallback={
                <div className="h-72 animate-pulse border border-border bg-border/10" />
              }
            >
              <SubmissionsSection
                id={id}
                page={page}
                submissionsPage={submissionsPage}
              />
            </Suspense>
          </div>

          <Suspense
            fallback={
              <div className="h-72 animate-pulse border border-border bg-border/10" />
            }
          >
            <CampaignRequirementsSection id={id} />
          </Suspense>
        </div>

        <Suspense
          fallback={
            <div className="h-40 animate-pulse border border-border bg-border/10" />
          }
        >
          <CampaignReferenceSection id={id} />
        </Suspense>
      </div>
    </LiveCampaignPollHost>
  );
}
