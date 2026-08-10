import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BenchReports } from "@/components/dashboard/bench-reports";
import { BuildLog } from "@/components/dashboard/build-log";
import { PipelineTimeline } from "@/components/dashboard/pipeline-timeline";
import { SectionUnavailable } from "@/components/dashboard/section-unavailable";
import {
  SubmissionDetailHeader,
  SubmissionMetadata,
} from "@/components/dashboard/submission-detail";
import { monoLinkClassName } from "@/components/ui/mono-link";
import { getCampaign, getSubmission } from "@/lib/api/endpoints";
import { isNotFound, isUnavailable } from "@/lib/api/errors";
import { truncateHash } from "@/lib/api/format";
import { campaignHref, decodePatchHash } from "@/lib/routes";
import {
  isStalled,
  isTerminalState,
  reachedBuild,
  type Campaign,
  type SubmissionDetail,
} from "@/lib/api/types";

type PageProps = {
  params: Promise<{ patch_hash: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { patch_hash: rawPatchHash } = await params;
  return {
    title: `Submission ${truncateHash(decodePatchHash(rawPatchHash), 8, 6)} · Pareton`,
    description:
      "Pipeline state, benchmark results, and build output for a Pareton miner submission.",
  };
}

async function loadSubmission(
  patchHash: string
): Promise<
  | { ok: true; detail: SubmissionDetail }
  | { ok: false; kind: "not_found" | "unavailable" | "error" }
> {
  try {
    const detail = await getSubmission(patchHash);
    return { ok: true, detail };
  } catch (error) {
    if (isNotFound(error)) return { ok: false, kind: "not_found" };
    if (isUnavailable(error)) return { ok: false, kind: "unavailable" };
    return { ok: false, kind: "error" };
  }
}

/** Campaign context is decoration here, so a failure must not break the page. */
async function loadCampaignOrNull(
  campaignId: string
): Promise<Campaign | null> {
  if (!campaignId) return null;
  try {
    return await getCampaign(campaignId);
  } catch {
    return null;
  }
}

async function SubmissionSections({ patchHash }: { patchHash: string }) {
  const result = await loadSubmission(patchHash);

  if (!result.ok) {
    if (result.kind === "not_found") notFound();
    return (
      <SectionUnavailable
        message={
          result.kind === "unavailable"
            ? "This submission is temporarily unavailable (API/DB)."
            : "Could not load this submission."
        }
      />
    );
  }

  const { detail } = result;
  const campaign = await loadCampaignOrNull(detail.submission.campaign_id);
  const states = detail.events.map((event) => event.state);
  const stalled = isStalled(detail.latest_state, detail.jobs);

  return (
    <>
      {detail.submission.campaign_id ? (
        <Link
          href={campaignHref(detail.submission.campaign_id)}
          className={monoLinkClassName({ size: "sm" }, "inline-flex")}
        >
          ← Campaign
        </Link>
      ) : null}

      <SubmissionDetailHeader detail={detail} campaign={campaign} />
      <SubmissionMetadata submission={detail.submission} />
      <PipelineTimeline events={detail.events} stalled={stalled} />
      <BenchReports reports={detail.bench_reports} />

      {reachedBuild(states) ? (
        <BuildLog
          patchHash={detail.submission.patch_hash || patchHash}
          live={!isTerminalState(detail.latest_state) && !stalled}
        />
      ) : null}
    </>
  );
}

export default async function SubmissionPage({ params }: PageProps) {
  const { patch_hash: rawPatchHash } = await params;
  const patchHash = decodePatchHash(rawPatchHash);

  return (
    <div className="space-y-8">
      <Suspense
        fallback={
          <>
            <div className="h-3 w-24 animate-pulse bg-border/50" />
            <div className="h-64 animate-pulse border border-border bg-border/10" />
            <div className="h-80 animate-pulse border border-border bg-border/10" />
          </>
        }
      >
        <SubmissionSections patchHash={patchHash} />
      </Suspense>
    </div>
  );
}
