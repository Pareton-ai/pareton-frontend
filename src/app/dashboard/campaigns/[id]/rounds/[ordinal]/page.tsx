import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BackLink } from "@/components/dashboard/back-link";
import { LiveActivityLine } from "@/components/dashboard/live-activity";
import {
  LivePoll,
  LivePollHost,
  ROUND_POLL_INTERVAL_MS,
} from "@/components/dashboard/live-poll";
import {
  RoundMetadata,
  RoundStats,
  RoundTitle,
  RoundVoidNotice,
} from "@/components/dashboard/round-detail";
import { RoundEntries } from "@/components/dashboard/round-entries";
import { RoundPlan } from "@/components/dashboard/round-plan";
import { SectionUnavailable } from "@/components/dashboard/section-unavailable";
import { getCampaign, getRoundByOrdinal } from "@/lib/api/endpoints";
import { isNotFound, isUnavailable } from "@/lib/api/errors";
import { campaignHref, parseRoundOrdinal } from "@/lib/routes";
import {
  getRoundActivity,
  isLiveRound,
  type Campaign,
  type RoundDetail,
} from "@/lib/api/types";

type PageProps = {
  params: Promise<{ id: string; ordinal: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { ordinal: rawOrdinal } = await params;
  const ordinal = parseRoundOrdinal(rawOrdinal);
  return {
    title: ordinal === null ? "Round · Pareton" : `Round ${ordinal} · Pareton`,
    description:
      "Entries, seed, and outcome for one round of a Pareton campaign.",
  };
}

async function loadRound(
  campaignId: string,
  ordinal: number
): Promise<
  | { ok: true; round: RoundDetail }
  | { ok: false; kind: "not_found" | "unavailable" | "error" }
> {
  try {
    const round = await getRoundByOrdinal(campaignId, ordinal);
    if (round === null) return { ok: false, kind: "not_found" };
    return { ok: true, round };
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

/** The ordinal names the page and comes from the URL, so it needs no skeleton. */
function OrdinalHeading({
  ordinal,
  muted = false,
}: {
  ordinal: number;
  muted?: boolean;
}) {
  return (
    <h1
      className={`font-mono text-display-section font-medium leading-display tracking-tight ${
        muted ? "text-muted" : "text-foreground"
      }`}
    >
      Round {ordinal}
    </h1>
  );
}

async function RoundSections({
  campaignId,
  ordinal,
}: {
  campaignId: string;
  ordinal: number;
}) {
  const result = await loadRound(campaignId, ordinal);

  if (!result.ok) {
    if (result.kind === "not_found") notFound();
    return (
      <div className="space-y-8">
        <LivePoll enabled />
        <TitleRow campaignId={campaignId}>
          <OrdinalHeading ordinal={ordinal} />
        </TitleRow>
        <SectionUnavailable
          message={
            result.kind === "unavailable"
              ? "This round is temporarily unavailable (API/DB)."
              : "Could not load this round."
          }
        />
      </div>
    );
  }

  const { round } = result;
  const campaign = await loadCampaignOrNull(campaignId);
  const now = new Date().toISOString();
  const activity = getRoundActivity(round, now);

  return (
    <div className="space-y-8">
      <LivePoll enabled={isLiveRound(round.status)} />

      <TitleRow campaignId={campaignId}>
        <RoundTitle round={round} campaign={campaign} />
      </TitleRow>

      {round.status === "void" ? <RoundVoidNotice round={round} /> : null}

      <RoundStats round={round} now={now} />

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_17rem] xl:items-start">
        <div className="min-w-0">
          <RoundPlan round={round} now={now} />
          {activity ? <LiveActivityLine activity={activity} now={now} /> : null}
          <div className="mt-8">
            <RoundEntries
              campaignId={campaignId}
              entries={round.entries}
              nowIso={now}
            />
          </div>
        </div>

        <RoundMetadata campaignId={campaignId} round={round} />
      </div>
    </div>
  );
}

function RoundFallback({
  campaignId,
  ordinal,
}: {
  campaignId: string;
  ordinal: number;
}) {
  return (
    <div className="space-y-8" aria-busy="true">
      <TitleRow campaignId={campaignId}>
        <OrdinalHeading ordinal={ordinal} muted />
      </TitleRow>
      <div className="h-28 animate-pulse border border-border bg-border/10" />
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_17rem]">
        <div className="h-72 animate-pulse border border-border bg-border/10" />
        <div className="h-72 animate-pulse border border-border bg-border/10" />
      </div>
    </div>
  );
}

export default async function RoundPage({ params }: PageProps) {
  const { id: campaignId, ordinal: rawOrdinal } = await params;
  const ordinal = parseRoundOrdinal(rawOrdinal);
  if (ordinal === null) notFound();

  return (
    <LivePollHost intervalMs={ROUND_POLL_INTERVAL_MS}>
      <Suspense
        fallback={<RoundFallback campaignId={campaignId} ordinal={ordinal} />}
      >
        <RoundSections campaignId={campaignId} ordinal={ordinal} />
      </Suspense>
    </LivePollHost>
  );
}
