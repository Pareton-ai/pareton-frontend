import { FlaskConical } from "lucide-react";
import { Panel } from "@/components/dashboard/panel";
import { formatScore } from "@/lib/api/format";
import type { SubmissionRound } from "@/lib/api/types";

/**
 * Placeholder for the round-entry panel. PAR-89 owns the real rework.
 */
export function BenchReports({ round }: { round: SubmissionRound | null }) {
  if (round == null) {
    return (
      <Panel icon={FlaskConical} title="Round">
        <p className="px-4 py-3 font-mono text-body text-muted">
          Not seated in a round.
        </p>
      </Panel>
    );
  }

  const scoreLabel =
    round.score === null ? "no score" : formatScore(round.score);

  return (
    <Panel icon={FlaskConical} title="Round">
      <p className="px-4 py-3 font-mono text-body text-secondary">
        Round {round.ordinal}: {round.status.replaceAll("_", " ")} ·{" "}
        {scoreLabel}
      </p>
    </Panel>
  );
}
