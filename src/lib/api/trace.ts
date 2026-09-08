/**
 * Per-request timings from an entry's SLA replay.
 *
 * `sla.timings` maps request id to what the harness recorded for that prompt:
 * time to first token, the gap before each token after it, and how many tokens
 * came out. It stays `Record<string, unknown>` on the domain model because the
 * surrounding blob varies per campaign profile, so it is narrowed here instead.
 *
 * Pure (no server-only / I/O) so tests can call it.
 */

export type EngineTiming = {
  requestId: string;
  ttftS: number;
  completionTokens: number;
  /** Inter-token gaps actually recorded. Normally `completionTokens - 1`. */
  gapCount: number;
  /** ttft plus every recorded gap: this request's wall time end to end. */
  totalS: number;
  /**
   * The longest single gap. Reported instead of a median because the median
   * gap on a healthy run is microseconds (tokens arrive in batches) while the
   * occasional stall is milliseconds, so the median describes the client and
   * the maximum describes the engine.
   */
  maxItlS: number | null;
  /**
   * Fewer gaps than tokens, meaning the stream arrived in batches rather than
   * token by token. The per-token numbers on such a row are not a real
   * measurement, and the harness rejects an engine that does it.
   */
  coalesced: boolean;
};

function finiteNumbers(value: unknown): number[] {
  return Array.isArray(value)
    ? value.filter(
        (item): item is number =>
          typeof item === "number" && Number.isFinite(item)
      )
    : [];
}

/**
 * Read every request's timings out of an SLA blob, in request id order.
 *
 * Returns an empty list for a blob that carries no usable `timings`, which
 * covers an entry that never ran as well as an older report.
 */
export function readEngineTimings(
  sla: Record<string, unknown> | null | undefined
): EngineTiming[] {
  const timings = sla?.timings;
  if (timings === null || typeof timings !== "object") return [];

  const out: EngineTiming[] = [];
  for (const [requestId, raw] of Object.entries(
    timings as Record<string, unknown>
  )) {
    if (raw === null || typeof raw !== "object") continue;
    const row = raw as Record<string, unknown>;

    const ttftS = typeof row.ttft_s === "number" ? row.ttft_s : null;
    if (ttftS === null || !Number.isFinite(ttftS)) continue;

    const gaps = finiteNumbers(row.itl_s);
    const completionTokens =
      typeof row.completion_tokens === "number" ? row.completion_tokens : 0;

    out.push({
      requestId,
      ttftS,
      completionTokens,
      gapCount: gaps.length,
      totalS: gaps.reduce((sum, gap) => sum + gap, ttftS),
      maxItlS: gaps.length > 0 ? Math.max(...gaps) : null,
      // One gap per token after the first. A shorter array means tokens
      // arrived together, so the gaps do not describe per-token latency.
      coalesced: completionTokens > 1 && gaps.length < completionTokens - 1,
    });
  }

  return out.sort((a, b) => a.requestId.localeCompare(b.requestId));
}
