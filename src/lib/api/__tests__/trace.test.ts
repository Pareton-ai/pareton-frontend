import { describe, expect, it } from "vitest";
import { readEngineTimings } from "@/lib/api/trace";

/** Shaped after a real `sla.timings` row from api.pareton.ai. */
const SLA = {
  role: "candidate",
  timings: {
    "hf-001": {
      ttft_s: 0.033746,
      itl_s: [0.014995, 0.000018],
      completion_tokens: 3,
    },
    "hf-000": {
      ttft_s: 0.053299,
      itl_s: [0.015075, 0.000011],
      completion_tokens: 3,
    },
  },
};

describe("readEngineTimings", () => {
  it("reads each request and orders them by id", () => {
    const rows = readEngineTimings(SLA);
    expect(rows.map((r) => r.requestId)).toEqual(["hf-000", "hf-001"]);
  });

  it("totals the wall time as ttft plus every gap", () => {
    const [first] = readEngineTimings(SLA);
    expect(first.totalS).toBeCloseTo(0.053299 + 0.015075 + 0.000011, 9);
  });

  it("reports the longest gap, which is the stall a miner is hunting", () => {
    const [first] = readEngineTimings(SLA);
    expect(first.maxItlS).toBeCloseTo(0.015075, 9);
  });

  it("counts gaps so a short array is visible", () => {
    const [first] = readEngineTimings(SLA);
    expect(first.gapCount).toBe(2);
    expect(first.completionTokens).toBe(3);
    expect(first.coalesced).toBe(false);
  });

  it("flags a coalesced stream", () => {
    // 41 tokens behind 6 gaps is the shape the harness rejects: the tokens
    // arrived in batches, so the per-token numbers measure nothing.
    const rows = readEngineTimings({
      timings: {
        "hf-000": {
          ttft_s: 0.05,
          itl_s: [0.01, 0.01, 0.01, 0.01, 0.01, 0.01],
          completion_tokens: 41,
        },
      },
    });
    expect(rows[0].coalesced).toBe(true);
  });

  it("does not flag a single-token completion", () => {
    const rows = readEngineTimings({
      timings: { "hf-000": { ttft_s: 0.05, itl_s: [], completion_tokens: 1 } },
    });
    expect(rows[0].coalesced).toBe(false);
    expect(rows[0].maxItlS).toBeNull();
    expect(rows[0].totalS).toBeCloseTo(0.05, 9);
  });

  it("returns nothing for a blob with no timings", () => {
    expect(readEngineTimings(null)).toEqual([]);
    expect(readEngineTimings(undefined)).toEqual([]);
    expect(readEngineTimings({})).toEqual([]);
    expect(readEngineTimings({ timings: null })).toEqual([]);
    expect(readEngineTimings({ timings: "nope" })).toEqual([]);
  });

  it("skips rows with no usable ttft rather than inventing one", () => {
    const rows = readEngineTimings({
      timings: {
        "hf-000": { itl_s: [0.01], completion_tokens: 2 },
        "hf-001": { ttft_s: "slow", completion_tokens: 2 },
        "hf-002": { ttft_s: 0.04, itl_s: [0.01], completion_tokens: 2 },
      },
    });
    expect(rows.map((r) => r.requestId)).toEqual(["hf-002"]);
  });

  it("drops non-numeric gaps instead of poisoning the total", () => {
    const rows = readEngineTimings({
      timings: {
        "hf-000": {
          ttft_s: 0.05,
          itl_s: [0.01, null, "x", Number.NaN, 0.02],
          completion_tokens: 3,
        },
      },
    });
    expect(rows[0].gapCount).toBe(2);
    expect(rows[0].totalS).toBeCloseTo(0.08, 9);
    expect(rows[0].maxItlS).toBeCloseTo(0.02, 9);
  });
});
