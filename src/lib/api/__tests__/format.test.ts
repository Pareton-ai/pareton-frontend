import { describe, expect, it } from "vitest";
import { formatScore } from "@/lib/api/format";

describe("formatScore", () => {
  it("clips to four decimal places", () => {
    expect(formatScore(-0.0000777167485470146)).toBe("-0.0001");
    expect(formatScore(1.11111111)).toBe("1.1111");
  });

  it("drops trailing zeros so short scores stay short", () => {
    expect(formatScore(0.31)).toBe("0.31");
    expect(formatScore(0)).toBe("0");
  });

  it("prints values that round to signed zero as 0", () => {
    expect(formatScore(-0.00004)).toBe("0");
  });
});
