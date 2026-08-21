import {
  Activity,
  Clock,
  Download,
  GitBranch,
  Timer,
  TrendingUp,
  User,
} from "lucide-react";
import Link from "next/link";
import { CopyableMono } from "@/components/dashboard/copyable-mono";
import { GpuMark } from "@/components/dashboard/gpu";
import { LiveElapsed } from "@/components/dashboard/live-elapsed";
import {
  Panel,
  PanelRow,
  StatStrip,
  StatTile,
} from "@/components/dashboard/panel";
import { PipelineChip } from "@/components/dashboard/status-chip";
import { monoLinkClassName } from "@/components/ui/mono-link";
import { isSafeArtifactUrl } from "@/lib/api/artifacts";
import {
  elapsedBetween,
  formatDuration,
  formatUtc,
  formatUtcShort,
  formatUtcTime,
  truncateDigest,
  truncateHash,
  truncateMiddle,
} from "@/lib/api/format";
import { campaignHref, minerExplorerHref } from "@/lib/routes";
import {
  firstEventByState,
  getSubmissionStateMeta,
  isFailedState,
  isStalled,
  isTerminalState,
  stageIndex,
  SUBMISSION_STAGE_ORDER,
  type Campaign,
  type SubmissionDetail,
  type SubmissionEvent,
  type SubmissionJob,
} from "@/lib/api/types";

/**
 * Title block sitting inline with the back control, mirroring the campaign page.
 *
 * Identity only: the patch digest that names the page, its verdict, and the ids
 * you need to quote. Numbers go in the stat strip, provenance in the sidebar.
 */
export function SubmissionTitle({
  detail,
  campaign,
}: {
  detail: SubmissionDetail;
  campaign: Campaign | null;
}) {
  const { submission } = detail;

  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {/* The `sha256:` prefix is constant across every patch, so the heading
            drops it the way the submissions table does. */}
        <h1 className="break-all font-mono text-display-section font-medium leading-display tracking-tight text-foreground">
          {truncateDigest(submission.patch_hash, 8, 6)}
        </h1>
        <PipelineChip state={detail.latest_state} />
      </div>

      <div className="mt-2 flex flex-col flex-wrap items-start gap-x-4 gap-y-1 font-mono text-body text-muted">
        {campaign ? (
          <span className="text-secondary">
            Campaign:{" "}
            <Link
              href={campaignHref(submission.campaign_id)}
              className={monoLinkClassName(
                { tone: "accent" },
                "normal-case tracking-normal underline-offset-4 hover:underline"
              )}
            >
              {campaign.bench.model.hf_repo}
            </Link>
          </span>
        ) : null}
        <span className="max-w-full text-secondary">
          Patch hash:{" "}
          <CopyableMono
            value={submission.patch_hash}
            display={truncateHash(submission.patch_hash, 14, 8)}
          />
        </span>
      </div>
    </div>
  );
}

/** Infra job failure with no matching rejection event (PAR-42). */
export function FailedJobNotice({ job }: { job: SubmissionJob }) {
  return (
    <section
      aria-label="Job failure"
      className="border border-rust/30 bg-rust/5 px-4 py-4"
    >
      <p className="font-mono text-caption uppercase tracking-caps text-rust">
        Job failed
      </p>
      <p className="mt-2 break-words font-mono text-body text-rust">
        {job.last_error ?? "No error recorded."}
      </p>
      <p className="mt-2 max-w-2xl text-body leading-relaxed text-secondary">
        The pipeline stopped without recording a rejection, so the timeline ends
        at the last stage that succeeded. This is an infrastructure failure, not
        a verdict on the patch.
      </p>
    </section>
  );
}

/**
 * Stage progress as one segment per happy-path stage.
 *
 * Each segment names its stage on hover with when it landed, so the strip is
 * readable on its own instead of only being a progress ratio. The bar stays 1px
 * tall; the segment around it is taller purely to be hoverable. The tip waits
 * 150ms so a pass across the strip does not flash, then appears faster than a
 * native `title`.
 */
function StageTrack({
  events,
  reached,
  halted,
}: {
  events: SubmissionEvent[];
  reached: number;
  halted: boolean;
}) {
  const firstByState = firstEventByState(events);

  return (
    <div
      className="mt-1.5 flex gap-px"
      role="img"
      aria-label={`Stage ${reached + 1} of ${SUBMISSION_STAGE_ORDER.length}`}
    >
      {SUBMISSION_STAGE_ORDER.map((state, index) => {
        const meta = getSubmissionStateMeta(state);
        const event = firstByState.get(state);
        const cleared = index <= reached;
        const when = event
          ? `${formatUtcTime(event.created_at)} UTC`
          : cleared
            ? "reached"
            : halted
              ? "not reached"
              : "pending";

        return (
          <span
            key={state}
            className="group/seg relative z-0 flex h-3.5 flex-1 cursor-help items-center hover:z-20"
          >
            <span
              className={`h-1 w-full ${
                cleared
                  ? halted
                    ? "bg-rust/70"
                    : "bg-accent"
                  : "bg-border-strong"
              }`}
            />
            {/* Native `title` waits ~1s; this waits 150ms then fades in. Leave
                is delay-0 so the tip does not linger when the pointer moves. */}
            <span
              aria-hidden
              className={`pointer-events-none absolute bottom-full z-10 mb-1.5 w-max max-w-52 border border-border bg-background px-2 py-1.5 text-left opacity-0 transition-opacity delay-0 duration-75 group-hover/seg:opacity-100 group-hover/seg:delay-150 ${
                index === 0
                  ? "left-0"
                  : index === SUBMISSION_STAGE_ORDER.length - 1
                    ? "right-0"
                    : "left-1/2 -translate-x-1/2"
              }`}
            >
              <span className="block font-mono text-caption text-foreground">
                {meta.label} · {when}
              </span>
              <span className="mt-0.5 block font-mono text-caption leading-normal text-muted">
                {meta.description}
              </span>
            </span>
          </span>
        );
      })}
    </div>
  );
}

function ScoreTile({ score }: { score: number | null }) {
  if (score === null) {
    return (
      <StatTile
        icon={TrendingUp}
        label="Round score"
        value="—"
        hint="awaiting round"
      />
    );
  }

  return (
    <StatTile
      icon={TrendingUp}
      label="Round score"
      value={<span className="tabular-nums">{score}</span>}
      hint="0 is baseline speed"
    />
  );
}

function LatencyTile({ campaign }: { campaign: Campaign | null }) {
  const ttftCeiling = campaign?.sla.p99_ttft_ms ?? null;
  const itlCeiling = campaign?.sla.p99_itl_ms ?? null;

  return (
    <StatTile
      icon={Timer}
      label="p99 latency"
      value="—"
      hint={
        ttftCeiling !== null && itlCeiling !== null
          ? `ceiling ${ttftCeiling} / ${itlCeiling} ms`
          : "awaiting round"
      }
    />
  );
}

/**
 * The four facts that decide whether a patch mattered: how far it got, how long
 * it took, how much faster it made the engine, and whether it stayed inside the
 * latency gates. Everything else on the page is evidence for these.
 */
export function SubmissionStats({
  detail,
  campaign,
}: {
  detail: SubmissionDetail;
  campaign: Campaign | null;
}) {
  const { submission, events, latest_state: latestState } = detail;
  const stateMeta = getSubmissionStateMeta(latestState);
  const stalled = isStalled(latestState, detail.jobs);
  const halted = isFailedState(latestState) || stalled;
  const active = !isTerminalState(latestState) && !stalled;

  const reached = Math.max(
    stageIndex(latestState),
    ...events.map((event) => stageIndex(event.state)),
    0
  );
  const lastEventAt = events.at(-1)?.created_at ?? submission.committed_at;
  const settledMs = elapsedBetween(submission.committed_at, lastEventAt) ?? 0;
  // "Running for" must measure to now; settledMs only spans to the last event.
  const runningMs =
    elapsedBetween(submission.committed_at, new Date().toISOString()) ?? 0;

  return (
    <StatStrip
      label="Submission summary"
      className="grid-cols-2 lg:grid-cols-4"
    >
      <StatTile
        icon={Activity}
        label="Stage"
        value={
          <span className={halted ? "text-rust" : undefined}>
            {stateMeta.label}
          </span>
        }
        hint={`${Math.min(reached + 1, SUBMISSION_STAGE_ORDER.length)} of ${
          SUBMISSION_STAGE_ORDER.length
        } stages`}
      >
        <StageTrack events={events} reached={reached} halted={halted} />
      </StatTile>

      <StatTile
        icon={Clock}
        label={
          active ? "Running for" : stalled ? "Stalled after" : "Settled in"
        }
        value={
          active ? (
            <LiveElapsed
              since={submission.committed_at}
              initialMs={runningMs}
              className="text-accent"
            />
          ) : (
            <span className={stalled ? "text-rust" : undefined}>
              {formatDuration(settledMs)}
            </span>
          )
        }
        hint={`committed ${formatUtcShort(submission.committed_at)} UTC`}
      />

      <ScoreTile score={detail.round?.score ?? null} />
      <LatencyTile campaign={campaign} />
    </StatStrip>
  );
}

function PatchArtifact({ url }: { url: string }) {
  if (!url) {
    return <span className="text-muted">—</span>;
  }

  // Miner-supplied URL that failed validation: show it, never link it.
  if (!isSafeArtifactUrl(url)) {
    return (
      <span className="break-all text-muted" title={url}>
        {truncateMiddle(url, 20, 12)}
      </span>
    );
  }

  return (
    <a
      href={url}
      rel="noreferrer nofollow"
      target="_blank"
      className="inline-flex items-center gap-1.5 text-secondary underline decoration-border underline-offset-4 transition-colors hover:text-foreground"
    >
      <Download className="size-3 shrink-0" aria-hidden />
      Download diff
    </a>
  );
}

/**
 * Sidebar column: who submitted the patch and what it was built from. Reference
 * material, so it sits beside the timeline rather than above it.
 */
export function SubmissionMetadata({
  submission,
  campaign,
}: {
  submission: SubmissionDetail["submission"];
  campaign: Campaign | null;
}) {
  return (
    <aside className="grid gap-6 sm:grid-cols-2 xl:grid-cols-1 xl:content-start">
      <Panel icon={User} title="Miner">
        <PanelRow label="Hotkey">
          <CopyableMono
            value={submission.hotkey}
            display={truncateMiddle(submission.hotkey, 12, 8)}
            href={minerExplorerHref(submission.hotkey)}
            hint="Open taomarketcap and copy miner hotkey"
          />
        </PanelRow>
        <PanelRow label="Committed">
          <span className="text-secondary">
            {formatUtc(submission.committed_at)}
          </span>
          {submission.commit_block !== null ? (
            <p className="mt-1 text-caption text-muted">
              block {submission.commit_block.toLocaleString("en-US")}
            </p>
          ) : null}
        </PanelRow>
        <PanelRow label="Submission id">
          <CopyableMono
            value={submission.id}
            display={truncateMiddle(submission.id, 10, 8)}
          />
        </PanelRow>
      </Panel>

      <Panel icon={GitBranch} title="Build inputs">
        <PanelRow label="Patch artifact">
          <PatchArtifact url={submission.retrieval_url} />
        </PanelRow>
        <PanelRow label="Baseline commit">
          <CopyableMono
            value={submission.baseline_commit}
            display={truncateMiddle(submission.baseline_commit, 10, 8)}
          />
        </PanelRow>
        <PanelRow label="Engine image">
          {submission.engine_image_ref ? (
            <CopyableMono
              value={submission.engine_image_ref}
              display={truncateHash(submission.engine_image_ref, 14, 8)}
            />
          ) : (
            <span className="text-muted">Not built yet</span>
          )}
        </PanelRow>
        {campaign && campaign.gpu_skus.length > 0 ? (
          <PanelRow label="Target GPUs">
            <span
              className="inline-flex items-center gap-1.5 text-secondary"
              title={campaign.gpu_skus.join(", ")}
            >
              <GpuMark
                skus={campaign.gpu_skus}
                className="size-3.5 shrink-0 text-muted"
              />
              {campaign.gpu_skus.join(" · ")}
            </span>
          </PanelRow>
        ) : null}
      </Panel>
    </aside>
  );
}
