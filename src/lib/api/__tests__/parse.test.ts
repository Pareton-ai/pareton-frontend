/**
 * Contract tests for the submission data layer.
 *
 * Fixtures are verbatim responses from https://api.pareton.ai (campaign
 * c02a40b0, 2026-08-10). Re-capture rather than editing by hand when the
 * backend changes.
 */

import { describe, expect, it } from "vitest";
import {
  parseBenchVerdict,
  parseCampaign,
  parseSubmissionDetail,
  parseSubmissionRow,
  parseSubmissionsPage,
  parseSubmissionState,
} from "@/lib/api/parse";
import {
  BENCH_FAIL_REASONS,
  getBenchVerdictMeta,
  getFailedSubmissionJob,
  getSubmissionJob,
  getSubmissionStateMeta,
  isStalled,
  SUBMISSION_STAGE_ORDER,
  SUBMISSION_STATE_META,
} from "@/lib/api/types";
import submissionsList from "./fixtures/campaign-submissions.json";
import benchJobFailed from "./fixtures/submission-bench-job-failed.json";
import rejectedCrossEnv from "./fixtures/submission-rejected-cross-env.json";
import rejectedPerfScreen from "./fixtures/submission-rejected-perf-screen.json";

function without(body: object, key: string): Record<string, unknown> {
  const copy: Record<string, unknown> = { ...body };
  delete copy[key];
  return copy;
}

describe("parseSubmissionDetail against live responses", () => {
  it("reads the API's top-level latest_state rather than re-deriving it", () => {
    const detail = parseSubmissionDetail(benchJobFailed);
    expect(detail.latest_state).toBe("bench_queued");
    expect(parseSubmissionDetail(rejectedCrossEnv).latest_state).toBe(
      "rejected"
    );
  });

  it("keeps latest_state when it runs ahead of the last event", () => {
    const detail = parseSubmissionDetail({
      ...benchJobFailed,
      latest_state: "benched",
    });
    expect(detail.events.at(-1)?.state).toBe("bench_queued");
    expect(detail.latest_state).toBe("benched");
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
    const { submission } = parseSubmissionDetail(rejectedPerfScreen);
    expect(submission.patch_hash).toBe(
      rejectedPerfScreen.submission.patch_hash
    );
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
    const { events } = parseSubmissionDetail(rejectedCrossEnv);
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
});

describe("submission jobs", () => {
  it("parses kind, status and last_error", () => {
    const { jobs } = parseSubmissionDetail(benchJobFailed);
    expect(jobs).toStrictEqual([
      { kind: "gates", status: "done", last_error: null },
      {
        kind: "bench",
        status: "failed",
        last_error: "bench_engine_baseline_or_unknown",
      },
    ]);
  });

  it("reorders the API's alphabetical jobs into pipeline order", () => {
    expect(benchJobFailed.jobs.map((job) => job.kind)).toStrictEqual([
      "bench",
      "gates",
    ]);
    expect(
      parseSubmissionDetail(benchJobFailed).jobs.map((job) => job.kind)
    ).toStrictEqual(["gates", "bench"]);
  });

  it("keeps unknown job kinds, sorted after the known ones", () => {
    const jobs = parseSubmissionDetail({
      ...benchJobFailed,
      jobs: [{ kind: "score", status: "pending", last_error: null }],
    }).jobs;
    expect(jobs.map((job) => job.kind)).toStrictEqual(["score"]);
  });

  it("tolerates an API build with no jobs field", () => {
    expect(
      parseSubmissionDetail(without(benchJobFailed, "jobs")).jobs
    ).toStrictEqual([]);
  });

  it("surfaces a bench failure that the event trail hides", () => {
    const detail = parseSubmissionDetail(benchJobFailed);
    expect(detail.latest_state).toBe("bench_queued");
    expect(detail.bench_verdict).toBeNull();

    const failed = getFailedSubmissionJob(detail.jobs);
    expect(failed?.kind).toBe("bench");
    expect(failed?.last_error).toBe("bench_engine_baseline_or_unknown");
    expect(isStalled(detail.latest_state, detail.jobs)).toBe(true);
  });

  it("does not report a stall when every job succeeded", () => {
    const detail = parseSubmissionDetail(rejectedCrossEnv);
    expect(getFailedSubmissionJob(detail.jobs)).toBeNull();
    expect(isStalled(detail.latest_state, detail.jobs)).toBe(false);
    expect(getSubmissionJob(detail.jobs, "bench")?.status).toBe("done");
    expect(getSubmissionJob(detail.jobs, "nope")).toBeNull();
  });
});

describe("bench verdicts", () => {
  it("keeps every fail_* reason the API can return", () => {
    for (const reason of BENCH_FAIL_REASONS) {
      expect(parseBenchVerdict(reason)).toBe(reason);
      expect(getBenchVerdictMeta(reason)?.tone).toBe("danger");
    }
  });

  it("parses the live fail_* verdicts instead of dropping them", () => {
    expect(parseSubmissionDetail(rejectedCrossEnv).bench_verdict).toBe(
      "fail_cross_env_speedup"
    );
    expect(parseSubmissionDetail(rejectedPerfScreen).bench_verdict).toBe(
      "fail_perf_screen"
    );
  });

  it("treats a pending or unrecognised verdict as null", () => {
    expect(parseBenchVerdict(null)).toBeNull();
    expect(parseBenchVerdict("pending")).toBeNull();
    expect(parseBenchVerdict("fail")).toBeNull();
    expect(parseBenchVerdict("error")).toBeNull();
    expect(parseBenchVerdict("pass")).toBe("pass");
  });
});

describe("pipeline state vocabulary", () => {
  it("covers the states the live pipeline actually emits", () => {
    for (const state of [
      "picked_up",
      "image_pushed",
      "bench_queued",
      "sampled",
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
      "correct",
      "screened",
      "benched",
    ]);
  });

  it("renders an unknown state verbatim instead of collapsing to committed", () => {
    expect(parseSubmissionState("scored")).toBe("scored");
    const meta = getSubmissionStateMeta("scored");
    expect(meta.state).toBe("scored");
    expect(meta.label).toBe("scored");
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
    expect(page.campaign_id).toBe("c02a40b0-6eb3-4853-827e-22d4794b814e");
    expect(page.submissions.every((row) => row.committed_at !== "")).toBe(true);
    expect(page.submissions[0].committed_at).toBe(
      submissionsList.submissions[0].committed_at
    );
  });

  it("carries live states and fail_* verdicts through to the table", () => {
    const page = parseSubmissionsPage(submissionsList, {
      campaign_id: "fallback",
      limit: 50,
      offset: 0,
    });
    expect(page.submissions.map((row) => row.latest_state)).toStrictEqual([
      "bench_queued",
      "rejected",
      "rejected",
    ]);
    expect(page.submissions.map((row) => row.bench_verdict)).toStrictEqual([
      null,
      "fail_cross_env_speedup",
      "fail_perf_screen",
    ]);
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

/** Thresholds as returned by the live campaign in PAR-68, plus extra fields
 *  the parser must ignore (`calibration`, `num_prompts`, …). */
const LIVE_CORRECTNESS = {
  thresholds: {
    argmax_mismatch_rate: 0.001,
    max_abs_logprob_diff: 0.164,
    mean_abs_logprob_diff: 0.0246,
  },
  calibration: {
    calibrated_at: "2026-08-17T11:23:46Z",
    safety_factor: 2.0,
  },
  num_prompts: 32,
};

const LIVE_CROSS_ENV = {
  aggregate: "min",
  speedup_metric: "output_tokens_per_s_ratio",
  min_speedup_each: 1.1111,
};

describe("parseCampaign correctness thresholds", () => {
  it("keeps the three enforced numbers and drops calibration", () => {
    const campaign = parseCampaign({
      bench: { correctness: LIVE_CORRECTNESS, cross_env: LIVE_CROSS_ENV },
    });
    expect(campaign.bench.correctness).toStrictEqual({
      thresholds: {
        argmax_mismatch_rate: 0.001,
        mean_abs_logprob_diff: 0.0246,
        max_abs_logprob_diff: 0.164,
      },
    });
    expect(campaign.bench.correctness).not.toHaveProperty("calibration");
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

  it("always keeps the speedup floor, including four decimal places", () => {
    const { cross_env } = parseCampaign({
      bench: { cross_env: LIVE_CROSS_ENV },
    }).bench;
    expect(cross_env.min_speedup_each).toBe(1.1111);
    expect(cross_env.min_speedup_each.toFixed(4)).toBe("1.1111");
    expect(
      `${cross_env.min_speedup_each.toFixed(4)}× ${cross_env.speedup_metric.replaceAll("_", " ")}`
    ).toBe("1.1111× output tokens per s ratio");
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
