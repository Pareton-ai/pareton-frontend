import "server-only";

import { apiFetch, apiFetchText } from "@/lib/api/client";
import { isLeaderVacant } from "@/lib/api/errors";
import {
  apiMocksEnabled,
  mockGetCampaign,
  mockGetLeader,
  mockGetRound,
  mockGetScoreProgress,
  mockGetSubmission,
  mockGetSubmissionBuildLog,
  mockListCampaigns,
  mockListRounds,
  mockListSubmissions,
} from "@/lib/api/mocks";
import {
  parseCampaign,
  parseCampaigns,
  parseLeader,
  parseRoundDetail,
  parseRoundsPage,
  parseScoreProgress,
  parseSubmissionDetail,
  parseSubmissionsPage,
} from "@/lib/api/parse";
import type {
  Campaign,
  CampaignsResponse,
  CampaignStatus,
  Leader,
  RoundDetail,
  RoundsPage,
  ScoreProgressSeries,
  SubmissionDetail,
  SubmissionsPage,
} from "@/lib/api/types";

const SHORT_REVALIDATE = 30;

/**
 * Detail + build-log must not sit in the Next data cache: the page polls while
 * the submission is non-terminal (PAR-44), and the API returns no-store for
 * those responses. Same rule for a pending or running round.
 */
const LIVE_REVALIDATE = 0;

/** Server-side cap from api/server.py. */
export const BUILD_LOG_MAX_TAIL = 2000;

export async function getCampaigns(opts?: {
  status?: CampaignStatus | string;
}): Promise<Campaign[]> {
  if (apiMocksEnabled()) return mockListCampaigns(opts?.status);

  const data = await apiFetch<unknown>("/v1/campaigns", {
    revalidate: SHORT_REVALIDATE,
    tags: ["campaigns"],
    searchParams: { status: opts?.status },
  });
  return parseCampaigns(data);
}

export async function getCampaign(campaignId: string): Promise<Campaign> {
  if (apiMocksEnabled()) return mockGetCampaign(campaignId);

  const data = await apiFetch<unknown>(
    `/v1/campaigns/${encodeURIComponent(campaignId)}`,
    {
      revalidate: SHORT_REVALIDATE,
      tags: ["campaigns", `campaign:${campaignId}`],
    }
  );
  return parseCampaign(data);
}

export async function getCampaignSubmissions(
  campaignId: string,
  opts?: { limit?: number; offset?: number }
): Promise<SubmissionsPage> {
  if (apiMocksEnabled()) return mockListSubmissions(campaignId, opts);

  const limit = opts?.limit ?? 50;
  const offset = opts?.offset ?? 0;
  const data = await apiFetch<unknown>(
    `/v1/campaigns/${encodeURIComponent(campaignId)}/submissions`,
    {
      revalidate: SHORT_REVALIDATE,
      tags: ["submissions", `campaign-submissions:${campaignId}`],
      searchParams: { limit, offset },
    }
  );
  return parseSubmissionsPage(data, {
    campaign_id: campaignId,
    limit,
    offset,
  });
}

/**
 * Campaign-scoped submission detail.
 *
 * `patch_hash` is only unique with `campaign_id` (UNIQUE pair in the DB), so
 * callers must pass both. Prefer this over the bare-hash API, which 409s when
 * the same hash appears in more than one campaign.
 */
export async function getSubmission(
  campaignId: string,
  patchHash: string
): Promise<SubmissionDetail> {
  if (apiMocksEnabled()) return mockGetSubmission(campaignId, patchHash);

  const data = await apiFetch<unknown>(
    `/v1/campaigns/${encodeURIComponent(campaignId)}/submissions/${encodeURIComponent(patchHash)}`,
    {
      revalidate: LIVE_REVALIDATE,
      tags: [
        "submissions",
        `submission:${campaignId}:${patchHash}`,
        `campaign-submissions:${campaignId}`,
      ],
    }
  );
  return parseSubmissionDetail(data);
}

/**
 * Current crown holder, or `null` when the crown is vacant.
 *
 * A vacant leader is HTTP 404 with detail "leader is vacant". That is a
 * normal state. A missing campaign is a different 404 and still throws.
 */
export async function getLeader(campaignId: string): Promise<Leader | null> {
  if (apiMocksEnabled()) return mockGetLeader(campaignId);

  try {
    const data = await apiFetch<unknown>(
      `/v1/campaigns/${encodeURIComponent(campaignId)}/leader`,
      {
        revalidate: SHORT_REVALIDATE,
        tags: ["leader", `campaign-leader:${campaignId}`],
      }
    );
    return parseLeader(data);
  } catch (error) {
    if (isLeaderVacant(error)) return null;
    throw error;
  }
}

export async function getRounds(
  campaignId: string,
  opts?: { limit?: number; offset?: number }
): Promise<RoundsPage> {
  if (apiMocksEnabled()) return mockListRounds(campaignId, opts);

  const limit = opts?.limit ?? 50;
  const offset = opts?.offset ?? 0;
  const data = await apiFetch<unknown>(
    `/v1/campaigns/${encodeURIComponent(campaignId)}/rounds`,
    {
      revalidate: LIVE_REVALIDATE,
      tags: ["rounds", `campaign-rounds:${campaignId}`],
      searchParams: { limit, offset },
    }
  );
  return parseRoundsPage(data, {
    campaign_id: campaignId,
    limit,
    offset,
  });
}

/**
 * How many rounds to scan per lookup call in `getRoundByOrdinal`.
 *
 * A campaign seats one round per seed block, so this resolves almost every
 * campaign in a single request while keeping the response small enough to
 * page through a long one.
 */
const ROUND_LOOKUP_LIMIT = 200;

/**
 * Round detail addressed the way the dashboard addresses it.
 *
 * `GET /v1/rounds/{round_id}` takes a UUID, but a round is public by its
 * campaign-scoped ordinal, so the id has to come from the campaign's round
 * list first. Returns null when the campaign has no such ordinal.
 */
export async function getRoundByOrdinal(
  campaignId: string,
  ordinal: number
): Promise<RoundDetail | null> {
  let offset = 0;

  for (;;) {
    const page = await getRounds(campaignId, {
      limit: ROUND_LOOKUP_LIMIT,
      offset,
    });
    const match = page.rounds.find((row) => row.ordinal === ordinal);
    if (match) return getRound(match.id);

    offset += page.rounds.length;
    if (page.rounds.length === 0 || offset >= page.total) return null;
  }
}

export async function getRound(roundId: string): Promise<RoundDetail> {
  if (apiMocksEnabled()) return mockGetRound(roundId);

  const data = await apiFetch<unknown>(
    `/v1/rounds/${encodeURIComponent(roundId)}`,
    {
      revalidate: LIVE_REVALIDATE,
      tags: ["rounds", `round:${roundId}`],
    }
  );
  return parseRoundDetail(data);
}

export async function getScoreProgress(
  campaignId: string
): Promise<ScoreProgressSeries> {
  if (apiMocksEnabled()) return mockGetScoreProgress(campaignId);

  const data = await apiFetch<unknown>(
    `/v1/campaigns/${encodeURIComponent(campaignId)}/score-progress`,
    {
      revalidate: LIVE_REVALIDATE,
      tags: ["score-progress", `campaign-score-progress:${campaignId}`],
    }
  );
  return parseScoreProgress(data, campaignId);
}

/**
 * Tail of the durable build log, as plain text.
 *
 * The log lives on the worker host's disk, so a submission that has not
 * reached the build phase (or a build whose log was never written) returns
 * 404. Callers should treat that as "nothing yet" rather than an error.
 */
export async function getSubmissionBuildLog(
  campaignId: string,
  patchHash: string,
  opts?: { tail?: number }
): Promise<string> {
  if (apiMocksEnabled())
    return mockGetSubmissionBuildLog(campaignId, patchHash);

  const tail = Math.min(Math.max(opts?.tail ?? 200, 1), BUILD_LOG_MAX_TAIL);
  return await apiFetchText(
    `/v1/campaigns/${encodeURIComponent(campaignId)}/submissions/${encodeURIComponent(patchHash)}/build-log`,
    {
      revalidate: LIVE_REVALIDATE,
      tags: [`submission-build-log:${campaignId}:${patchHash}`],
      searchParams: { tail },
    }
  );
}

export type { CampaignsResponse };
