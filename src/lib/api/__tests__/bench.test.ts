import { describe, expect, it } from "vitest";
import { hasScore } from "@/lib/api/bench";
import { parseRoundDetail, parseScore } from "@/lib/api/parse";
import roundRunning from "./fixtures/round-running.json";

describe("hasScore", () => {
  it("treats 0.0 as a score and null as the absence of one", () => {
    const detail = parseRoundDetail(roundRunning);
    expect(hasScore(detail.entries[0])).toBe(true);
    expect(detail.entries[0].score).toBe(0);
    expect(hasScore(detail.entries[1])).toBe(false);
    expect(parseScore(null)).toBeNull();
    expect(hasScore(null)).toBe(false);
  });
});
