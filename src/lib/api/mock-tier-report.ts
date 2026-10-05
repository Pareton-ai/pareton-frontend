/** Synthetic v5 evidence for local UI review and regression tests. */
import {
  INPUT_TIERS,
  type RoundEntryReport,
  type ScoreBreakdown,
} from "./types";

export const MOCK_TIER_RULE = {
  name: "weighted_tier_completion_speedup",
  tier_weights: { "2k": 0.25, "4k": 0.25, "8k": 0.25, "16k": 0.25 },
  failure_penalty: 0.1,
};

export function mockTierReport(
  base: RoundEntryReport,
  failed = 0
): RoundEntryReport {
  const baseline = base.role === "baseline";
  const scored = !baseline && base.status === "scored";
  const tiers = Object.fromEntries(
    INPUT_TIERS.map((tier, i) => [
      tier,
      {
        weight: 0.25,
        baseline_completion_s: 100,
        candidate_completion_s: [80, 90, 110, 60][i],
        speedup: [0.2, 0.1, -0.1, 0.4][i],
        scheduled_requests: 8,
      },
    ])
  ) as NonNullable<ScoreBreakdown["tiers"]>;
  const penalty = (0.1 * failed) / 32;
  const eligible = failed ? 0 : 0.15;
  const prompts = Array.from({ length: 32 }, (_, i) => ({
    request_id: `v5-${i}`,
    input_length_group: INPUT_TIERS[Math.floor(i / 8)],
    input_tokens: [2048, 4096, 8192, 16384][Math.floor(i / 8)],
    max_tokens: 5120,
    aligned_tokens: i < failed ? 2699 : 3000,
    baseline_e2e_s: 100,
    candidate_e2e_s: 80,
    speedup: i < failed ? 0 : 0.2,
    reason: i < failed ? "candidate output below 90% minimum" : null,
    candidate_failed: i < failed,
  }));
  return {
    ...base,
    scoring_rule: MOCK_TIER_RULE,
    score: baseline ? 0 : scored ? eligible - penalty : null,
    workload: {
      algo_version: 5,
      request_interval_ms: null,
      request_concurrency: 32,
      enable_thinking: false,
      max_model_len: 262144,
      temperature: null,
      temperature_range: [0.1, 1.01],
    },
    prompt_summary: {
      total: scored ? 32 : 0,
      scored: scored ? 32 - failed : 0,
      zeroed: scored ? failed : 0,
      below_tolerance: scored ? failed : 0,
      zeroed_by_reason: {},
    },
    prompts: scored ? prompts : [],
    score_breakdown: scored
      ? {
          weighted_speedup: 0.15,
          eligible_speedup: eligible,
          tiers,
          scheduled_requests: 32,
          failed_requests: failed,
          failure_rate: failed / 32,
          failure_penalty: 0.1,
          penalty,
        }
      : null,
    sla: {
      tier_completion: Object.fromEntries(
        INPUT_TIERS.map((t) => [
          t,
          { completion_s: baseline ? 100 : tiers[t].candidate_completion_s },
        ])
      ),
      concurrency_observations: [1, 2, 3].map((rep) => ({
        rep,
        group_start_offset_ms: 0,
        requested_concurrency: 32,
        effective_concurrency: 32,
        observed_peak: 32,
        time_weighted_mean: 25.5,
      })),
    },
    correctness: scored ? { verdict: "pass" } : null,
  };
}
