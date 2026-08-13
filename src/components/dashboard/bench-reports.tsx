import { FlaskConical } from "lucide-react";
import { GpuMark, shortSku } from "@/components/dashboard/gpu";
import { MeterRow } from "@/components/dashboard/meter";
import { Panel } from "@/components/dashboard/panel";
import { StageVerdictChip } from "@/components/dashboard/status-chip";
import { Eyebrow } from "@/components/ui/eyebrow";
import { formatRatio } from "@/lib/api/format";
import {
  readCorrectness,
  readPerfScreen,
  readSlaBench,
  speedupFor,
  type SlaBenchMetrics,
} from "@/lib/api/bench";
import type { BenchReport, Campaign } from "@/lib/api/types";

const STAGE_LABEL: Record<string, string> = {
  correctness: "Correctness",
  perf_screen: "Perf screen",
  sla_bench: "SLA bench",
};

/** One line each on why a stage exists, so the verdict is readable in context. */
const STAGE_PURPOSE: Record<string, string> = {
  correctness:
    "Candidate output must track the baseline engine token for token.",
  perf_screen:
    "Cheap throughput check before a GPU is spent on the full bench.",
  sla_bench: "Full workload replay: latency gates and the speedup that scores.",
};

function fmt(value: number | null, digits = 2, suffix = ""): string {
  if (value === null) return "—";
  return `${value.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}${suffix}`;
}

function fmtRatio(value: number | null): string {
  return value === null ? "—" : formatRatio(value);
}

function fmtPercent(value: number | null, digits = 2): string {
  return value === null ? "—" : `${(value * 100).toFixed(digits)}%`;
}

function Metric({
  label,
  value,
  hint,
  tone = "foreground",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "foreground" | "accent" | "rust";
}) {
  const valueClassName =
    tone === "rust"
      ? "text-rust"
      : tone === "accent"
        ? "text-accent"
        : "text-foreground";

  return (
    <div>
      <p className="font-mono text-caption uppercase tracking-caps text-muted">
        {label}
      </p>
      <p className={`mt-1 font-mono text-body-lg ${valueClassName}`}>{value}</p>
      {hint ? (
        <p className="mt-0.5 font-mono text-caption text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

function MetricRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
      {children}
    </div>
  );
}

function CorrectnessBody({ report }: { report: Record<string, unknown> }) {
  const metrics = readCorrectness(report);
  return (
    <MetricRow>
      <Metric
        label="Mean |Δ logprob|"
        value={fmt(metrics.meanAbsLogprobDiff, 4)}
      />
      <Metric
        label="Max |Δ logprob|"
        value={fmt(metrics.maxAbsLogprobDiff, 4)}
      />
      <Metric
        label="Argmax mismatch"
        value={fmtPercent(metrics.argmaxMismatchRate)}
      />
      <Metric
        label="Prompts"
        value={metrics.numPrompts?.toLocaleString("en-US") ?? "—"}
        hint={
          metrics.numPositionsCompared !== null
            ? `${metrics.numPositionsCompared.toLocaleString("en-US")} positions`
            : undefined
        }
      />
    </MetricRow>
  );
}

/**
 * Baseline against candidate on one shared scale.
 *
 * Two bars sharing a denominator is the whole point of the screen: the ratio
 * alone hides whether the engine is fast or merely less slow.
 */
function ThroughputPair({
  baseline,
  candidate,
  ratio,
  floor,
}: {
  baseline: number;
  candidate: number;
  ratio: number | null;
  floor: number | null;
}) {
  const scale = Math.max(baseline, candidate);
  const clears = ratio !== null && (floor === null || ratio >= floor);

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_10rem] lg:items-center">
      <div className="space-y-3">
        <MeterRow
          label="Baseline"
          value={fmt(baseline, 1, " tok/s")}
          fraction={scale === 0 ? 0 : baseline / scale}
          tone="neutral"
        />
        <MeterRow
          label="Candidate"
          value={fmt(candidate, 1, " tok/s")}
          fraction={scale === 0 ? 0 : candidate / scale}
          tone={clears ? "accent" : "rust"}
        />
      </div>
      <Metric
        label="Throughput ratio"
        value={fmtRatio(ratio)}
        hint={floor === null ? undefined : `floor ≥ ${formatRatio(floor)}`}
        tone={ratio === null ? "foreground" : clears ? "accent" : "rust"}
      />
    </div>
  );
}

function PerfScreenBody({
  report,
  campaign,
}: {
  report: Record<string, unknown>;
  campaign: Campaign | null;
}) {
  const metrics = readPerfScreen(report);
  const floor = campaign?.bench.cross_env.min_speedup_each ?? null;

  if (
    metrics.baselineTokensPerS === null ||
    metrics.candidateTokensPerS === null
  ) {
    return (
      <MetricRow>
        <Metric
          label="Baseline"
          value={fmt(metrics.baselineTokensPerS, 1, " tok/s")}
        />
        <Metric
          label="Candidate"
          value={fmt(metrics.candidateTokensPerS, 1, " tok/s")}
        />
        <Metric
          label="Throughput ratio"
          value={fmtRatio(metrics.throughputRatio)}
        />
      </MetricRow>
    );
  }

  return (
    <ThroughputPair
      baseline={metrics.baselineTokensPerS}
      candidate={metrics.candidateTokensPerS}
      ratio={metrics.throughputRatio}
      floor={floor}
    />
  );
}

const SLA_ROWS = [
  {
    label: "p99 TTFT",
    read: (m: SlaBenchMetrics["baseline"]) => m.ttftMs.p99,
    suffix: " ms",
    digits: 1,
    lowerIsBetter: true,
  },
  {
    label: "p99 ITL",
    read: (m: SlaBenchMetrics["baseline"]) => m.itlMs.p99,
    suffix: " ms",
    digits: 1,
    lowerIsBetter: true,
  },
  {
    label: "p99 E2E",
    read: (m: SlaBenchMetrics["baseline"]) => m.e2eMs.p99,
    suffix: " ms",
    digits: 1,
    lowerIsBetter: true,
  },
  {
    label: "Output",
    read: (m: SlaBenchMetrics["baseline"]) => m.outputTokensPerS,
    suffix: " tok/s",
    digits: 1,
    lowerIsBetter: false,
  },
  {
    label: "Requests",
    read: (m: SlaBenchMetrics["baseline"]) => m.requestsPerS,
    suffix: " req/s",
    digits: 2,
    lowerIsBetter: false,
  },
  {
    label: "SLA goodput",
    read: (m: SlaBenchMetrics["baseline"]) => m.slaGoodputRatio,
    suffix: "",
    digits: 2,
    lowerIsBetter: false,
  },
] as const;

/** The three numbers the campaign actually gates on, each against its budget. */
function SlaGates({
  metrics,
  campaign,
}: {
  metrics: SlaBenchMetrics;
  campaign: Campaign | null;
}) {
  const floor = campaign?.bench.cross_env.min_speedup_each ?? null;
  const speedup = speedupFor(metrics, campaign?.bench.cross_env.speedup_metric);
  const ttft = metrics.candidate.ttftMs.p99;
  const itl = metrics.candidate.itlMs.p99;
  const ttftCeiling = campaign?.sla.p99_ttft_ms ?? null;
  const itlCeiling = campaign?.sla.p99_itl_ms ?? null;

  const gates = [
    { label: "p99 TTFT", value: ttft, ceiling: ttftCeiling },
    { label: "p99 ITL", value: itl, ceiling: itlCeiling },
  ].filter(
    (gate): gate is { label: string; value: number; ceiling: number | null } =>
      gate.value !== null
  );

  const speedupClears =
    speedup !== null && (floor === null || speedup >= floor);

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-baseline justify-between gap-3">
          <span className="font-mono text-caption uppercase tracking-caps text-muted">
            Speedup
          </span>
          <span
            className={`font-mono text-body-lg ${
              speedup === null
                ? "text-muted"
                : speedupClears
                  ? "text-accent"
                  : "text-rust"
            }`}
          >
            {fmtRatio(speedup)}
          </span>
        </div>
        {floor !== null ? (
          <p className="mt-1 font-mono text-caption text-muted">
            floor ≥ {formatRatio(floor)}
          </p>
        ) : null}
      </div>

      {gates.map((gate) => {
        const over = gate.ceiling !== null && gate.value > gate.ceiling;
        return (
          <MeterRow
            key={gate.label}
            label={gate.label}
            value={
              gate.ceiling === null
                ? fmt(gate.value, 1, " ms")
                : `${gate.value.toFixed(1)} / ${gate.ceiling} ms`
            }
            fraction={gate.ceiling === null ? 0 : gate.value / gate.ceiling}
            tone={over ? "rust" : "accent"}
            hint={
              gate.ceiling === null
                ? undefined
                : over
                  ? "over ceiling"
                  : `${Math.round((1 - gate.value / gate.ceiling) * 100)}% headroom`
            }
          />
        );
      })}
    </div>
  );
}

function SlaBenchBody({
  report,
  campaign,
}: {
  report: Record<string, unknown>;
  campaign: Campaign | null;
}) {
  const metrics = readSlaBench(report);
  if (!metrics) return null;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,15rem)] lg:gap-8">
      <div className="min-w-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-left">
            <thead>
              <tr className="font-mono text-caption uppercase tracking-caps text-muted">
                <th className="py-2 font-normal">Metric</th>
                <th className="py-2 text-right font-normal">Baseline</th>
                <th className="py-2 text-right font-normal">Candidate</th>
                <th className="py-2 text-right font-normal">Change</th>
              </tr>
            </thead>
            <tbody>
              {SLA_ROWS.map((row) => {
                const base = row.read(metrics.baseline);
                const cand = row.read(metrics.candidate);

                let change = "—";
                let better: boolean | null = null;
                if (base !== null && cand !== null && base !== 0) {
                  const delta = (cand - base) / base;
                  change = `${delta >= 0 ? "+" : ""}${(delta * 100).toFixed(1)}%`;
                  better = row.lowerIsBetter ? delta < 0 : delta > 0;
                }

                return (
                  <tr key={row.label} className="border-t border-border/80">
                    <td className="py-2.5 font-mono text-body-sm text-secondary">
                      {row.label}
                    </td>
                    <td className="py-2.5 text-right font-mono text-body-sm text-muted">
                      {fmt(base, row.digits, row.suffix)}
                    </td>
                    <td className="py-2.5 text-right font-mono text-body-sm text-foreground">
                      {fmt(cand, row.digits, row.suffix)}
                    </td>
                    <td
                      className={`py-2.5 text-right font-mono text-body-sm ${
                        better === null
                          ? "text-muted"
                          : better
                            ? "text-accent"
                            : "text-rust"
                      }`}
                    >
                      {change}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {metrics.repetitions !== null ? (
          <p className="mt-3 font-mono text-caption text-muted">
            {metrics.repetitions} repetition
            {metrics.repetitions === 1 ? "" : "s"}
          </p>
        ) : null}
      </div>

      <SlaGates metrics={metrics} campaign={campaign} />
    </div>
  );
}

function ReportBody({
  report: item,
  campaign,
}: {
  report: BenchReport;
  campaign: Campaign | null;
}) {
  if (item.stage === "correctness") {
    return <CorrectnessBody report={item.report} />;
  }
  if (item.stage === "perf_screen") {
    return <PerfScreenBody report={item.report} campaign={campaign} />;
  }
  if (item.stage === "sla_bench") {
    return <SlaBenchBody report={item.report} campaign={campaign} />;
  }
  return null;
}

function ReportCard({
  report: item,
  campaign,
  showPurpose,
}: {
  report: BenchReport;
  campaign: Campaign | null;
  /** False for repeat cards: a stage runs once per SKU but means the same thing. */
  showPurpose: boolean;
}) {
  const body = <ReportBody report={item} campaign={campaign} />;
  const purpose = showPurpose ? STAGE_PURPOSE[item.stage] : undefined;

  return (
    <div className="px-4 py-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Eyebrow size="caption" tone="secondary">
            {STAGE_LABEL[item.stage] ?? item.stage.replaceAll("_", " ")}
          </Eyebrow>
          {item.gpu_sku ? (
            <span
              className="inline-flex items-center gap-1.5 font-mono text-caption text-muted"
              title={item.gpu_sku}
            >
              <GpuMark skus={[item.gpu_sku]} className="size-3.5 shrink-0" />
              {shortSku(item.gpu_sku)}
            </span>
          ) : null}
          {item.mock ? (
            <span className="inline-flex border border-rust/40 px-2 py-0.5 font-mono text-caption uppercase tracking-caps text-rust">
              Mock
            </span>
          ) : null}
        </div>
        <StageVerdictChip verdict={item.verdict} />
      </div>

      {purpose ? (
        <p className="mt-2 text-body leading-relaxed text-muted">{purpose}</p>
      ) : null}

      {body ? <div className="mt-5">{body}</div> : null}

      <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2">
        <details className="group/raw">
          <summary className="inline-flex cursor-pointer list-none font-mono text-caption uppercase tracking-caps text-muted transition-colors hover:text-secondary">
            <span className="group-open/raw:hidden">+ raw report</span>
            <span className="hidden group-open/raw:inline">− raw report</span>
          </summary>
          <pre className="mt-2 max-h-80 overflow-auto border border-border bg-border/10 px-3 py-2 font-mono text-caption leading-relaxed text-secondary">
            {JSON.stringify(item.report, null, 2)}
          </pre>
        </details>

        {item.evidence_s3_url ? (
          <a
            href={item.evidence_s3_url}
            rel="noreferrer nofollow"
            target="_blank"
            className="font-mono text-caption uppercase tracking-caps text-accent underline-offset-4 transition-colors hover:underline"
          >
            Evidence ↗
          </a>
        ) : null}
      </div>
    </div>
  );
}

export function BenchReports({
  reports,
  campaign,
}: {
  reports: BenchReport[];
  campaign: Campaign | null;
}) {
  if (reports.length === 0) return null;

  const ordered = [...reports].sort((a, b) =>
    a.created_at.localeCompare(b.created_at)
  );
  const seenStages = new Set<string>();

  return (
    <Panel
      icon={FlaskConical}
      title="Benchmark results"
      meta={`${ordered.length} report${ordered.length === 1 ? "" : "s"}`}
    >
      {ordered.map((item) => {
        const firstOfStage = !seenStages.has(item.stage);
        seenStages.add(item.stage);
        return (
          <ReportCard
            key={`${item.stage}-${item.gpu_sku ?? "default"}-${item.task_id}`}
            report={item}
            campaign={campaign}
            showPurpose={firstOfStage}
          />
        );
      })}
    </Panel>
  );
}
