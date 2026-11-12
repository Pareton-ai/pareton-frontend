import { describe, expect, it } from "vitest";

import { firstEventByState, type SubmissionEvent } from "../types";

function ev(
  state: SubmissionEvent["state"],
  minute: number,
  detail: Record<string, unknown> = {}
): SubmissionEvent {
  return {
    state,
    created_at: `2026-11-12T16:${String(minute).padStart(2, "0")}:00Z`,
    detail,
    evidence_ref: null,
  };
}

describe("firstEventByState", () => {
  it("keeps the first event per state", () => {
    const events = [ev("picked_up", 1), ev("fetched", 2), ev("fetched", 3)];
    expect(firstEventByState(events).get("fetched")?.created_at).toBe(
      "2026-11-12T16:02:00Z"
    );
  });

  it("only counts the latest run after a requeue", () => {
    const events = [
      ev("committed", 0),
      ev("picked_up", 18),
      ev("rejected", 21, { reason: "llm_review_invalid_output" }),
      ev("picked_up", 40),
      ev("rejected", 42, { reason: "llm_review_rejected" }),
    ];
    const byState = firstEventByState(events);
    expect(byState.get("rejected")?.detail.reason).toBe("llm_review_rejected");
    expect(byState.get("picked_up")?.created_at).toBe("2026-11-12T16:40:00Z");
    expect(byState.has("committed")).toBe(true);
  });
});
