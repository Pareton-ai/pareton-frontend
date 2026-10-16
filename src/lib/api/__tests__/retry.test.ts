import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getCampaigns } from "../endpoints";
import { ApiError } from "../errors";

vi.mock("server-only", () => ({}));

function reply(status: number) {
  return status === 200
    ? Response.json({ campaigns: [] })
    : Response.json({ detail: "database connection failed" }, { status });
}

/** `fetch` that answers with each status in turn. */
function stubFetch(...statuses: number[]) {
  const fetchMock = vi.fn(async () => reply(statuses.shift() ?? 200));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubEnv("PARETON_USE_MOCKS", "0");
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("transient API errors", () => {
  it("retries a momentary 503 and returns the data", async () => {
    const fetchMock = stubFetch(503, 200);
    const result = getCampaigns({ status: "open" });
    await vi.runAllTimersAsync();

    await expect(result).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("gives up after one retry", async () => {
    const fetchMock = stubFetch(503, 503, 200);
    const result = getCampaigns({ status: "open" });
    const assertion = expect(result).rejects.toMatchObject({ status: 503 });
    await vi.runAllTimersAsync();

    await assertion;
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it.each([404, 422, 500])("does not retry a %i", async (status) => {
    const fetchMock = stubFetch(status, 200);
    const result = getCampaigns({ status: "open" });
    const assertion = expect(result).rejects.toBeInstanceOf(ApiError);
    await vi.runAllTimersAsync();

    await assertion;
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
