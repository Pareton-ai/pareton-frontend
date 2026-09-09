import { Activity, Gauge, ListChecks, ShieldCheck, Timer } from "lucide-react";
import {
  Panel,
  PanelRow,
  StatStrip,
  StatTile,
} from "@/components/dashboard/panel";
import { CopyableMono } from "@/components/dashboard/copyable-mono";
import { EmptyState } from "@/components/ui/empty-state";
import { formatScore, truncateDigest } from "@/lib/api/format";
import { readEngineTimings, type EngineTiming } from "@/lib/api/trace";
import type { PromptScore, RoundEntryReport } from "@/lib/api/types";

/** Percent for reading, e.g. `+71.94%`. The sign matters: a patch can be slower. */
function formatPercent(value: number): string {
  const percent = (value * 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return value > 0 ? `+${percent}%` : `${percent}%`;
}

/** TTFT and inter-token gaps live in milliseconds; a stall past 1s does not. */
function formatMs(value: number | null): string {
  if (value === null) return "—";
  if (value >= 1) return `${value.toFixed(3)}s`;
  return `${(value * 1000).toFixed(2)}ms`;
}

function formatSeconds(value: number | null): string {
  return value === null ? "—" : `${value.toFixed(3)}s`;
}

/**
 * The scoring rule's tolerance, as a percentage of the baseline's tokens.
 *
 * Read off the round's own rule rather than hardcoded, because a campaign can
 * pin its own and the number is the whole explanation for a zeroed prompt.
 */
function toleranceLabel(rule: Record<string, unknown>): string | null {
  const tolerance = rule.tolerance;
  if (typeof tolerance !== "number" || !Number.isFinite(tolerance)) return null;
  return `${(tolerance * 100).toLocaleString("en-US", {
    maximumFractionDigits: 1,
  })}%`;
}

function PromptRow({ prompt }: { prompt: PromptScore }) {
  const gated = prompt.reason !== null;
  return (
    <tr className="border-t border-border/80">
      <td className="whitespace-nowrap px-4 py-3 font-mono text-body text-secondary sm:px-5">
        {prompt.request_id}
      </td>
      <td
        className={`whitespace-nowrap px-3 py-3 text-right font-mono text-body tabular-nums ${
          gated ? "text-muted" : "text-foreground"
        }`}
      >
        {/* A gated prompt measured nothing, so its 0.0 is not a result to show
            as one. A real 0.0 means baseline speed and does print. */}
        {gated ? "—" : formatPercent(prompt.speedup)}
      </td>
      <td className="whitespace-nowrap px-3 py-3 text-right font-mono text-body tabular-nums text-secondary">
        {formatSeconds(prompt.baseline_e2e_s)}
      </td>
      <td className="whitespace-nowrap px-3 py-3 text-right font-mono text-body tabular-nums text-secondary">
        {formatSeconds(prompt.candidate_e2e_s)}
      </td>
      <td className="whitespace-nowrap px-3 py-3 text-right font-mono text-body tabular-nums text-secondary">
        {prompt.aligned_tokens}
      </td>
      <td className="px-3 py-3 pr-4 font-mono text-body text-rust sm:pr-5">
        {prompt.reason ?? <span className="text-muted">—</span>}
      </td>
    </tr>
  );
}

function PromptTable({ prompts }: { prompts: readonly PromptScore[] }) {
  return (
    /* The table is wider than a phone; it scrolls in its own box so the page
       never scrolls sideways. */
    <div className="overflow-x-auto">
      <table className="w-full min-w-[46rem] border-collapse text-left">
        <thead>
          <tr>
            <th className="px-4 py-3 font-mono text-caption uppercase tracking-caps text-muted sm:px-5">
              Prompt
            </th>
            <th className="px-3 py-3 text-right font-mono text-caption uppercase tracking-caps text-muted">
              Speedup
            </th>
            <th className="px-3 py-3 text-right font-mono text-caption uppercase tracking-caps text-muted">
              Baseline
            </th>
            <th className="px-3 py-3 text-right font-mono text-caption uppercase tracking-caps text-muted">
              Candidate
            </th>
            <th className="px-3 py-3 text-right font-mono text-caption uppercase tracking-caps text-muted">
              Tokens
            </th>
            <th className="px-3 py-3 pr-4 font-mono text-caption uppercase tracking-caps text-muted sm:pr-5">
              Gate
            </th>
          </tr>
        </thead>
        <tbody>
          {prompts.map((prompt) => (
            <PromptRow key={prompt.request_id} prompt={prompt} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Harness blob rendered as key/value: its keys vary by campaign profile. */
function BlobRows({ blob }: { blob: Record<string, unknown> }) {
  const rows = Object.entries(blob).filter(
    ([, value]) => value !== null && typeof value !== "object"
  );
  if (rows.length === 0) return null;

  return (
    <>
      {rows.map(([key, value]) => (
        <PanelRow key={key} label={key.replaceAll("_", " ")}>
          <span className="tabular-nums">{String(value)}</span>
        </PanelRow>
      ))}
    </>
  );
}

function TimingRow({ timing }: { timing: EngineTiming }) {
  return (
    <tr className="border-t border-border/80">
      <td className="whitespace-nowrap px-4 py-3 font-mono text-body text-secondary sm:px-5">
        {timing.requestId}
      </td>
      <td className="whitespace-nowrap px-3 py-3 text-right font-mono text-body tabular-nums text-foreground">
        {formatMs(timing.ttftS)}
      </td>
      <td className="whitespace-nowrap px-3 py-3 text-right font-mono text-body tabular-nums text-secondary">
        {formatSeconds(timing.totalS)}
      </td>
      <td className="whitespace-nowrap px-3 py-3 text-right font-mono text-body tabular-nums text-secondary">
        {timing.completionTokens}
      </td>
      <td className="whitespace-nowrap px-3 py-3 text-right font-mono text-body tabular-nums text-secondary">
        {formatMs(timing.maxItlS)}
      </td>
      <td className="px-3 py-3 pr-4 font-mono text-body sm:pr-5">
        {timing.coalesced ? (
          <span className="text-rust">
            {timing.gapCount} gaps for {timing.completionTokens} tokens
          </span>
        ) : (
          <span className="text-muted">—</span>
        )}
      </td>
    </tr>
  );
}

/**
 * The engine's own replay, request by request.
 *
 * The prompt table above says how this entry compared to the baseline; this
 * says what the engine actually did, which is where a miner looks after a
 * speedup fails to reproduce.
 */
export function EntryReportTrace({ report }: { report: RoundEntryReport }) {
  const timings = readEngineTimings(report.sla);
  if (timings.length === 0) return null;

  return (
    <Panel
      icon={Activity}
      title="Request trace"
      meta={`${timings.length} requests`}
      bodyClassName=""
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[46rem] border-collapse text-left">
          <thead>
            <tr>
              <th className="px-4 py-3 font-mono text-caption uppercase tracking-caps text-muted sm:px-5">
                Request
              </th>
              <th className="px-3 py-3 text-right font-mono text-caption uppercase tracking-caps text-muted">
                TTFT
              </th>
              <th className="px-3 py-3 text-right font-mono text-caption uppercase tracking-caps text-muted">
                Total
              </th>
              <th className="px-3 py-3 text-right font-mono text-caption uppercase tracking-caps text-muted">
                Tokens
              </th>
              <th className="px-3 py-3 text-right font-mono text-caption uppercase tracking-caps text-muted">
                Slowest gap
              </th>
              <th className="px-3 py-3 pr-4 font-mono text-caption uppercase tracking-caps text-muted sm:pr-5">
                Stream
              </th>
            </tr>
          </thead>
          <tbody>
            {timings.map((timing) => (
              <TimingRow key={timing.requestId} timing={timing} />
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

export function EntryReportStats({ report }: { report: RoundEntryReport }) {
  const { prompt_summary: summary } = report;
  const tolerance = toleranceLabel(report.scoring_rule);

  return (
    <StatStrip
      label="Score breakdown"
      className="sm:grid-cols-2 xl:grid-cols-4"
    >
      <StatTile
        icon={Gauge}
        label="Round score"
        value={report.score === null ? "—" : formatScore(report.score)}
        hint={
          report.score === null
            ? (report.reason ?? "did not score")
            : formatPercent(report.score)
        }
      />
      <StatTile
        icon={ListChecks}
        label="Prompts scored"
        value={`${summary.scored} / ${summary.total}`}
        hint={
          typeof report.scoring_rule.name === "string"
            ? report.scoring_rule.name
            : undefined
        }
      />
      <StatTile
        icon={ShieldCheck}
        label="Below tolerance"
        value={String(summary.below_tolerance)}
        hint={
          tolerance
            ? `answered under ${tolerance} of baseline tokens`
            : "answered too little to score"
        }
      />
      <StatTile
        icon={Timer}
        label="Zeroed total"
        value={String(summary.zeroed)}
        hint="scored 0.0 without measuring"
      />
    </StatStrip>
  );
}

export function EntryReportPrompts({ report }: { report: RoundEntryReport }) {
  if (report.prompts.length > 0) {
    return (
      <Panel
        icon={ListChecks}
        title="Per-prompt breakdown"
        meta={`${report.prompts.length} prompts`}
        bodyClassName=""
      >
        <PromptTable prompts={report.prompts} />
      </Panel>
    );
  }

  // The baseline is the reference every candidate is measured against, so it
  // has no speedup of its own. Everything else here never reached scoring.
  const isBaseline = report.role === "baseline";
  return (
    <EmptyState
      title={isBaseline ? "Reference engine" : "No prompt scores"}
      message={
        isBaseline
          ? "The baseline is what candidates are measured against, so it has no speedup of its own. Its SLA replay is below."
          : (report.reason ??
            "This entry never reached scoring, so no prompt was measured.")
      }
      tone={isBaseline ? "muted" : "rust"}
    />
  );
}

export function EntryReportEvidence({ report }: { report: RoundEntryReport }) {
  return (
    <div className="space-y-8">
      {report.correctness ? (
        <Panel icon={ShieldCheck} title="Correctness">
          <BlobRows blob={report.correctness} />
        </Panel>
      ) : null}

      {report.sla ? (
        <Panel icon={Timer} title="SLA replay">
          <BlobRows blob={report.sla} />
          {/* Nested metrics are the useful half and are one level down. */}
          {typeof report.sla.metrics === "object" &&
          report.sla.metrics !== null ? (
            <BlobRows blob={report.sla.metrics as Record<string, unknown>} />
          ) : null}
          {/* How far the repeats of this run drifted from each other. A wide
              range means the number above is noise, so it belongs on screen. */}
          {typeof report.sla.cross_rep_variance === "object" &&
          report.sla.cross_rep_variance !== null ? (
            <BlobRows
              blob={report.sla.cross_rep_variance as Record<string, unknown>}
            />
          ) : null}
        </Panel>
      ) : null}

      <Panel icon={Gauge} title="Engine">
        <PanelRow label="Image digest">
          {report.image_digest ? (
            <CopyableMono
              value={report.image_digest}
              display={truncateDigest(report.image_digest)}
            />
          ) : (
            <span className="text-muted">—</span>
          )}
        </PanelRow>
        {report.patch_hash ? (
          <PanelRow label="Patch hash">
            <CopyableMono
              value={report.patch_hash}
              display={truncateDigest(report.patch_hash)}
            />
          </PanelRow>
        ) : null}
        {report.engine_crashed ? (
          <PanelRow label="Engine">
            <span className="text-rust">crashed during the run</span>
          </PanelRow>
        ) : null}
      </Panel>
    </div>
  );
}
