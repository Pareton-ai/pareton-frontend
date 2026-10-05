"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { formatUtc } from "@/lib/api/format";
import type { PatchAvailability } from "@/lib/api/patch-availability";
import { startPatchRevealRefresh } from "./patch-reveal-schedule";

export function PatchArtifact({
  campaignId,
  patchHash,
  initial,
}: {
  campaignId: string;
  patchHash: string;
  initial: PatchAvailability;
}) {
  const [patch, setPatch] = useState(initial);
  const [retrying, setRetrying] = useState(false);
  const { mode, url, downloadable, revealAt } = patch;

  useEffect(() => {
    let request: AbortController | null = null;
    const refresh = async () => {
      if (request) return;
      const controller = new AbortController();
      request = controller;
      const showRetryStatus = () => {
        const deadline = Date.parse(revealAt ?? "");
        setRetrying(
          mode !== "private" &&
            (!Number.isFinite(deadline) || Date.now() >= deadline)
        );
      };
      // Let the proxy's 60-second publication request finish before aborting.
      const timeout = setTimeout(() => {
        showRetryStatus();
        controller.abort();
      }, 65_000);
      try {
        const response = await fetch(
          `/api/campaigns/${encodeURIComponent(campaignId)}/submissions/${encodeURIComponent(patchHash)}/patch`,
          { cache: "no-store", signal: controller.signal }
        );
        if (!response.ok) throw new Error("Patch availability unavailable");
        const next: PatchAvailability = await response.json();
        if (!controller.signal.aborted) {
          setPatch(next);
          setRetrying(false);
        }
      } catch {
        if (!controller.signal.aborted) showRetryStatus();
      } finally {
        clearTimeout(timeout);
        request = null;
      }
    };
    // Private campaigns do not poll. Recheck once on tab return in case an
    // operator changed policy. Public campaigns also track policy/deadline edits.
    const onVisible = () => {
      if (!document.hidden) void refresh();
    };
    if (mode === "private")
      document.addEventListener("visibilitychange", onVisible);
    const stop = startPatchRevealRefresh(
      {
        enabled: mode === "public_after_reveal",
        refreshAt: mode === "private" ? null : revealAt,
      },
      15_000,
      () => {
        void refresh();
      }
    );
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisible);
      request?.abort();
    };
  }, [campaignId, patchHash, mode, revealAt]);

  if (mode === "private") {
    return (
      <span className="text-muted" role="status">
        Private for this campaign
      </span>
    );
  }
  if (url && downloadable) {
    return (
      <a
        href={url}
        rel="noreferrer nofollow"
        target="_blank"
        className="inline-flex items-center gap-1.5 text-secondary underline decoration-border underline-offset-4 transition-colors hover:text-foreground"
      >
        <Download className="size-3 shrink-0" aria-hidden />
        Download diff
      </a>
    );
  }
  return (
    <span className="text-muted" role="status">
      {retrying ? (
        "Download temporarily unavailable. Retrying…"
      ) : revealAt && Number.isFinite(Date.parse(revealAt)) ? (
        <>
          Available from <time dateTime={revealAt}>{formatUtc(revealAt)}</time>
        </>
      ) : (
        "Awaiting finalized evaluation"
      )}
    </span>
  );
}
