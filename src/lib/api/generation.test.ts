import { describe, expect, it } from "vitest";
import { readRepetitionChecks, readSampling } from "./generation";
import { parseRoundEntryReport } from "./parse";

describe("optional generation diagnostics", () => {
  it("keeps old reports unknown rather than claiming checks passed", () => {
    const report = parseRoundEntryReport({
      workload: { algo_version: 4, request_interval_ms: 2 },
    });
    expect(report.workload?.temperature_range).toBeNull();
    expect(report.workload?.randomize_seed).toBeNull();
    expect(readSampling(report.sla?.sampling)).toEqual([]);
    expect(readRepetitionChecks(report.correctness?.prompt_checks)).toEqual([]);
    expect(readRepetitionChecks([{ request_id: "a" }])[0].status).toBe(
      "Not recorded"
    );
  });
  it("preserves per-prompt failures on disqualified reports without scores", () => {
    const report = parseRoundEntryReport({
      status: "disqualified",
      workload: {
        algo_version: 4,
        request_interval_ms: 2,
        temperature_range: [0.1, 1.5],
        randomize_seed: true,
      },
      correctness: {
        prompt_checks: [
          {
            request_id: "hf-028",
            distinct_ngram_ratio: 0.6808,
            baseline_distinct_ngram_ratio: 0.8953,
            distinct_ngram_ratio_drop: 0.2145,
            max_distinct_ngram_ratio_drop: 0.1,
            degenerate: "repetition",
          },
          {
            request_id: "hf-029",
            distinct_ngram_ratio: 0.6,
            baseline_distinct_ngram_ratio: 0.65,
            degenerate: null,
          },
          { request_id: "hf-030", dropped: true, drop_reason: "baseline loop" },
          {
            request_id: "hf-031",
            degenerate: null,
            degeneracy_exemptions: ["forced_tail_diagnostic_only"],
          },
        ],
      },
    });
    expect(report.prompts).toEqual([]);
    expect(report.workload?.temperature_range).toEqual([0.1, 1.5]);
    expect(report.workload?.randomize_seed).toBe(true);
    const rows = readRepetitionChecks(report.correctness?.prompt_checks);
    expect(rows.map((r) => r.status)).toEqual([
      "Failed",
      "Passed",
      "Excluded",
      "Tail diagnostic only",
    ]);
    expect(rows[0]).toMatchObject({
      requestId: "hf-028",
      baseline: 0.8953,
      drop: 0.2145,
      limit: 0.1,
    });
    expect(rows[1].baseline).toBe(0.65);
  });
  it("accepts seed zero and ignores malformed rows", () => {
    expect(
      readSampling([
        null,
        { request_id: "a", rep: 1, seed: 0, temperature: 0, top_p: 1 },
        { request_id: "b", rep: 2, seed: 1.5, temperature: 0.7, top_p: 1 },
      ])
    ).toEqual([{ requestId: "a", rep: 1, seed: 0, temperature: 0, topP: 1 }]);
    expect(
      readRepetitionChecks([{ request_id: "a", distinct_ngram_ratio: NaN }])[0]
        .distinct
    ).toBeNull();
  });
});
