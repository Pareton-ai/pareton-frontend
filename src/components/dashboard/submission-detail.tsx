import Link from "next/link";
import { CopyableMono } from "@/components/dashboard/copyable-mono";
import { FieldGrid, FieldGridItem } from "@/components/dashboard/field";
import { LiveElapsed } from "@/components/dashboard/live-elapsed";
import {
  BenchVerdictChip,
  PipelineChip,
} from "@/components/dashboard/status-chip";
import { monoLinkClassName } from "@/components/ui/mono-link";
import {
  elapsedBetween,
  formatDuration,
  formatUtc,
  truncateHash,
  truncateMiddle,
} from "@/lib/api/format";
import { campaignHref } from "@/lib/routes";
import {
  getFailedSubmissionJob,
  getSubmissionStateMeta,
  isStalled,
  isTerminalState,
  stageIndex,
  SUBMISSION_STAGE_ORDER,
  type Campaign,
  type SubmissionDetail,
  type SubmissionJob,
} from "@/lib/api/types";

function ProgressTrack({
  reached,
  halted,
}: {
  reached: number;
  halted: boolean;
}) {
  return (
    <div
      className="flex gap-px"
      role="img"
      aria-label={`Stage ${reached + 1} of ${SUBMISSION_STAGE_ORDER.length}`}
    >
      {SUBMISSION_STAGE_ORDER.map((state, index) => (
        <span
          key={state}
          className={`h-1 flex-1 ${
            index <= reached
              ? halted
                ? "bg-rust/70"
                : "bg-accent"
              : "bg-border-strong"
          }`}
        />
      ))}
    </div>
  );
}

/** Infra job failure with no matching rejection event (PAR-42). */
function FailedJobNotice({ job }: { job: SubmissionJob }) {
  return (
    <div className="border-b border-rust/30 bg-rust/5 px-5 py-4 sm:px-6">
      <p className="font-mono text-caption uppercase tracking-caps text-rust">
        {job.kind} job failed
      </p>
      <p className="mt-2 break-words font-mono text-body text-rust">
        {job.last_error ?? "No error recorded."}
      </p>
      <p className="mt-2 max-w-2xl text-body leading-relaxed text-secondary">
        The pipeline stopped without recording a rejection, so the timeline
        below ends at the last stage that succeeded. This is an infrastructure
        failure, not a verdict on the patch.
      </p>
    </div>
  );
}

export function SubmissionDetailHeader({
  detail,
  campaign,
}: {
  detail: SubmissionDetail;
  campaign: Campaign | null;
}) {
  const { submission, events, latest_state: latestState } = detail;
  const stateMeta = getSubmissionStateMeta(latestState);
  const failedJob = getFailedSubmissionJob(detail.jobs);
  const stalled = isStalled(latestState, detail.jobs);
  const halted = latestState === "rejected" || failedJob !== null;
  const active = !isTerminalState(latestState) && !stalled;

  const reached = Math.max(
    ...events.map((event) => stageIndex(event.state)),
    0
  );
  const lastEventAt = events.at(-1)?.created_at ?? submission.committed_at;
  const settledMs = elapsedBetween(submission.committed_at, lastEventAt) ?? 0;

  return (
    <section className="border border-border">
      <div className="border-b border-border px-5 py-5 sm:px-6">
        <div className="flex flex-wrap items-center gap-3">
          <PipelineChip state={latestState} />
          {detail.bench_verdict ? (
            <BenchVerdictChip verdict={detail.bench_verdict} />
          ) : null}
          {campaign ? (
            <Link
              href={campaignHref(submission.campaign_id)}
              className={monoLinkClassName({ size: "sm", tone: "muted" })}
            >
              {campaign.bench.model.hf_repo}
            </Link>
          ) : null}
        </div>

        <h1 className="mt-4 break-all font-mono text-display-section font-medium tracking-tight text-foreground">
          {truncateHash(submission.patch_hash, 12, 8)}
        </h1>

        <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2">
          <CopyableMono
            value={submission.patch_hash}
            display="Copy full patch hash"
          />
          <p className="font-mono text-body-sm text-muted">
            {stateMeta.description}
          </p>
        </div>
      </div>

      {failedJob ? <FailedJobNotice job={failedJob} /> : null}

      <div className="px-5 py-5 sm:px-6">
        <ProgressTrack reached={reached} halted={halted} />
        <div className="mt-3 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <p className="font-mono text-caption uppercase tracking-caps text-muted">
            Stage {Math.min(reached + 1, SUBMISSION_STAGE_ORDER.length)} of{" "}
            {SUBMISSION_STAGE_ORDER.length}
            <span className={halted ? "text-rust" : "text-secondary"}>
              {" · "}
              {stateMeta.label}
            </span>
          </p>
          <p className="font-mono text-caption uppercase tracking-caps text-muted">
            {active
              ? "Running for "
              : stalled
                ? "Stalled after "
                : "Settled in "}
            <span className={stalled ? "text-rust" : "text-secondary"}>
              {active ? (
                <LiveElapsed
                  since={submission.committed_at}
                  initialMs={settledMs}
                />
              ) : (
                formatDuration(settledMs)
              )}
            </span>
          </p>
        </div>
      </div>
    </section>
  );
}

export function SubmissionMetadata({
  submission,
}: {
  submission: SubmissionDetail["submission"];
}) {
  return (
    <section aria-label="Submission metadata" className="border border-border">
      <div className="border-b border-border px-5 py-4 sm:px-6">
        <h2 className="font-mono text-body-sm uppercase tracking-caps text-muted">
          Metadata
        </h2>
      </div>

      <FieldGrid>
        <FieldGridItem label="Miner hotkey">
          <CopyableMono
            value={submission.hotkey}
            display={truncateMiddle(submission.hotkey, 12, 8)}
          />
        </FieldGridItem>

        <FieldGridItem label="Committed">
          <p className="font-mono text-body-sm text-secondary">
            {formatUtc(submission.committed_at)}
          </p>
          {submission.commit_block !== null ? (
            <p className="mt-1 font-mono text-caption text-muted">
              block {submission.commit_block.toLocaleString("en-US")}
            </p>
          ) : null}
        </FieldGridItem>

        <FieldGridItem label="Baseline commit">
          <CopyableMono
            value={submission.baseline_commit}
            display={truncateMiddle(submission.baseline_commit, 10, 8)}
          />
        </FieldGridItem>

        <FieldGridItem label="Engine image">
          {submission.engine_image_ref ? (
            <CopyableMono
              value={submission.engine_image_ref}
              display={truncateHash(submission.engine_image_ref, 16, 10)}
            />
          ) : (
            <p className="font-mono text-body-sm text-muted">Not built yet</p>
          )}
        </FieldGridItem>

        <FieldGridItem label="Submission id">
          <CopyableMono
            value={submission.id}
            display={truncateMiddle(submission.id, 10, 8)}
          />
        </FieldGridItem>

        <FieldGridItem label="Patch artifact">
          {submission.retrieval_url ? (
            <a
              href={submission.retrieval_url}
              rel="noreferrer nofollow"
              target="_blank"
              className={monoLinkClassName(
                { size: "sm", tone: "accent" },
                "inline-flex normal-case tracking-normal underline-offset-4 hover:underline"
              )}
            >
              Download diff ↗
            </a>
          ) : (
            <p className="font-mono text-body-sm text-muted">—</p>
          )}
        </FieldGridItem>
      </FieldGrid>
    </section>
  );
}
