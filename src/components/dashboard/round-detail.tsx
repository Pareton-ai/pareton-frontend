import {
  Clock,
  Dices,
  Layers,
  Repeat2,
  TrendingUp,
  Trophy,
} from "lucide-react";
import Link from "next/link";
import { CopyableMono } from "@/components/dashboard/copyable-mono";
import { GpuMark, shortSku } from "@/components/dashboard/gpu";
import { LiveElapsed } from "@/components/dashboard/live-elapsed";
import {
  Panel,
  PanelRow,
  StatStrip,
  StatTile,
} from "@/components/dashboard/panel";
import { RoundStatusChip } from "@/components/dashboard/status-chip";
import { monoLinkClassName } from "@/components/ui/mono-link";
import {
  elapsedBetween,
  formatDuration,
  formatUtc,
  formatUtcShort,
  truncateDigest,
  truncateHash,
  truncateMiddle,
} from "@/lib/api/format";
import { campaignHref, submissionHref } from "@/lib/routes";
import {
  isLiveRound,
  type Campaign,
  type RoundDetail,
  type RoundEntry,
} from "@/lib/api/types";

/**
 * Title block sitting inline with the back control, mirroring the submission
 * page: what names the page, its verdict, and the ids you need to quote.
 */
export function RoundTitle({
  round,
  campaign,
}: {
  round: RoundDetail;
  campaign: Campaign | null;
}) {
  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h1 className="font-mono text-display-section font-medium leading-display tracking-tight text-foreground">
          Round {round.ordinal}
        </h1>
        <RoundStatusChip status={round.status} />
      </div>

      <div className="mt-2 flex flex-col flex-wrap items-start gap-x-4 gap-y-1 font-mono text-body text-muted">
        {campaign ? (
          <span className="text-secondary">
            Campaign:{" "}
            <Link
              href={campaignHref(round.campaign_id)}
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
          Round id:{" "}
          <CopyableMono
            value={round.id}
            display={truncateMiddle(round.id, 12, 8)}
          />
        </span>
      </div>
    </div>
  );
}

/**
 * A void round produced no verdict.
 *
 * Stated up front because the entries below still look like a normal run: they
 * ran, they carry statuses, and none of it counts.
 */
export function RoundVoidNotice({ round }: { round: RoundDetail }) {
  return (
    <section
      aria-label="Round voided"
      className="border border-rust/30 bg-rust/5 px-4 py-4"
    >
      <p className="font-mono text-caption uppercase tracking-caps text-rust">
        Round voided
      </p>
      <p className="mt-2 break-words font-mono text-body text-rust">
        {round.void_reason?.replaceAll("_", " ") ?? "No reason recorded."}
      </p>
      <p className="mt-2 max-w-2xl text-body leading-relaxed text-secondary">
        A void round scores nothing and leaves the leader where it was. The
        entries below ran, but their results do not count.
      </p>
    </section>
  );
}

/**
 * Best challenger score in the round.
 *
 * Baseline and the incumbent leader are excluded. Baseline's 0.0 is the
 * reference line, and the leader already holds the crown: counting either
 * would report a top score for a round no challenger scored in. A null score
 * means disqualified or infra-failed, never zero.
 */
export function topChallengerScore(
  entries: readonly RoundEntry[]
): number | null {
  const scores = entries.flatMap((entry) =>
    entry.role === "challenger" && entry.score !== null ? [entry.score] : []
  );
  return scores.length === 0 ? null : Math.max(...scores);
}

function durationLabel(round: RoundDetail): string {
  if (round.status === "pending") return "Waiting for";
  return isLiveRound(round.status) ? "Running for" : "Settled in";
}

function OutcomeTile({ round }: { round: RoundDetail }) {
  const winnerPatch = patchHashFor(round.entries, round.winner_submission_id);

  if (round.leader_changed === null) {
    return (
      <StatTile
        icon={Trophy}
        label="Leader"
        value="—"
        hint={round.status === "void" ? "round voided" : "not decided yet"}
      />
    );
  }

  return (
    <StatTile
      icon={Trophy}
      label="Leader"
      value={round.leader_changed ? "Changed" : "Held"}
      hint={
        round.leader_changed
          ? winnerPatch
            ? `won by ${truncateDigest(winnerPatch, 8, 6)}`
            : "a challenger took the lead"
          : "incumbent kept the lead"
      }
    />
  );
}

/**
 * The four facts that decide whether a round mattered: who turned up, how long
 * it took, how fast the best image was, and whether the lead moved.
 */
export function RoundStats({
  round,
  now,
}: {
  round: RoundDetail;
  /** Server render time, so the first paint and the tests agree. */
  now: string;
}) {
  const scored = round.entries.filter(
    (entry) => entry.status === "scored"
  ).length;
  const disqualified = round.entries.filter(
    (entry) => entry.status === "disqualified"
  ).length;

  const elapsedMs =
    elapsedBetween(round.created_at, round.completed_at ?? now) ?? 0;
  const top = topChallengerScore(round.entries);

  return (
    <StatStrip label="Round summary" className="grid-cols-2 lg:grid-cols-4">
      <StatTile
        icon={Layers}
        label="Entries"
        value={round.entries.length}
        hint={`${scored} scored · ${disqualified} disqualified`}
      />

      <StatTile
        icon={Clock}
        label={durationLabel(round)}
        value={
          isLiveRound(round.status) ? (
            <LiveElapsed
              since={round.created_at}
              initialMs={elapsedMs}
              className="text-accent"
            />
          ) : (
            formatDuration(elapsedMs)
          )
        }
        hint={`seated ${formatUtcShort(round.created_at)} UTC`}
      />

      <StatTile
        icon={TrendingUp}
        label="Top score"
        value={top === null ? "—" : <span className="tabular-nums">{top}</span>}
        hint={top === null ? "no scored challenger" : "0 is baseline speed"}
      />

      <OutcomeTile round={round} />
    </StatStrip>
  );
}

/** The patch a round entry ran, so a submission id can link to its page. */
function patchHashFor(
  entries: readonly RoundEntry[],
  submissionId: string | null
): string | null {
  if (submissionId === null) return null;
  return (
    entries.find((entry) => entry.submission_id === submissionId)?.patch_hash ??
    null
  );
}

/**
 * A submission referenced by id only.
 *
 * Links to the submission page when the round seated it, since only an entry
 * carries the patch hash the route needs. Otherwise the raw id is still worth
 * showing: it is what you quote in support.
 */
function SubmissionRef({
  campaignId,
  entries,
  submissionId,
}: {
  campaignId: string;
  entries: readonly RoundEntry[];
  submissionId: string | null;
}) {
  if (submissionId === null) return <span className="text-muted">—</span>;

  const patchHash = patchHashFor(entries, submissionId);
  if (patchHash === null) {
    return (
      <CopyableMono
        value={submissionId}
        display={truncateMiddle(submissionId, 10, 8)}
      />
    );
  }

  return (
    <Link
      href={submissionHref(campaignId, patchHash)}
      className="break-all text-secondary underline decoration-border underline-offset-4 transition-colors hover:text-foreground"
    >
      {truncateDigest(patchHash, 10, 6)}
    </Link>
  );
}

function scoringRuleLabel(rule: Record<string, unknown>): string {
  const name = rule.name;
  return typeof name === "string" && name !== ""
    ? name.replaceAll("_", " ")
    : "—";
}

/**
 * Sidebar column: the inputs that made this round reproducible and the outcome
 * it recorded. Reference material, so it sits beside the entries.
 */
export function RoundMetadata({
  campaignId,
  round,
}: {
  campaignId: string;
  round: RoundDetail;
}) {
  return (
    <aside className="grid gap-6 sm:grid-cols-2 xl:grid-cols-1 xl:content-start">
      <Panel icon={Dices} title="Seed">
        <PanelRow label="Seed block">
          <span className="tabular-nums text-secondary">
            {round.seed_block.toLocaleString("en-US")}
          </span>
        </PanelRow>
        <PanelRow label="Block hash">
          <CopyableMono
            value={round.seed_block_hash}
            display={truncateMiddle(round.seed_block_hash, 12, 8)}
          />
        </PanelRow>
        <PanelRow label="Seed">
          <CopyableMono
            value={round.seed_hex}
            display={truncateMiddle(round.seed_hex, 12, 8)}
          />
        </PanelRow>
        <PanelRow label="Sampled trace">
          <CopyableMono
            value={round.sampled_trace_sha256}
            display={truncateHash(round.sampled_trace_sha256, 12, 8)}
          />
        </PanelRow>
      </Panel>

      <Panel icon={Repeat2} title="Round">
        <PanelRow label="GPU">
          <span
            className="inline-flex items-center gap-1.5 text-secondary"
            title={round.gpu_sku}
          >
            <GpuMark
              skus={[round.gpu_sku]}
              className="size-3.5 shrink-0 text-muted"
            />
            {shortSku(round.gpu_sku)}
          </span>
        </PanelRow>
        <PanelRow label="Scoring rule">
          <span className="text-secondary">
            {scoringRuleLabel(round.scoring_rule)}
          </span>
        </PanelRow>
        <PanelRow label="Baseline drift">
          {round.baseline_drift === null ? (
            <span className="text-muted">—</span>
          ) : (
            <span className="tabular-nums text-secondary">
              {round.baseline_drift}
            </span>
          )}
        </PanelRow>
        <PanelRow label="Incumbent">
          <SubmissionRef
            campaignId={campaignId}
            entries={round.entries}
            submissionId={round.incumbent_submission_id}
          />
        </PanelRow>
        <PanelRow label="Winner">
          <SubmissionRef
            campaignId={campaignId}
            entries={round.entries}
            submissionId={round.winner_submission_id}
          />
        </PanelRow>
        <PanelRow label="Completed">
          {round.completed_at === null ? (
            <span className="text-muted">Not yet</span>
          ) : (
            <span className="text-secondary">
              {formatUtc(round.completed_at)}
            </span>
          )}
        </PanelRow>
      </Panel>
    </aside>
  );
}
