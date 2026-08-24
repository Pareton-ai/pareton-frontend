/**
 * Contract tests for the submission and round data layer.
 *
 * Round fixtures follow `tests/test_api.py` in the backend repo (PAR-80).
 */

import { describe, expect, it } from "vitest";
import { ApiError, isLeaderVacant, isNotFound } from "@/lib/api/errors";
import { hasScore } from "@/lib/api/bench";
import {
  MOCK_CAMPAIGN_ID,
  MOCK_CLOSED_CAMPAIGN_ID,
  MOCK_DRAFT_CAMPAIGN_ID,
  mockGetLeader,
  mockGetRound,
  mockListRounds,
} from "@/lib/api/mocks";
import {
  parseCampaign,
  parseLeader,
  parseRoundDetail,
  parseRoundsPage,
  parseScore,
  parseScoreProgress,
  parseSubmissionDetail,
  parseSubmissionRow,
  parseSubmissionsPage,
  parseSubmissionState,
} from "@/lib/api/parse";
import {
  BENCH_PHASE_META,
  BENCH_PHASES,
  ENTRY_ROLES,
  ENTRY_STATUSES,
  getFailedSubmissionJob,
  getLiveActivity,
  getRoundActivity,
  getRunningSubmissionJob,
  getSubmissionStateMeta,
  HEARTBEAT_STALE_AFTER_MS,
  isFailedState,
  isLiveSubmissionRow,
  isStalled,
  ROUND_STATUSES,
  SUBMISSION_STAGE_ORDER,
  SUBMISSION_STATE_META,
  VOID_REASONS,
  type SubmissionJob,
} from "@/lib/api/types";
import submissionsList from "./fixtures/campaign-submissions.json";
import leader from "./fixtures/leader.json";
import leaderVacant from "./fixtures/leader-vacant.json";
import roundRunning from "./fixtures/round-running.json";
import roundVoid from "./fixtures/round-void.json";
import roundsList from "./fixtures/rounds.json";
import scoreProgress from "./fixtures/score-progress.json";
import benchJobFailed from "./fixtures/submission-bench-job-failed.json";
import rejected from "./fixtures/submission-rejected.json";

function without(body: object, key: string): Record<string, unknown> {
  const copy: Record<string, unknown> = { ...body };
  delete copy[key];
  return copy;
}

function settled(job: {
  status: string;
  last_error: string | null;
}): SubmissionJob {
  return {
    ...job,
    phase: null,
    phase_started_at: null,
    heartbeat_at: null,
    progress: null,
  };
}

function runningJob(overrides: Partial<SubmissionJob> = {}): SubmissionJob {
  return {
    status: "running",
    last_error: null,
    phase: "downloading_model",
    phase_started_at: "2026-08-17T12:00:00+00:00",
    heartbeat_at: "2026-08-17T12:20:00+00:00",
    progress: { gpu_sku: "H200-SXM-141GB" },
    ...overrides,
  };
}

describe("parseSubmissionDetail", () => {
  it("reads the API's top-level latest_state rather than re-deriving it", () => {
    const detail = parseSubmissionDetail(benchJobFailed);
    expect(detail.latest_state).toBe("bench_queued");
    expect(parseSubmissionDetail(rejected).latest_state).toBe("rejected");
  });

  it("keeps latest_state when it runs ahead of the last event", () => {
    const detail = parseSubmissionDetail({
      ...benchJobFailed,
      latest_state: "scored",
    });
    expect(detail.events.at(-1)?.state).toBe("bench_queued");
    expect(detail.latest_state).toBe("scored");
  });

  it("falls back to the last event when latest_state is absent or null", () => {
    expect(
      parseSubmissionDetail(without(benchJobFailed, "latest_state"))
        .latest_state
    ).toBe("bench_queued");
    expect(
      parseSubmissionDetail({ ...benchJobFailed, latest_state: null })
        .latest_state
    ).toBe("bench_queued");
  });

  it("defaults to committed only when there are no events at all", () => {
    expect(
      parseSubmissionDetail({ submission: {}, events: [] }).latest_state
    ).toBe("committed");
  });

  it("unwraps the nested submission object", () => {
    const { submission } = parseSubmissionDetail(rejected);
    expect(submission.patch_hash).toBe(rejected.submission.patch_hash);
    expect(submission.campaign_id).toBe("c02a40b0-6eb3-4853-827e-22d4794b814e");
    expect(submission.hotkey).not.toBe("");
    expect(submission.committed_at).not.toBe("");
    expect(submission.commit_block).toBeTypeOf("number");
  });

  it("reads events from created_at, not submitted_at or timestamp", () => {
    const { events } = parseSubmissionDetail(benchJobFailed);
    expect(events).toHaveLength(10);
    expect(events.every((event) => event.created_at !== "")).toBe(true);
  });

  it("returns events in created_at order", () => {
    const { events } = parseSubmissionDetail(rejected);
    const times = events.map((event) => event.created_at);
    expect(times).toStrictEqual([...times].sort());
  });

  it("sorts events even when the API returns them reversed", () => {
    const shuffled = {
      ...benchJobFailed,
      events: [...benchJobFailed.events].reverse(),
    };
    expect(parseSubmissionDetail(shuffled).events.map((e) => e.state)).toEqual(
      benchJobFailed.events.map((e) => e.state)
    );
  });

  it("preserves the full pipeline trail including newly added states", () => {
    const states = parseSubmissionDetail(benchJobFailed).events.map(
      (event) => event.state
    );
    expect(states).toStrictEqual([
      "committed",
      "picked_up",
      "fetched",
      "verified",
      "applied",
      "surface_ok",
      "building",
      "image_pushed",
      "built",
      "bench_queued",
    ]);
  });

  it("parses a null round on a submission that never sat in one", () => {
    expect(parseSubmissionDetail(rejected).round).toBeNull();
    expect(parseSubmissionDetail(benchJobFailed).round).toBeNull();
  });
});

describe("submission jobs", () => {
  it("parses status and last_error without a kind field", () => {
    const { jobs } = parseSubmissionDetail(benchJobFailed);
    expect(jobs).toStrictEqual([
      settled({
        status: "failed",
        last_error: "bench_engine_baseline_or_unknown",
      }),
    ]);
  });

  it("tolerates an API build with no phase fields", () => {
    const jobs = parseSubmissionDetail({
      ...benchJobFailed,
      jobs: [{ status: "running", last_error: null }],
    }).jobs;
    expect(jobs[0]).toStrictEqual(
      settled({ status: "running", last_error: null })
    );
  });

  it("tolerates an API build with no jobs field", () => {
    expect(
      parseSubmissionDetail(without(benchJobFailed, "jobs")).jobs
    ).toStrictEqual([]);
  });

  it("surfaces a job failure that the event trail hides", () => {
    const detail = parseSubmissionDetail(benchJobFailed);
    expect(detail.latest_state).toBe("bench_queued");
    expect(detail.round).toBeNull();

    const failed = getFailedSubmissionJob(detail.jobs);
    expect(failed?.last_error).toBe("bench_engine_baseline_or_unknown");
    expect(isStalled(detail.latest_state, detail.jobs)).toBe(true);
  });

  it("does not report a stall when every job succeeded", () => {
    const detail = parseSubmissionDetail(rejected);
    expect(getFailedSubmissionJob(detail.jobs)).toBeNull();
    expect(isStalled(detail.latest_state, detail.jobs)).toBe(false);
  });
});

describe("isLiveSubmissionRow", () => {
  it("treats intake and build as live without a bench phase", () => {
    expect(isLiveSubmissionRow({ latest_state: "building" })).toBe(true);
  });

  it("stays live through the GPU wait, before a bench phase exists", () => {
    expect(isLiveSubmissionRow({ latest_state: "bench_queued" })).toBe(true);
    expect(isLiveSubmissionRow({ latest_state: "sampled" })).toBe(true);
  });

  it("stays live through the round until the score lands", () => {
    // benched is not terminal: the entry still goes through scoring.
    expect(isLiveSubmissionRow({ latest_state: "benched" })).toBe(true);
  });

  it("stops after a terminal state", () => {
    expect(isLiveSubmissionRow({ latest_state: "scored" })).toBe(false);
    expect(isLiveSubmissionRow({ latest_state: "rejected" })).toBe(false);
    expect(isLiveSubmissionRow({ latest_state: "disqualified" })).toBe(false);
  });
});

describe("live bench activity", () => {
  const jobsWith = (job: SubmissionJob) => [job];

  it("parses the phase, its start, and the heartbeat off a running job", () => {
    const { jobs } = parseSubmissionDetail({
      ...benchJobFailed,
      jobs: [runningJob()],
    });
    expect(jobs[0]).toStrictEqual(runningJob());
  });

  it("drops phase text outside the fixed vocabulary", () => {
    const { jobs } = parseSubmissionDetail({
      ...benchJobFailed,
      jobs: [runningJob({ phase: "rm -rf /" as never })],
    });
    expect(jobs[0].phase).toBeNull();
    expect(jobs[0].phase_started_at).toBeNull();
    expect(jobs[0].heartbeat_at).toBeNull();
    expect(jobs[0].progress).toBeNull();
  });

  it("describes what the bench is doing now", () => {
    const activity = getLiveActivity(
      jobsWith(runningJob()),
      "2026-08-17T12:20:30+00:00"
    );
    expect(activity?.phase).toBe("downloading_model");
    expect(activity?.label).toBe("Downloading model weights");
    expect(activity?.since).toBe("2026-08-17T12:00:00+00:00");
    expect(activity?.heartbeatAgeMs).toBe(30_000);
    expect(activity?.stale).toBe(false);
  });

  it("reports a dead worker as stale rather than as active work", () => {
    const activity = getLiveActivity(
      jobsWith(runningJob()),
      "2026-08-17T13:20:00+00:00"
    );
    expect(activity?.stale).toBe(true);
    expect(activity?.heartbeatAgeMs).toBe(3_600_000);
  });

  it("treats a missing heartbeat as stale", () => {
    const activity = getLiveActivity(
      jobsWith(runningJob({ heartbeat_at: null })),
      "2026-08-17T12:20:30+00:00"
    );
    expect(activity?.stale).toBe(true);
    expect(activity?.heartbeatAgeMs).toBeNull();
  });

  it("holds the phase across a few missed beats before calling it stale", () => {
    const nearly = new Date(
      new Date("2026-08-17T12:20:00+00:00").getTime() +
        HEARTBEAT_STALE_AFTER_MS -
        1_000
    ).toISOString();
    expect(getLiveActivity(jobsWith(runningJob()), nearly)?.stale).toBe(false);
  });

  it("shows nothing for a settled or unstarted job", () => {
    expect(
      getLiveActivity(
        jobsWith(settled({ status: "done", last_error: null })),
        "2026-08-17T12:20:30+00:00"
      )
    ).toBeNull();
    expect(
      getLiveActivity(
        jobsWith(runningJob({ phase: null })),
        "2026-08-17T12:20:30+00:00"
      )
    ).toBeNull();
    expect(getRunningSubmissionJob([])).toBeNull();
  });

  it("labels every phase the backend can report", () => {
    for (const phase of BENCH_PHASES) {
      expect(BENCH_PHASE_META[phase].label).not.toBe("");
      expect(BENCH_PHASE_META[phase].description).not.toBe("");
    }
    expect(Object.keys(BENCH_PHASE_META)).toStrictEqual([...BENCH_PHASES]);
  });

  it("keeps phases out of the pipeline stage vocabulary", () => {
    for (const phase of BENCH_PHASES) {
      expect(SUBMISSION_STAGE_ORDER).not.toContain(phase);
    }
  });
});

describe("pipeline state vocabulary", () => {
  it("covers the states the live pipeline actually emits", () => {
    for (const state of [
      "picked_up",
      "image_pushed",
      "bench_queued",
      "round_assigned",
      "scored",
      "disqualified",
      "infra_failed",
    ]) {
      expect(SUBMISSION_STATE_META).toHaveProperty(state);
      expect(getSubmissionStateMeta(state).label).not.toBe("Committed");
    }
  });

  it("orders the stages the way the worker advances them", () => {
    expect([...SUBMISSION_STAGE_ORDER]).toStrictEqual([
      "committed",
      "picked_up",
      "fetched",
      "verified",
      "applied",
      "surface_ok",
      "building",
      "image_pushed",
      "built",
      "bench_queued",
      "round_assigned",
      "infra_failed",
      "scored",
      "disqualified",
    ]);
  });

  it("renders an unknown state verbatim instead of collapsing to committed", () => {
    expect(parseSubmissionState("scored")).toBe("scored");
    const meta = getSubmissionStateMeta("unknown_state");
    expect(meta.state).toBe("unknown_state");
    expect(meta.label).toBe("unknown state");
  });

  it("only falls back to committed for a missing state", () => {
    expect(parseSubmissionState(null)).toBe("committed");
    expect(parseSubmissionState("")).toBe("committed");
  });
});

describe("parseSubmissionsPage", () => {
  it("reads the Submitted column from committed_at", () => {
    const page = parseSubmissionsPage(submissionsList, {
      campaign_id: "fallback",
      limit: 50,
      offset: 0,
    });
    expect(page.total).toBe(3);
    expect(page.campaign_id).toBe("cccccccc-cccc-cccc-cccc-cccccccccccc");
    expect(page.submissions.every((row) => row.committed_at !== "")).toBe(true);
    expect(page.submissions[0].committed_at).toBe(
      submissionsList.submissions[0].committed_at
    );
  });

  it("carries live states and round entries through to the table", () => {
    const page = parseSubmissionsPage(submissionsList, {
      campaign_id: "fallback",
      limit: 50,
      offset: 0,
    });
    expect(page.submissions.map((row) => row.latest_state)).toStrictEqual([
      "bench_queued",
      "disqualified",
      "rejected",
    ]);
    expect(page.submissions[0].round).toBeNull();
    expect(page.submissions[1].round).toEqual({
      round_id: "11111111-1111-1111-1111-111111111111",
      ordinal: 1,
      status: "disqualified",
      score: null,
      disqualify_reason: "fail_correctness",
    });
    expect(page.submissions[2].round).toBeNull();
  });

  it("ignores a legacy submitted_at field", () => {
    const row = parseSubmissionRow({
      id: "1",
      patch_hash: "sha256:abc",
      submitted_at: "2026-01-01T00:00:00Z",
    });
    expect(row.committed_at).toBe("");
  });

  it("falls back to the requested paging when the envelope is empty", () => {
    const page = parseSubmissionsPage(null, {
      campaign_id: "cid",
      limit: 25,
      offset: 50,
    });
    expect(page).toStrictEqual({
      campaign_id: "cid",
      total: 0,
      limit: 25,
      offset: 50,
      submissions: [],
    });
  });
});

describe("parseScore", () => {
  it("keeps 0.0 as a real score and leaves null alone", () => {
    expect(parseScore(0)).toBe(0);
    expect(parseScore(0.0)).toBe(0);
    expect(parseScore(null)).toBeNull();
    expect(parseScore(undefined)).toBeNull();
    expect(parseScore("0")).toBeNull();
  });
});

describe("leader", () => {
  it("parses a seated crown with the full hotkey", () => {
    const parsed = parseLeader(leader);
    expect(parsed.hotkey).toBe(
      "5Gecn3q1wMRCLddBoztcsE8cRcBMkbLGDJEZA5oanWSX7MHy"
    );
    expect(parsed.last_score).toBe(0.31);
    expect(parsed.won_at_ordinal).toBe(2);
    expect(parsed.campaign_id).toBe("cccccccc-cccc-cccc-cccc-cccccccccccc");
  });

  it("treats a vacant crown as distinct from a missing campaign", () => {
    const vacant = new ApiError({
      status: 404,
      path: "/v1/campaigns/cccccccc-cccc-cccc-cccc-cccccccccccc/leader",
      detail: leaderVacant.detail,
    });
    const missing = new ApiError({
      status: 404,
      path: "/v1/campaigns/cccccccc-cccc-cccc-cccc-cccccccccccc/leader",
      detail: "campaign not found",
    });
    expect(isNotFound(vacant)).toBe(true);
    expect(isLeaderVacant(vacant)).toBe(true);
    expect(isNotFound(missing)).toBe(true);
    expect(isLeaderVacant(missing)).toBe(false);
  });
});

describe("rounds", () => {
  it("keeps void ordinals instead of compacting the list", () => {
    const page = parseRoundsPage(roundsList, {
      campaign_id: "fallback",
      limit: 50,
      offset: 0,
    });
    expect(page.rounds.map((row) => row.ordinal)).toStrictEqual([3, 2, 1]);
    expect(page.rounds[1].status).toBe("void");
    expect(page.rounds[1].void_reason).toBe("baseline_drift");
    expect(VOID_REASONS).toContain("baseline_drift");
    expect(ROUND_STATUSES).toContain("void");
  });

  it("parses a round mid-flight, including a null-score entry", () => {
    const detail = parseRoundDetail(roundRunning);
    expect(detail.status).toBe("running");
    expect(detail.phase).toBe("sla_bench");
    expect(detail.progress).toEqual({ entry: 2 });
    expect(detail.entries.map((e) => e.role)).toEqual([
      "baseline",
      "challenger",
      "challenger",
    ]);
    expect(new Set(detail.entries.map((e) => e.role))).toEqual(
      new Set(ENTRY_ROLES.filter((role) => role !== "leader"))
    );
    expect(ENTRY_STATUSES).toContain("disqualified");
    const baseline = detail.entries[0];
    const disqualified = detail.entries[1];
    expect(baseline.score).toBe(0);
    expect(hasScore(baseline)).toBe(true);
    expect(disqualified.score).toBeNull();
    expect(hasScore(disqualified)).toBe(false);
    expect(disqualified.disqualify_reason).toBe("fail_correctness");
    expect(disqualified.hotkey).toBe(
      "5Gecn3q1wMRCLddBoztcsE8cRcBMkbLGDJEZA5oanWSX7MHy"
    );
  });

  it("parses a void round without inventing a winner or a zero score", () => {
    const detail = parseRoundDetail(roundVoid);
    expect(detail.status).toBe("void");
    expect(detail.void_reason).toBe("baseline_drift");
    expect(detail.ordinal).toBe(2);
    expect(detail.winner_submission_id).toBeNull();
    expect(detail.leader_changed).toBeNull();
    expect(detail.phase).toBeNull();
  });

  it("drops phase text outside the vocabulary on round detail", () => {
    const detail = parseRoundDetail({
      ...roundRunning,
      phase: "<script>",
      progress: { entry: 2 },
    });
    expect(detail.phase).toBeNull();
    expect(detail.progress).toBeNull();
  });

  it("keeps heartbeat_at when a claimed round has no phase yet", () => {
    const detail = parseRoundDetail({
      ...roundRunning,
      phase: null,
      phase_started_at: null,
      progress: null,
    });
    expect(detail.phase).toBeNull();
    expect(detail.heartbeat_at).toBe("2026-08-20T00:01:00+00:00");
  });

  it("shows no live activity once a round settles, even with a stale phase", () => {
    // The backend settle paths leave the phase column populated, so a
    // completed round can still carry phase='teardown'.
    const settled = parseRoundDetail({
      ...roundRunning,
      status: "complete",
      phase: "teardown",
    });
    expect(settled.phase).toBe("teardown");
    expect(getRoundActivity(settled, "2026-08-20T00:10:00+00:00")).toBeNull();
    expect(
      getRoundActivity(
        parseRoundDetail(roundRunning),
        "2026-08-20T00:10:00+00:00"
      )
    ).not.toBeNull();
  });
});

describe("isFailedState", () => {
  it("treats disqualified and rejected as failure, not infra_failed", () => {
    expect(isFailedState("disqualified")).toBe(true);
    expect(isFailedState("rejected")).toBe(true);
    expect(isFailedState("infra_failed")).toBe(false);
    expect(isFailedState("scored")).toBe(false);
  });
});

describe("mock rounds", () => {
  it("resolves a detail for every listed round, so no row links to a 404", () => {
    const { rounds, total } = mockListRounds(MOCK_CAMPAIGN_ID, { limit: 500 });
    expect(rounds).toHaveLength(total);

    for (const row of rounds) {
      const detail = mockGetRound(row.id);
      expect(detail.ordinal).toBe(row.ordinal);
      expect(detail.status).toBe(row.status);
      expect(detail.void_reason).toBe(row.void_reason);
      expect(detail.entries).toHaveLength(row.entry_count);
    }
  });

  it("never invents a winner or a zero score for a void round", () => {
    const { rounds } = mockListRounds(MOCK_CAMPAIGN_ID, { limit: 500 });
    const voided = rounds.filter((row) => row.status === "void");
    expect(voided.length).toBeGreaterThan(0);

    for (const row of voided) {
      const detail = mockGetRound(row.id);
      expect(detail.winner_submission_id).toBeNull();
      for (const entry of detail.entries) {
        if (entry.status !== "scored") expect(entry.score).toBeNull();
      }
    }
  });
});

describe("mockGetLeader", () => {
  it("returns null for a vacant mock campaign instead of throwing", () => {
    expect(mockGetLeader(MOCK_DRAFT_CAMPAIGN_ID)).toBeNull();
    expect(mockGetLeader(MOCK_CLOSED_CAMPAIGN_ID)).toBeNull();
    expect(mockGetLeader(MOCK_CAMPAIGN_ID)?.patch_hash).toBeTruthy();
  });
});

describe("score progress", () => {
  it("keeps void ordinals as gaps and leaves null scores as null", () => {
    const series = parseScoreProgress(scoreProgress);
    expect(series.points.map((p) => p.ordinal)).toStrictEqual([1, 2, 3]);
    expect(series.points.map((p) => p.leader_score)).toStrictEqual([
      0.31,
      null,
      0.4,
    ]);
    expect(series.points[0].entries[0].score).toBeNull();
    expect(hasScore(series.points[0].entries[0])).toBe(false);
    expect(series.points[1].status).toBe("void");
    expect(series.points[1].entries).toEqual([]);
  });
});

const LIVE_CORRECTNESS = {
  thresholds: {
    argmax_mismatch_rate: 0.001,
    max_abs_logprob_diff: 0.164,
    mean_abs_logprob_diff: 0.0246,
  },
  num_prompts: 32,
};

const LIVE_SAMPLING_RULE = {
  type: "hf_rows",
  dataset: "nebius/SWE-agent-trajectories",
  revision: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  config: "default",
  split: "train",
  n_rows: 1000,
  n_prompts: 32,
  max_tokens: 128,
  algo_version: 1,
};

describe("parseCampaign sampling_rule", () => {
  it("keeps the hf_rows pin and ignores leftover workload_trace fields", () => {
    const campaign = parseCampaign({
      sampling_rule: LIVE_SAMPLING_RULE,
      workload_trace_url: "file:///Users/xavierlu/Desktop/trace.json",
      workload_trace_sha256: "sha256:" + "9".repeat(64),
    });
    expect(campaign.sampling_rule).toStrictEqual(LIVE_SAMPLING_RULE);
    expect(campaign).not.toHaveProperty("workload_trace_url");
    expect(campaign).not.toHaveProperty("workload_trace_sha256");
  });

  it("returns null when sampling_rule is missing or not hf_rows", () => {
    expect(parseCampaign({}).sampling_rule).toBeNull();
    expect(
      parseCampaign({
        sampling_rule: { type: "fixed_trace", dataset: "x/y", revision: "a" },
      }).sampling_rule
    ).toBeNull();
    expect(
      parseCampaign({
        sampling_rule: { type: "hf_rows", dataset: "", revision: "a" },
      }).sampling_rule
    ).toBeNull();
  });
});

describe("parseCampaign correctness thresholds", () => {
  it("keeps the three enforced numbers and drops extra keys", () => {
    const campaign = parseCampaign({
      bench: { correctness: LIVE_CORRECTNESS },
      scoring_rule: { name: "median_e2e_speedup" },
    });
    expect(campaign.bench.correctness).toStrictEqual({
      thresholds: {
        argmax_mismatch_rate: 0.001,
        mean_abs_logprob_diff: 0.0246,
        max_abs_logprob_diff: 0.164,
      },
    });
    expect(campaign.scoring_rule).toEqual({ name: "median_e2e_speedup" });
    expect(campaign.bench.correctness).not.toHaveProperty("num_prompts");
  });

  it("prints the live numbers exactly, without rounding or percents", () => {
    const parsed = parseCampaign({
      bench: { correctness: LIVE_CORRECTNESS },
    }).bench.correctness;
    expect(parsed).not.toBeNull();
    if (parsed == null) return;
    const { thresholds } = parsed;

    expect(String(thresholds.argmax_mismatch_rate)).toBe("0.001");
    expect(String(thresholds.mean_abs_logprob_diff)).toBe("0.0246");
    expect(String(thresholds.max_abs_logprob_diff)).toBe("0.164");
  });

  it("falls back to null when correctness is missing", () => {
    expect(parseCampaign({ bench: {} }).bench.correctness).toBeNull();
    expect(
      parseCampaign({ bench: { correctness: null } }).bench.correctness
    ).toBeNull();
  });

  it("falls back to null when any of the three numbers is missing", () => {
    expect(
      parseCampaign({
        bench: {
          correctness: {
            thresholds: {
              argmax_mismatch_rate: 0.001,
              max_abs_logprob_diff: 0.164,
            },
          },
        },
      }).bench.correctness
    ).toBeNull();
  });

  it("rejects stringly-typed or non-finite thresholds", () => {
    expect(
      parseCampaign({
        bench: {
          correctness: {
            thresholds: {
              argmax_mismatch_rate: "0.001",
              mean_abs_logprob_diff: 0.0246,
              max_abs_logprob_diff: 0.164,
            },
          },
        },
      }).bench.correctness
    ).toBeNull();
    expect(
      parseCampaign({
        bench: {
          correctness: {
            thresholds: {
              argmax_mismatch_rate: 0.001,
              mean_abs_logprob_diff: Number.NaN,
              max_abs_logprob_diff: 0.164,
            },
          },
        },
      }).bench.correctness
    ).toBeNull();
  });
});
