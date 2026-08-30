import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { BackLink } from "@/components/dashboard/back-link";
import { CampaignTitle } from "@/components/dashboard/campaign-detail";
import { CampaignLeaders } from "@/components/dashboard/campaign-leaders";
import { CampaignMetadata } from "@/components/dashboard/campaign-spec";
import { CampaignStats } from "@/components/dashboard/campaign-stats";
import { CampaignTabs } from "@/components/dashboard/campaign-tabs";
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
  getLeader,
  getRounds,
  getScoreProgress,
} from "@/lib/api/endpoints";
import { isNotFound, isUnavailable } from "@/lib/api/errors";
import {
  campaignListHref,
  clampedCampaignListHref,
  parseCampaignTab,
  type CampaignTab,
} from "@/lib/routes";
import {
  isLiveCampaignPage,
  type Campaign,
  type Leader,
  type RoundsPage,
  type ScoreProgressSeries,
  type SubmissionsPage,
} from "@/lib/api/types";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string; submissions?: string; tab?: string }>;
};

/** Query state the page carries between tabs, so switching keeps your place. */
type PageQuery = {
  page: number;
  submissions: number;
  tab: CampaignTab;
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
): Promise<{ ok: true; data: RoundsPage } | { ok: false; error: unknown }> {
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
  { ok: true; data: SubmissionsPage } | { ok: false; error: unknown }
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

async function loadLeaders(
  id: string
): Promise<
  | { ok: true; leader: Leader | null; series: ScoreProgressSeries }
  | { ok: false; error: unknown }
> {
  try {
    const [leader, series] = await Promise.all([
      getLeader(id),
      getScoreProgress(id),
    ]);
    return { ok: true, leader, series };
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

/** Section fetch failed. Names the section so the message is not generic. */
function sectionUnavailable(error: unknown, section: string) {
  return (
    <SectionUnavailable
      message={
        isUnavailable(error)
          ? `${section} are temporarily unavailable (API/DB).`
          : `Could not load ${section.toLowerCase()}.`
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
 * Starts the two list fetches together so a slow rounds query does not sit
 * behind the campaign row, then enables polling once we know whether anything
 * is still moving.
 *
 * Runs on every tab, not just the list ones: the poller has to keep a metadata
 * or leaders view fresh too, and both requests are the same ones the tab strip
 * counts, so they are memoised within the render rather than fetched twice.
 */
async function CampaignPollGate({
  id,
  query,
}: {
  id: string;
  query: PageQuery;
}) {
  const [campaignResult, roundsResult, submissionsResult] = await Promise.all([
    loadCampaign(id),
    loadRounds(id, query.page),
    loadSubmissions(id, query.submissions),
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
  query,
}: {
  id: string;
  query: PageQuery;
}) {
  const [campaignResult, submissionsResult] = await Promise.all([
    loadCampaign(id),
    loadSubmissions(id, query.submissions),
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

async function CampaignTabsSection({
  id,
  query,
}: {
  id: string;
  query: PageQuery;
}) {
  const [roundsResult, submissionsResult] = await Promise.all([
    loadRounds(id, query.page),
    loadSubmissions(id, query.submissions),
  ]);
  return (
    <CampaignTabs
      active={query.tab}
      hrefFor={(tab) => campaignListHref(id, { ...query, tab })}
      counts={{
        rounds: roundsResult.ok ? roundsResult.data.total : null,
        submissions: submissionsResult.ok ? submissionsResult.data.total : null,
      }}
    />
  );
}

async function RoundsSection({ id, query }: { id: string; query: PageQuery }) {
  const [campaignResult, roundsResult] = await Promise.all([
    loadCampaign(id),
    loadRounds(id, query.page),
  ]);
  if (!campaignResult.ok) {
    if (campaignResult.kind === "not_found") notFound();
    return null;
  }
  if (!roundsResult.ok) {
    return sectionUnavailable(roundsResult.error, "Rounds");
  }
  const { data: rounds } = roundsResult;
  if (rounds.total === 0) {
    return <EmptyRounds status={campaignResult.campaign.status} />;
  }
  return (
    <RoundsTable
      campaignId={id}
      page={safePageNumber(query.page)}
      data={rounds}
      pageHref={(next) => campaignListHref(id, { ...query, page: next })}
    />
  );
}

async function SubmissionsSection({
  id,
  query,
}: {
  id: string;
  query: PageQuery;
}) {
  const [campaignResult, submissionsResult] = await Promise.all([
    loadCampaign(id),
    loadSubmissions(id, query.submissions),
  ]);
  if (!campaignResult.ok) {
    if (campaignResult.kind === "not_found") notFound();
    return null;
  }
  if (!submissionsResult.ok) {
    return sectionUnavailable(submissionsResult.error, "Submissions");
  }
  const { data } = submissionsResult;
  if (data.total === 0) {
    return <EmptySubmissions status={campaignResult.campaign.status} />;
  }
  return (
    <SubmissionsTable
      campaignId={id}
      page={safePageNumber(query.submissions)}
      data={data}
      pageHref={(next) => campaignListHref(id, { ...query, submissions: next })}
    />
  );
}

async function MetadataSection({ id }: { id: string }) {
  const result = await loadCampaign(id);
  if (!result.ok) {
    if (result.kind === "not_found") notFound();
    return campaignLoadUnavailable(result.kind);
  }
  return <CampaignMetadata campaign={result.campaign} />;
}

async function LeadersSection({ id }: { id: string }) {
  const [campaignResult, leadersResult] = await Promise.all([
    loadCampaign(id),
    loadLeaders(id),
  ]);
  if (!campaignResult.ok) {
    if (campaignResult.kind === "not_found") notFound();
    return campaignLoadUnavailable(campaignResult.kind);
  }
  if (!leadersResult.ok) {
    return sectionUnavailable(leadersResult.error, "Leaders");
  }
  return (
    <CampaignLeaders
      campaign={campaignResult.campaign}
      leader={leadersResult.leader}
      series={leadersResult.series}
    />
  );
}

/** The active panel. Only the open tab is fetched and rendered. */
function TabPanel({ id, query }: { id: string; query: PageQuery }) {
  switch (query.tab) {
    case "submissions":
      return <SubmissionsSection id={id} query={query} />;
    case "metadata":
      return <MetadataSection id={id} />;
    case "leaders":
      return <LeadersSection id={id} />;
    default:
      return <RoundsSection id={id} query={query} />;
  }
}

async function redirectIfPagersOutOfRange(id: string, query: PageQuery) {
  // Page 1 of either table is always in range (`totalPages` is at least 1).
  if (query.page <= 1 && query.submissions <= 1) return;
  const [roundsResult, submissionsResult] = await Promise.all([
    loadRounds(id, query.page),
    loadSubmissions(id, query.submissions),
  ]);
  const href = clampedCampaignListHref(
    id,
    { page: query.page, submissions: query.submissions, tab: query.tab },
    {
      pageSize: PAGE_SIZE,
      roundsTotal: roundsResult.ok ? roundsResult.data.total : null,
      submissionsTotal: submissionsResult.ok
        ? submissionsResult.data.total
        : null,
    }
  );
  if (href) redirect(href);
}

export default async function CampaignPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const sp = await searchParams;
  const query: PageQuery = {
    page: parsePage(sp.page),
    submissions: parsePage(sp.submissions),
    tab: parseCampaignTab(sp.tab),
  };
  await redirectIfPagersOutOfRange(id, query);

  return (
    <LiveCampaignPollHost>
      <div className="space-y-8">
        <Suspense fallback={null}>
          <CampaignPollGate id={id} query={query} />
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
          <CampaignStatsSection id={id} query={query} />
        </Suspense>

        <div className="space-y-6">
          {/* The strip renders its own labels immediately; only the counts
              wait on a fetch, so the tabs never pop in. */}
          <Suspense
            fallback={
              <CampaignTabs
                active={query.tab}
                hrefFor={(tab) => campaignListHref(id, { ...query, tab })}
              />
            }
          >
            <CampaignTabsSection id={id} query={query} />
          </Suspense>

          <Suspense
            key={query.tab}
            fallback={
              <div className="h-72 animate-pulse border border-border bg-border/10" />
            }
          >
            <TabPanel id={id} query={query} />
          </Suspense>
        </div>
      </div>
    </LiveCampaignPollHost>
  );
}
