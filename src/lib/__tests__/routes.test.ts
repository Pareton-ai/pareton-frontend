import { describe, expect, it } from "vitest";
import {
  campaignHref,
  campaignListHref,
  clampedCampaignListHref,
  parseCampaignTab,
  parseRoundOrdinal,
  roundHref,
  submissionHref,
  blockExplorerHref,
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

describe("clampedCampaignListHref", () => {
  const pageSize = 10;

  it("returns null when both pagers are in range", () => {
    expect(
      clampedCampaignListHref(
        "c1",
        { page: 2, submissions: 3 },
        { pageSize, roundsTotal: 25, submissionsTotal: 40 }
      )
    ).toBeNull();
  });

  it("clamps both pagers in one URL when both are past the last page", () => {
    expect(
      clampedCampaignListHref(
        "c1",
        { page: 9, submissions: 8 },
        { pageSize, roundsTotal: 12, submissionsTotal: 25 }
      )
    ).toBe(campaignListHref("c1", { page: 2, submissions: 3 }));
  });

  it("leaves a pager alone when that list total is missing", () => {
    expect(
      clampedCampaignListHref(
        "c1",
        { page: 9, submissions: 8 },
        { pageSize, roundsTotal: 12, submissionsTotal: null }
      )
    ).toBe(campaignListHref("c1", { page: 2, submissions: 8 }));
  });
});

describe("roundHref", () => {
  it("uses the campaign-scoped ordinal path PAR-88 owns", () => {
    expect(roundHref("mock-campaign", 12)).toBe(
      "/dashboard/campaigns/mock-campaign/rounds/12"
    );
  });
});

describe("parseRoundOrdinal", () => {
  it("round-trips the ordinal roundHref wrote", () => {
    expect(parseRoundOrdinal("12")).toBe(12);
    expect(parseRoundOrdinal("1")).toBe(1);
  });

  it("rejects anything that is not a plain 1-based integer", () => {
    for (const param of ["0", "01", "-1", "1.5", "1e3", "12abc", "", " 1"]) {
      expect(parseRoundOrdinal(param)).toBeNull();
    }
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

describe("blockExplorerHref", () => {
  it("points at the taomarketcap block page", () => {
    expect(blockExplorerHref(8912412)).toBe(
      "https://taomarketcap.com/blocks/8912412"
    );
  });
});

describe("parseCampaignTab", () => {
  it("round-trips every tab campaignListHref can write", () => {
    for (const tab of [
      "rounds",
      "submissions",
      "metadata",
      "leaders",
    ] as const) {
      expect(parseCampaignTab(tab)).toBe(tab);
    }
  });

  it("falls back to rounds for a missing or unknown tab", () => {
    expect(parseCampaignTab(undefined)).toBe("rounds");
    expect(parseCampaignTab("")).toBe("rounds");
    expect(parseCampaignTab("leaderboard")).toBe("rounds");
  });
});

describe("campaignListHref tabs", () => {
  it("omits the default tab so the bare campaign URL stays canonical", () => {
    expect(campaignListHref("c1", { tab: "rounds" })).toBe(campaignHref("c1"));
  });

  it("names any other tab", () => {
    expect(campaignListHref("c1", { tab: "leaders" })).toBe(
      "/dashboard/campaigns/c1?tab=leaders"
    );
  });

  it("carries both pagers across a tab switch, so places are kept", () => {
    expect(
      campaignListHref("c1", { tab: "metadata", page: 3, submissions: 2 })
    ).toBe("/dashboard/campaigns/c1?tab=metadata&page=3&submissions=2");
  });
});

describe("clampedCampaignListHref tabs", () => {
  it("keeps you on the tab it redirects you from", () => {
    expect(
      clampedCampaignListHref(
        "c1",
        { page: 9, submissions: 1, tab: "leaders" },
        { pageSize: 10, roundsTotal: 12, submissionsTotal: 4 }
      )
    ).toBe(campaignListHref("c1", { page: 2, tab: "leaders" }));
  });
});
