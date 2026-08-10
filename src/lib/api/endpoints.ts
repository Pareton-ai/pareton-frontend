import "server-only";

import { apiFetch, apiFetchText } from "@/lib/api/client";
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
const BUILD_LOG_REVALIDATE = 10;

/** Server-side cap from api/server.py. */
export const BUILD_LOG_MAX_TAIL = 2000;

/**
 * Scope a submission read to its campaign.
 *
 * `patch_hash` is only UNIQUE (campaign_id, patch_hash); the bare
 * `/v1/submissions/{patch_hash}` route returns 409 once the same patch lands
 * in two campaigns.
 */
export type SubmissionScope = { campaignId?: string };

function submissionPath(patchHash: string, scope?: SubmissionScope): string {
  const hash = encodeURIComponent(patchHash);
  return scope?.campaignId
    ? `/v1/campaigns/${encodeURIComponent(scope.campaignId)}/submissions/${hash}`
    : `/v1/submissions/${hash}`;
}

export async function getCampaigns(opts?: {
  status?: CampaignStatus | string;
}): Promise<Campaign[]> {
  const data = await apiFetch<unknown>("/v1/campaigns", {
    revalidate: SHORT_REVALIDATE,
    tags: ["campaigns"],
    searchParams: { status: opts?.status },
  });
  return parseCampaigns(data);
}

export async function getCampaign(campaignId: string): Promise<Campaign> {
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

export async function getSubmission(
  patchHash: string,
  scope?: SubmissionScope
): Promise<SubmissionDetail> {
  const data = await apiFetch<unknown>(submissionPath(patchHash, scope), {
    revalidate: SHORT_REVALIDATE,
    tags: ["submissions", `submission:${patchHash}`],
  });
  return parseSubmissionDetail(data);
}

/** Tail of the durable build log. 404 means the build hasn't written one yet. */
export async function getSubmissionBuildLog(
  patchHash: string,
  opts?: { tail?: number } & SubmissionScope
): Promise<string> {
  const tail = Math.min(Math.max(opts?.tail ?? 200, 1), BUILD_LOG_MAX_TAIL);
  return await apiFetchText(`${submissionPath(patchHash, opts)}/build-log`, {
    revalidate: BUILD_LOG_REVALIDATE,
    tags: [`submission-build-log:${patchHash}`],
    searchParams: { tail },
  });
}

export type { CampaignsResponse };
