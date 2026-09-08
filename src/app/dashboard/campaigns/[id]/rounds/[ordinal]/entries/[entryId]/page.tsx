import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BackLink } from "@/components/dashboard/back-link";
import { CopyableMono } from "@/components/dashboard/copyable-mono";
import {
  EntryReportEvidence,
  EntryReportPrompts,
  EntryReportStats,
  EntryReportTrace,
} from "@/components/dashboard/entry-report";
import { SectionUnavailable } from "@/components/dashboard/section-unavailable";
import { EntryStatusChip } from "@/components/dashboard/status-chip";
import { getRoundByOrdinal, getRoundEntryReport } from "@/lib/api/endpoints";
import { isNotFound, isUnavailable } from "@/lib/api/errors";
import { truncateMiddle } from "@/lib/api/format";
import { parseEntryId, parseRoundOrdinal, roundHref } from "@/lib/routes";
import type { RoundEntryReport } from "@/lib/api/types";

type PageProps = {
  params: Promise<{ id: string; ordinal: string; entryId: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { ordinal: rawOrdinal } = await params;
  const ordinal = parseRoundOrdinal(rawOrdinal);
  return {
    title:
      ordinal === null
        ? "Score breakdown · Pareton"
        : `Round ${ordinal} score breakdown · Pareton`,
    description:
      "Per-prompt speedups, timings, and gate reasons behind one entry's round score.",
  };
}

/**
 * The report is addressed by round id, but the URL carries the ordinal, so the
 * round has to resolve first. That also means a bad ordinal 404s here rather
 * than sending a nonsense id to the API.
 */
async function loadReport(
  campaignId: string,
  ordinal: number,
  entryId: number
): Promise<
  | { ok: true; report: RoundEntryReport }
  | { ok: false; kind: "not_found" | "unavailable" | "error" }
> {
  try {
    const round = await getRoundByOrdinal(campaignId, ordinal);
    if (round === null) return { ok: false, kind: "not_found" };
    const report = await getRoundEntryReport(round.id, entryId);
    return { ok: true, report };
  } catch (error) {
    if (isNotFound(error)) return { ok: false, kind: "not_found" };
    if (isUnavailable(error)) return { ok: false, kind: "unavailable" };
    return { ok: false, kind: "error" };
  }
}

function TitleRow({
  campaignId,
  ordinal,
  children,
}: {
  campaignId: string;
  ordinal: number;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-4">
      <BackLink href={roundHref(campaignId, ordinal)} label="Back to round" />
      {children}
    </div>
  );
}

function Heading({
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
      Round {ordinal} breakdown
    </h1>
  );
}

async function ReportSections({
  campaignId,
  ordinal,
  entryId,
}: {
  campaignId: string;
  ordinal: number;
  entryId: number;
}) {
  const result = await loadReport(campaignId, ordinal, entryId);

  if (!result.ok) {
    if (result.kind === "not_found") notFound();
    return (
      <div className="space-y-8">
        <TitleRow campaignId={campaignId} ordinal={ordinal}>
          <Heading ordinal={ordinal} />
        </TitleRow>
        <SectionUnavailable
          message={
            result.kind === "unavailable"
              ? "This breakdown is temporarily unavailable (API/DB)."
              : "Could not load this breakdown."
          }
        />
      </div>
    );
  }

  const { report } = result;

  return (
    <div className="space-y-8">
      <TitleRow campaignId={campaignId} ordinal={ordinal}>
        <div className="min-w-0 space-y-2">
          <Heading ordinal={ordinal} />
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <EntryStatusChip status={report.status} />
            <span className="font-mono text-body text-secondary">
              {report.role.replaceAll("_", " ")}
            </span>
            {report.hotkey ? (
              <CopyableMono
                value={report.hotkey}
                display={truncateMiddle(report.hotkey)}
              />
            ) : null}
          </div>
        </div>
      </TitleRow>

      <EntryReportStats report={report} />

      <p className="max-w-2xl text-body leading-relaxed text-secondary">
        The round score is the scoring rule applied to the prompts below. Both
        engines are compared at the same output token count, so a candidate that
        stops early cannot buy speed by answering less: a prompt under the
        tolerance bar scores nothing and shows its gate reason.
      </p>

      <EntryReportPrompts report={report} />
      <EntryReportTrace report={report} />
      <EntryReportEvidence report={report} />
    </div>
  );
}

function ReportFallback({
  campaignId,
  ordinal,
}: {
  campaignId: string;
  ordinal: number;
}) {
  return (
    <div className="space-y-8" aria-busy="true">
      <TitleRow campaignId={campaignId} ordinal={ordinal}>
        <Heading ordinal={ordinal} muted />
      </TitleRow>
      <div className="h-28 animate-pulse border border-border bg-border/10" />
      <div className="h-96 animate-pulse border border-border bg-border/10" />
    </div>
  );
}

export default async function RoundEntryReportPage({ params }: PageProps) {
  const {
    id: campaignId,
    ordinal: rawOrdinal,
    entryId: rawEntryId,
  } = await params;
  const ordinal = parseRoundOrdinal(rawOrdinal);
  const entryId = parseEntryId(rawEntryId);
  if (ordinal === null || entryId === null) notFound();

  return (
    <Suspense
      fallback={<ReportFallback campaignId={campaignId} ordinal={ordinal} />}
    >
      <ReportSections
        campaignId={campaignId}
        ordinal={ordinal}
        entryId={entryId}
      />
    </Suspense>
  );
}
