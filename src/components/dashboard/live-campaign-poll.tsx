"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

/**
 * Rounds can void in under 10s (pod provision failed). One minute was the
 * cadence for pipeline chips before the rounds table existed.
 */
export const CAMPAIGN_POLL_INTERVAL_MS = 5_000;

const SetLivePollEnabledContext = createContext<
  ((enabled: boolean) => void) | null
>(null);

/**
 * Host that owns the soft-refresh interval for the campaign detail page.
 *
 * Mount this outside the `CampaignBody` Suspense tree so a transient API
 * failure (which swaps the RSC body for `SectionUnavailable`) cannot unmount
 * the poller and permanently stop live updates.
 */
export function LiveCampaignPollHost({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    let intervalId: number | undefined;

    const refresh = () => router.refresh();

    const startInterval = () => {
      if (document.hidden) return;
      intervalId = window.setInterval(refresh, CAMPAIGN_POLL_INTERVAL_MS);
    };

    const onVisibility = () => {
      if (intervalId !== undefined) {
        window.clearInterval(intervalId);
        intervalId = undefined;
      }
      if (document.hidden) return;
      refresh();
      startInterval();
    };

    startInterval();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      if (intervalId !== undefined) window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [enabled, router]);

  return (
    <SetLivePollEnabledContext.Provider value={setEnabled}>
      {children}
    </SetLivePollEnabledContext.Provider>
  );
}

/**
 * Report whether this campaign page still has live work.
 *
 * Does not clear on unmount: when a refresh hits a transient failure the
 * signal may disappear with the success tree, and the host must keep the
 * last known poll state. Only an explicit `enabled={false}` after a
 * successful settled render on a draft or closed campaign stops polling.
 */
export function LiveCampaignPoll({ enabled }: { enabled: boolean }) {
  const setEnabled = useContext(SetLivePollEnabledContext);

  useEffect(() => {
    setEnabled?.(enabled);
  }, [enabled, setEnabled]);

  return null;
}
