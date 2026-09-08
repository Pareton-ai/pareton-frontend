import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { startPatchRevealRefresh } from "./patch-reveal-schedule";

const INTERVAL = 15_000;
const DAY = 86_400_000;
let page: EventTarget & { hidden: boolean };
let stop: (() => void) | undefined;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-07T12:00:00Z"));
  page = Object.assign(new EventTarget(), { hidden: false });
  vi.stubGlobal("document", page);
});

afterEach(() => {
  stop?.();
  stop = undefined;
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function visible(value: boolean) {
  page.hidden = !value;
  page.dispatchEvent(new Event("visibilitychange"));
}

describe("patch download refresh scheduling", () => {
  it("waits two days without polling, then retries until the URL arrives", () => {
    const refresh = vi.fn();
    stop = startPatchRevealRefresh(
      {
        enabled: false,
        refreshAt: new Date(Date.now() + 2 * DAY).toISOString(),
      },
      INTERVAL,
      refresh
    );
    vi.advanceTimersByTime(2 * DAY - 1);
    expect(refresh).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(refresh).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(INTERVAL);
    expect(refresh).toHaveBeenCalledTimes(2);

    // The next availability response supplies a public URL and clears the schedule.
    stop();
    stop = startPatchRevealRefresh({ enabled: false }, INTERVAL, refresh);
    vi.advanceTimersByTime(DAY);
    visible(true);
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it("refreshes immediately when mounting with an elapsed deadline", () => {
    const refresh = vi.fn();
    stop = startPatchRevealRefresh(
      { enabled: false, refreshAt: new Date(Date.now() - 1).toISOString() },
      INTERVAL,
      refresh
    );
    expect(refresh).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(INTERVAL - 1);
    expect(refresh).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1);
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it("resumes after a tab sleeps through its deadline", () => {
    const refresh = vi.fn();
    stop = startPatchRevealRefresh(
      { enabled: false, refreshAt: new Date(Date.now() + DAY).toISOString() },
      INTERVAL,
      refresh
    );
    visible(false);
    vi.advanceTimersByTime(2 * DAY);
    expect(refresh).not.toHaveBeenCalled();
    visible(true);
    expect(refresh).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(INTERVAL);
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it("re-reads on tab return before the deadline, then resumes waiting", () => {
    const refresh = vi.fn();
    stop = startPatchRevealRefresh(
      { enabled: false, refreshAt: new Date(Date.now() + DAY).toISOString() },
      INTERVAL,
      refresh
    );
    visible(false);
    vi.advanceTimersByTime(1_000);
    visible(true);
    expect(refresh).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(DAY - 1_001);
    expect(refresh).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1);
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it("supports deadlines beyond the browser's maximum timeout", () => {
    const refresh = vi.fn();
    stop = startPatchRevealRefresh(
      {
        enabled: false,
        refreshAt: new Date(Date.now() + 30 * DAY).toISOString(),
      },
      INTERVAL,
      refresh
    );
    vi.advanceTimersByTime(30 * DAY - 1);
    expect(refresh).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it.each([null, "", "invalid"])(
    "does not poll a settled page with deadline %s",
    (refreshAt) => {
      const refresh = vi.fn();
      stop = startPatchRevealRefresh(
        { enabled: false, refreshAt },
        INTERVAL,
        refresh
      );
      vi.advanceTimersByTime(DAY);
      visible(true);
      expect(refresh).not.toHaveBeenCalled();
    }
  );

  it("keeps the live cadence and pauses it while hidden", () => {
    const refresh = vi.fn();
    stop = startPatchRevealRefresh({ enabled: true }, INTERVAL, refresh);
    vi.advanceTimersByTime(INTERVAL);
    expect(refresh).toHaveBeenCalledTimes(1);
    visible(false);
    vi.advanceTimersByTime(DAY);
    expect(refresh).toHaveBeenCalledTimes(1);
    visible(true);
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it("refreshes at a reveal deadline between regular live polls", () => {
    const refresh = vi.fn();
    stop = startPatchRevealRefresh(
      { enabled: true, refreshAt: new Date(Date.now() + 20_000).toISOString() },
      INTERVAL,
      refresh
    );
    vi.advanceTimersByTime(15_000);
    expect(refresh).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(5_000);
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it("cancels an old deadline when the API supplies a different one", () => {
    const refresh = vi.fn();
    stop = startPatchRevealRefresh(
      { enabled: false, refreshAt: new Date(Date.now() + DAY).toISOString() },
      INTERVAL,
      refresh
    );
    stop();
    stop = startPatchRevealRefresh(
      {
        enabled: false,
        refreshAt: new Date(Date.now() + 2 * DAY).toISOString(),
      },
      INTERVAL,
      refresh
    );
    vi.advanceTimersByTime(DAY);
    expect(refresh).not.toHaveBeenCalled();
    vi.advanceTimersByTime(DAY);
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
