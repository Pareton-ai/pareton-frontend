import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BackLink } from "@/components/dashboard/back-link";
import { BenchReports } from "@/components/dashboard/bench-reports";
import { BuildLog } from "@/components/dashboard/build-log";
import {
  LiveSubmissionPoll,
  LiveSubmissionPollHost,
} from "@/components/dashboard/live-submission-poll";
import { PipelineTimeline } from "@/components/dashboard/pipeline-timeline";
import { SectionUnavailable } from "@/components/dashboard/section-unavailable";
import {
  FailedJobNotice,
  SubmissionMetadata,
  SubmissionStats,
  SubmissionTitle,
} from "@/components/dashboard/submission-detail";
import { getCampaign, getSubmission } from "@/lib/api/endpoints";
import { isNotFound, isUnavailable } from "@/lib/api/errors";
import { truncateDigest, truncateHash } from "@/lib/api/format";
import { campaignHref, decodePatchHash, isPatchHash } from "@/lib/routes";
import {
  getFailedSubmissionJob,
  isStalled,
  isTerminalState,
  reachedBuild,
  type Campaign,
  type SubmissionDetail,
} from "@/lib/api/types";

type PageProps = {
  params: Promise<{ id: string; patch_hash: string }>;
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
  campaignId: string,
  patchHash: string
): Promise<
  | { ok: true; detail: SubmissionDetail }
  | { ok: false; kind: "not_found" | "unavailable" | "error" }
> {
  try {
    const detail = await getSubmission(campaignId, patchHash);
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

/** Back control plus title, the one row every branch of this page opens with. */
function TitleRow({
  campaignId,
  children,
}: {
  campaignId: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-4">
      <BackLink href={campaignHref(campaignId)} label="Back to campaign" />
      {children}
    </div>
  );
}

async function SubmissionSections({
  campaignId,
  patchHash,
}: {
  campaignId: string;
  patchHash: string;
}) {
  const result = await loadSubmission(campaignId, patchHash);

  if (!result.ok) {
    if (result.kind === "not_found") notFound();
    return (
      <div className="space-y-8">
        <LiveSubmissionPoll enabled />
        <TitleRow campaignId={campaignId}>
          <h1 className="break-all font-mono text-display-section font-medium leading-display tracking-tight text-foreground">
            {truncateDigest(patchHash, 8, 6)}
          </h1>
        </TitleRow>
        <SectionUnavailable
          message={
            result.kind === "unavailable"
              ? "This submission is temporarily unavailable (API/DB)."
              : "Could not load this submission."
          }
        />
      </div>
    );
  }

  const { detail } = result;
  if (detail.submission.campaign_id !== campaignId) notFound();

  const campaign = await loadCampaignOrNull(campaignId);
  const states = [
    detail.latest_state,
    ...detail.events.map((event) => event.state),
  ];
  const stalled = isStalled(detail.latest_state, detail.jobs);
  const live = !isTerminalState(detail.latest_state) && !stalled;
  const failedJob = stalled ? getFailedSubmissionJob(detail.jobs) : null;

  return (
    <div className="space-y-8">
      <LiveSubmissionPoll enabled={live} />

      <TitleRow campaignId={campaignId}>
        <SubmissionTitle detail={detail} campaign={campaign} />
      </TitleRow>

      {failedJob ? <FailedJobNotice job={failedJob} /> : null}

      <SubmissionStats detail={detail} campaign={campaign} />

      {/* Verdict evidence outranks provenance: these numbers are why the page
          gets opened, so they must not sit below a 13-row timeline. */}
      <BenchReports reports={detail.bench_reports} campaign={campaign} />

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_17rem] xl:items-start">
        <div className="min-w-0">
          <PipelineTimeline
            events={detail.events}
            latestState={detail.latest_state}
            stalled={stalled}
          />
        </div>

        <SubmissionMetadata
          submission={detail.submission}
          campaign={campaign}
        />
      </div>

      {reachedBuild(states) ? (
        <BuildLog
          campaignId={campaignId}
          patchHash={detail.submission.patch_hash || patchHash}
          live={live}
        />
      ) : null}
    </div>
  );
}

function SubmissionFallback({
  campaignId,
  patchHash,
}: {
  campaignId: string;
  patchHash: string;
}) {
  return (
    <div className="space-y-8" aria-busy="true">
      <TitleRow campaignId={campaignId}>
        {/* The digest is known from the URL, so the heading needs no skeleton. */}
        <h1 className="break-all font-mono text-display-section font-medium leading-display tracking-tight text-muted">
          {truncateDigest(patchHash, 8, 6)}
        </h1>
      </TitleRow>
      <div className="h-28 animate-pulse border border-border bg-border/10" />
      <div className="h-64 animate-pulse border border-border bg-border/10" />
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_17rem]">
        <div className="h-72 animate-pulse border border-border bg-border/10" />
        <div className="h-72 animate-pulse border border-border bg-border/10" />
      </div>
    </div>
  );
}

export default async function SubmissionPage({ params }: PageProps) {
  const { id: campaignId, patch_hash: rawPatchHash } = await params;
  const patchHash = decodePatchHash(rawPatchHash);
  if (!isPatchHash(patchHash)) notFound();

  return (
    <LiveSubmissionPollHost>
      <Suspense
        fallback={
          <SubmissionFallback campaignId={campaignId} patchHash={patchHash} />
        }
      >
        <SubmissionSections campaignId={campaignId} patchHash={patchHash} />
      </Suspense>
    </LiveSubmissionPollHost>
  );
}
