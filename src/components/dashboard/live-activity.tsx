import { LiveElapsed } from "@/components/dashboard/live-elapsed";
import {
  elapsedBetween,
  formatDuration,
  formatUtcTime,
} from "@/lib/api/format";
import type { LiveActivity } from "@/lib/api/types";

/**
 * What the bench is doing right now. A missing heartbeat is shown as stale, not as ongoing work.
 */
export function LiveActivityLine({
  activity,
  now,
}: {
  activity: LiveActivity;
  /** Server render time, so the first paint and the tests agree on staleness. */
  now: string;
}) {
  const sinceMs =
    activity.since === null ? null : elapsedBetween(activity.since, now);

  return (
    <div
      aria-label="Current activity"
      aria-live="polite"
      className="mt-px flex flex-wrap items-baseline gap-x-3 gap-y-1 border border-t-0 border-border px-4 py-3"
    >
      <span className="flex items-center gap-2 font-mono text-body text-foreground">
        {/* Filled while beating; hollow once stale. */}
        <span
          aria-hidden
          className={
            activity.stale
              ? "size-1.5 shrink-0 rounded-full border border-rust"
              : "size-1.5 shrink-0 animate-pulse rounded-full bg-accent"
          }
        />
        {activity.label}
      </span>

      {activity.stale ? (
        <span className="font-mono text-caption text-rust">
          {activity.heartbeatAgeMs === null
            ? "no heartbeat recorded; the worker may have stopped"
            : `no heartbeat for ${formatDuration(activity.heartbeatAgeMs)}; the worker may have stopped`}
        </span>
      ) : activity.since !== null && sinceMs !== null ? (
        <span className="font-mono text-caption text-muted">
          for{" "}
          <LiveElapsed
            since={activity.since}
            initialMs={sinceMs}
            className="text-secondary"
          />
          <span className="text-muted">
            {" "}
            · since {formatUtcTime(activity.since)} UTC
          </span>
        </span>
      ) : null}

      <span className="basis-full text-caption leading-normal text-muted">
        {activity.description}
      </span>
    </div>
  );
}
