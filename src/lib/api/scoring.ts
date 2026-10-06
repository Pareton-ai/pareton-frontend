import { INPUT_TIERS, type InputTier } from "@/lib/api/types";

/** Tiers present on a record, in canonical input order. */
export function selectedTiers(
  record: Partial<Record<InputTier, unknown>>
): InputTier[] {
  return INPUT_TIERS.filter((tier) => record[tier] !== undefined);
}

/**
 * A wire `input_tiers` list: a nonempty subset of the known tiers in canonical
 * order with no duplicates. Anything else is treated as absent.
 */
export function parseInputTiers(value: unknown): InputTier[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  if (value.some((tier) => !(INPUT_TIERS as readonly string[]).includes(tier)))
    return null;
  const ordered = INPUT_TIERS.filter((tier) => value.includes(tier));
  return ordered.length === value.length &&
    ordered.every((tier, i) => tier === value[i])
    ? [...ordered]
    : null;
}

/** Scheduling descriptions apply only to the pinned v5 contract. */
export function tierGrouping(
  concurrency: number | null | undefined,
  tiers: readonly InputTier[] = INPUT_TIERS
): string {
  if (concurrency == null || ![1, 2, 4, 8, 16, 32].includes(concurrency)) {
    return "Grouping unavailable";
  }
  const per = Math.max(1, Math.floor(concurrency / 8));
  const groups: InputTier[][] = [];
  for (let i = 0; i < tiers.length; i += per) {
    groups.push(tiers.slice(i, i + per));
  }
  if (groups.length === 1) {
    if (tiers.length === 4) return "All four tiers overlap";
    if (tiers.length === 1) return `${tiers[0]} only`;
    return `${tiers.join(" + ")} overlap`;
  }
  if (groups.every((group) => group.length === 1)) {
    return `${tiers.slice(0, -1).join(", ")}, then ${tiers[tiers.length - 1]}; one tier at a time`;
  }
  return `${groups[0].join(" + ")} together, then ${groups
    .slice(1)
    .map((group) => group.join(" + "))
    .join(", then ")}`;
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
