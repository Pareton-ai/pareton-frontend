/**
 * Readers for the per-stage `bench_reports[].report` payloads.
 *
 * The API stores whatever the bench harness wrote and types it as a bare
 * object, so every field is read defensively here instead of at the fetch
 * boundary. Shapes follow `bench/schemas.py` in the backend repo.
 */

import type { BenchReport, Campaign } from "@/lib/api/types";

/** Speedup key used when the campaign does not name one. */
export const DEFAULT_SPEEDUP_METRIC = "output_tokens_per_s_ratio";

export type Percentiles = {
  p50: number | null;
  p95: number | null;
  p99: number | null;
};

export type CorrectnessMetrics = {
  numPrompts: number | null;
  numPositionsCompared: number | null;
  meanAbsLogprobDiff: number | null;
  maxAbsLogprobDiff: number | null;
  argmaxMismatchRate: number | null;
};

export type PerfScreenMetrics = {
  baselineTokensPerS: number | null;
  candidateTokensPerS: number | null;
  throughputRatio: number | null;
};

export type SlaEngineMetrics = {
  ttftMs: Percentiles;
  itlMs: Percentiles;
  e2eMs: Percentiles;
  outputTokensPerS: number | null;
  requestsPerS: number | null;
  slaGoodputRatio: number | null;
};

export type SlaBenchMetrics = {
  baseline: SlaEngineMetrics;
  candidate: SlaEngineMetrics;
  /** Raw `speedup` map, keyed by metric name (`output_tokens_per_s_ratio`, …). */
  speedup: Record<string, number>;
  repetitions: number | null;
};

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function percentiles(value: unknown): Percentiles {
  const source = record(value);
  return {
    p50: num(source.p50),
    p95: num(source.p95),
    p99: num(source.p99),
  };
}

function engineMetrics(value: unknown): SlaEngineMetrics {
  const source = record(value);
  return {
    ttftMs: percentiles(source.ttft_ms),
    itlMs: percentiles(source.itl_ms),
    e2eMs: percentiles(source.e2e_ms),
    outputTokensPerS: num(source.output_tokens_per_s),
    requestsPerS: num(source.requests_per_s),
    slaGoodputRatio: num(source.sla_goodput_ratio),
  };
}

export function readCorrectness(report: unknown): CorrectnessMetrics {
  const source = record(report);
  return {
    numPrompts: num(source.num_prompts),
    numPositionsCompared: num(source.num_positions_compared),
    meanAbsLogprobDiff: num(source.mean_abs_logprob_diff),
    maxAbsLogprobDiff: num(source.max_abs_logprob_diff),
    argmaxMismatchRate: num(source.argmax_mismatch_rate),
  };
}

export function readPerfScreen(report: unknown): PerfScreenMetrics {
  const source = record(report);
  return {
    baselineTokensPerS: num(source.baseline_output_tokens_per_s),
    candidateTokensPerS: num(source.candidate_output_tokens_per_s),
    throughputRatio: num(source.throughput_ratio),
  };
}

/**
 * Floor the cheap screen actually gates on.
 *
 * Distinct from `cross_env.min_speedup_each`, which is the SLA / scoring
 * floor (typically > 1x). The screen is a coarse filter; live campaigns
 * pass around 0.99x and fail around 0.94x. The harness writes
 * `min_throughput_ratio` on some payloads; otherwise the campaign spec
 * may name it. Neither is `min_speedup_each`.
 */
export function readPerfScreenFloor(
  report: unknown,
  campaign: Campaign | null
): number | null {
  const fromReport = num(record(report).min_throughput_ratio);
  if (fromReport !== null) return fromReport;
  return num(record(campaign?.bench.perf_screen).min_throughput_ratio);
}

/** `null` when the payload carries no candidate run to compare against. */
export function readSlaBench(report: unknown): SlaBenchMetrics | null {
  const source = record(report);
  if (Object.keys(record(source.candidate)).length === 0) return null;

  const speedup: Record<string, number> = {};
  for (const [key, value] of Object.entries(record(source.speedup))) {
    const parsed = num(value);
    if (parsed !== null) speedup[key] = parsed;
  }

  return {
    baseline: engineMetrics(source.baseline),
    candidate: engineMetrics(source.candidate),
    speedup,
    repetitions: num(source.repetitions),
  };
}

/**
 * Speedup for the metric a campaign gates on.
 *
 * Report keys carry a `_ratio` suffix (`output_tokens_per_s_ratio`), which is
 * how `cross_env.speedup_metric` names them too, but campaigns predating that
 * convention name the bare metric.
 */
export function speedupFor(
  metrics: SlaBenchMetrics,
  metric: string | null | undefined
): number | null {
  const keys = metric
    ? [metric, `${metric}_ratio`, DEFAULT_SPEEDUP_METRIC]
    : [DEFAULT_SPEEDUP_METRIC];
  for (const key of keys) {
    const value = metrics.speedup[key];
    if (value !== undefined) return value;
  }
  return null;
}

export type BenchSummary = {
  /** Worst speedup across target SKUs, matching the `worst` cross-env rule. */
  speedup: number | null;
  /** SKU the worst speedup came from, when more than one was benched. */
  speedupSku: string | null;
  /** Whether the speedup is from the full bench or the cheap screen. */
  speedupSource: "sla_bench" | "perf_screen" | null;
  /**
   * Whether that headline clears the floor that applies to its source.
   * Screen-only numbers use the stage verdict, not a missing floor.
   */
  speedupClears: boolean | null;
  /** Floor used for that judgment, when the campaign or report names one. */
  speedupFloor: number | null;
  /** Worst (highest) p99 latency across SKUs, in ms. */
  p99TtftMs: number | null;
  p99ItlMs: number | null;
  /** Distinct SKUs that produced an SLA bench run. */
  skuCount: number;
};

const EMPTY_SUMMARY: BenchSummary = {
  speedup: null,
  speedupSku: null,
  speedupSource: null,
  speedupClears: null,
  speedupFloor: null,
  p99TtftMs: null,
  p99ItlMs: null,
  skuCount: 0,
};

function maxOf(values: (number | null)[]): number | null {
  const present = values.filter((value): value is number => value !== null);
  return present.length === 0 ? null : Math.max(...present);
}

/**
 * Headline numbers for a submission: the speedup it earned and the worst p99
 * latency it produced. Both aggregate across SKUs the pessimistic way, because
 * that is what the campaign gates on.
 */
export function summarizeBench(
  reports: readonly BenchReport[],
  campaign: Campaign | null
): BenchSummary {
  const sla = reports
    .filter((report) => report.stage === "sla_bench")
    .map((report) => ({
      sku: report.gpu_sku,
      metrics: readSlaBench(report.report),
    }))
    .filter(
      (entry): entry is { sku: string | null; metrics: SlaBenchMetrics } =>
        entry.metrics !== null
    );

  if (sla.length === 0) {
    // Before the full bench runs, the cheap screen is the only speedup signal.
    const screen = reports
      .filter((report) => report.stage === "perf_screen")
      .map((report) => ({
        report,
        ratio: readPerfScreen(report.report).throughputRatio,
      }))
      .filter(
        (entry): entry is { report: BenchReport; ratio: number } =>
          entry.ratio !== null
      );

    if (screen.length === 0) return EMPTY_SUMMARY;
    const worst = screen.reduce((lowest, entry) =>
      entry.ratio < lowest.ratio ? entry : lowest
    );
    return {
      ...EMPTY_SUMMARY,
      speedup: worst.ratio,
      speedupSource: "perf_screen",
      speedupClears: worst.report.verdict === "pass",
      speedupFloor: readPerfScreenFloor(worst.report.report, campaign),
    };
  }

  const metric = campaign?.bench.cross_env.speedup_metric;
  const slaFloor = campaign?.bench.cross_env.min_speedup_each ?? null;
  const speedups = sla
    .map((entry) => ({
      sku: entry.sku,
      value: speedupFor(entry.metrics, metric),
    }))
    .filter(
      (entry): entry is { sku: string | null; value: number } =>
        entry.value !== null
    );
  const worst = speedups.reduce<{ sku: string | null; value: number } | null>(
    (lowest, entry) =>
      lowest === null || entry.value < lowest.value ? entry : lowest,
    null
  );

  return {
    speedup: worst?.value ?? null,
    speedupSku: worst?.sku ?? null,
    speedupSource: worst ? "sla_bench" : null,
    speedupClears:
      worst === null ? null : slaFloor === null || worst.value >= slaFloor,
    speedupFloor: slaFloor,
    p99TtftMs: maxOf(sla.map((entry) => entry.metrics.candidate.ttftMs.p99)),
    p99ItlMs: maxOf(sla.map((entry) => entry.metrics.candidate.itlMs.p99)),
    skuCount: new Set(sla.map((entry) => entry.sku ?? "default")).size,
  };
}
