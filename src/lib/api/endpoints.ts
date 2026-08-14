import "server-only";

import { apiFetch, apiFetchText } from "@/lib/api/client";
import {
  apiMocksEnabled,
  mockGetCampaign,
  mockGetSubmission,
  mockGetSubmissionBuildLog,
  mockListCampaigns,
  mockListSubmissions,
} from "@/lib/api/mocks";
import {
  parseCampaign,
  parseCampaigns,
  parseSubmissionDetail,
  parseSubmissionsPage,
} from "@/lib/api/parse";
import type {
  Campaign,
  CampaignsResponse,
  CampaignStatus,
  SubmissionDetail,
  SubmissionsPage,
} from "@/lib/api/types";

const SHORT_REVALIDATE = 30;

/**
 * Detail + build-log must not sit in the Next data cache: the page polls while
 * the submission is non-terminal (PAR-44), and the API returns no-store for
 * those responses.
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
