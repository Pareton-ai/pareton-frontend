import { describe, expect, it } from "vitest";
import {
  campaignHref,
  campaignListHref,
  roundHref,
  submissionHref,
} from "@/lib/routes";

describe("campaignListHref", () => {
  it("omits page 1 for both tables", () => {
    expect(campaignListHref("mock-campaign")).toBe(
      campaignHref("mock-campaign")
    );
    expect(campaignListHref("mock-campaign", { page: 1, submissions: 1 })).toBe(
      campaignHref("mock-campaign")
    );
  });

  it("keeps independent paginators", () => {
    expect(campaignListHref("mock-campaign", { page: 2 })).toBe(
      "/dashboard/campaigns/mock-campaign?page=2"
    );
    expect(campaignListHref("mock-campaign", { submissions: 3 })).toBe(
      "/dashboard/campaigns/mock-campaign?submissions=3"
    );
    expect(campaignListHref("mock-campaign", { page: 2, submissions: 3 })).toBe(
      "/dashboard/campaigns/mock-campaign?page=2&submissions=3"
    );
  });
});

describe("roundHref", () => {
  it("uses the campaign-scoped ordinal path PAR-88 owns", () => {
    expect(roundHref("mock-campaign", 12)).toBe(
      "/dashboard/campaigns/mock-campaign/rounds/12"
    );
  });
});

describe("submissionHref", () => {
  it("encodes the patch hash colon", () => {
    expect(
      submissionHref(
        "c1",
        "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
      )
    ).toContain("sha256%3A");
  });
});
