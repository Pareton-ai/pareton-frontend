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
  parseSubmissionDetail,
  parseSubmissionRow,
  parseSubmissionsPage,
  parseSubmissionState,
} from "@/lib/api/parse";
import {
  BENCH_FAIL_REASONS,
  BENCH_PHASE_META,
  BENCH_PHASES,
  getBenchVerdictMeta,
  getFailedSubmissionJob,
  getLiveActivity,
  getRunningSubmissionJob,
  getSubmissionJob,
  getSubmissionStateMeta,
  HEARTBEAT_STALE_AFTER_MS,
  isStalled,
  SUBMISSION_STAGE_ORDER,
  SUBMISSION_STATE_META,
  type SubmissionJob,
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

function settled(job: {
  kind: string;
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

function runningBench(overrides: Partial<SubmissionJob> = {}): SubmissionJob {
  return {
    kind: "bench",
    status: "running",
    last_error: null,
    phase: "downloading_model",
    phase_started_at: "2026-08-17T12:00:00+00:00",
    heartbeat_at: "2026-08-17T12:20:00+00:00",
    progress: { gpu_sku: "H200-SXM-141GB" },
    ...overrides,
  };
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
      settled({ kind: "gates", status: "done", last_error: null }),
      settled({
        kind: "bench",
        status: "failed",
        last_error: "bench_engine_baseline_or_unknown",
      }),
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

  it("tolerates an API build with no phase fields", () => {
    const jobs = parseSubmissionDetail({
      ...benchJobFailed,
      jobs: [{ kind: "bench", status: "running", last_error: null }],
    }).jobs;
    expect(jobs[0]).toStrictEqual(
      settled({ kind: "bench", status: "running", last_error: null })
    );
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

describe("live bench activity", () => {
  const jobsWith = (job: SubmissionJob) => [
    settled({ kind: "gates", status: "done", last_error: null }),
    job,
  ];

  it("parses the phase, its start, and the heartbeat off a running job", () => {
    const { jobs } = parseSubmissionDetail({
      ...benchJobFailed,
      jobs: [runningBench()],
    });
    expect(jobs[0]).toStrictEqual(runningBench());
  });

  it("drops phase text outside the fixed vocabulary", () => {
    const { jobs } = parseSubmissionDetail({
      ...benchJobFailed,
      jobs: [runningBench({ phase: "rm -rf /" as never })],
    });
    expect(jobs[0].phase).toBeNull();
    expect(jobs[0].phase_started_at).toBeNull();
    expect(jobs[0].heartbeat_at).toBeNull();
    expect(jobs[0].progress).toBeNull();
  });

  it("describes what the bench is doing now", () => {
    const activity = getLiveActivity(
      jobsWith(runningBench()),
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
      jobsWith(runningBench()),
      "2026-08-17T13:20:00+00:00"
    );
    expect(activity?.stale).toBe(true);
    expect(activity?.heartbeatAgeMs).toBe(3_600_000);
  });

  it("treats a missing heartbeat as stale", () => {
    const activity = getLiveActivity(
      jobsWith(runningBench({ heartbeat_at: null })),
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
    expect(getLiveActivity(jobsWith(runningBench()), nearly)?.stale).toBe(
      false
    );
  });

  it("shows nothing for a settled or unstarted job", () => {
    expect(
      getLiveActivity(
        jobsWith(settled({ kind: "bench", status: "done", last_error: null })),
        "2026-08-17T12:20:30+00:00"
      )
    ).toBeNull();
    // Claimed but not yet reporting: the stage list already says bench_queued.
    expect(
      getLiveActivity(
        jobsWith(runningBench({ phase: null })),
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
    // Two vocabularies on purpose: a phase is what is happening now, a state is
    // a milestone that was reached and recorded.
    for (const phase of BENCH_PHASES) {
      expect(SUBMISSION_STAGE_ORDER).not.toContain(phase);
    }
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
