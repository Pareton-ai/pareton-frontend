"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { formatUtc, truncateMiddle } from "@/lib/api/format";
import { startPatchRevealRefresh } from "./patch-reveal-schedule";

export type PatchAvailability = {
  url: string;
  downloadable: boolean;
  revealAt: string | null;
  awaitingRevealTime: boolean;
};

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
  const { url, downloadable, revealAt, awaitingRevealTime } = patch;

  useEffect(() => {
    if (url) return;
    let request: AbortController | null = null;
    const stop = startPatchRevealRefresh(
      { enabled: awaitingRevealTime, refreshAt: revealAt },
      15_000,
      async () => {
        if (request) return;
        const controller = new AbortController();
        request = controller;
        const timeout = setTimeout(() => {
          setRetrying(true);
          controller.abort();
        }, 12_000);
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
          if (!controller.signal.aborted) setRetrying(true);
        } finally {
          clearTimeout(timeout);
          request = null;
        }
      }
    );
    return () => {
      stop();
      request?.abort();
    };
  }, [campaignId, patchHash, url, revealAt, awaitingRevealTime]);

  if (!url) {
    return (
      <span className="text-muted" role="status">
        {retrying ? (
          "Download temporarily unavailable. Retrying…"
        ) : revealAt && Number.isFinite(Date.parse(revealAt)) ? (
          <>
            Available from{" "}
            <time dateTime={revealAt}>{formatUtc(revealAt)}</time>
          </>
        ) : (
          "Not available yet"
        )}
      </span>
    );
  }
  if (!downloadable) {
    return (
      <span className="break-all text-muted" title={url}>
        {truncateMiddle(url, 20, 12)}
      </span>
    );
  }
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
