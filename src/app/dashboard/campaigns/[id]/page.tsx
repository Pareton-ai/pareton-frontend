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
      <p className="font-mono text-body uppercase tracking-caps text-muted">
        Campaign {id}
      </p>
    );
  }
  return <CampaignTitle campaign={result.campaign} />;
}

async function CampaignBody({
  id,
  page,
  submissionsPage,
}: {
  id: string;
  page: number;
  submissionsPage: number;
}) {
  const result = await loadCampaign(id);
  if (!result.ok) {
    if (result.kind === "not_found") notFound();
    return (
      <div className="space-y-8">
        <LiveCampaignPoll enabled />
        {campaignLoadUnavailable(result.kind)}
      </div>
    );
  }
  const { campaign } = result;

  const safePage = page > 0 && Number.isFinite(page) ? Math.floor(page) : 1;
  const safeSubmissionsPage =
    submissionsPage > 0 && Number.isFinite(submissionsPage)
      ? Math.floor(submissionsPage)
      : 1;

  const [roundsSettled, submissionsSettled] = await Promise.allSettled([
    getRounds(id, {
      limit: PAGE_SIZE,
      offset: (safePage - 1) * PAGE_SIZE,
    }),
    getCampaignSubmissions(id, {
      limit: PAGE_SIZE,
      offset: (safeSubmissionsPage - 1) * PAGE_SIZE,
    }),
  ]);

  const rounds: RoundsPage | null =
    roundsSettled.status === "fulfilled" ? roundsSettled.value : null;
  const roundsError =
    roundsSettled.status === "rejected" ? roundsSettled.reason : null;
  const data: SubmissionsPage | null =
    submissionsSettled.status === "fulfilled" ? submissionsSettled.value : null;
  const submissionsError =
    submissionsSettled.status === "rejected" ? submissionsSettled.reason : null;

  if (rounds) {
    const totalPages = Math.max(1, Math.ceil(rounds.total / PAGE_SIZE));
    if (safePage > totalPages) {
      redirect(
        campaignListHref(id, {
          page: totalPages,
          submissions: safeSubmissionsPage,
        })
      );
    }
  }
  if (data) {
    const totalPages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));
    if (safeSubmissionsPage > totalPages) {
      redirect(
        campaignListHref(id, {
          page: safePage,
          submissions: totalPages,
        })
      );
    }
  }

  // A fetch blip must not send `enabled={false}`: that would stop the host.
  // An open campaign keeps polling even after listed rows settle, so the
  // next round (or void) shows up without a reload.
  const live = isLiveCampaignPage({
    campaignStatus: campaign.status,
    submissions: data === null ? null : data.submissions,
    rounds: rounds === null ? null : rounds.rounds,
  });

  return (
    <div className="space-y-8">
      <LiveCampaignPoll enabled={live} />
      <CampaignStats campaign={campaign} submissions={data} />

      {rounds === null ? (
        <SectionUnavailable
          message={
            isUnavailable(roundsError)
              ? "Rounds are temporarily unavailable (API/DB)."
              : "Could not load rounds."
          }
        />
      ) : rounds.total === 0 ? (
        <EmptyRounds status={campaign.status} />
      ) : (
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
      )}

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
  const page = parsePage(sp.page);
  const submissionsPage = parsePage(sp.submissions);

  return (
    <LiveCampaignPollHost>
      <div className="space-y-8">
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
            <div className="space-y-8">
              <div className="h-28 animate-pulse border border-border bg-border/10" />
              <div className="h-72 animate-pulse border border-border bg-border/10" />
              <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_17rem]">
                <div className="h-72 animate-pulse border border-border bg-border/10" />
                <div className="h-72 animate-pulse border border-border bg-border/10" />
              </div>
            </div>
          }
        >
          <CampaignBody id={id} page={page} submissionsPage={submissionsPage} />
        </Suspense>
      </div>
    </LiveCampaignPollHost>
  );
}
