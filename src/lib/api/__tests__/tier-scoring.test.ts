import { describe, expect, it } from "vitest";
import { parseCampaign, parseRoundEntryReport } from "../parse";
import { MOCK_CAMPAIGN, mockGetRoundEntryReport } from "../mocks";
import { mockTierReport, MOCK_TIER_RULE } from "../mock-tier-report";
import { INPUT_TIERS } from "../types";

const legacy = () =>
  mockGetRoundEntryReport("33333333-3333-3333-3333-333333333333", 2);
const wire = () => mockTierReport(legacy());

describe("v5 report contract", () => {
  it("retains weighted evidence without median or interval fields", () => {
    const input = wire();
    const parsed = parseRoundEntryReport(input);
    expect(parsed.score_breakdown).toEqual(input.score_breakdown);
    expect(parsed.workload).toEqual(input.workload);
    expect(parsed.score).toBe(0.15);
  });

  it.each([1, 2, 4, 8, 16, 32])("accepts C%s", (concurrency) => {
    const input = wire();
    expect(
      parseRoundEntryReport({
        ...input,
        workload: { ...input.workload, request_concurrency: concurrency },
      }).workload?.request_concurrency
    ).toBe(concurrency);
  });

  it("preserves the failure cap, denominator and deduction without recalculating the score", () => {
    const input = mockTierReport(legacy(), 1);
    const parsed = parseRoundEntryReport(input);
    expect(parsed.score_breakdown?.weighted_speedup).toBe(0.15);
    expect(parsed.score_breakdown?.eligible_speedup).toBe(0);
    expect(parsed.score_breakdown?.scheduled_requests).toBe(32);
    expect(parsed.score_breakdown?.penalty).toBe(0.003125);
    expect(parsed.score).toBe(-0.003125);
  });

  it("retains nonuniform and zero weights and negative speedups", () => {
    const input = wire();
    const tiers = input.score_breakdown!.tiers!;
    INPUT_TIERS.forEach((t, i) => {
      tiers[t].weight = [0, 0.1, 0.2, 0.7][i];
    });
    expect(parseRoundEntryReport(input).score_breakdown?.tiers).toEqual(tiers);
  });

  it.each([
    "missing tier",
    "nonfinite time",
    "invalid weights",
    "missing eligible",
  ])("hides incomplete arithmetic: %s", (corruption) => {
    const input = wire();
    const score = input.score_breakdown!;
    if (corruption === "missing tier")
      delete (score.tiers as Partial<NonNullable<typeof score.tiers>>)["4k"];
    if (corruption === "nonfinite time")
      score.tiers!["4k"].candidate_completion_s = Infinity;
    if (corruption === "invalid weights") score.tiers!["4k"].weight = 1;
    if (corruption === "missing eligible")
      delete (score as { eligible_speedup?: number }).eligible_speedup;
    const parsed = parseRoundEntryReport(input);
    expect(parsed.score_breakdown).toBeNull();
    expect(parsed.score).toBe(input.score);
    expect(parsed.workload?.request_concurrency).toBe(32);
  });

  it("keeps historical median arithmetic and burst intervals", () => {
    const input = legacy();
    const parsed = parseRoundEntryReport(input);
    expect(parsed.score_breakdown).toEqual(input.score_breakdown);
    expect(parsed.workload?.request_interval_ms).toBe(0);
    expect(parsed.workload?.request_concurrency).toBeUndefined();
  });

  it("does not invent scoring evidence for baseline or disqualified entries", () => {
    for (const overrides of [
      { role: "baseline" },
      { status: "disqualified", score: null },
    ]) {
      const parsed = parseRoundEntryReport(
        mockTierReport({ ...legacy(), ...overrides })
      );
      expect(parsed.score_breakdown).toBeNull();
      expect(parsed.workload?.request_concurrency).toBe(32);
    }
  });

  it("retains manifest weights, penalty and natural output ceiling", () => {
    const campaign = parseCampaign({
      ...MOCK_CAMPAIGN,
      scoring_rule: MOCK_TIER_RULE,
      sampling_rule: {
        ...MOCK_CAMPAIGN.sampling_rule,
        algo_version: 5,
        request_concurrency: 4,
        max_tokens: 5120,
      },
    });
    expect(campaign.scoring_rule).toEqual(MOCK_TIER_RULE);
    expect(campaign.sampling_rule).toMatchObject({
      request_concurrency: 4,
      max_tokens: 5120,
    });
  });
});
