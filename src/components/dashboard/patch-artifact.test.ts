import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PatchArtifact } from "./patch-artifact";
import type { PatchAvailability } from "@/lib/api/patch-availability";

const hooks = vi.hoisted(() => ({
  state: [] as unknown[],
  index: 0,
  effect: undefined as (() => void | (() => void)) | undefined,
}));
vi.mock("react", async (original) => ({
  ...(await original<typeof import("react")>()),
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
let page: EventTarget & { hidden: boolean };
let cleanup: (() => void) | void;
const publicPatch: PatchAvailability = {
  mode: "public_after_reveal",
  url: "",
  downloadable: false,
  revealAt: null,
};
const privatePatch: PatchAvailability = { ...publicPatch, mode: "private" };
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-02T12:00:00Z"));
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
function mount() {
  cleanup?.();
  cleanup = hooks.effect?.();
}

describe("patch artifact control", () => {
  it("shows private status, hides stale URLs and never polls", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    expect(
      render({
        ...privatePatch,
        url: "https://example.com/old",
        downloadable: true,
      })
    ).toContain("Private for this campaign");
    expect(render(privatePatch)).not.toContain("href=");
    mount();
    await vi.advanceTimersByTimeAsync(86400000);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("rechecks private policy once when returning to the tab", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => publicPatch });
    vi.stubGlobal("fetch", fetch);
    render(privatePatch);
    mount();
    page.dispatchEvent(new Event("visibilitychange"));
    await vi.advanceTimersByTimeAsync(0);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(render(privatePatch)).toContain("Awaiting finalized evaluation");
    mount();
    await vi.advanceTimersByTimeAsync(15000);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it("waits for evaluation and then displays the backend timestamp", async () => {
    const next = { ...publicPatch, revealAt: "2026-10-04T12:00:00Z" };
    const fetch = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => next });
    vi.stubGlobal("fetch", fetch);
    expect(render(publicPatch)).toContain("Awaiting finalized evaluation");
    mount();
    await vi.advanceTimersByTimeAsync(15000);
    expect(render(publicPatch)).toContain("Available from");
    expect(fetch.mock.calls[0][1].cache).toBe("no-store");
  });
  it("keeps the scheduled date on a pre-reveal error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    const initial = { ...publicPatch, revealAt: "2026-10-04T12:00:00Z" };
    render(initial);
    mount();
    await vi.advanceTimersByTimeAsync(15000);
    expect(render(initial)).toContain("Available from");
    expect(render(initial)).not.toContain("Retrying");
  });
  it("shows retries after reveal without fabricating a link", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    const initial = { ...publicPatch, revealAt: "2026-10-01T12:00:00Z" };
    render(initial);
    mount();
    await vi.advanceTimersByTimeAsync(0);
    expect(render(initial)).toContain("Retrying");
    expect(render(initial)).not.toContain("href=");
  });
  it("allows slow publication without overlapping requests", async () => {
    let signal: AbortSignal | undefined;
    const fetch = vi.fn((_url, options) => {
      signal = options.signal;
      return new Promise((resolve) => {
        setTimeout(
          () =>
            resolve({
              ok: true,
              json: async () => ({
                ...publicPatch,
                url: "https://example.com/public.diff",
                downloadable: true,
              }),
            }),
          55000
        );
      });
    });
    vi.stubGlobal("fetch", fetch);
    const initial = { ...publicPatch, revealAt: "2026-10-01T12:00:00Z" };
    render(initial);
    mount();
    await vi.advanceTimersByTimeAsync(54999);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(signal?.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(render(initial)).toContain("Download diff");
  });
  it("aborts hung publication and retries without overlapping", async () => {
    const fetch = vi.fn(
      (_url, options) =>
        new Promise((_resolve, reject) => {
          options.signal.addEventListener("abort", () =>
            reject(new DOMException("Aborted", "AbortError"))
          );
        })
    );
    vi.stubGlobal("fetch", fetch);
    const initial = { ...publicPatch, revealAt: "2026-10-01T12:00:00Z" };
    render(initial);
    mount();
    await vi.advanceTimersByTimeAsync(65000);
    expect(render(initial)).toContain("Retrying");
    expect(fetch).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(10000);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it("removes a previously visible link when policy becomes private", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => privatePatch })
    );
    const initial = {
      ...publicPatch,
      url: "https://example.com/public.diff",
      downloadable: true,
    };
    expect(render(initial)).toContain("Download diff");
    mount();
    await vi.advanceTimersByTimeAsync(15000);
    expect(render(initial)).toContain("Private for this campaign");
    expect(render(initial)).not.toContain("href=");
    mount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
