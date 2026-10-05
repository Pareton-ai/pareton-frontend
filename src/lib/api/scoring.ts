/** Scheduling descriptions apply only to the pinned v5 contract. */
export function tierGrouping(concurrency: number | null | undefined): string {
  if (concurrency === 32) return "All four tiers overlap";
  if (concurrency === 16) return "2k + 4k together, then 8k + 16k";
  if (concurrency != null && [1, 2, 4, 8].includes(concurrency)) {
    return "2k, 4k, 8k, then 16k; one tier at a time";
  }
  return "Grouping unavailable";
}

export function isWeightedTierRule(rule: { name?: unknown }): boolean {
  return rule.name === "weighted_tier_completion_speedup";
}

export type ConcurrencyObservation = {
  rep: number;
  group_start_offset_ms: number;
  requested_concurrency: number;
  effective_concurrency: number;
  observed_peak: number;
  time_weighted_mean: number;
};

export function readConcurrencyObservations(
  sla: Record<string, unknown> | null
): ConcurrencyObservation[] {
  const rows = sla?.concurrency_observations;
  if (!Array.isArray(rows)) return [];
  const keys = [
    "rep",
    "group_start_offset_ms",
    "requested_concurrency",
    "effective_concurrency",
    "observed_peak",
    "time_weighted_mean",
  ] as const;
  return rows.flatMap((row) => {
    if (
      row === null ||
      typeof row !== "object" ||
      keys.some(
        (key) =>
          typeof row[key] !== "number" ||
          !Number.isFinite(row[key]) ||
          row[key] < 0
      )
    )
      return [];
    return [
      Object.fromEntries(
        keys.map((key) => [key, row[key]])
      ) as ConcurrencyObservation,
    ];
  });
}
