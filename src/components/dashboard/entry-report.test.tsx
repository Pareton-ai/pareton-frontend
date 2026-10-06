import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { parseRoundEntryReport, parseCampaign } from "@/lib/api/parse";
import { mockGetRoundEntryReport, MOCK_CAMPAIGN } from "@/lib/api/mocks";
import { mockTierReport, MOCK_TIER_RULE } from "@/lib/api/mock-tier-report";
import {
  EntryReportWorkload,
  EntryReportStats,
  EntryReportPrompts,
  EntryReportExplanation,
  EntryReportConcurrency,
} from "./entry-report";
import { CampaignRequirements, CampaignReference } from "./campaign-spec";

const legacy = () =>
  mockGetRoundEntryReport("33333333-3333-3333-3333-333333333333", 2);
const weighted = (failed = 0) =>
  parseRoundEntryReport(mockTierReport(legacy(), failed));

describe("weighted tier report rendering", () => {
  it("renders all tier contributions, natural outputs and complete-group timing", () => {
    const html = renderToStaticMarkup(
      <EntryReportWorkload report={weighted()} />
    );
    for (const text of [
      "C32",
      "90% of baseline",
      "Tier completion",
      "100.000s",
      "110.000s",
      "25%",
      "− candidate / baseline",
      "client queueing",
      "All four tiers overlap",
      "No request failures",
    ])
      expect(html).toContain(text);
    expect(html).not.toContain("Median speedup");
    expect(html).not.toContain("Request interval");
  });
  it("shows positive raw speed credit capped before a nonzero deduction", () => {
    const html = renderToStaticMarkup(
      <EntryReportWorkload report={weighted(1)} />
    );
    expect(html).toContain("min(0.150000, 0) = 0.000000");
    expect(html).toContain("0.000000 - 0.003125 =");
    expect(html).toContain("-0.003125");
  });
  it("labels per-request values as diagnostics and omits median-rule summary labels", () => {
    const report = weighted();
    const html = renderToStaticMarkup(
      <>
        <EntryReportStats report={report} />
        <EntryReportExplanation report={report} />
        <EntryReportPrompts report={report} />
      </>
    );
    expect(html).toContain("Per-request diagnostics");
    expect(html).toContain("not score contributions");
    expect(html).toContain("Eligible requests");
    expect(html).not.toContain("Prompts scored");
    expect(html).not.toContain("Zeroed total");
  });
  it.each([
    [4, "one tier at a time"],
    [8, "one tier at a time"],
    [16, "2k + 4k together, then 8k + 16k"],
    [32, "All four tiers overlap"],
  ])("shows C%s grouping", (cap, label) => {
    const report = weighted();
    report.workload!.request_concurrency = cap as number;
    expect(
      renderToStaticMarkup(<EntryReportWorkload report={report} />)
    ).toContain(label);
  });
  it("preserves historical median arithmetic and interval wording", () => {
    const html = renderToStaticMarkup(
      <EntryReportWorkload report={parseRoundEntryReport(legacy())} />
    );
    expect(html).toContain("Median speedup");
    expect(html).toContain("Request interval");
    expect(html).toContain("(burst)");
    expect(html).not.toContain("Tier completion");
  });
  it("renders disqualified workload without inventing score arithmetic", () => {
    const report = parseRoundEntryReport(
      mockTierReport({ ...legacy(), status: "disqualified", score: null })
    );
    const html = renderToStaticMarkup(<EntryReportWorkload report={report} />);
    expect(html).toContain("C32");
    expect(html).not.toContain("Score calculation");
  });
  it("shows observed rather than promised occupancy and ignores malformed rows", () => {
    const report = weighted();
    const html = renderToStaticMarkup(
      <EntryReportConcurrency report={report} />
    );
    expect(html).toContain("25.50");
    expect(html).toContain("below the requested cap");
    report.sla = { concurrency_observations: [{ rep: NaN }] };
    expect(
      renderToStaticMarkup(<EntryReportConcurrency report={report} />)
    ).toBe("");
  });
  it("shows campaign weights, failure penalty and natural output ceiling", () => {
    const campaign = parseCampaign({
      ...MOCK_CAMPAIGN,
      scoring_rule: MOCK_TIER_RULE,
      sampling_rule: {
        ...MOCK_CAMPAIGN.sampling_rule,
        algo_version: 5,
        request_concurrency: 32,
        max_tokens: 5120,
      },
    });
    const html = renderToStaticMarkup(
      <>
        <CampaignRequirements campaign={campaign} />
        <CampaignReference campaign={campaign} />
      </>
    );
    expect(html).toContain("90% of baseline");
    expect(html).toContain("5,120 max output tokens");
    expect(html).toContain("Tier weights:");
    expect(html).toContain("Failure penalty:");
  });
  it("renders only the selected tiers for a subset campaign", () => {
    const input = mockTierReport(legacy());
    const tiers = input.score_breakdown!.tiers!;
    delete tiers["2k"];
    delete tiers["4k"];
    tiers["8k"]!.weight = 0.5;
    tiers["16k"]!.weight = 0.5;
    input.workload!.input_tiers = ["8k", "16k"];
    const html = renderToStaticMarkup(
      <EntryReportWorkload report={parseRoundEntryReport(input)} />
    );
    expect(html).toContain(">8k</th>");
    expect(html).toContain(">16k</th>");
    expect(html).not.toContain(">2k</th>");
    expect(html).not.toContain(">4k</th>");
    expect(html).toContain("8k + 16k overlap");
  });
  it("shows only the selected campaign tier weights", () => {
    const campaign = parseCampaign({
      ...MOCK_CAMPAIGN,
      scoring_rule: {
        name: "weighted_tier_completion_speedup",
        failure_penalty: 0.1,
        tier_weights: { "8k": 0.5, "16k": 0.5 },
      },
      sampling_rule: {
        ...MOCK_CAMPAIGN.sampling_rule,
        algo_version: 5,
        request_concurrency: 16,
        input_tiers: ["8k", "16k"],
      },
    });
    const html = renderToStaticMarkup(
      <>
        <CampaignRequirements campaign={campaign} />
        <CampaignReference campaign={campaign} />
      </>
    );
    expect(html).toContain("8k: 50%");
    expect(html).toContain("16k: 50%");
    expect(html).not.toContain("2k:");
    expect(html).not.toContain("4k:");
    expect(html).toContain("8k + 16k overlap");
  });
});
