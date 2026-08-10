"use client";

import { useEffect, useRef, useState } from "react";

const POLL_INTERVAL_MS = 15_000;
const TAIL_LINES = 400;

type LogState =
  | { kind: "loading" }
  | { kind: "empty" }
  | { kind: "error"; message: string }
  | { kind: "ready"; text: string };

type BuildLogResponse = {
  available?: boolean;
  text?: string;
  error?: string;
};

/**
 * Tail of the durable build log.
 *
 * Builds run for over an hour, so this polls while the submission is still
 * moving. Terminal submissions fetch once. The request goes to our own route
 * handler, which proxies the API host server-side.
 */
export function BuildLog({
  patchHash,
  live,
}: {
  patchHash: string;
  live: boolean;
}) {
  const [state, setState] = useState<LogState>({ kind: "loading" });
  const [paused, setPaused] = useState(false);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const preRef = useRef<HTMLPreElement>(null);
  const pinnedToBottom = useRef(true);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        const response = await fetch(
          `/api/submissions/${encodeURIComponent(patchHash)}/build-log?tail=${TAIL_LINES}`,
          { signal: controller.signal, cache: "no-store" }
        );
        const body = (await response.json()) as BuildLogResponse;

        if (!response.ok) {
          setState({
            kind: "error",
            message: body.error ?? "Could not load the build log.",
          });
        } else if (!body.available || !body.text?.trim()) {
          setState({ kind: "empty" });
        } else {
          setState({ kind: "ready", text: body.text.trimEnd() });
        }
      } catch {
        if (controller.signal.aborted) return;
        setState({ kind: "error", message: "Could not load the build log." });
      }
    }

    void load();

    const intervalId =
      live && !paused
        ? window.setInterval(() => void load(), POLL_INTERVAL_MS)
        : undefined;

    return () => {
      controller.abort();
      if (intervalId !== undefined) window.clearInterval(intervalId);
    };
  }, [patchHash, live, paused, refreshNonce]);

  // Follow the tail only while the reader has not scrolled up to read history.
  useEffect(() => {
    const node = preRef.current;
    if (node && pinnedToBottom.current) {
      node.scrollTop = node.scrollHeight;
    }
  }, [state]);

  function onScroll() {
    const node = preRef.current;
    if (!node) return;
    const distance = node.scrollHeight - node.scrollTop - node.clientHeight;
    pinnedToBottom.current = distance < 40;
  }

  const lineCount =
    state.kind === "ready" ? state.text.split("\n").length : null;

  return (
    <section aria-label="Build log" className="border border-border">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-border px-5 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <h2 className="font-mono text-body-sm uppercase tracking-caps text-muted">
            Build log
          </h2>
          {live ? (
            <span className="inline-flex items-center gap-2 font-mono text-caption uppercase tracking-caps text-accent">
              <span
                aria-hidden
                className={`size-1.5 bg-accent ${paused ? "" : "motion-safe:animate-pulse"}`}
              />
              {paused ? "Paused" : "Live"}
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-6">
          {lineCount !== null ? (
            <p className="font-mono text-caption text-muted">
              last {lineCount} line{lineCount === 1 ? "" : "s"}
            </p>
          ) : null}
          {live ? (
            <button
              type="button"
              onClick={() => setPaused((value) => !value)}
              className="font-mono text-caption uppercase tracking-caps text-muted transition-colors hover:text-foreground"
            >
              {paused ? "Resume" : "Pause"}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setRefreshNonce((value) => value + 1)}
            className="font-mono text-caption uppercase tracking-caps text-accent transition-colors hover:text-foreground"
          >
            Refresh
          </button>
        </div>
      </div>

      {state.kind === "loading" ? (
        <div
          className="h-48 animate-pulse bg-border/10"
          aria-label="Loading build log"
        />
      ) : null}

      {state.kind === "empty" ? (
        <p className="px-5 py-10 text-center text-body-lg leading-relaxed text-muted sm:px-6">
          No build output yet. The log appears once the hermetic image build
          starts.
        </p>
      ) : null}

      {state.kind === "error" ? (
        <p className="px-5 py-10 text-center text-body-lg leading-relaxed text-rust sm:px-6">
          {state.message}
        </p>
      ) : null}

      {state.kind === "ready" ? (
        <pre
          ref={preRef}
          onScroll={onScroll}
          tabIndex={0}
          aria-label="Build log output"
          className="max-h-96 overflow-auto bg-border/10 px-5 py-4 font-mono text-caption leading-relaxed text-secondary sm:px-6"
        >
          {state.text}
        </pre>
      ) : null}
    </section>
  );
}
