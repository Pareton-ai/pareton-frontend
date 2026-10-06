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
import {
  isWeightedTierRule,
  tierGrouping,
  readConcurrencyObservations,
  selectedTiers,
} from "@/lib/api/scoring";
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

function PromptRow({
  prompt,
  weighted,
}: {
  prompt: PromptScore;
  weighted: boolean;
}) {
  const gated =
    weighted && typeof prompt.candidate_failed === "boolean"
      ? prompt.candidate_failed
      : prompt.reason !== null;
  const unmeasured = gated || prompt.reason !== null;
  const reason =
    weighted && !gated && prompt.reason === "insufficient timing"
      ? "Per-token timing unavailable (not a request failure)"
      : prompt.reason;
  return (
    <tr className="border-t border-border/80">
      <td className="whitespace-nowrap px-4 py-3 font-mono text-body text-secondary sm:px-5">
        {prompt.request_id}
      </td>
      <td
        className={`whitespace-nowrap px-3 py-3 text-right font-mono text-body tabular-nums ${
          unmeasured ? "text-muted" : "text-foreground"
        }`}
      >
        {/* Missing diagnostics are not a measured 0%, even for a valid completion. */}
        {unmeasured ? "—" : formatPercent(prompt.speedup)}
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
      <td
        className={`px-3 py-3 pr-4 font-mono text-body sm:pr-5 ${gated ? "text-rust" : "text-muted"}`}
      >
        {reason ?? (gated ? "Candidate completion failed" : "—")}
      </td>
    </tr>
  );
}

function PromptTable({
  prompts,
  weighted,
}: {
  prompts: readonly PromptScore[];
  weighted: boolean;
}) {
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
              {weighted ? "Diagnostic speedup" : "Speedup"}
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
              {weighted ? "Diagnostic / failure" : "Gate"}
            </th>
          </tr>
        </thead>
        <tbody>
          {prompts.map((prompt) => (
            <PromptRow
              key={prompt.request_id}
              prompt={prompt}
              weighted={weighted}
            />
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
  if (isWeightedTierRule(report.scoring_rule)) {
    const score = report.score_breakdown;
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
              : "weighted tier speedup after failure cap and deduction"
          }
        />
        <StatTile
          icon={ListChecks}
          label="Eligible requests"
          value={score ? String(score.scheduled_requests) : "—"}
          hint="trusted baseline exclusions removed"
        />
        <StatTile
          icon={ShieldCheck}
          label="Failed eligible requests"
          value={score ? String(score.failed_requests) : "—"}
          hint="each request counted once"
        />
        <StatTile
          icon={Timer}
          label="Raw weighted speedup"
          value={
            score?.weighted_speedup != null
              ? formatPercent(score.weighted_speedup)
              : "—"
          }
          hint="before failure cap and deduction"
        />
      </StatStrip>
    );
  }

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
          {workload.algo_version === 5 ? (
            <>
              <PanelRow label="Request concurrency">
                C{workload.request_concurrency}
              </PanelRow>
              <PanelRow label="Tier scheduling">
                {tierGrouping(
                  workload.request_concurrency,
                  workload.input_tiers ??
                    (score?.tiers ? selectedTiers(score.tiers) : undefined)
                )}
              </PanelRow>
              <PanelRow label="Output policy">
                Natural EOS · Minimum 90% of baseline tokens per request
              </PanelRow>
            </>
          ) : (
            <PanelRow label="Request interval">
              {workload.request_interval_ms} ms
              {workload.request_interval_ms === 0 ? " (burst)" : ""}
            </PanelRow>
          )}
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
            {workload.algo_version === 5
              ? "The same eligible inputs and output ceilings apply to every engine. Candidates must emit at least 90% of baseline tokens per request; natural output lengths can affect tier completion time. Slots refill until the group drains and stay occupied through protocol completion. Baseline exclusions and final drain can reduce actual concurrency below the configured cap."
              : "The same inputs and output limits apply to every engine. Actual concurrency depends on response duration and engine scheduling."}
            {workload.enable_thinking
              ? " TTFT includes the start of reasoning; it is not time to the final answer."
              : ""}
          </p>
        </Panel>
      ) : null}
      {score && report.score !== null ? (
        <Panel icon={Gauge} title="Score calculation">
          {score.weighted_speedup != null ? (
            <>
              <PanelRow label="Raw weighted speedup">
                {formatPercent(score.weighted_speedup)}
              </PanelRow>
              <PanelRow label="Eligible speedup">
                {formatPercent(score.eligible_speedup)}
              </PanelRow>
              <p className="px-4 py-3 text-body text-secondary sm:px-5">
                {score.failed_requests > 0
                  ? `Request failures cap speed credit at zero: min(${score.weighted_speedup.toFixed(6)}, 0) = ${score.eligible_speedup.toFixed(6)}. Negative speedups remain negative.`
                  : "No request failures: eligible speedup equals raw weighted speedup."}
              </p>
            </>
          ) : (
            <PanelRow label="Median speedup">
              {formatPercent(score.median_speedup)}
            </PanelRow>
          )}
          <PanelRow label="Failed requests">
            {score.failed_requests} / {score.scheduled_requests} (
            {(score.failure_rate * 100).toFixed(2)}%)
          </PanelRow>
          <PanelRow label="Deduction">
            {score.failure_penalty} ×{" "}
            {score.weighted_speedup != null
              ? `(${score.failed_requests} / ${score.scheduled_requests})`
              : score.failure_rate.toFixed(4)}{" "}
            = {score.penalty.toFixed(6)}
          </PanelRow>
          <PanelRow label="Final score">
            {(score.eligible_speedup ?? score.median_speedup).toFixed(6)} -{" "}
            {score.penalty.toFixed(6)} = {report.score.toFixed(6)}
          </PanelRow>
        </Panel>
      ) : null}
      {score?.tiers ? (
        <div className="lg:col-span-2">
          <TierCompletionTable score={score} />
        </div>
      ) : null}
    </div>
  );
}

function TierCompletionTable({
  score,
}: {
  score: NonNullable<RoundEntryReport["score_breakdown"]>;
}) {
  if (!score.tiers) return null;
  return (
    <Panel icon={Timer} title="Tier completion" bodyClassName="">
      <p className="px-4 py-3 text-body text-secondary sm:px-5">
        Each duration is the median across repetitions, from the group start
        until the tier&apos;s last request finishes. This includes client
        queueing. Weighted speedup = sum of weight × (1 − candidate / baseline).
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[48rem] text-left font-mono text-body tabular-nums">
          <thead>
            <tr>
              {[
                "Input tier",
                "Eligible requests",
                "Weight",
                "Baseline",
                "Candidate",
                "Speedup",
                "Contribution",
              ].map((label) => (
                <th key={label} className="px-4 py-3 text-caption text-muted">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {selectedTiers(score.tiers).map((tier) => {
              const detail = score.tiers[tier];
              if (!detail) return null;
              return (
                <tr key={tier} className="border-t border-border">
                  <th scope="row" className="px-4 py-3">
                    {tier}
                  </th>
                  <td className="px-4 py-3">{detail.scheduled_requests}</td>
                  <td className="px-4 py-3">
                    {(detail.weight * 100).toLocaleString("en-US")}%
                  </td>
                  <td className="px-4 py-3">
                    {formatSeconds(detail.baseline_completion_s)}
                  </td>
                  <td className="px-4 py-3">
                    {formatSeconds(detail.candidate_completion_s)}
                  </td>
                  <td className="px-4 py-3">{formatPercent(detail.speedup)}</td>
                  <td className="px-4 py-3">
                    {formatPercent(detail.weight * detail.speedup)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

export function EntryReportExplanation({
  report,
}: {
  report: RoundEntryReport;
}) {
  return (
    <p className="max-w-2xl text-body leading-relaxed text-secondary">
      {isWeightedTierRule(report.scoring_rule)
        ? "The round score uses weighted completion times for all eligible work in each tier. Per-request speedups below are diagnostics, not score contributions. Only trusted baseline exclusions are removed; candidate failures remain in the eligible count and incur the configured failure penalty."
        : "The round score is the scoring rule applied to the prompts below. Both engines are compared at the same output token count, so a candidate that stops early cannot buy speed by answering less: a prompt under the tolerance bar scores nothing and shows its gate reason."}
    </p>
  );
}

export function EntryReportPrompts({ report }: { report: RoundEntryReport }) {
  if (report.prompts.length > 0) {
    return (
      <Panel
        icon={ListChecks}
        title={
          isWeightedTierRule(report.scoring_rule)
            ? "Per-request diagnostics"
            : "Per-prompt breakdown"
        }
        meta={`${report.prompts.length} prompts`}
        bodyClassName=""
      >
        <PromptTable
          prompts={report.prompts}
          weighted={isWeightedTierRule(report.scoring_rule)}
        />
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
      <EntryReportConcurrency report={report} />
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
            Actual settings for each measured request. Each prompt keeps its
            temperature across repetitions and engines. Generation uses seed 0
            throughout qualification, warmups and measured repetitions; fixed
            settings do not guarantee identical output text.
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

export function EntryReportConcurrency({
  report,
}: {
  report: RoundEntryReport;
}) {
  const rows = readConcurrencyObservations(report.sla);
  if (rows.length === 0) return null;
  return (
    <Panel
      icon={Activity}
      title="Observed request concurrency"
      bodyClassName=""
    >
      <p className="px-4 py-3 text-body text-secondary sm:px-5">
        Occupied client slots include protocol completion and final drain. Mean
        occupancy is weighted by elapsed time; it can be below the requested
        cap.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[42rem] text-left font-mono text-body tabular-nums">
          <thead>
            <tr>
              {[
                "Repetition",
                "Group start",
                "Requested",
                "Effective cap",
                "Peak",
                "Mean",
              ].map((label) => (
                <th key={label} className="px-4 py-3 text-caption text-muted">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={`${row.rep}-${row.group_start_offset_ms}-${i}`}
                className="border-t border-border"
              >
                <td className="px-4 py-3">{row.rep}</td>
                <td className="px-4 py-3">
                  {formatSeconds(row.group_start_offset_ms / 1000)}
                </td>
                <td className="px-4 py-3">C{row.requested_concurrency}</td>
                <td className="px-4 py-3">{row.effective_concurrency}</td>
                <td className="px-4 py-3">{row.observed_peak}</td>
                <td className="px-4 py-3">
                  {row.time_weighted_mean.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
