/** Optional report diagnostics. Older reports deliberately return no rows. */
function rows(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter(
        (v): v is Record<string, unknown> =>
          !!v && typeof v === "object" && !Array.isArray(v)
      )
    : [];
}
function number(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
export function readSampling(value: unknown) {
  return rows(value).flatMap((row) => {
    const rep = number(row.rep);
    const temperature = number(row.temperature);
    const seed = number(row.seed);
    const topP = number(row.top_p);
    if (
      typeof row.request_id !== "string" ||
      rep === null ||
      !Number.isInteger(rep) ||
      rep < 1 ||
      temperature === null ||
      seed === null ||
      !Number.isInteger(seed) ||
      topP === null
    )
      return [];
    return [{ requestId: row.request_id, rep, temperature, seed, topP }];
  });
}
export function readRepetitionChecks(value: unknown) {
  return rows(value).flatMap((row) => {
    if (typeof row.request_id !== "string") return [];
    const diagnostic =
      Array.isArray(row.degeneracy_exemptions) &&
      row.degeneracy_exemptions.includes("forced_tail_diagnostic_only");
    const reason = typeof row.degenerate === "string" ? row.degenerate : null;
    return [
      {
        requestId: row.request_id,
        distinct: number(row.distinct_ngram_ratio),
        baseline: number(row.baseline_distinct_ngram_ratio),
        drop: number(row.distinct_ngram_ratio_drop),
        limit: number(row.max_distinct_ngram_ratio_drop),
        status:
          row.dropped === true
            ? "Excluded"
            : reason
              ? "Failed"
              : diagnostic
                ? "Tail diagnostic only"
                : row.degenerate === null
                  ? "Passed"
                  : "Not recorded",
        reason: typeof row.drop_reason === "string" ? row.drop_reason : reason,
      },
    ];
  });
}
