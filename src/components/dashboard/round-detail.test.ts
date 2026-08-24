import { describe, expect, it } from "vitest";
import { topChallengerScore } from "@/components/dashboard/round-detail";
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

describe("topChallengerScore", () => {
  it("ignores baseline and the incumbent leader", () => {
    expect(
      topChallengerScore([
        entry({ role: "baseline", status: "scored", score: 0.0 }),
        entry({ role: "leader", status: "scored", score: 0.4 }),
        entry({ role: "challenger", status: "disqualified", score: null }),
      ])
    ).toBeNull();
  });

  it("returns the highest scored challenger", () => {
    expect(
      topChallengerScore([
        entry({ role: "baseline", status: "scored", score: 0.0 }),
        entry({ role: "leader", status: "scored", score: 0.9 }),
        entry({ role: "challenger", status: "scored", score: 0.2 }),
        entry({ role: "challenger", status: "scored", score: 0.31 }),
      ])
    ).toBe(0.31);
  });
});
