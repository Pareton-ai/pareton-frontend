"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

/** Matches the build-log poll cadence so the page and log stay in sync. */
const POLL_INTERVAL_MS = 15_000;

const SetLivePollEnabledContext = createContext<
  ((enabled: boolean) => void) | null
>(null);

/**
 * Host that owns the soft-refresh interval for the submission detail page.
 *
 * Mount this outside the `SubmissionSections` Suspense tree so a transient
 * API failure (which swaps the RSC body for `SectionUnavailable`) cannot
 * unmount the poller and permanently stop live updates.
 */
export function LiveSubmissionPollHost({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    const id = window.setInterval(() => {
      router.refresh();
    }, POLL_INTERVAL_MS);

    return () => window.clearInterval(id);
  }, [enabled, router]);

  return (
    <SetLivePollEnabledContext.Provider value={setEnabled}>
      {children}
    </SetLivePollEnabledContext.Provider>
  );
}

/**
 * Report whether the pipeline is still live.
 *
 * Does not clear on unmount: when a refresh hits a transient failure the
 * signal may disappear with the success tree, and the host must keep the
 * last known poll state (same idea as build-log omitting `live` on blips).
 * Only an explicit `enabled={false}` after a successful terminal render stops
 * polling.
 */
export function LiveSubmissionPoll({ enabled }: { enabled: boolean }) {
  const setEnabled = useContext(SetLivePollEnabledContext);

  useEffect(() => {
    setEnabled?.(enabled);
  }, [enabled, setEnabled]);

  return null;
}
