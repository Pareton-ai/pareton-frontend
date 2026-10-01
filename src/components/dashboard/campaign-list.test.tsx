import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCampaigns } from "@/lib/api/endpoints";
import {
  MOCK_ARCHIVED_CAMPAIGN,
  MOCK_CAMPAIGN,
  MOCK_CLOSED_CAMPAIGN,
} from "@/lib/api/mocks";
import { CampaignList } from "./campaign-list";

vi.mock("@/lib/api/endpoints", () => ({
  getCampaigns: vi.fn(),
}));

const mockedGetCampaigns = vi.mocked(getCampaigns);

function detailsTag(html: string, label: string): string {
  const marker = `aria-label="${label}"`;
  const end = html.indexOf(marker);
  expect(end).toBeGreaterThan(-1);
  const start = html.lastIndexOf("<details", end);
  return html.slice(start, html.indexOf(">", end) + 1);
}

async function render(): Promise<string> {
  return renderToStaticMarkup(await CampaignList());
}

beforeEach(() => {
  mockedGetCampaigns.mockReset();
  mockedGetCampaigns.mockImplementation(async (opts) => {
    if (opts?.status === "open") return [MOCK_CAMPAIGN];
    if (opts?.status === "closed") return [MOCK_CLOSED_CAMPAIGN];
    if (opts?.status === "archived") return [MOCK_ARCHIVED_CAMPAIGN];
    return [];
  });
});

describe("CampaignList", () => {
  it("fetches open, closed, and archived once each", async () => {
    await render();
    expect(mockedGetCampaigns).toHaveBeenCalledTimes(3);
    expect(mockedGetCampaigns).toHaveBeenCalledWith({ status: "open" });
    expect(mockedGetCampaigns).toHaveBeenCalledWith({ status: "closed" });
    expect(mockedGetCampaigns).toHaveBeenCalledWith({ status: "archived" });
  });

  it("opens only the Open section by default", async () => {
    const html = await render();
    expect(detailsTag(html, "Open")).toContain("open");
    expect(detailsTag(html, "Closed")).not.toContain("open");
    expect(detailsTag(html, "Archived")).not.toContain("open");
  });

  it("lists the archived campaign under Archived, not Closed", async () => {
    const html = await render();
    const archivedMark = html.indexOf('aria-label="Archived"');
    const closedMark = html.indexOf('aria-label="Closed"');
    expect(archivedMark).toBeGreaterThan(closedMark);
    expect(html.slice(closedMark, archivedMark)).not.toContain(
      MOCK_ARCHIVED_CAMPAIGN.campaign_id
    );
    expect(html.slice(archivedMark)).toContain(
      MOCK_ARCHIVED_CAMPAIGN.campaign_id
    );
  });
});
