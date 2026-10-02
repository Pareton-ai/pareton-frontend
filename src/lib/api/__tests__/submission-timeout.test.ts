import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getSubmission, getSubmissionPatchAvailability } from "../endpoints";

vi.mock("server-only", () => ({}));

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubEnv("PARETON_USE_MOCKS", "0");
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("submission request timeout", () => {
  it("allows publication to finish after the ordinary API timeout", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((_url: string, options: RequestInit) => {
        return new Promise((resolve, reject) => {
          options.signal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
          setTimeout(() => {
            resolve(
              Response.json({
                submission: {
                  campaign_id: "campaign",
                  retrieval_url: "https://artifacts.example/public.diff",
                },
              })
            );
          }, 55_000);
        });
      })
    );
    const result = getSubmissionPatchAvailability("campaign", "sha256:patch");
    const assertion = expect(result).resolves.toMatchObject({
      retrieval_url: "https://artifacts.example/public.diff",
    });
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining(
        "/v1/campaigns/campaign/submissions/sha256%3Apatch/patch-availability"
      ),
      expect.objectContaining({
        next: expect.objectContaining({ revalidate: 0 }),
      })
    );
    await vi.advanceTimersByTimeAsync(55_000);
    await assertion;
  });

  it.each([10_000, 60_000])(
    "still aborts stalled metadata/availability requests after %s ms",
    async (timeoutMs) => {
      let signal: AbortSignal | null | undefined;
      vi.stubGlobal(
        "fetch",
        vi.fn((_url: string, options: RequestInit) => {
          signal = options.signal;
          return new Promise((_resolve, reject) => {
            signal?.addEventListener("abort", () => {
              reject(new DOMException("Aborted", "AbortError"));
            });
          });
        })
      );
      const result =
        timeoutMs === 60_000
          ? getSubmissionPatchAvailability("campaign", "patch")
          : getSubmission("campaign", "patch");
      const assertion = expect(result).rejects.toMatchObject({ status: 408 });
      await vi.advanceTimersByTimeAsync(timeoutMs - 1);
      expect(signal?.aborted).toBe(false);
      await vi.advanceTimersByTimeAsync(1);
      await assertion;
      expect(signal?.aborted).toBe(true);
    }
  );
});
