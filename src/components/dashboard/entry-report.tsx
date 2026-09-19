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
import { readSampling, readRepetitionChecks } from "@/lib/api/generation";
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
              Aligned output
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

function TimingRow({
  timing,
  showWorkload,
}: {
  timing: EngineTiming;
  showWorkload: boolean;
}) {
  return (
    <tr className="border-t border-border/80">
      <td className="whitespace-nowrap px-4 py-3 font-mono text-body text-secondary sm:px-5">
        {timing.requestId}
      </td>
      {showWorkload ? (
        <>
          <td className="whitespace-nowrap px-3 py-3 text-right font-mono text-body tabular-nums text-secondary">
            {timing.inputTokens?.toLocaleString("en-US") ?? "n/a"}
          </td>
          <td className="whitespace-nowrap px-3 py-3 text-right font-mono text-body tabular-nums text-secondary">
            {timing.maxTokens?.toLocaleString("en-US") ?? "n/a"}
          </td>
        </>
      ) : null}
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
  const showWorkload = timings.some((t) => t.inputTokens !== null);

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
              {showWorkload ? (
                <>
                  <th className="px-3 py-3 text-right font-mono text-caption uppercase tracking-caps text-muted">
                    Input tokens
                  </th>
                  <th className="px-3 py-3 text-right font-mono text-caption uppercase tracking-caps text-muted">
                    Output limit
                  </th>
                </>
              ) : null}
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
              <TimingRow
                key={timing.requestId}
                timing={timing}
                showWorkload={showWorkload}
              />
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
            : report.score_breakdown
              ? "median speedup minus reliability deduction"
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

export function EntryReportWorkload({ report }: { report: RoundEntryReport }) {
  const { workload, score_breakdown: score } = report;
  if (!workload && !score) return null;
  return (
    <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
      {workload ? (
        <Panel icon={Timer} title="Workload">
          {workload.temperature_range ? (
            <PanelRow label="Temperature range">
              {workload.temperature_range.join(" to ")} (per prompt)
            </PanelRow>
          ) : workload.temperature != null ? (
            <PanelRow label="Temperature">{workload.temperature}</PanelRow>
          ) : null}
          {workload.randomize_seed != null ? (
            <PanelRow label="Generation seeds">
              {workload.randomize_seed
                ? "Vary by prompt and repetition; matched across engines"
                : "Fixed"}
            </PanelRow>
          ) : null}
          <PanelRow label="Request interval">
            {workload.request_interval_ms} ms
            {workload.request_interval_ms === 0 ? " (burst)" : ""}
          </PanelRow>
          {workload.enable_thinking !== null ? (
            <PanelRow label="Thinking">
              {workload.enable_thinking ? "Enabled" : "Disabled"}
            </PanelRow>
          ) : null}
          {workload.max_model_len !== null ? (
            <PanelRow label="Context limit">
              {workload.max_model_len.toLocaleString("en-US")} tokens
            </PanelRow>
          ) : null}
          <p className="px-4 py-3 text-body leading-relaxed text-secondary sm:px-5">
            The same inputs and output limits apply to every engine. Actual
            concurrency depends on response duration and engine scheduling.
            {workload.enable_thinking
              ? " TTFT includes the start of reasoning; it is not time to the final answer."
              : ""}
          </p>
        </Panel>
      ) : null}
      {score && report.score !== null ? (
        <Panel icon={Gauge} title="Score calculation">
          <PanelRow label="Median speedup">
            {formatPercent(score.median_speedup)}
          </PanelRow>
          <PanelRow label="Failed requests">
            {score.failed_requests} / {score.scheduled_requests} (
            {(score.failure_rate * 100).toFixed(2)}%)
          </PanelRow>
          <PanelRow label="Deduction">
            {score.failure_penalty} × {score.failure_rate.toFixed(4)} ={" "}
            {score.penalty.toFixed(6)}
          </PanelRow>
          <PanelRow label="Final score">
            {score.median_speedup.toFixed(6)} - {score.penalty.toFixed(6)} ={" "}
            {report.score.toFixed(6)}
          </PanelRow>
        </Panel>
      ) : null}
    </div>
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
      <GenerationDiagnostics report={report} />
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

function GenerationDiagnostics({ report }: { report: RoundEntryReport }) {
  const samples = readSampling(report.sla?.sampling);
  const checks = readRepetitionChecks(report.correctness?.prompt_checks);
  const ratio = (value: number | null) =>
    value === null ? "Not recorded" : value.toFixed(4);
  const cell = "px-4 py-3 font-mono text-body tabular-nums";
  return (
    <>
      {checks.length > 0 ? (
        <Panel
          icon={ShieldCheck}
          title="Per-prompt repetition checks"
          bodyClassName=""
        >
          <p className="px-4 py-3 text-body text-secondary">
            Each latency-median response is compared with the lowest valid
            opening-baseline ratio for the same prompt. Drops above the recorded
            limit fail; absolute checks also apply. These checks detect
            repetition, not overall writing quality.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[48rem] text-left">
              <thead>
                <tr>
                  {[
                    "Prompt",
                    "Candidate char-16",
                    "Baseline char-16",
                    "Drop",
                    "Limit",
                    "Result",
                  ].map((label) => (
                    <th key={label} className={cell}>
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {checks.map((row) => (
                  <tr key={row.requestId} className="border-t border-border/80">
                    <td className={cell}>{row.requestId}</td>
                    <td className={cell}>{ratio(row.distinct)}</td>
                    <td className={cell}>{ratio(row.baseline)}</td>
                    <td className={cell}>{ratio(row.drop)}</td>
                    <td className={cell}>{ratio(row.limit)}</td>
                    <td className={cell}>
                      <span
                        className={
                          row.status === "Failed"
                            ? "text-rust"
                            : "text-secondary"
                        }
                      >
                        {row.status}
                      </span>
                      {row.reason ? (
                        <p className="max-w-sm font-sans">{row.reason}</p>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      ) : null}
      {samples.length > 0 ? (
        <Panel icon={ListChecks} title="Replay sampling" bodyClassName="">
          <p className="px-4 py-3 text-body text-secondary">
            Actual settings for each measured request. Baseline and candidate
            receive matching temperature and seed for each prompt and
            repetition.
          </p>
          <div className="max-h-96 overflow-auto">
            <table className="w-full min-w-[35rem] text-left">
              <thead>
                <tr>
                  {["Prompt", "Repetition", "Temperature", "Top p", "Seed"].map(
                    (label) => (
                      <th key={label} className={cell}>
                        {label}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {samples.map((row) => (
                  <tr
                    key={`${row.requestId}-${row.rep}`}
                    className="border-t border-border/80"
                  >
                    <td className={cell}>{row.requestId}</td>
                    <td className={cell}>{row.rep}</td>
                    <td className={cell}>{row.temperature}</td>
                    <td className={cell}>{row.topP}</td>
                    <td className={cell}>{row.seed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      ) : null}
    </>
  );
}
