/**
 * Round-entry display helpers.
 *
 * `score` is null for a disqualified or infra-failed entry. 0.0 is a real
 * score and means the image matched baseline speed. Callers must not coerce
 * null to 0; that decision belongs to the chart (PAR-86).
 */

import type { RoundEntry, SubmissionRound } from "@/lib/api/types";

export function hasScore(
  entry: Pick<RoundEntry, "score"> | Pick<SubmissionRound, "score"> | null
): boolean {
  return entry != null && entry.score !== null;
}
