/**
 * Local dashboard fixtures for UI review.
 *
 * Enabled when `PARETON_USE_MOCKS=1`. Not for production.
 */

import { ApiError } from "@/lib/api/errors";
import type {
  BenchFailReason,
  BenchVerdict,
  Campaign,
  SubmissionDetail,
  SubmissionRow,
  SubmissionStateName,
  SubmissionsPage,
} from "@/lib/api/types";

export const MOCK_CAMPAIGN_ID = "mock-campaign";
export const MOCK_DRAFT_CAMPAIGN_ID = "mock-campaign-draft";
export const MOCK_CLOSED_CAMPAIGN_ID = "mock-campaign-closed";

/** Enough rows to exercise pagination (PAGE_SIZE = 25). */
const EXTRA_SUBMISSION_COUNT = 36;

const HOTKEYS = [
  "5FakeHotkeyAAAA111111111111111111111111111111111111111111",
  "5FakeHotkeyBBBB222222222222222222222222222222222222222222",
  "5FakeHotkeyCCCC333333333333333333333333333333333333333333",
  "5FakeHotkeyDDDD444444444444444444444444444444444444444444",
  "5FakeHotkeyEEEE555555555555555555555555555555555555555555",
  "5FakeHotkeyFFFF666666666666666666666666666666666666666666",
] as const;

const PASS_HASH =
  "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const REJECT_CROSS_ENV_HASH =
  "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const REJECT_PERF_HASH =
  "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc";
const QUEUED_HASH =
  "sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd";

function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 3_600_000).toISOString();
}

function minutesAfter(iso: string, minutes: number): string {
  return new Date(new Date(iso).getTime() + minutes * 60_000).toISOString();
}

function padHex(n: number, width: number): string {
  return n.toString(16).padStart(width, "0");
}

function mockHash(n: number): string {
  return `sha256:${padHex(n, 64)}`;
}

function mockId(n: number): string {
  const hex = padHex(n, 12);
  return `${hex.slice(0, 8)}-${hex.slice(0, 4)}-4${hex.slice(1, 4)}-a${hex.slice(2, 5)}-${hex.padEnd(12, "0")}`;
}

export const MOCK_CAMPAIGN: Campaign = {
  campaign_id: MOCK_CAMPAIGN_ID,
  profile_id: "mock-profile",
  status: "open",
  baseline_repo: "https://github.com/Pareton-ai/mock-baseline",
  baseline_commit: "abcdef0123456789abcdef0123456789abcdef01",
  base_image_digest:
    "sha256:1111111111111111111111111111111111111111111111111111111111111111",
  gpu_skus: ["A100_80GB", "H100_80GB"],
  workload_trace_sha256:
    "sha256:2222222222222222222222222222222222222222222222222222222222222222",
  workload_trace_url: "https://example.com/trace.jsonl",
  sla: {
    p99_ttft_ms: 120,
    p99_itl_ms: 25,
    quality_floor_spec: "mock-quality-floor",
  },
  scoring_config_sha256: null,
  scoring_config_url: null,
  allowed_paths: ["src/**"],
  denied_paths: [".git/**"],
  created_at: hoursAgo(48),
  manifest_hash:
    "sha256:3333333333333333333333333333333333333333333333333333333333333333",
  customer_signoff: null,
  priority_metric: "output_tokens_per_s_ratio",
  success_threshold: "Beat baseline speedup on every target SKU.",
  bench: {
    model: {
      hf_repo: "meta-llama/Llama-3.1-8B-Instruct",
      hf_revision: "main",
      dtype: "bfloat16",
      quantization: null,
      max_model_len: 8192,
    },
    cross_env: {
      aggregate: "worst",
      speedup_metric: "output_tokens_per_s_ratio",
      min_speedup_each: 1.05,
    },
    gpu_count: 1,
    serve_args: null,
    correctness: {
      thresholds: {
        argmax_mismatch_rate: 0.001,
        mean_abs_logprob_diff: 0.0246,
        max_abs_logprob_diff: 0.164,
      },
    },
    perf_screen: null,
    baseline_engine_image_digest:
      "sha256:4444444444444444444444444444444444444444444444444444444444444444",
  },
};

export const MOCK_DRAFT_CAMPAIGN: Campaign = {
  ...MOCK_CAMPAIGN,
  campaign_id: MOCK_DRAFT_CAMPAIGN_ID,
  profile_id: "mock-profile-draft",
  status: "draft",
  gpu_skus: ["H100_80GB"],
  created_at: hoursAgo(12),
  manifest_hash:
    "sha256:5555555555555555555555555555555555555555555555555555555555555555",
  bench: {
    ...MOCK_CAMPAIGN.bench,
    model: {
      hf_repo: "Qwen/Qwen2.5-7B-Instruct",
      hf_revision: "v2.5",
      dtype: "bfloat16",
      quantization: null,
      max_model_len: 16384,
    },
    // Live draft campaigns omit correctness; the Objective panel must not crash.
    correctness: null,
  },
};

export const MOCK_CLOSED_CAMPAIGN: Campaign = {
  ...MOCK_CAMPAIGN,
  campaign_id: MOCK_CLOSED_CAMPAIGN_ID,
  profile_id: "mock-profile-closed",
  status: "closed",
  gpu_skus: ["L40S", "A10"],
  created_at: hoursAgo(30 * 24),
  manifest_hash:
    "sha256:6666666666666666666666666666666666666666666666666666666666666666",
  bench: {
    ...MOCK_CAMPAIGN.bench,
    model: {
      hf_repo: "mistralai/Mistral-7B-Instruct-v0.3",
      hf_revision: "v0.3",
      dtype: "float16",
      quantization: "fp8",
      max_model_len: 32768,
    },
  },
};

const MOCK_CAMPAIGNS: Campaign[] = [
  MOCK_CAMPAIGN,
  MOCK_DRAFT_CAMPAIGN,
  MOCK_CLOSED_CAMPAIGN,
];

type PipelineTerminal =
  "benched" | "rejected" | "bench_queued" | "building" | "screened";

type SeedSpec = {
  id: string;
  patch_hash: string;
  hotkey: string;
  hours_ago: number;
  latest_state: SubmissionStateName;
  bench_verdict: BenchVerdict;
  terminal: PipelineTerminal;
  reject_reason?: BenchFailReason;
};

const SEED_SPECS: SeedSpec[] = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    patch_hash: PASS_HASH,
    hotkey: HOTKEYS[0],
    hours_ago: 6,
    latest_state: "benched",
    bench_verdict: "pass",
    terminal: "benched",
  },
  {
    id: "22222222-2222-2222-2222-222222222222",
    patch_hash: REJECT_CROSS_ENV_HASH,
    hotkey: HOTKEYS[1],
    hours_ago: 12,
    latest_state: "rejected",
    bench_verdict: "fail_cross_env_speedup",
    terminal: "rejected",
    reject_reason: "fail_cross_env_speedup",
  },
  {
    id: "33333333-3333-3333-3333-333333333333",
    patch_hash: REJECT_PERF_HASH,
    hotkey: HOTKEYS[2],
    hours_ago: 18,
    latest_state: "rejected",
    bench_verdict: "fail_perf_screen",
    terminal: "rejected",
    reject_reason: "fail_perf_screen",
  },
  {
    id: "44444444-4444-4444-4444-444444444444",
    patch_hash: QUEUED_HASH,
    hotkey: HOTKEYS[3],
    hours_ago: 2,
    latest_state: "bench_queued",
    bench_verdict: null,
    terminal: "bench_queued",
  },
];

const EXTRA_VARIANTS: Array<{
  latest_state: SubmissionStateName;
  bench_verdict: BenchVerdict;
  terminal: PipelineTerminal;
  reject_reason?: BenchFailReason;
}> = [
  {
    latest_state: "benched",
    bench_verdict: "pass",
    terminal: "benched",
  },
  {
    latest_state: "rejected",
    bench_verdict: "fail_correctness",
    terminal: "rejected",
    reject_reason: "fail_correctness",
  },
  {
    latest_state: "rejected",
    bench_verdict: "fail_perf_screen",
    terminal: "rejected",
    reject_reason: "fail_perf_screen",
  },
  {
    latest_state: "rejected",
    bench_verdict: "fail_cross_env_speedup",
    terminal: "rejected",
    reject_reason: "fail_cross_env_speedup",
  },
  {
    latest_state: "rejected",
    bench_verdict: "fail_sla",
    terminal: "rejected",
    reject_reason: "fail_sla",
  },
  {
    latest_state: "bench_queued",
    bench_verdict: null,
    terminal: "bench_queued",
  },
  {
    latest_state: "building",
    bench_verdict: null,
    terminal: "building",
  },
  {
    latest_state: "screened",
    bench_verdict: null,
    terminal: "screened",
  },
];

function rowFromSpec(spec: SeedSpec): SubmissionRow {
  return {
    id: spec.id,
    patch_hash: spec.patch_hash,
    campaign_id: MOCK_CAMPAIGN_ID,
    hotkey: spec.hotkey,
    committed_at: hoursAgo(spec.hours_ago),
    latest_state: spec.latest_state,
    bench_verdict: spec.bench_verdict,
  };
}

const EXTRA_SPECS: SeedSpec[] = Array.from(
  { length: EXTRA_SUBMISSION_COUNT },
  (_, i) => {
    const variant = EXTRA_VARIANTS[i % EXTRA_VARIANTS.length];
    const n = i + 16; // keep clear of handcrafted a/b/c/d hashes
    return {
      id: mockId(n),
      patch_hash: mockHash(n),
      hotkey: HOTKEYS[i % HOTKEYS.length],
      hours_ago: 1 + ((i * 3) % 72),
      ...variant,
    };
  }
);

const ALL_SPECS: SeedSpec[] = [...SEED_SPECS, ...EXTRA_SPECS];
const MOCK_ROWS: SubmissionRow[] = ALL_SPECS.map(rowFromSpec);

function baseSubmission(
  row: SubmissionRow,
  extras?: Partial<SubmissionDetail["submission"]>
): SubmissionDetail["submission"] {
  return {
    id: row.id,
    campaign_id: row.campaign_id,
    patch_hash: row.patch_hash,
    hotkey: row.hotkey,
    baseline_commit: MOCK_CAMPAIGN.baseline_commit,
    retrieval_url: `https://example.com/patches/${row.patch_hash}.diff`,
    commit_block: 1_234_567,
    committed_at: row.committed_at,
    engine_image_ref:
      "ghcr.io/pareton-ai/pareton-engine@sha256:5555555555555555555555555555555555555555555555555555555555555555",
    created_at: row.committed_at,
    ...extras,
  };
}

function pipelineEvents(
  committedAt: string,
  terminal: PipelineTerminal,
  rejectReason?: string
): SubmissionDetail["events"] {
  const steps: Array<{
    state: SubmissionDetail["events"][number]["state"];
    at: number;
  }> = [
    { state: "committed", at: 0 },
    { state: "picked_up", at: 2 },
    { state: "fetched", at: 5 },
    { state: "verified", at: 8 },
    { state: "applied", at: 12 },
    { state: "surface_ok", at: 15 },
  ];

  if (terminal === "building") {
    steps.push({ state: "building", at: 20 });
  } else {
    steps.push(
      { state: "building", at: 20 },
      { state: "image_pushed", at: 95 },
      { state: "built", at: 100 },
      { state: "bench_queued", at: 105 }
    );
  }

  if (terminal === "benched") {
    steps.push(
      { state: "correct", at: 140 },
      { state: "screened", at: 155 },
      { state: "benched", at: 210 }
    );
  } else if (terminal === "screened") {
    steps.push({ state: "correct", at: 140 }, { state: "screened", at: 155 });
  } else if (terminal === "rejected") {
    steps.push({ state: "rejected", at: 150 });
  }

  return steps.map(({ state, at }) => ({
    state,
    created_at: minutesAfter(committedAt, at),
    detail:
      state === "rejected" && rejectReason ? { reason: rejectReason } : {},
    evidence_ref: null,
  }));
}

function round(value: number, digits = 1): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

type Percentiles = { p50: number; p95: number; p99: number };

/**
 * Baseline engine metrics every candidate is scored against.
 *
 * Shapes mirror `bench/schemas.py` in the backend repo (`EngineSlaMetrics`,
 * `CorrectnessReport`, `PerfScreenReport`), so the dashboard readers see the
 * payload they will get in production.
 */
const SLA_BASELINE = {
  ttft_ms: { p50: 62.4, p95: 98.1, p99: 112.7 },
  itl_ms: { p50: 12.4, p95: 18.9, p99: 22.6 },
  e2e_ms: { p50: 812.4, p95: 1184.2, p99: 1327.6 },
  output_tokens_per_s: 2140.5,
  requests_per_s: 8.42,
  sla_goodput_ratio: 0.96,
};

function scalePercentiles(source: Percentiles, factor: number): Percentiles {
  return {
    p50: round(source.p50 * factor),
    p95: round(source.p95 * factor),
    p99: round(source.p99 * factor),
  };
}

function correctnessReport(pass: boolean): Record<string, unknown> {
  return {
    verdict: pass ? "pass" : "fail_correctness",
    num_prompts: 64,
    num_positions_compared: 8192,
    mean_abs_logprob_diff: pass ? 0.0012 : 0.0421,
    max_abs_logprob_diff: pass ? 0.0081 : 0.6134,
    argmax_mismatch_rate: pass ? 0.0004 : 0.0312,
    evidence: "evidence/correctness/logprob_diffs.jsonl",
  };
}

function perfScreenReport(ratio: number): Record<string, unknown> {
  const baseline = SLA_BASELINE.output_tokens_per_s;
  return {
    verdict:
      ratio >= MOCK_CAMPAIGN.bench.cross_env.min_speedup_each
        ? "pass"
        : "fail_perf_screen",
    baseline_output_tokens_per_s: baseline,
    candidate_output_tokens_per_s: round(baseline * ratio),
    throughput_ratio: ratio,
    evidence: "evidence/perf_screen/perf_screen.jsonl",
  };
}

/** Candidate derived from the baseline: throughput scales up, latency down. */
function slaBenchReport(opts: {
  verdict: string;
  speedup: number;
  latency: number;
  goodput: number;
}): Record<string, unknown> {
  // Latency ratios are baseline/candidate, so faster reads above 1 like
  // throughput does.
  const latencyRatio = round(1 / opts.latency, 4);
  return {
    verdict: opts.verdict,
    repetitions: 3,
    baseline: SLA_BASELINE,
    candidate: {
      ttft_ms: scalePercentiles(SLA_BASELINE.ttft_ms, opts.latency),
      itl_ms: scalePercentiles(SLA_BASELINE.itl_ms, opts.latency),
      e2e_ms: scalePercentiles(SLA_BASELINE.e2e_ms, opts.latency),
      output_tokens_per_s: round(
        SLA_BASELINE.output_tokens_per_s * opts.speedup
      ),
      requests_per_s: round(SLA_BASELINE.requests_per_s * opts.speedup, 2),
      sla_goodput_ratio: opts.goodput,
    },
    speedup: {
      output_tokens_per_s_ratio: opts.speedup,
      requests_per_s_ratio: opts.speedup,
      p99_ttft_ratio: latencyRatio,
      p99_itl_ratio: latencyRatio,
      p99_e2e_ratio: latencyRatio,
    },
    cross_rep_variance: {
      p99_ttft_ms_rel_range: 0.031,
      p99_itl_ms_rel_range: 0.024,
      p99_e2e_ms_rel_range: 0.018,
    },
    evidence: "evidence/sla_bench",
  };
}

function jobsFor(terminal: PipelineTerminal): SubmissionDetail["jobs"] {
  if (terminal === "building") {
    return [
      { kind: "gates", status: "running", last_error: null },
      { kind: "bench", status: "pending", last_error: null },
    ];
  }
  if (terminal === "bench_queued" || terminal === "screened") {
    return [
      { kind: "gates", status: "done", last_error: null },
      { kind: "bench", status: "running", last_error: null },
    ];
  }
  return [
    { kind: "gates", status: "done", last_error: null },
    { kind: "bench", status: "done", last_error: null },
  ];
}

type ReportSeed = {
  stage: string;
  verdict: string;
  report: Record<string, unknown>;
  gpu_sku: string;
  minutes: number;
  task_id?: string;
};

/** Per-verdict report set, so each mock submission tells a coherent story. */
function reportSeeds(spec: SeedSpec): ReportSeed[] {
  const correctnessPass: ReportSeed = {
    stage: "correctness",
    verdict: "pass",
    report: correctnessReport(true),
    gpu_sku: "A100_80GB",
    minutes: 140,
  };

  if (spec.terminal === "benched") {
    return [
      correctnessPass,
      {
        stage: "perf_screen",
        verdict: "pass",
        report: perfScreenReport(1.18),
        gpu_sku: "A100_80GB",
        minutes: 155,
      },
      {
        stage: "sla_bench",
        verdict: "pass",
        report: slaBenchReport({
          verdict: "pass",
          speedup: 1.18,
          latency: 0.8,
          goodput: 0.99,
        }),
        gpu_sku: "A100_80GB",
        minutes: 205,
      },
      // Second SKU: `worst` cross-env aggregate is what the campaign gates on.
      {
        stage: "sla_bench",
        verdict: "pass",
        report: slaBenchReport({
          verdict: "pass",
          speedup: 1.11,
          latency: 0.87,
          goodput: 0.98,
        }),
        gpu_sku: "H100_80GB",
        minutes: 210,
      },
    ];
  }

  if (spec.terminal !== "rejected" || !spec.reject_reason) return [];

  if (spec.reject_reason === "fail_correctness") {
    return [
      {
        stage: "correctness",
        verdict: "fail_correctness",
        report: correctnessReport(false),
        gpu_sku: "A100_80GB",
        minutes: 145,
      },
    ];
  }

  if (spec.reject_reason === "fail_perf_screen") {
    return [
      correctnessPass,
      {
        stage: "perf_screen",
        verdict: "fail_perf_screen",
        report: perfScreenReport(0.93),
        gpu_sku: "A100_80GB",
        minutes: 150,
      },
    ];
  }

  if (spec.reject_reason === "fail_cross_env_speedup") {
    return [
      correctnessPass,
      {
        stage: "perf_screen",
        verdict: "pass",
        report: perfScreenReport(1.12),
        gpu_sku: "A100_80GB",
        minutes: 150,
      },
      {
        stage: "sla_bench",
        verdict: "pass",
        report: slaBenchReport({
          verdict: "pass",
          speedup: 1.12,
          latency: 0.84,
          goodput: 0.98,
        }),
        gpu_sku: "A100_80GB",
        minutes: 195,
      },
      {
        stage: "sla_bench",
        verdict: "fail_cross_env_speedup",
        report: slaBenchReport({
          verdict: "fail_cross_env_speedup",
          speedup: 0.97,
          latency: 1.04,
          goodput: 0.94,
        }),
        gpu_sku: "H100_80GB",
        minutes: 205,
      },
    ];
  }

  // fail_sla: throughput cleared, but p99 latency blew past the campaign gate.
  return [
    correctnessPass,
    {
      stage: "perf_screen",
      verdict: "pass",
      report: perfScreenReport(1.15),
      gpu_sku: "A100_80GB",
      minutes: 150,
    },
    {
      stage: "sla_bench",
      verdict: "fail_sla",
      report: slaBenchReport({
        verdict: "fail_sla",
        speedup: 1.15,
        latency: 1.34,
        goodput: 0.71,
      }),
      gpu_sku: "A100_80GB",
      minutes: 200,
    },
  ];
}

function detailFromSpec(spec: SeedSpec): SubmissionDetail {
  const row = rowFromSpec(spec);
  const extras =
    spec.terminal === "building" || spec.terminal === "bench_queued"
      ? { engine_image_ref: null as string | null }
      : undefined;

  const bench_reports: SubmissionDetail["bench_reports"] = reportSeeds(
    spec
  ).map((seed) => ({
    task_id: seed.task_id ?? `${seed.stage}_${seed.gpu_sku.toLowerCase()}`,
    stage: seed.stage,
    verdict: seed.verdict,
    report: seed.report,
    evidence_s3_url: null,
    gpu_sku: seed.gpu_sku,
    mock: true,
    created_at: minutesAfter(row.committed_at, seed.minutes),
  }));

  return {
    submission: baseSubmission(row, extras),
    events: pipelineEvents(row.committed_at, spec.terminal, spec.reject_reason),
    jobs: jobsFor(spec.terminal),
    bench_reports,
    bench_verdict: spec.bench_verdict,
    latest_state: spec.latest_state,
  };
}

const MOCK_DETAILS: Record<string, SubmissionDetail> = Object.fromEntries(
  ALL_SPECS.map((spec) => [spec.patch_hash, detailFromSpec(spec)])
);

const MOCK_BUILD_LOG = `=> [builder 1/4] FROM docker.io/library/ubuntu:22.04
=> [builder 2/4] COPY patch.diff /tmp/patch.diff
=> [builder 3/4] RUN git apply /tmp/patch.diff
=> [builder 4/4] RUN cmake --build . --target engine
=> exporting to image
=> => naming to ghcr.io/pareton-ai/pareton-engine:mock
build finished
`;

export function apiMocksEnabled(): boolean {
  return process.env.PARETON_USE_MOCKS === "1";
}

export function mockListCampaigns(status?: string): Campaign[] {
  if (!status) return MOCK_CAMPAIGNS;
  return MOCK_CAMPAIGNS.filter((campaign) => campaign.status === status);
}

export function mockGetCampaign(campaignId: string): Campaign {
  const campaign = MOCK_CAMPAIGNS.find((c) => c.campaign_id === campaignId);
  if (!campaign) {
    throw new ApiError({
      status: 404,
      path: `/v1/campaigns/${campaignId}`,
      detail: "campaign not found",
    });
  }
  return campaign;
}

export function mockListSubmissions(
  campaignId: string,
  opts?: { limit?: number; offset?: number }
): SubmissionsPage {
  mockGetCampaign(campaignId);

  const limit = opts?.limit ?? 50;
  const offset = opts?.offset ?? 0;
  const rows =
    campaignId === MOCK_CAMPAIGN_ID ? MOCK_ROWS : ([] as SubmissionRow[]);
  const slice = rows.slice(offset, offset + limit);
  return {
    campaign_id: campaignId,
    total: rows.length,
    limit,
    offset,
    submissions: slice,
  };
}

export function mockGetSubmission(
  campaignId: string,
  patchHash: string
): SubmissionDetail {
  if (campaignId !== MOCK_CAMPAIGN_ID) {
    throw new ApiError({
      status: 404,
      path: `/v1/campaigns/${campaignId}/submissions/${patchHash}`,
      detail: "submission not found",
    });
  }
  const detail = MOCK_DETAILS[patchHash];
  if (!detail) {
    throw new ApiError({
      status: 404,
      path: `/v1/campaigns/${campaignId}/submissions/${patchHash}`,
      detail: "submission not found",
    });
  }
  return detail;
}

export function mockGetSubmissionBuildLog(
  campaignId: string,
  patchHash: string
): string {
  const detail = mockGetSubmission(campaignId, patchHash);
  const states = detail.events.map((event) => event.state);
  const reached = states.some(
    (state) =>
      state === "building" ||
      state === "image_pushed" ||
      state === "built" ||
      state === "bench_queued" ||
      state === "benched" ||
      state === "rejected"
  );
  if (!reached) {
    throw new ApiError({
      status: 404,
      path: `/v1/campaigns/${campaignId}/submissions/${patchHash}/build-log`,
      detail: "build log not found",
    });
  }
  return MOCK_BUILD_LOG;
}
