/**
 * Guards the `font-size` class group in `cn`.
 *
 * tailwind-merge dedupes by class-name prefix, so an unconfigured `cn` reads
 * `text-body` (a size) and `text-foreground` (a colour) as the same group and
 * silently drops the size — the element then inherits 16px and nothing in the
 * type system says otherwise. That shipped once. These tests fail if a scale
 * step is added to globals.css without being registered in cn.ts.
 */

import { describe, expect, it } from "vitest";
import { cn } from "@/lib/cn";

/** Every step in the `--text-*` scale, paired with a colour it ships beside. */
const SCALE = [
  "text-caption",
  "text-body",
  "text-body-lg",
  "text-title",
  "text-display-section",
] as const;

describe("cn", () => {
  it.each(SCALE)("keeps %s alongside a text colour", (size) => {
    expect(cn(size, "text-foreground")).toContain(size);
    expect(cn(`font-mono ${size} uppercase`, "text-muted")).toContain(size);
  });

  it("still collapses two sizes to the last one", () => {
    expect(cn("text-body", "text-title")).toBe("text-title");
  });

  it("still collapses two colours to the last one", () => {
    expect(cn("text-muted", "text-foreground")).toBe("text-foreground");
  });

  it("keeps size and colour independent in either order", () => {
    const out = cn("text-foreground", "text-caption");
    expect(out).toContain("text-caption");
    expect(out).toContain("text-foreground");
  });
});
