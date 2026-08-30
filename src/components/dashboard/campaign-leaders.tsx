import { Crown, Repeat2, TrendingUp, Trophy } from "lucide-react";
import Link from "next/link";
import { CopyableMono } from "@/components/dashboard/copyable-mono";
import {
  Panel,
  PanelRow,
  StatStrip,
  StatTile,
} from "@/components/dashboard/panel";
import { ScoreProgressChart } from "@/components/dashboard/score-progress-chart";
import { EmptyState } from "@/components/ui/empty-state";
import { monoLinkClassName } from "@/components/ui/mono-link";
import {
  formatScore,
  formatUtc,
  truncateHash,
  truncateMiddle,
} from "@/lib/api/format";
import { minerExplorerHref, roundHref, submissionHref } from "@/lib/routes";
import type {
  Campaign,
  CampaignStatus,
  Leader,
  ScoreProgressSeries,
} from "@/lib/api/types";

export function EmptyLeaders({
  status,
  hasScoredHistory = false,
}: {
  status: CampaignStatus;
  /** Scored rounds exist, but the crown is vacant (leader vacated). */
  hasScoredHistory?: boolean;
}) {
  const copy = emptyLeadersCopy(status, hasScoredHistory);
  return <EmptyState tone="accent" title={copy.title} message={copy.body} />;
}

function emptyLeadersCopy(
  status: CampaignStatus,
  hasScoredHistory: boolean
): { title: string; body: string } {
  if (hasScoredHistory) {
    return {
      title: status === "draft" ? "No leader yet" : "Crown vacant",
      body:
        status === "closed"
          ? "This campaign closed with no crown holder. The chart above is the score history from rounds that scored."
          : "No image currently holds the crown. The chart above is the score history from scored rounds.",
    };
  }
  if (status === "open") {
    return {
      title: "Crown vacant",
      body: "No image has beaten the baseline yet. The first challenger to clear the gates in a scored round takes the crown.",
    };
  }
  if (status === "draft") {
    return {
      title: "No leader yet",
      body: "This campaign has not opened. A crown holder appears once the first round scores.",
    };
  }
  return {
    title: "No leader",
    body: "This campaign closed without a scored round, so no image ever held the crown.",
  };
}

/** Score progress with the axis label the campaign actually scores on. */
function scoringLabel(campaign: Campaign): string {
  return campaign.scoring_rule.name.replaceAll("_", " ") || "score";
}

/**
 * Leaders section: who holds the crown, and how the number got where it is.
 *
 * The chart leads because the shape of the climb is the question people open
 * this tab with; the crown holder's digests sit under it for whoever needs to
 * pull the image.
 */
export function CampaignLeaders({
  campaign,
  leader,
  series,
}: {
  campaign: Campaign;
  /** Null when the crown is vacant, which is a normal state, not an error. */
  leader: Leader | null;
  series: ScoreProgressSeries;
}) {
  // The API returns newest first for lists; the chart reads left to right.
  const points = [...series.points].sort((a, b) => a.ordinal - b.ordinal);
  const scoredPoints = points.filter((point) => point.leader_score !== null);
  const best = scoredPoints.length
    ? Math.max(...scoredPoints.map((point) => point.leader_score ?? 0))
    : null;
  const bestRound =
    scoredPoints.find((point) => point.leader_score === best) ?? null;
  const latest = scoredPoints.at(-1) ?? null;

  if (!leader && scoredPoints.length === 0) {
    return <EmptyLeaders status={campaign.status} />;
  }

  return (
    <div className="space-y-6">
      <StatStrip label="Leader summary" className="grid-cols-2 lg:grid-cols-4">
        <StatTile
          icon={Crown}
          label="Crown holder"
          value={
            leader ? (
              <a
                href={minerExplorerHref(leader.hotkey)}
                target="_blank"
                rel="noopener noreferrer"
                title={leader.hotkey}
                className="underline decoration-border underline-offset-4 transition-colors hover:text-accent"
              >
                {truncateMiddle(leader.hotkey, 10, 6)}
              </a>
            ) : (
              "vacant"
            )
          }
          hint={leader ? `won at round ${leader.won_at_ordinal}` : "no holder"}
        />
        <StatTile
          icon={TrendingUp}
          label="Current score"
          value={leader ? formatScore(leader.last_score) : "—"}
          hint={scoringLabel(campaign)}
        />
        <StatTile
          icon={Trophy}
          label="Best score"
          value={best === null ? "—" : formatScore(best)}
          hint={
            bestRound === null
              ? "no scored round"
              : `round ${bestRound.ordinal}`
          }
        />
        <StatTile
          icon={Repeat2}
          label="Scored rounds"
          value={scoredPoints.length}
          hint={
            points.length === 0
              ? "no rounds"
              : `of ${points.length} recorded${
                  latest ? ` · latest R${latest.ordinal}` : ""
                }`
          }
        />
      </StatStrip>

      <Panel
        icon={TrendingUp}
        title="Score progress"
        meta={points.length > 0 ? `${points.length} rounds` : undefined}
        bodyClassName=""
      >
        {points.length === 0 ? (
          <p className="px-4 py-10 text-center text-body-lg leading-relaxed text-muted">
            No rounds have been recorded for this campaign yet.
          </p>
        ) : (
          <div className="px-4 py-5 sm:px-5">
            <ScoreProgressChart
              points={points}
              scoringLabel={scoringLabel(campaign)}
            />
          </div>
        )}
      </Panel>

      {leader ? (
        <Panel
          icon={Crown}
          title="Crown holder"
          bodyClassName="grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-3 [&>*]:min-w-0"
        >
          <div className="bg-background">
            <PanelRow label="Miner">
              <a
                href={minerExplorerHref(leader.hotkey)}
                target="_blank"
                rel="noopener noreferrer"
                title={leader.hotkey}
                className="text-secondary underline decoration-border underline-offset-4 transition-colors hover:text-foreground"
              >
                {truncateMiddle(leader.hotkey, 14, 8)}
              </a>
            </PanelRow>
          </div>
          <div className="bg-background">
            <PanelRow label="Patch">
              <Link
                href={submissionHref(leader.campaign_id, leader.patch_hash)}
                className={monoLinkClassName(
                  { tone: "accent" },
                  "normal-case tracking-normal underline-offset-4 hover:underline"
                )}
              >
                {truncateHash(leader.patch_hash)}
              </Link>
            </PanelRow>
          </div>
          <div className="bg-background">
            <PanelRow label="Won at round">
              <Link
                href={roundHref(leader.campaign_id, leader.won_at_ordinal)}
                className={monoLinkClassName(
                  { tone: "accent" },
                  "normal-case tracking-normal underline-offset-4 hover:underline"
                )}
              >
                Round {leader.won_at_ordinal}
              </Link>
            </PanelRow>
          </div>
          <div className="bg-background">
            <PanelRow label="Engine image">
              <CopyableMono
                value={leader.engine_image_ref}
                display={truncateHash(leader.engine_image_ref)}
              />
            </PanelRow>
          </div>
          <div className="bg-background">
            <PanelRow label="Last score">
              <span className="tabular-nums text-secondary">
                {formatScore(leader.last_score)}
              </span>
            </PanelRow>
          </div>
          <div className="bg-background">
            <PanelRow label="Updated">
              <span className="text-secondary">
                {formatUtc(leader.updated_at)}
              </span>
            </PanelRow>
          </div>
        </Panel>
      ) : (
        <EmptyLeaders status={campaign.status} hasScoredHistory />
      )}
    </div>
  );
}
