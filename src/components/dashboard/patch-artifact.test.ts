import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PatchArtifact, type PatchAvailability } from "./patch-artifact";

// Drive effects and re-render state in Node without introducing a DOM dependency.
const hooks = vi.hoisted(() => ({
  state: [] as unknown[],
  index: 0,
  effect: undefined as (() => void | (() => void)) | undefined,
}));

vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react")>()),
  useState: (initial: unknown) => {
    const index = hooks.index++;
    if (!(index in hooks.state)) hooks.state[index] = initial;
    return [
      hooks.state[index],
      (next: unknown) => {
        hooks.state[index] = next;
      },
    ];
  },
  useEffect: (effect: () => void | (() => void)) => {
    hooks.effect = effect;
  },
}));

const DAY = 86_400_000;
let page: EventTarget & { hidden: boolean };
let cleanup: (() => void) | void;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-07T12:00:00Z"));
  hooks.state = [];
  hooks.index = 0;
  hooks.effect = undefined;
  page = Object.assign(new EventTarget(), { hidden: false });
  vi.stubGlobal("document", page);
});

afterEach(() => {
  cleanup?.();
  cleanup = undefined;
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function render(initial: PatchAvailability) {
  hooks.index = 0;
  return renderToStaticMarkup(
    createElement(PatchArtifact, {
      campaignId: "campaign",
      patchHash: "patch",
      initial,
    })
  );
}

describe("patch availability failure status", () => {
  it.each(["HTTP error", "timeout"])(
    "keeps the deadline after a pre-reveal %s, then shows retries after reveal",
    async (failure) => {
      const failureDelay = failure === "timeout" ? 65_000 : 0;
      const initial: PatchAvailability = {
        url: "",
        downloadable: false,
        revealAt: new Date(Date.now() + DAY).toISOString(),
        awaitingRevealTime: false,
      };
      const fetch = vi.fn((_url: string, options: RequestInit) => {
        if (failure === "HTTP error") {
          return Promise.resolve({ ok: false });
        }
        return new Promise((_resolve, reject) => {
          options.signal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        });
      });
      vi.stubGlobal("fetch", fetch);
      const scheduledMarkup = render(initial);
      expect(scheduledMarkup).toContain("Available from");
      cleanup = hooks.effect?.();

      page.hidden = true;
      page.dispatchEvent(new Event("visibilitychange"));
      page.hidden = false;
      page.dispatchEvent(new Event("visibilitychange"));
      await vi.advanceTimersByTimeAsync(failureDelay);
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(render(initial)).toBe(scheduledMarkup);

      await vi.advanceTimersByTimeAsync(DAY - failureDelay - 1);
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(render(initial)).toBe(scheduledMarkup);

      await vi.advanceTimersByTimeAsync(1 + failureDelay);
      expect(fetch).toHaveBeenCalledTimes(2);
      expect(render(initial)).toContain(
        "Download temporarily unavailable. Retrying…"
      );
      await vi.advanceTimersByTimeAsync(15_000 - (failureDelay % 15_000));
      expect(fetch).toHaveBeenCalledTimes(3);
    }
  );

  it("waits for slow publication without aborting or overlapping requests", async () => {
    const initial: PatchAvailability = {
      url: "",
      downloadable: false,
      revealAt: new Date(Date.now() - 1).toISOString(),
      awaitingRevealTime: false,
    };
    let signal: AbortSignal | null | undefined;
    const fetch = vi.fn((_url: string, options: RequestInit) => {
      signal = options.signal;
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            ok: true,
            json: async () => ({
              ...initial,
              url: "https://artifacts.example/public.diff",
              downloadable: true,
            }),
          });
        }, 55_000);
      });
    });
    vi.stubGlobal("fetch", fetch);
    render(initial);
    cleanup = hooks.effect?.();

    await vi.advanceTimersByTimeAsync(54_999);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(signal?.aborted).toBe(false);
    expect(render(initial)).not.toContain("Retrying");

    await vi.advanceTimersByTimeAsync(1);
    expect(signal?.aborted).toBe(false);
    expect(render(initial)).toContain("Download diff");
  });
});
