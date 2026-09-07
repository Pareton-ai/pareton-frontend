import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";
import { getSubmission } from "@/lib/api/endpoints";
import { ApiError } from "@/lib/api/errors";
import { parseSubmissionDetail } from "@/lib/api/parse";
import { DEFAULT_ARTIFACT_BASE_URL } from "@/lib/api/artifacts";

vi.mock("@/lib/api/endpoints", () => ({ getSubmission: vi.fn() }));
const hash = `sha256:${"a".repeat(64)}`;
const revealAt = "2026-09-09T12:00:00Z";
const publicUrl = `${DEFAULT_ARTIFACT_BASE_URL}/stage0/campaigns/campaign/public.diff`;

function request(patchHash = encodeURIComponent(hash)) {
  return GET(new Request("http://localhost/api/patch"), {
    params: Promise.resolve({ id: "campaign", patch_hash: patchHash }),
  });
}

function fixture(url = "", deadline: string | null = revealAt) {
  return parseSubmissionDetail({
    submission: {
      campaign_id: "campaign",
      retrieval_url: url,
      patch_reveal_at: deadline,
    },
    latest_state: "scored",
    round: { round_id: "round", status: "scored" },
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("PARETON_ARTIFACT_BASE_URL", DEFAULT_ARTIFACT_BASE_URL);
});

describe("patch availability proxy", () => {
  it("returns a withheld URL and the backend deadline without caching", async () => {
    vi.mocked(getSubmission).mockResolvedValue(fixture());
    const response = await request();
    expect(getSubmission).toHaveBeenCalledWith("campaign", hash, {
      timeoutMs: 60_000,
    });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({
      url: "",
      revealAt,
      downloadable: false,
      awaitingRevealTime: false,
    });
  });

  it("signals a measured entry awaiting its round's reveal timestamp", async () => {
    vi.mocked(getSubmission).mockResolvedValue(fixture("", null));
    expect(await (await request()).json()).toMatchObject({
      awaitingRevealTime: true,
    });
  });

  it("returns the permanent URL only after the API provides it", async () => {
    vi.mocked(getSubmission).mockResolvedValue(fixture(publicUrl));
    expect(await (await request()).json()).toEqual({
      url: publicUrl,
      revealAt,
      downloadable: true,
      awaitingRevealTime: false,
    });
  });

  it("keeps legacy URLs compatible and rejects foreign artifact hosts", async () => {
    vi.mocked(getSubmission).mockResolvedValue(fixture(publicUrl, null));
    expect(await (await request()).json()).toMatchObject({
      downloadable: true,
      revealAt: null,
    });
    vi.mocked(getSubmission).mockResolvedValue(
      fixture("https://foreign.example/patch.diff")
    );
    expect(await (await request()).json()).toMatchObject({
      downloadable: false,
    });
  });

  it("keeps a publication failure retryable and does not expose diagnostics", async () => {
    vi.mocked(getSubmission).mockRejectedValue(
      new ApiError({
        status: 503,
        path: "/submission",
        detail: "private source locator",
      })
    );
    const response = await request();
    expect(response.status).toBe(503);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.text()).not.toContain("private source locator");
  });

  it("rejects invalid hashes before making API calls", async () => {
    expect((await request("invalid")).status).toBe(404);
    expect(getSubmission).not.toHaveBeenCalled();
  });

  it("rejects a submission belonging to another campaign", async () => {
    const detail = fixture(publicUrl);
    detail.submission.campaign_id = "different";
    vi.mocked(getSubmission).mockResolvedValue(detail);
    expect((await request()).status).toBe(404);
  });
});
