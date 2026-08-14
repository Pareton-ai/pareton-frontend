/**
 * Contract tests for the bench report readers.
 *
 * Fixtures are verbatim responses from https://api.pareton.ai, so these pin the
 * reader logic to payload shapes the harness actually writes.
 */

import { describe, expect, it } from "vitest";
import {
  readCorrectness,
  readPerfScreen,
  readPerfScreenFloor,
  readSlaBench,
  speedupFor,
  summarizeBench,
} from "@/lib/api/bench";
import { parseSubmissionDetail } from "@/lib/api/parse";
import type { BenchReport, Campaign } from "@/lib/api/types";
import rejectedCrossEnv from "./fixtures/submission-rejected-cross-env.json";
import rejectedPerfScreen from "./fixtures/submission-rejected-perf-screen.json";

const reports = parseSubmissionDetail(rejectedCrossEnv).bench_reports;

function stage(name: string): BenchReport {
  const report = reports.find((item) => item.stage === name);
  if (!report) throw new Error(`fixture has no ${name} report`);
  return report;
}

/** Only the fields `summarizeBench` reads. */
function campaignWithMetric(metric: string): Campaign {
  return {
    bench: { cross_env: { speedup_metric: metric } },
  } as Campaign;
}

describe("stage readers", () => {
  it("reads correctness metrics, keeping a legitimate zero", () => {
    const metrics = readCorrectness(stage("correctness").report);
    expect(metrics.numPrompts).toBe(8);
    expect(metrics.numPositionsCompared).toBe(128);
    expect(metrics.meanAbsLogprobDiff).toBe(0);
    expect(metrics.argmaxMismatchRate).toBe(0);
  });

  it("reads perf screen throughput", () => {
    const metrics = readPerfScreen(stage("perf_screen").report);
    expect(metrics.baselineTokensPerS).toBeCloseTo(102502.11, 1);
    expect(metrics.candidateTokensPerS).toBeCloseTo(101218.38, 1);
    expect(metrics.throughputRatio).toBeCloseTo(0.9875, 4);
  });

  it("reads the screen floor, never the SLA speedup floor", () => {
    const passed = stage("perf_screen").report;
    expect(readPerfScreenFloor(passed, null)).toBeNull();
    expect(
      readPerfScreenFloor(passed, {
        bench: {
          cross_env: { min_speedup_each: 1.05 },
          perf_screen: { min_throughput_ratio: 0.95 },
        },
      } as Campaign)
    ).toBe(0.95);
    expect(readPerfScreenFloor({ min_throughput_ratio: 0.97 }, null)).toBe(
      0.97
    );
  });

  it("reads both engines' percentiles from the SLA bench", () => {
    const metrics = readSlaBench(stage("sla_bench").report);
    expect(metrics?.baseline.ttftMs.p99).toBeCloseTo(2.5071, 4);
    expect(metrics?.candidate.ttftMs.p99).toBeCloseTo(2.0734, 4);
    expect(metrics?.candidate.outputTokensPerS).toBeCloseTo(1359.94, 2);
    expect(metrics?.repetitions).toBe(3);
  });

  it("returns null when no candidate run is present", () => {
    expect(readSlaBench({ verdict: "error" })).toBeNull();
    expect(readSlaBench(null)).toBeNull();
  });
});

describe("speedupFor", () => {
  const metrics = readSlaBench(stage("sla_bench").report)!;

  it("reads the metric the campaign gates on", () => {
    expect(speedupFor(metrics, "output_tokens_per_s_ratio")).toBeCloseTo(
      0.9997,
      4
    );
    expect(speedupFor(metrics, "p99_ttft_ratio")).toBeCloseTo(1.2092, 4);
  });

  it("appends the _ratio suffix a campaign may omit", () => {
    expect(speedupFor(metrics, "output_tokens_per_s")).toBeCloseTo(0.9997, 4);
  });

  it("falls back to the throughput ratio for an unknown metric", () => {
    expect(speedupFor(metrics, "not_a_metric")).toBeCloseTo(0.9997, 4);
  });
});

describe("summarizeBench", () => {
  it("reports the worst speedup and worst p99 across SKUs", () => {
    const fast = stage("sla_bench");
    const slow: BenchReport = {
      ...fast,
      gpu_sku: "A100_80GB",
      report: {
        ...(fast.report as object),
        speedup: { output_tokens_per_s_ratio: 0.82 },
        candidate: {
          ttft_ms: { p50: 3, p95: 4, p99: 9.5 },
          itl_ms: { p50: 1, p95: 2, p99: 3 },
          e2e_ms: { p50: 6, p95: 7, p99: 8 },
          output_tokens_per_s: 1100,
          requests_per_s: 9,
          sla_goodput_ratio: 0.9,
        },
      },
    };

    const summary = summarizeBench(
      [fast, slow],
      campaignWithMetric("output_tokens_per_s_ratio")
    );
    expect(summary.speedup).toBeCloseTo(0.82, 2);
    expect(summary.speedupSku).toBe("A100_80GB");
    expect(summary.speedupSource).toBe("sla_bench");
    // Worst p99 wins, which is the slow SKU's 9.5ms rather than the fast 2.07ms.
    expect(summary.p99TtftMs).toBeCloseTo(9.5, 2);
    expect(summary.skuCount).toBe(2);
  });

  it("falls back to the perf screen before the SLA bench has run", () => {
    const screen = parseSubmissionDetail(
      rejectedPerfScreen
    ).bench_reports.filter((report) => report.stage !== "sla_bench");

    const summary = summarizeBench(screen, null);
    expect(summary.speedupSource).toBe("perf_screen");
    expect(summary.speedup).not.toBeNull();
    expect(summary.p99TtftMs).toBeNull();
    expect(summary.skuCount).toBe(0);
  });

  it("stays empty when nothing has been benched", () => {
    const summary = summarizeBench([], null);
    expect(summary.speedup).toBeNull();
    expect(summary.speedupSource).toBeNull();
  });
});
