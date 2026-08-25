import { describe, expect, it } from "vitest";
import { parseRoundDetail } from "@/lib/api/parse";
import {
  annotateRoundPlan,
  buildRoundPlan,
  groupRoundPlan,
  readProgressHint,
  roundPlanProgress,
} from "@/lib/api/round-plan";
import type { RoundDetail, RoundEntry } from "@/lib/api/types";
import roundRunning from "@/lib/api/__tests__/fixtures/round-running.json";
import roundVoid from "@/lib/api/__tests__/fixtures/round-void.json";

const NOW = "2026-08-20T00:01:10+00:00";
const LATER = "2026-08-20T00:10:00+00:00";

function entry(
  over: Pick<RoundEntry, "id" | "role" | "status"> & Partial<RoundEntry>
): RoundEntry {
  return {
    submission_id: null,
    patch_hash: null,
    hotkey: null,
    engine_image_ref: "ghcr.io/example@sha256:aa",
    score: null,
    disqualify_reason: null,
    started_at: null,
    completed_at: null,
    ...over,
  };
}

function roundOver(
  base: unknown,
  over: Partial<RoundDetail> & { entries?: RoundEntry[] }
): RoundDetail {
  return parseRoundDetail({
    ...(base as object),
    ...over,
    entries: over.entries ?? (base as { entries: unknown[] }).entries,
  });
}

function currentLabel(round: RoundDetail, now = NOW): string | null {
  const current = annotateRoundPlan(round, now).find(
    (step) => step.status === "current" || step.status === "stalled"
  );
  return current?.label ?? null;
}

describe("buildRoundPlan", () => {
  it("is 4 setup + 2 per entry + scorer + drift + teardown", () => {
    const entries = [
      entry({ id: 1, role: "baseline", status: "pending" }),
      entry({ id: 2, role: "challenger", status: "pending" }),
      entry({ id: 3, role: "challenger", status: "pending" }),
    ];
    const steps = buildRoundPlan(entries);
    expect(steps).toHaveLength(4 + 2 * 3 + 2 + 2 + 1);
    expect(steps.map((s) => s.groupId)).toEqual([
      "setup",
      "setup",
      "setup",
      "setup",
      "entry:1",
      "entry:1",
      "entry:2",
      "entry:2",
      "entry:3",
      "entry:3",
      "scorer",
      "scorer",
      "drift",
      "drift",
      "teardown",
    ]);
  });

  it("labels engine steps by entry, not by the raw phase name", () => {
    const steps = buildRoundPlan([
      entry({ id: 1, role: "baseline", status: "pending" }),
      entry({ id: 2, role: "leader", status: "pending" }),
      entry({ id: 3, role: "challenger", status: "pending" }),
      entry({ id: 4, role: "challenger", status: "pending" }),
    ]);
    expect(steps.find((s) => s.id === "entry:1:sla_bench")?.label).toBe(
      "Baseline, running SLA"
    );
    expect(steps.find((s) => s.id === "entry:2:starting_engine")?.label).toBe(
      "Incumbent, starting the engine"
    );
    expect(steps.find((s) => s.id === "entry:4:sla_bench")?.label).toBe(
      "Candidate 2 of 2, running SLA"
    );
    expect(steps.find((s) => s.id === "scorer:correctness")?.label).toBe(
      "Scorer, running the shared scorer"
    );
  });
});

describe("readProgressHint", () => {
  const entries = [
    entry({ id: 10, role: "baseline", status: "pending" }),
    entry({ id: 11, role: "challenger", status: "pending" }),
    entry({ id: 12, role: "challenger", status: "pending" }),
  ];

  it("treats progress.entry as a 0-based index", () => {
    expect(readProgressHint({ entry: 2 }, entries)).toEqual({
      entryIndex: 2,
      kind: "entry",
    });
  });

  it("maps EngineStart roles when they land", () => {
    expect(readProgressHint({ role: "scorer" }, entries).kind).toBe("scorer");
    expect(readProgressHint({ role: "baseline-drift" }, entries).kind).toBe(
      "drift"
    );
    expect(readProgressHint({ role: "candidate-1" }, entries)).toEqual({
      entryIndex: 2,
      kind: "entry",
    });
  });

  it("treats progress.step as a 1-based plan position", () => {
    expect(readProgressHint({ step: 3 }, entries)).toEqual({
      entryIndex: 2,
      kind: "entry",
    });
    expect(readProgressHint({ step: 4 }, entries).kind).toBe("scorer");
    expect(readProgressHint({ step: 5 }, entries).kind).toBe("drift");
  });

  it("lets a live step override a leftover seated entry index", () => {
    expect(readProgressHint({ entry: 2, step: 5 }, entries).kind).toBe("drift");
  });
});

describe("annotateRoundPlan", () => {
  it("keeps a pending round fully unreached", () => {
    const round = roundOver(roundRunning, { status: "pending", phase: null });
    const steps = annotateRoundPlan(round, NOW);
    expect(steps.every((s) => s.status === "pending")).toBe(true);
    expect(roundPlanProgress(steps)).toEqual({ done: 0, total: steps.length });
  });

  it("marks a complete round fully done, including scorer and drift", () => {
    const round = roundOver(roundRunning, {
      status: "complete",
      phase: "teardown",
      completed_at: "2026-08-20T06:00:00+00:00",
    });
    const steps = annotateRoundPlan(round, NOW);
    expect(steps.every((s) => s.status === "done")).toBe(true);
    expect(steps.at(-1)?.phase).toBe("teardown");
  });

  it("distinguishes 10 percent setup from 85 percent through the candidates", () => {
    const early = roundOver(roundRunning, {
      phase: "downloading_model",
      progress: null,
      entries: (
        roundRunning as { entries: Array<Record<string, unknown>> }
      ).entries.map((row) => ({
        ...row,
        status: "pending",
        started_at: null,
        completed_at: null,
        score: null,
        disqualify_reason: null,
      })),
    });
    const late = parseRoundDetail(roundRunning);

    const earlyLabel = currentLabel(early);
    const lateLabel = currentLabel(late);
    expect(earlyLabel).toBe("Downloading model weights");
    expect(lateLabel).toBe("Candidate 2 of 2, running SLA");
    expect(earlyLabel).not.toBe(lateLabel);

    const earlyDone = roundPlanProgress(annotateRoundPlan(early, NOW)).done;
    const lateDone = roundPlanProgress(annotateRoundPlan(late, NOW)).done;
    expect(lateDone).toBeGreaterThan(earlyDone);
  });

  it("uses leftover phase on a void round so the list stops where it died", () => {
    const round = roundOver(roundRunning, {
      status: "void",
      void_reason: "heartbeat_stale",
    });
    const steps = annotateRoundPlan(round, NOW);
    const stalled = steps.find((s) => s.status === "stalled");
    expect(stalled?.label).toBe("Candidate 2 of 2, running SLA");
    const stalledIndex = steps.findIndex((s) => s.status === "stalled");
    expect(steps.slice(0, stalledIndex).every((s) => s.status === "done")).toBe(
      true
    );
    expect(
      steps.slice(stalledIndex + 1).every((s) => s.status === "halted")
    ).toBe(true);
  });

  it("renders a rank-time void as a finished plan", () => {
    const round = parseRoundDetail(roundVoid);
    const steps = annotateRoundPlan(round, NOW);
    expect(round.void_reason).toBe("baseline_drift");
    expect(steps.every((s) => s.status === "done")).toBe(true);
  });

  it("halts a provision failure on the first setup step", () => {
    const round = roundOver(roundRunning, {
      status: "void",
      void_reason: "pod_provision_failed",
      phase: null,
      progress: null,
      entries: (
        roundRunning as { entries: Array<Record<string, unknown>> }
      ).entries.map((row) => ({
        ...row,
        status: "pending",
        started_at: null,
        completed_at: null,
        score: null,
      })),
    });
    expect(currentLabel(round)).toBe("Renting a GPU pod");
    expect(
      annotateRoundPlan(round, NOW).find((s) => s.label === "Renting a GPU pod")
        ?.status
    ).toBe("stalled");
  });

  it("places correctness on the shared scorer, not a candidate row", () => {
    const round = roundOver(roundRunning, {
      phase: "correctness",
      progress: { entry: 2 },
    });
    expect(currentLabel(round)).toBe("Scorer, running the shared scorer");
  });

  it("treats sla_bench after every entry finishes as the drift baseline", () => {
    const round = roundOver(roundRunning, {
      phase: "sla_bench",
      progress: null,
      entries: (
        roundRunning as { entries: Array<Record<string, unknown>> }
      ).entries.map((row, index) => ({
        ...row,
        status: "scored",
        score: index === 0 ? 0 : 0.1,
        started_at: "2026-08-20T00:00:10+00:00",
        completed_at: "2026-08-20T00:00:50+00:00",
      })),
    });
    expect(currentLabel(round)).toBe("Drift baseline, running SLA");
  });

  it("keeps live sla_bench on a finished image instead of jumping to the next start", () => {
    const round = roundOver(roundRunning, {
      phase: "sla_bench",
      progress: null,
      entries: [
        entry({
          id: 1,
          role: "baseline",
          status: "scored",
          score: 0,
          started_at: "2026-08-20T00:00:00+00:00",
          completed_at: "2026-08-20T00:00:40+00:00",
        }),
        entry({ id: 2, role: "challenger", status: "pending" }),
      ],
    });
    expect(currentLabel(round)).toBe("Baseline, running SLA");
  });

  it("ignores a leftover progress.entry once every seated image has finished", () => {
    const settled = (
      roundRunning as { entries: Array<Record<string, unknown>> }
    ).entries.map((row, index) => ({
      ...row,
      status: "scored",
      score: index === 0 ? 0 : 0.1,
      disqualify_reason: null,
      started_at: "2026-08-20T00:00:10+00:00",
      completed_at: "2026-08-20T00:00:50+00:00",
    }));
    expect(
      currentLabel(
        roundOver(roundRunning, {
          phase: "starting_engine",
          progress: { entry: 2 },
          entries: settled,
        })
      )
    ).toBe("Scorer, starting the engine");
    expect(
      currentLabel(
        roundOver(roundRunning, {
          phase: "sla_bench",
          progress: { entry: 2 },
          entries: settled,
        })
      )
    ).toBe("Drift baseline, running SLA");
  });

  it("places an unhinted starting_engine on drift after the scorer has judged", () => {
    const judged = (
      roundRunning as { entries: Array<Record<string, unknown>> }
    ).entries.map((row, index) => ({
      ...row,
      status: index === 1 ? "disqualified" : "scored",
      score: index === 0 ? 0 : null,
      disqualify_reason: index === 1 ? "fail_correctness" : null,
      started_at: "2026-08-20T00:00:10+00:00",
      completed_at: "2026-08-20T00:00:50+00:00",
    }));
    expect(
      currentLabel(
        roundOver(roundRunning, {
          phase: "starting_engine",
          progress: null,
          entries: judged,
        })
      )
    ).toBe("Drift baseline, starting the engine");
    expect(
      currentLabel(
        roundOver(roundRunning, {
          phase: "starting_engine",
          progress: { entry: 2 },
          entries: judged,
        })
      )
    ).toBe("Drift baseline, starting the engine");
  });

  it("places a PAR-98 drift step on the drift engine, not the scorer", () => {
    const settled = (
      roundRunning as { entries: Array<Record<string, unknown>> }
    ).entries.map((row, index) => ({
      ...row,
      status: "scored",
      score: index === 0 ? 0 : 0.1,
      disqualify_reason: null,
      started_at: "2026-08-20T00:00:10+00:00",
      completed_at: "2026-08-20T00:00:50+00:00",
    }));
    expect(
      currentLabel(
        roundOver(roundRunning, {
          phase: "starting_engine",
          progress: { step: 5, steps: 5, role: "baseline-drift" },
          entries: settled,
        })
      )
    ).toBe("Drift baseline, starting the engine");
  });

  it("paints the current step stalled when the heartbeat is old", () => {
    const round = parseRoundDetail(roundRunning);
    expect(currentLabel(round, LATER)).toBe("Candidate 2 of 2, running SLA");
    expect(
      annotateRoundPlan(round, LATER).find(
        (s) => s.label === "Candidate 2 of 2, running SLA"
      )?.status
    ).toBe("stalled");
    expect(
      annotateRoundPlan(round, NOW).find(
        (s) => s.label === "Candidate 2 of 2, running SLA"
      )?.status
    ).toBe("current");
  });

  it("groups adjacent steps so the timeline can reuse pipeline eyebrows", () => {
    const steps = annotateRoundPlan(parseRoundDetail(roundRunning), NOW);
    const groups = groupRoundPlan(steps);
    expect(groups.map((g) => g.label)).toEqual([
      "Setup",
      "Baseline",
      "Candidate 1 of 2",
      "Candidate 2 of 2",
      "Scorer",
      "Drift baseline",
      "Teardown",
    ]);
    expect(groups[0]?.steps).toHaveLength(4);
    expect(groups[1]?.steps.map((s) => s.phase)).toEqual([
      "starting_engine",
      "sla_bench",
    ]);
  });

  it("cuts a mid-run void after the last engine that actually ran", () => {
    const round = roundOver(roundRunning, {
      status: "void",
      void_reason: "pod_failed",
      phase: null,
      progress: null,
      entries: [
        entry({
          id: 1,
          role: "baseline",
          status: "scored",
          score: 0,
          started_at: "2026-08-20T00:00:00+00:00",
          completed_at: "2026-08-20T00:10:00+00:00",
        }),
        entry({
          id: 2,
          role: "challenger",
          status: "infra_failed",
          started_at: "2026-08-20T00:10:00+00:00",
          completed_at: "2026-08-20T00:20:00+00:00",
        }),
        entry({ id: 3, role: "challenger", status: "pending" }),
      ],
    });
    const steps = annotateRoundPlan(round, NOW);
    expect(
      steps.find((s) => s.label === "Candidate 1 of 2, running SLA")?.status
    ).toBe("done");
    expect(
      steps.find((s) => s.label === "Candidate 2 of 2, starting the engine")
        ?.status
    ).toBe("halted");
    expect(steps.some((s) => s.status === "stalled")).toBe(false);
    expect(steps.some((s) => s.status === "current")).toBe(false);
  });
});
