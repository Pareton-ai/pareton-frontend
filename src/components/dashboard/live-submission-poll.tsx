"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Matches the build-log poll cadence so the page and log stay in sync. */
const POLL_INTERVAL_MS = 15_000;

/**
 * Soft-refresh the submission detail RSC tree while the pipeline is live.
 *
 * Stops when `enabled` flips false (terminal `latest_state` after a refresh),
 * so a tab left open through completion does not keep hitting the API.
 */
export function LiveSubmissionPoll({ enabled }: { enabled: boolean }) {
  const router = useRouter();

  useEffect(() => {
    if (!enabled) return;

    const id = window.setInterval(() => {
      router.refresh();
    }, POLL_INTERVAL_MS);

    return () => window.clearInterval(id);
  }, [enabled, router]);

  return null;
}
