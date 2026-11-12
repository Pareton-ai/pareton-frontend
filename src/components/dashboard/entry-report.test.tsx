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
      "Eligible speedup equals raw weighted speedup",
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
  it("renders batched-token timing gaps neutrally while retaining real failures", () => {
    const report = weighted(1);
    report.prompts = [
      {
        request_id: "batched",
        speedup: 0,
        aligned_tokens: 5000,
        baseline_e2e_s: null,
        candidate_e2e_s: null,
        reason: "insufficient timing",
        candidate_failed: false,
      },
      {
        request_id: "short",
        speedup: 0,
        aligned_tokens: 3000,
        baseline_e2e_s: null,
        candidate_e2e_s: null,
        reason: "candidate output below tolerance",
        candidate_failed: true,
      },
    ];
    const html = renderToStaticMarkup(<EntryReportPrompts report={report} />);
    const rows = html.match(/<tr\b[^>]*>.*?<\/tr>/g)!;
    expect(rows[1]).toContain(
      "Per-token timing unavailable (not a request failure)"
    );
    expect(rows[1]).not.toContain("text-rust");
    expect(rows[1]).not.toContain("0.00%");
    expect(rows[2]).toContain("candidate output below tolerance");
    expect(rows[2]).toContain("text-rust");
    expect(html).toContain("Diagnostic / failure");
    expect(html).toContain("Diagnostic speedup");

    // An actual zero diagnostic remains a measurement, not a timing gap.
    report.prompts = [{ ...report.prompts[0]!, reason: null }];
    expect(
      renderToStaticMarkup(<EntryReportPrompts report={report} />)
    ).toContain("0.00%");
  });
  it("keeps median timing gates and unknown completion flags conservative", () => {
    const report = weighted();
    report.prompts = [
      {
        request_id: "missing-timing",
        speedup: 0,
        aligned_tokens: 5000,
        baseline_e2e_s: null,
        candidate_e2e_s: null,
        reason: "insufficient timing",
        candidate_failed: false,
      },
    ];
    report.scoring_rule = { name: "median_e2e_speedup" };
    let html = renderToStaticMarkup(<EntryReportPrompts report={report} />);
    expect(html).toContain("insufficient timing");
    expect(html).toContain("text-rust");
    expect(html).not.toContain("not a request failure");

    report.scoring_rule = MOCK_TIER_RULE;
    delete report.prompts[0]!.candidate_failed;
    html = renderToStaticMarkup(<EntryReportPrompts report={report} />);
    expect(html).toContain("insufficient timing");
    expect(html).toContain("text-rust");
    expect(html).not.toContain("not a request failure");
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
  it("explains a TTFT-capped score and fixed-length outputs", () => {
    const input = mockTierReport(legacy());
    Object.assign(input.score_breakdown!, {
      eligible_speedup: 0,
      ttft_ratio: 2.5,
      max_ttft_ratio: 2,
      ttft_capped: true,
    });
    input.score = -input.score_breakdown!.penalty;
    input.workload!.ignore_eos = true;
    const html = renderToStaticMarkup(
      <EntryReportWorkload report={parseRoundEntryReport(input)} />
    );
    expect(html).toContain("2.50×");
    expect(html).toContain("over the 2× cap");
    expect(html).toContain("over 2× the baseline");
    expect(html).toContain("min(0.150000, 0) = 0.000000");
    expect(html).toContain("Fixed length");
    expect(html).not.toContain("Natural EOS");
  });
  it("does not call an unmeasured TTFT ratio within the cap", () => {
    const input = mockTierReport(legacy());
    Object.assign(input.score_breakdown!, {
      ttft_ratio: null,
      max_ttft_ratio: 2,
      ttft_capped: false,
    });
    const html = renderToStaticMarkup(
      <EntryReportWorkload report={parseRoundEntryReport(input)} />
    );
    expect(html).toContain("not measured; cap 2×");
    expect(html).not.toContain("within the 2× cap");
  });
  it("shows a TTFT cap and fixed-length outputs on the campaign spec", () => {
    const campaign = parseCampaign({
      ...MOCK_CAMPAIGN,
      scoring_rule: { ...MOCK_TIER_RULE, max_ttft_ratio: 2 },
      sampling_rule: {
        ...MOCK_CAMPAIGN.sampling_rule,
        algo_version: 6,
        request_concurrency: 16,
        max_tokens: 220,
        ignore_eos: true,
      },
    });
    const html = renderToStaticMarkup(
      <>
        <CampaignRequirements campaign={campaign} />
        <CampaignReference campaign={campaign} />
      </>
    );
    expect(html).toContain("TTFT cap");
    expect(html).toContain("2× the baseline");
    expect(html).toContain("returns exactly this many tokens");
    expect(html).not.toContain("Natural EOS");
  });
  it("shows a drawn output-length range instead of one fixed length", () => {
    const sampling = {
      ...MOCK_CAMPAIGN.sampling_rule,
      algo_version: 6,
      request_concurrency: 16,
      max_tokens: 5120,
      ignore_eos: true,
      output_tokens_range: [220, 5120],
    };
    const campaign = parseCampaign({
      ...MOCK_CAMPAIGN,
      scoring_rule: MOCK_TIER_RULE,
      sampling_rule: sampling,
    });
    expect(campaign.sampling_rule?.output_tokens_range).toEqual([220, 5120]);
    const spec = renderToStaticMarkup(
      <CampaignReference campaign={campaign} />
    );
    expect(spec).toContain("each round draws 220 to 5,120 tokens");
    expect(spec).not.toContain("returns exactly this many tokens");
    const input = mockTierReport(legacy());
    Object.assign(input.workload!, {
      ignore_eos: true,
      output_tokens_range: [220, 5120],
    });
    const report = renderToStaticMarkup(
      <EntryReportWorkload report={parseRoundEntryReport(input)} />
    );
    expect(report).toContain("drawn for this round from 220 to 5,120 tokens");
    expect(report).not.toContain("Fixed length");
    // A range only means something on a forced-length rule, and must be sane.
    for (const bad of [
      { ...sampling, ignore_eos: false },
      { ...sampling, output_tokens_range: [5120, 220] },
      { ...sampling, output_tokens_range: [220.5, 5120] },
      { ...sampling, output_tokens_range: "220-5120" },
    ]) {
      const parsed = parseCampaign({ ...MOCK_CAMPAIGN, sampling_rule: bad });
      expect(parsed.sampling_rule?.output_tokens_range).toBeUndefined();
    }
  });
  it("shows the GPU memory cap on the campaign spec", () => {
    const campaign = parseCampaign({
      ...MOCK_CAMPAIGN,
      scoring_rule: { ...MOCK_TIER_RULE, max_extra_gpu_memory_mib: 2048 },
    });
    expect(campaign.scoring_rule.max_extra_gpu_memory_mib).toBe(2048);
    const html = renderToStaticMarkup(
      <CampaignRequirements campaign={campaign} />
    );
    expect(html).toContain("GPU memory cap");
    expect(html).toContain("more than 2 GiB above the baseline");
    const plain = parseCampaign({
      ...MOCK_CAMPAIGN,
      scoring_rule: { ...MOCK_TIER_RULE, max_extra_gpu_memory_mib: -1 },
    });
    expect(plain.scoring_rule.max_extra_gpu_memory_mib).toBeUndefined();
    expect(
      renderToStaticMarkup(<CampaignRequirements campaign={plain} />)
    ).not.toContain("GPU memory cap");
    // The harness applies the cap under every rule, so every rule shows it.
    const median = parseCampaign({
      ...MOCK_CAMPAIGN,
      scoring_rule: {
        name: "median_e2e_speedup",
        max_extra_gpu_memory_mib: 2048,
      },
    });
    expect(
      renderToStaticMarkup(<CampaignRequirements campaign={median} />)
    ).toContain("more than 2 GiB above the baseline");
  });
  it("shows an entry's GPU memory against the cap", () => {
    const memory = {
      baseline_peak_mib: [120000, 120100],
      candidate_peak_mib: [121234.4, 120000],
      extra_mib: 1234.4,
      max_extra_gpu_memory_mib: 2048,
      over_cap: false,
    };
    const within = parseRoundEntryReport({
      ...mockTierReport(legacy()),
      gpu_memory: memory,
    });
    expect(within.gpu_memory).toEqual({
      extra_mib: 1234.4,
      max_extra_mib: 2048,
      over_cap: false,
    });
    const html = renderToStaticMarkup(<EntryReportWorkload report={within} />);
    expect(html).toContain("GPU memory vs baseline");
    expect(html).toContain("+1,234 MiB on the fullest GPU");
    expect(html).toContain("within the");
    expect(html).toContain("2 GiB");
    // A candidate disqualified over the cap has no score but keeps the row.
    const over = parseRoundEntryReport({
      ...mockTierReport({ ...legacy(), status: "disqualified", score: null }),
      gpu_memory: { ...memory, extra_mib: 3000, over_cap: true },
    });
    const overHtml = renderToStaticMarkup(
      <EntryReportWorkload report={over} />
    );
    expect(overHtml).toContain("+3,000 MiB");
    expect(overHtml).toContain("over the");
    expect(overHtml).not.toContain("Score calculation");
    // Below the baseline everywhere, and reports without the field.
    const below = parseRoundEntryReport({
      ...mockTierReport(legacy()),
      gpu_memory: { ...memory, extra_mib: -40 },
    });
    expect(
      renderToStaticMarkup(<EntryReportWorkload report={below} />)
    ).toContain("-40 MiB on the fullest GPU");
    const none = parseRoundEntryReport({
      ...mockTierReport(legacy()),
      gpu_memory: { extra_mib: "lots" },
    });
    expect(none.gpu_memory).toBeUndefined();
    // No verdict from the harness: dropped, never shown as within the cap.
    expect(
      parseRoundEntryReport({
        ...mockTierReport(legacy()),
        gpu_memory: { ...memory, extra_mib: 3000, over_cap: null },
      }).gpu_memory
    ).toBeUndefined();
    expect(
      renderToStaticMarkup(<EntryReportWorkload report={weighted()} />)
    ).not.toContain("GPU memory vs baseline");
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
  it("describes a v6 campaign as a concurrent tier workload", () => {
    const campaign = parseCampaign({
      ...MOCK_CAMPAIGN,
      scoring_rule: {
        name: "weighted_tier_completion_speedup",
        failure_penalty: 0.1,
        tier_weights: { "8k": 0.25, "16k": 0.25, "32k": 0.25, "64k": 0.25 },
      },
      sampling_rule: {
        ...MOCK_CAMPAIGN.sampling_rule,
        algo_version: 6,
        request_concurrency: 32,
        input_tiers: ["8k", "16k", "32k", "64k"],
      },
    });
    const html = renderToStaticMarkup(
      <>
        <CampaignRequirements campaign={campaign} />
        <CampaignReference campaign={campaign} />
      </>
    );
    expect(html).toContain("C32 request concurrency");
    expect(html).toContain("All four tiers overlap");
    expect(html).toContain("64k: 25%");
  });
  it("names where the quantization comes from when the campaign pins none", () => {
    const precision = (quantization: string | null) =>
      renderToStaticMarkup(
        <CampaignRequirements
          campaign={parseCampaign({
            ...MOCK_CAMPAIGN,
            bench: {
              ...MOCK_CAMPAIGN.bench,
              model: { ...MOCK_CAMPAIGN.bench.model, quantization },
            },
          })}
        />
      );
    expect(precision(null)).toContain(
      "bfloat16 · quantization from checkpoint"
    );
    expect(precision("fp8")).toContain("bfloat16 · fp8");
  });
});
