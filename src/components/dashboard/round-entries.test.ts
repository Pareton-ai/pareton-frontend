import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RoundMetadata, RoundStats } from "@/components/dashboard/round-detail";
import { RoundEntries } from "@/components/dashboard/round-entries";
import roundVoid from "@/lib/api/__tests__/fixtures/round-void.json";
import { parseRoundDetail } from "@/lib/api/parse";
import type { RoundDetail, RoundEntry } from "@/lib/api/types";

const WINNER = "11111111-1111-1111-1111-111111111111";
const RUNNER_UP = "22222222-2222-2222-2222-222222222222";
const NOW = "2026-11-13T12:00:00+00:00";

function entry(over: Partial<RoundEntry> & Pick<RoundEntry, "id">): RoundEntry {
  return {
    submission_id: null,
    patch_hash: null,
    hotkey: null,
    role: "challenger",
    engine_image_ref: "ghcr.io/example@sha256:aa",
    status: "scored",
    score: null,
    disqualify_reason: null,
    started_at: null,
    completed_at: null,
    ...over,
  };
}

const ENTRIES: RoundEntry[] = [
  entry({ id: 1, role: "baseline", score: 0 }),
  entry({
    id: 2,
    submission_id: WINNER,
    patch_hash: "sha256:" + "a".repeat(64),
    hotkey: "5Winner",
    score: 0.4322,
  }),
  entry({
    id: 3,
    submission_id: RUNNER_UP,
    patch_hash: "sha256:" + "b".repeat(64),
    hotkey: "5RunnerUp",
    score: 0.378,
  }),
];

function round(): RoundDetail {
  return {
    ...parseRoundDetail(roundVoid),
    status: "complete",
    void_reason: null,
    void_detail: null,
    incumbent_submission_id: null,
    winner_submission_id: WINNER,
    leader_changed: true,
    entries: ENTRIES,
  };
}

function rows(html: string): string[] {
  return html.split("<tr").slice(2);
}

describe("a submission disqualified after the round", () => {
  it("keeps the round's verdict and marks the later one on its row", () => {
    const html = renderToStaticMarkup(
      createElement(RoundEntries, {
        campaignId: "c1",
        ordinal: 1,
        entries: ENTRIES,
        nowIso: NOW,
        disqualifiedLater: new Set([WINNER]),
      })
    );
    const [baseline, winner, runnerUp] = rows(html);
    expect(winner).toContain("disqualified later");
    expect(winner).toContain("line-through");
    expect(winner).toContain("scored");
    for (const row of [baseline, runnerUp]) {
      expect(row).not.toContain("disqualified later");
      expect(row).not.toContain("line-through");
    }
  });

  it("marks nothing when no set is given", () => {
    const html = renderToStaticMarkup(
      createElement(RoundEntries, {
        campaignId: "c1",
        ordinal: 1,
        entries: ENTRIES,
        nowIso: NOW,
      })
    );
    expect(html).not.toContain("disqualified later");
    expect(html).not.toContain("line-through");
  });

  it("says so next to the round's winner", () => {
    const marked = new Set([WINNER]);
    const stats = renderToStaticMarkup(
      createElement(RoundStats, {
        round: round(),
        now: NOW,
        disqualifiedLater: marked,
      })
    );
    expect(stats).toContain(", disqualified later");
    const meta = renderToStaticMarkup(
      createElement(RoundMetadata, {
        campaignId: "c1",
        round: round(),
        disqualifiedLater: marked,
      })
    );
    expect(meta).toContain("disqualified later");
  });

  it("leaves the winner alone when another entry was disqualified", () => {
    const marked = new Set([RUNNER_UP]);
    const stats = renderToStaticMarkup(
      createElement(RoundStats, {
        round: round(),
        now: NOW,
        disqualifiedLater: marked,
      })
    );
    expect(stats).not.toContain("disqualified later");
    const meta = renderToStaticMarkup(
      createElement(RoundMetadata, { campaignId: "c1", round: round() })
    );
    expect(meta).not.toContain("disqualified later");
  });
});
