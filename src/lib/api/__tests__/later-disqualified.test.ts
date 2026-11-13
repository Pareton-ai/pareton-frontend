import { describe, expect, it } from "vitest";
import {
  disqualifiedAfterRound,
  hasScoredSubmission,
} from "@/lib/api/later-disqualified";
import type { RoundEntry } from "@/lib/api/types";

function entry(
  over: Pick<RoundEntry, "role" | "status"> & Partial<RoundEntry>
): RoundEntry {
  return {
    id: 1,
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

const ENTRIES = [
  entry({ role: "baseline", status: "scored", score: 0 }),
  entry({
    role: "challenger",
    status: "scored",
    score: 0.43,
    submission_id: "a",
  }),
  entry({
    role: "challenger",
    status: "scored",
    score: 0.38,
    submission_id: "b",
  }),
  entry({ role: "challenger", status: "disqualified", submission_id: "c" }),
  entry({ role: "challenger", status: "infra_failed", submission_id: "d" }),
];

describe("disqualifiedAfterRound", () => {
  it("marks a scored entry whose submission is now disqualified", () => {
    const marked = disqualifiedAfterRound(ENTRIES, [
      { id: "a", latest_state: "disqualified" },
      { id: "b", latest_state: "scored" },
    ]);
    expect([...marked]).toEqual(["a"]);
  });

  it("leaves entries the round itself did not score", () => {
    // The row already carries the round's own verdict and reason.
    const marked = disqualifiedAfterRound(ENTRIES, [
      { id: "c", latest_state: "disqualified" },
      { id: "d", latest_state: "disqualified" },
    ]);
    expect(marked.size).toBe(0);
  });

  it("ignores submissions the round never seated", () => {
    expect(
      disqualifiedAfterRound(ENTRIES, [
        { id: "z", latest_state: "disqualified" },
      ]).size
    ).toBe(0);
    expect(disqualifiedAfterRound(ENTRIES, []).size).toBe(0);
  });
});

describe("hasScoredSubmission", () => {
  it("is false for a round with only the baseline scored", () => {
    expect(hasScoredSubmission(ENTRIES.slice(0, 1))).toBe(false);
    expect(hasScoredSubmission(ENTRIES.slice(3))).toBe(false);
    expect(hasScoredSubmission(ENTRIES)).toBe(true);
  });
});
