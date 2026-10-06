import { describe, expect, it } from "vitest";
import { parseCampaign, parseRoundEntryReport } from "../parse";
import { MOCK_CAMPAIGN, mockGetRoundEntryReport } from "../mocks";
import { mockTierReport, MOCK_TIER_RULE } from "../mock-tier-report";
import { tierGrouping } from "../scoring";
import { INPUT_TIERS, type InputTier } from "../types";

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
      tiers[t]!.weight = [0, 0.1, 0.2, 0.7][i];
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
      score.tiers!["4k"]!.candidate_completion_s = Infinity;
    if (corruption === "invalid weights") score.tiers!["4k"]!.weight = 1;
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

describe("selected input tiers", () => {
  const subsetRule = {
    name: "weighted_tier_completion_speedup",
    failure_penalty: 0.1,
    tier_weights: { "8k": 0.5, "16k": 0.5 },
  };
  const subsetCampaign = (sampling: Record<string, unknown>) =>
    parseCampaign({
      ...MOCK_CAMPAIGN,
      scoring_rule: subsetRule,
      sampling_rule: {
        ...MOCK_CAMPAIGN.sampling_rule,
        algo_version: 5,
        request_concurrency: 4,
        ...sampling,
      },
    });

  it("preserves a tier-weight subset and declared input tiers", () => {
    const campaign = subsetCampaign({ input_tiers: ["8k", "16k"] });
    expect(campaign.scoring_rule.tier_weights).toEqual({
      "8k": 0.5,
      "16k": 0.5,
    });
    expect(campaign.sampling_rule?.input_tiers).toEqual(["8k", "16k"]);
  });

  it("parses a report scored over two tiers only", () => {
    const input = wire();
    const tiers = input.score_breakdown!.tiers!;
    delete tiers["2k"];
    delete tiers["4k"];
    tiers["8k"]!.weight = 0.5;
    tiers["16k"]!.weight = 0.5;
    input.workload!.input_tiers = ["8k", "16k"];
    const parsed = parseRoundEntryReport(input);
    expect(parsed.score_breakdown?.tiers).toEqual(tiers);
    expect(parsed.workload?.input_tiers).toEqual(["8k", "16k"]);
  });

  it("rejects a report tier set with an unknown key", () => {
    const input = wire();
    const tiers = input.score_breakdown!.tiers! as Record<string, unknown>;
    tiers["32k"] = tiers["16k"];
    expect(parseRoundEntryReport(input).score_breakdown).toBeNull();
  });

  it("rejects a report subset whose weights do not sum to 1", () => {
    const input = wire();
    const tiers = input.score_breakdown!.tiers!;
    delete tiers["2k"];
    delete tiers["4k"];
    delete tiers["16k"];
    expect(parseRoundEntryReport(input).score_breakdown).toBeNull();
  });

  it("drops campaign tier weights with an unknown key", () => {
    const campaign = parseCampaign({
      ...MOCK_CAMPAIGN,
      scoring_rule: {
        ...subsetRule,
        tier_weights: { "8k": 0.5, "16k": 0.4, "32k": 0.1 },
      },
    });
    expect(campaign.scoring_rule.tier_weights).toBeUndefined();
  });

  it.each([[["16k", "8k"]], [["32k"]], [[]], [["8k", "8k"]]])(
    "omits invalid input_tiers %j",
    (input_tiers) => {
      const campaign = subsetCampaign({ input_tiers });
      expect(campaign.sampling_rule?.input_tiers).toBeUndefined();
      const report = wire();
      report.workload!.input_tiers = input_tiers as InputTier[];
      expect(
        parseRoundEntryReport(report).workload?.input_tiers
      ).toBeUndefined();
    }
  );

  it.each([
    [1, undefined, "2k, 4k, 8k, then 16k; one tier at a time"],
    [2, undefined, "2k, 4k, 8k, then 16k; one tier at a time"],
    [4, undefined, "2k, 4k, 8k, then 16k; one tier at a time"],
    [8, undefined, "2k, 4k, 8k, then 16k; one tier at a time"],
    [16, undefined, "2k + 4k together, then 8k + 16k"],
    [32, undefined, "All four tiers overlap"],
    [4, ["8k", "16k"], "8k, then 16k; one tier at a time"],
    [16, ["8k", "16k"], "8k + 16k overlap"],
    [32, ["8k", "16k"], "8k + 16k overlap"],
    [3, undefined, "Grouping unavailable"],
  ] as const)("describes C%s over %j", (concurrency, tiers, expected) => {
    expect(tierGrouping(concurrency, tiers)).toBe(expected);
  });
});
