import { describe, expect, it } from "vitest";
import {
  parseCampaign,
  parsePatchVisibility,
  parseSubmissionDetail,
} from "../parse";
import { isAwaitingPatchRevealTime } from "../types";
import { getPatchAvailability } from "../patch-availability";
import { DEFAULT_ARTIFACT_BASE_URL } from "../artifacts";

const policy = { mode: "public_after_reveal", reveal_delay_s: 60 };
const url = `${DEFAULT_ARTIFACT_BASE_URL}/stage0/campaigns/c/patch.diff`;

describe("campaign disclosure policy", () => {
  it.each([
    undefined,
    null,
    {},
    { mode: "public" },
    { mode: "public_after_reveal" },
    ...[-1, true, "60", 0.5, 2147483648].map((reveal_delay_s) => ({
      ...policy,
      reveal_delay_s,
    })),
  ])("fails closed for missing or invalid policy %j", (value) => {
    expect(parsePatchVisibility(value)).toEqual({ mode: "private" });
  });
  it.each([0, 60, 2147483647])("preserves valid delay %i", (delay) => {
    const visibility = { ...policy, reveal_delay_s: delay };
    expect(
      parseCampaign({ patch_visibility: visibility }).patch_visibility
    ).toEqual(visibility);
    expect(
      parseSubmissionDetail({ submission: { patch_visibility: visibility } })
        .submission.patch_visibility
    ).toEqual(visibility);
  });
  it("never treats private evaluated submissions as awaiting reveal", () => {
    const detail = parseSubmissionDetail({
      submission: {},
      round: { round_id: "r", status: "scored" },
    });
    expect(isAwaitingPatchRevealTime(detail)).toBe(false);
  });
  it("suppresses old URLs and timestamps under private or absent policy", () => {
    const detail = parseSubmissionDetail({
      submission: {
        retrieval_url: url,
        patch_reveal_at: "2026-01-01T00:00:00Z",
      },
    });
    expect(getPatchAvailability(detail.submission)).toEqual({
      mode: "private",
      url: "",
      downloadable: false,
      revealAt: null,
    });
  });
  it("never invents a download at the reveal deadline", () => {
    const detail = parseSubmissionDetail({
      submission: {
        patch_visibility: policy,
        patch_reveal_at: "2026-01-01T00:00:00Z",
      },
    });
    expect(getPatchAvailability(detail.submission)).toMatchObject({
      url: "",
      downloadable: false,
    });
    detail.submission.retrieval_url = url;
    expect(getPatchAvailability(detail.submission)).toMatchObject({
      url,
      downloadable: true,
    });
    detail.submission.retrieval_url = "https://foreign.example/private.diff";
    expect(getPatchAvailability(detail.submission)).toMatchObject({
      url: "",
      downloadable: false,
    });
  });
});
