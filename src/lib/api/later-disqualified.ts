import type { RoundEntry, SubmissionRow } from "@/lib/api/types";

/**
 * Submissions a round scored that were disqualified afterwards.
 *
 * A round entry is the round's own record and never changes: an image that
 * was scored stays `scored` there. A later verdict (an operator excluding the
 * miner, or a later round catching the patch) lands on the submission, whose
 * latest state becomes `disqualified`. Without this the round page keeps
 * showing a winner the campaign no longer recognises.
 *
 * Entries the round itself disqualified are left out: their row already says
 * so, with the round's reason.
 */
export function disqualifiedAfterRound(
  entries: readonly RoundEntry[],
  submissions: readonly Pick<SubmissionRow, "id" | "latest_state">[]
): ReadonlySet<string> {
  const disqualified = new Set(
    submissions
      .filter((row) => row.latest_state === "disqualified")
      .map((row) => row.id)
  );
  return new Set(
    entries.flatMap((entry) =>
      entry.status === "scored" &&
      entry.submission_id !== null &&
      disqualified.has(entry.submission_id)
        ? [entry.submission_id]
        : []
    )
  );
}

/** Whether any entry could carry a later verdict, so the lookup is worth it. */
export function hasScoredSubmission(entries: readonly RoundEntry[]): boolean {
  return entries.some(
    (entry) => entry.status === "scored" && entry.submission_id !== null
  );
}

export const DISQUALIFIED_LATER_NOTE =
  "Disqualified after this round. The score is what the round recorded and no longer counts.";
