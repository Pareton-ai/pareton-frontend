/**
 * Local dashboard fixtures for UI review.
 *
 * Enabled when `PARETON_USE_MOCKS=1`. Not for production.
 */

import { ApiError } from "@/lib/api/errors";
import type {
  Campaign,
  EntryStatus,
  Leader,
  Round,
  RoundDetail,
  RoundEntry,
  RoundsPage,
  ScoreProgressSeries,
  SubmissionDetail,
  SubmissionRow,
  SubmissionStateName,
  SubmissionsPage,
} from "@/lib/api/types";

export const MOCK_CAMPAIGN_ID = "mock-campaign";
export const MOCK_DRAFT_CAMPAIGN_ID = "mock-campaign-draft";
export const MOCK_CLOSED_CAMPAIGN_ID = "mock-campaign-closed";

const MOCK_ROUND_1 = "11111111-1111-1111-1111-111111111111";
const MOCK_ROUND_2 = "22222222-2222-2222-2222-222222222222";
const MOCK_ROUND_3 = "33333333-3333-3333-3333-333333333333";

/** Enough rows to exercise pagination (`PAGE_SIZE = 10` in submissions-table). */
const EXTRA_SUBMISSION_COUNT = 36;

const HOTKEYS = [
  "5FakeHotkeyAAAA111111111111111111111111111111111111111111",
  "5FakeHotkeyBBBB222222222222222222222222222222222222222222",
  "5FakeHotkeyCCCC333333333333333333333333333333333333333333",
  "5FakeHotkeyDDDD444444444444444444444444444444444444444444",
  "5FakeHotkeyEEEE555555555555555555555555555555555555555555",
  "5FakeHotkeyFFFF666666666666666666666666666666666666666666",
] as const;

const SCORED_HASH =
  "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const DISQUALIFIED_HASH =
  "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const REJECTED_HASH =
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
  priority_metric: "throughput",
  success_threshold: "Beat baseline median e2e latency on the campaign SKU.",
  scoring_rule: { name: "median_e2e_speedup" },
  bench: {
    model: {
      hf_repo: "meta-llama/Llama-3.1-8B-Instruct",
      hf_revision: "main",
      dtype: "bfloat16",
      quantization: null,
      max_model_len: 8192,
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
  | "scored"
  | "disqualified"
  | "rejected"
  | "bench_queued"
  | "building"
  | "round_assigned";

type SeedSpec = {
  id: string;
  patch_hash: string;
  hotkey: string;
  hours_ago: number;
  latest_state: SubmissionStateName;
  terminal: PipelineTerminal;
  round?: SubmissionRow["round"];
};

const SEED_SPECS: SeedSpec[] = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    patch_hash: SCORED_HASH,
    hotkey: HOTKEYS[0],
    hours_ago: 6,
    latest_state: "scored",
    terminal: "scored",
    round: {
      round_id: MOCK_ROUND_3,
      ordinal: 3,
      status: "scored",
      score: 0.31,
      disqualify_reason: null,
    },
  },
  {
    id: "22222222-2222-2222-2222-222222222222",
    patch_hash: DISQUALIFIED_HASH,
    hotkey: HOTKEYS[1],
    hours_ago: 12,
    latest_state: "disqualified",
    terminal: "disqualified",
    round: {
      round_id: MOCK_ROUND_1,
      ordinal: 1,
      status: "disqualified",
      score: null,
      disqualify_reason: "fail_correctness",
    },
  },
  {
    id: "33333333-3333-3333-3333-333333333333",
    patch_hash: REJECTED_HASH,
    hotkey: HOTKEYS[2],
    hours_ago: 18,
    latest_state: "rejected",
    terminal: "rejected",
    round: null,
  },
  {
    id: "44444444-4444-4444-4444-444444444444",
    patch_hash: QUEUED_HASH,
    hotkey: HOTKEYS[3],
    hours_ago: 2,
    latest_state: "bench_queued",
    terminal: "bench_queued",
    round: null,
  },
];

const EXTRA_VARIANTS: Array<{
  latest_state: SubmissionStateName;
  terminal: PipelineTerminal;
  round?: SubmissionRow["round"];
}> = [
  {
    latest_state: "scored",
    terminal: "scored",
    round: {
      round_id: MOCK_ROUND_3,
      ordinal: 3,
      status: "scored",
      score: 0.22,
      disqualify_reason: null,
    },
  },
  {
    latest_state: "disqualified",
    terminal: "disqualified",
    round: {
      round_id: MOCK_ROUND_1,
      ordinal: 1,
      status: "disqualified",
      score: null,
      disqualify_reason: "fail_correctness",
    },
  },
  {
    latest_state: "rejected",
    terminal: "rejected",
    round: null,
  },
  {
    latest_state: "bench_queued",
    terminal: "bench_queued",
    round: null,
  },
  {
    latest_state: "building",
    terminal: "building",
    round: null,
  },
  {
    latest_state: "round_assigned",
    terminal: "round_assigned",
    round: {
      round_id: MOCK_ROUND_3,
      ordinal: 3,
      status: "pending",
      score: null,
      disqualify_reason: null,
    },
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
    round: spec.round ?? null,
  };
}

const EXTRA_SPECS: SeedSpec[] = Array.from(
  { length: EXTRA_SUBMISSION_COUNT },
  (_, i) => {
    const variant = EXTRA_VARIANTS[i % EXTRA_VARIANTS.length];
    const n = i + 16;
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
  terminal: PipelineTerminal
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

  if (terminal === "scored") {
    steps.push(
      { state: "round_assigned", at: 140 },
      { state: "scored", at: 210 }
    );
  } else if (terminal === "round_assigned") {
    steps.push({ state: "round_assigned", at: 140 });
  } else if (terminal === "disqualified") {
    steps.push(
      { state: "round_assigned", at: 140 },
      { state: "disqualified", at: 180 }
    );
  } else if (terminal === "rejected") {
    steps.push({ state: "rejected", at: 150 });
  }

  return steps.map(({ state, at }) => ({
    state,
    created_at: minutesAfter(committedAt, at),
    detail: {},
    evidence_ref: null,
  }));
}

function settledJob(status: string): SubmissionDetail["jobs"][number] {
  return {
    status,
    last_error: null,
    phase: null,
    phase_started_at: null,
    heartbeat_at: null,
    progress: null,
  };
}

function jobsFor(terminal: PipelineTerminal): SubmissionDetail["jobs"] {
  if (terminal === "building") {
    return [
      {
        ...settledJob("running"),
        phase: "bootstrapping",
        phase_started_at: minutesAfter(hoursAgo(1), 20),
        heartbeat_at: hoursAgo(0),
        progress: null,
      },
    ];
  }
  if (terminal === "bench_queued") {
    return [settledJob("done")];
  }
  if (terminal === "round_assigned") {
    return [
      {
        ...settledJob("running"),
        phase: "sla_bench",
        phase_started_at: minutesAfter(hoursAgo(1), 22),
        heartbeat_at: hoursAgo(0),
        progress: { gpu_sku: "A100_80GB" },
      },
    ];
  }
  return [settledJob("done")];
}

function detailFromSpec(spec: SeedSpec): SubmissionDetail {
  const row = rowFromSpec(spec);
  const extras =
    spec.terminal === "building" || spec.terminal === "bench_queued"
      ? { engine_image_ref: null as string | null }
      : undefined;

  return {
    submission: baseSubmission(row, extras),
    events: pipelineEvents(row.committed_at, spec.terminal),
    jobs: jobsFor(spec.terminal),
    round: spec.round ?? null,
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

const MOCK_LEADER: Leader = {
  campaign_id: MOCK_CAMPAIGN_ID,
  submission_id: SEED_SPECS[0].id,
  patch_hash: SCORED_HASH,
  hotkey: HOTKEYS[0],
  engine_image_ref:
    "ghcr.io/pareton-ai/pareton-engine@sha256:5555555555555555555555555555555555555555555555555555555555555555",
  won_at_round_id: MOCK_ROUND_3,
  won_at_ordinal: 3,
  last_score: 0.31,
  last_scored_round_id: MOCK_ROUND_3,
  updated_at: hoursAgo(4),
};

function mockRoundSummary(
  id: string,
  ordinal: number,
  status: Round["status"],
  over: Partial<Round> = {}
): Round {
  return {
    id,
    ordinal,
    status,
    void_reason: null,
    gpu_sku: "H200",
    seed_block: 1000 + ordinal,
    seed_block_hash: "0x" + ordinal.toString(16).padStart(64, "0"),
    entry_count: 7,
    leader_changed: false,
    created_at: hoursAgo(24 - ordinal),
    completed_at:
      status === "running" || status === "pending"
        ? null
        : hoursAgo(20 - ordinal),
    ...over,
  };
}

/** Newest first. Extra rows exist so the campaign table paginates. */
const EXTRA_ROUND_SPECS: Array<{
  ordinal: number;
  status: Round["status"];
  over?: Partial<Round>;
}> = [
  {
    ordinal: 14,
    status: "pending",
    over: {
      leader_changed: null,
      entry_count: 3,
      created_at: hoursAgo(0.4),
      completed_at: null,
    },
  },
  {
    ordinal: 13,
    status: "running",
    over: {
      leader_changed: null,
      entry_count: 8,
      created_at: hoursAgo(2),
      completed_at: null,
    },
  },
  {
    ordinal: 12,
    status: "complete",
    over: { leader_changed: true, entry_count: 7 },
  },
  {
    ordinal: 11,
    status: "void",
    over: {
      void_reason: "heartbeat_stale",
      leader_changed: null,
      entry_count: 5,
    },
  },
  {
    ordinal: 10,
    status: "complete",
    over: { leader_changed: false, entry_count: 6 },
  },
  {
    ordinal: 9,
    status: "void",
    over: {
      void_reason: "baseline_failed",
      leader_changed: null,
      entry_count: 2,
    },
  },
  {
    ordinal: 8,
    status: "complete",
    over: { leader_changed: true, entry_count: 9 },
  },
  {
    ordinal: 7,
    status: "void",
    over: {
      void_reason: "no_surviving_challenger",
      leader_changed: null,
      entry_count: 4,
    },
  },
  {
    ordinal: 6,
    status: "complete",
    over: { leader_changed: false, entry_count: 5 },
  },
  {
    ordinal: 5,
    status: "void",
    over: {
      void_reason: "leader_infra_failed",
      leader_changed: null,
      entry_count: 3,
    },
  },
  {
    ordinal: 4,
    status: "void",
    over: {
      void_reason: "pod_failed",
      leader_changed: null,
      entry_count: 6,
    },
  },
];

const MOCK_ROUNDS: Round[] = [
  ...EXTRA_ROUND_SPECS.map(({ ordinal, status, over }) =>
    mockRoundSummary(mockId(2000 + ordinal), ordinal, status, over)
  ),
  /* Entry counts match the hand-written details below: the table and the round
     page read the same round, so they must not disagree on how many ran. */
  mockRoundSummary(MOCK_ROUND_3, 3, "complete", {
    leader_changed: true,
    entry_count: 2,
  }),
  mockRoundSummary(MOCK_ROUND_2, 2, "void", {
    void_reason: "baseline_drift",
    leader_changed: null,
    entry_count: 2,
  }),
  mockRoundSummary(MOCK_ROUND_1, 1, "complete", { entry_count: 3 }),
];

function mockEntry(
  id: number,
  over: Partial<RoundEntry> & Pick<RoundEntry, "role" | "status">
): RoundEntry {
  return {
    id,
    submission_id: null,
    patch_hash: null,
    hotkey: null,
    engine_image_ref:
      "ghcr.io/pareton-ai/pareton-engine@sha256:4444444444444444444444444444444444444444444444444444444444444444",
    score: null,
    disqualify_reason: null,
    started_at: null,
    completed_at: null,
    ...over,
  };
}

const HAND_WRITTEN_ROUND_DETAILS: Record<string, RoundDetail> = {
  [MOCK_ROUND_3]: {
    id: MOCK_ROUND_3,
    campaign_id: MOCK_CAMPAIGN_ID,
    ordinal: 3,
    status: "complete",
    void_reason: null,
    gpu_sku: "H200",
    seed_block: 1003,
    seed_block_hash: "0x" + "3".padStart(64, "0"),
    seed_hex: "b".repeat(64),
    sampled_trace_sha256: "sha256:" + "c".repeat(64),
    scoring_rule: { name: "median_e2e_speedup" },
    incumbent_submission_id: null,
    winner_submission_id: SEED_SPECS[0].id,
    leader_changed: true,
    baseline_drift: 0.004,
    phase: null,
    phase_started_at: null,
    heartbeat_at: null,
    progress: null,
    created_at: hoursAgo(21),
    started_at: hoursAgo(20),
    completed_at: hoursAgo(4),
    entries: [
      mockEntry(1, {
        role: "baseline",
        status: "scored",
        score: 0.0,
        started_at: hoursAgo(20),
        completed_at: hoursAgo(12),
      }),
      mockEntry(2, {
        role: "challenger",
        status: "scored",
        score: 0.31,
        submission_id: SEED_SPECS[0].id,
        patch_hash: SCORED_HASH,
        hotkey: HOTKEYS[0],
        started_at: hoursAgo(12),
        completed_at: hoursAgo(4),
      }),
    ],
  },
  [MOCK_ROUND_2]: {
    id: MOCK_ROUND_2,
    campaign_id: MOCK_CAMPAIGN_ID,
    ordinal: 2,
    status: "void",
    void_reason: "baseline_drift",
    gpu_sku: "H200",
    seed_block: 1002,
    seed_block_hash: "0x" + "2".padStart(64, "0"),
    seed_hex: "d".repeat(64),
    sampled_trace_sha256: "sha256:" + "e".repeat(64),
    scoring_rule: { name: "median_e2e_speedup" },
    incumbent_submission_id: SEED_SPECS[0].id,
    winner_submission_id: null,
    leader_changed: null,
    baseline_drift: 0.12,
    phase: null,
    phase_started_at: null,
    heartbeat_at: null,
    progress: null,
    created_at: hoursAgo(22),
    started_at: hoursAgo(22),
    completed_at: hoursAgo(18),
    entries: [
      mockEntry(1, {
        role: "baseline",
        status: "scored",
        score: 0.0,
        started_at: hoursAgo(22),
        completed_at: hoursAgo(20),
      }),
      mockEntry(2, {
        role: "leader",
        status: "infra_failed",
        score: null,
        submission_id: SEED_SPECS[0].id,
        patch_hash: SCORED_HASH,
        hotkey: HOTKEYS[0],
        started_at: hoursAgo(20),
        completed_at: hoursAgo(18),
      }),
    ],
  },
  /* The campaign's first round: settled long ago, so it carries no live phase.
     Round 13 is the one still on a pod. */
  [MOCK_ROUND_1]: {
    id: MOCK_ROUND_1,
    campaign_id: MOCK_CAMPAIGN_ID,
    ordinal: 1,
    status: "complete",
    void_reason: null,
    gpu_sku: "H200",
    seed_block: 1001,
    seed_block_hash: "0x" + "1".padStart(64, "0"),
    seed_hex: "a".repeat(64),
    sampled_trace_sha256: "sha256:" + "b".repeat(64),
    scoring_rule: { name: "median_e2e_speedup" },
    incumbent_submission_id: null,
    winner_submission_id: null,
    leader_changed: false,
    baseline_drift: 0.002,
    phase: null,
    phase_started_at: null,
    heartbeat_at: null,
    progress: null,
    created_at: hoursAgo(23),
    started_at: hoursAgo(23),
    completed_at: hoursAgo(19),
    entries: [
      mockEntry(1, {
        role: "baseline",
        status: "scored",
        score: 0.0,
        started_at: hoursAgo(23),
        completed_at: hoursAgo(22),
      }),
      mockEntry(2, {
        role: "challenger",
        status: "disqualified",
        score: null,
        disqualify_reason: "fail_correctness",
        submission_id: SEED_SPECS[1].id,
        patch_hash: DISQUALIFIED_HASH,
        hotkey: HOTKEYS[1],
        started_at: hoursAgo(22),
        completed_at: hoursAgo(21),
      }),
      mockEntry(3, {
        role: "challenger",
        status: "scored",
        score: 0.08,
        submission_id: SEED_SPECS[0].id,
        patch_hash: SCORED_HASH,
        hotkey: HOTKEYS[0],
        started_at: hoursAgo(21),
        completed_at: hoursAgo(19),
      }),
    ],
  },
};

function derivedChallengerStatus(row: Round, index: number): EntryStatus {
  if (row.status === "pending") return "pending";
  if (row.status === "running") {
    if (index === 1) return "running";
    return index === 2 ? "pending" : "scored";
  }
  if (row.status === "void") {
    return row.void_reason === "no_surviving_challenger"
      ? "disqualified"
      : "infra_failed";
  }
  return index % 3 === 0 ? "disqualified" : "scored";
}

/** Baseline plus `entry_count - 1` challengers, all agreeing with the round's
 *  own status so a void round shows no winner and a pending one shows no work. */
function derivedEntries(row: Round): RoundEntry[] {
  const baselineStatus =
    row.status === "pending"
      ? "pending"
      : row.void_reason === "baseline_failed"
        ? "infra_failed"
        : "scored";

  const startedAt = row.status === "pending" ? null : row.created_at;

  /* Entries that finished inside a round still on a pod need an end of their
     own, or the page would tick their duration up as if they were running. */
  const settledAt = row.completed_at ?? hoursAgo(1);

  const entries: RoundEntry[] = [
    mockEntry(1, {
      role: "baseline",
      status: baselineStatus,
      score: baselineStatus === "scored" ? 0.0 : null,
      started_at: startedAt,
      completed_at: baselineStatus === "pending" ? null : settledAt,
    }),
  ];

  for (let index = 1; index < row.entry_count; index += 1) {
    const status = derivedChallengerStatus(row, index);
    const settled = status !== "running" && status !== "pending";

    entries.push(
      mockEntry(index + 1, {
        role: "challenger",
        status,
        score:
          status === "scored"
            ? Number((row.ordinal / 100 + index * 0.05).toFixed(3))
            : null,
        disqualify_reason:
          status === "disqualified" ? "fail_correctness" : null,
        submission_id: mockId(4000 + row.ordinal * 20 + index),
        patch_hash: mockHash(5000 + row.ordinal * 20 + index),
        hotkey: HOTKEYS[index % HOTKEYS.length],
        started_at: status === "pending" ? null : startedAt,
        completed_at: settled ? settledAt : null,
      })
    );
  }

  return entries;
}

/**
 * Detail derived from a listed round.
 *
 * The summary row is the source of truth for every field the two shapes share,
 * so opening a row can never contradict the table it was opened from.
 */
function derivedRoundDetail(row: Round): RoundDetail {
  const entries = derivedEntries(row);
  const winner =
    row.leader_changed === true
      ? (entries.find(
          (entry) => entry.role === "challenger" && entry.status === "scored"
        )?.submission_id ?? null)
      : null;
  const running = row.status === "running";

  return {
    id: row.id,
    campaign_id: MOCK_CAMPAIGN_ID,
    ordinal: row.ordinal,
    status: row.status,
    void_reason: row.void_reason,
    gpu_sku: row.gpu_sku,
    seed_block: row.seed_block,
    seed_block_hash: row.seed_block_hash,
    seed_hex: padHex(row.ordinal, 64),
    sampled_trace_sha256: mockHash(3000 + row.ordinal),
    scoring_rule: { name: "median_e2e_speedup" },
    incumbent_submission_id: SEED_SPECS[0].id,
    winner_submission_id: winner,
    leader_changed: row.leader_changed,
    baseline_drift:
      row.status === "pending"
        ? null
        : row.void_reason === "baseline_drift"
          ? 0.12
          : 0.003,
    phase: running ? "correctness" : null,
    phase_started_at: running ? hoursAgo(0.2) : null,
    heartbeat_at: running ? hoursAgo(0) : null,
    progress: running ? { entry: 2 } : null,
    created_at: row.created_at,
    started_at: row.status === "pending" ? null : row.created_at,
    completed_at: row.completed_at,
    entries,
  };
}

/** Every listed round resolves, so no row in the campaign table opens a 404. */
const MOCK_ROUND_DETAILS: Record<string, RoundDetail> = {
  ...Object.fromEntries(
    MOCK_ROUNDS.map((row) => [row.id, derivedRoundDetail(row)])
  ),
  ...HAND_WRITTEN_ROUND_DETAILS,
};

const MOCK_SCORE_PROGRESS: ScoreProgressSeries = {
  campaign_id: MOCK_CAMPAIGN_ID,
  points: [
    {
      round_id: MOCK_ROUND_1,
      ordinal: 1,
      status: "complete",
      leader_score: 0.31,
      entries: [
        {
          submission_id: SEED_SPECS[1].id,
          hotkey: HOTKEYS[1].slice(0, 16),
          role: "challenger",
          status: "disqualified",
          score: null,
        },
      ],
    },
    {
      round_id: MOCK_ROUND_2,
      ordinal: 2,
      status: "void",
      leader_score: null,
      entries: [],
    },
    {
      round_id: MOCK_ROUND_3,
      ordinal: 3,
      status: "complete",
      leader_score: 0.4,
      entries: [],
    },
  ],
};

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
      state === "round_assigned" ||
      state === "scored" ||
      state === "disqualified" ||
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

export function mockGetLeader(campaignId: string): Leader | null {
  mockGetCampaign(campaignId);
  if (campaignId !== MOCK_CAMPAIGN_ID) return null;
  return MOCK_LEADER;
}

export function mockListRounds(
  campaignId: string,
  opts?: { limit?: number; offset?: number }
): RoundsPage {
  mockGetCampaign(campaignId);
  const limit = opts?.limit ?? 50;
  const offset = opts?.offset ?? 0;
  const rows = campaignId === MOCK_CAMPAIGN_ID ? MOCK_ROUNDS : [];
  return {
    campaign_id: campaignId,
    total: rows.length,
    limit,
    offset,
    rounds: rows.slice(offset, offset + limit),
  };
}

export function mockGetRound(roundId: string): RoundDetail {
  const detail = MOCK_ROUND_DETAILS[roundId];
  if (!detail) {
    throw new ApiError({
      status: 404,
      path: `/v1/rounds/${roundId}`,
      detail: "round not found",
    });
  }
  return detail;
}

export function mockGetScoreProgress(campaignId: string): ScoreProgressSeries {
  mockGetCampaign(campaignId);
  if (campaignId !== MOCK_CAMPAIGN_ID) {
    return { campaign_id: campaignId, points: [] };
  }
  return MOCK_SCORE_PROGRESS;
}
