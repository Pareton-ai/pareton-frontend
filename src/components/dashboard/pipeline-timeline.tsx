import { Eyebrow } from "@/components/ui/eyebrow";
import {
  elapsedBetween,
  formatDuration,
  formatUtcTime,
} from "@/lib/api/format";
import {
  getSubmissionStateMeta,
  isTerminalState,
  stageIndex,
  SUBMISSION_PHASES,
  type SubmissionEvent,
} from "@/lib/api/types";

type StepStatus = "done" | "current" | "stalled" | "pending" | "halted";

type Step = {
  state: string;
  status: StepStatus;
  event: SubmissionEvent | null;
  /** Time since the previous recorded event. */
  sincePrevious: number | null;
};

function markerClassName(status: StepStatus, rejected: boolean): string {
  if (status === "done") {
    return rejected ? "bg-border-strong" : "bg-accent";
  }
  if (status === "current") {
    return "bg-accent ring-2 ring-accent/30 motion-safe:animate-pulse";
  }
  if (status === "stalled") {
    return "bg-rust ring-2 ring-rust/30";
  }
  return "border border-border-strong bg-background";
}

function DetailDisclosure({ event }: { event: SubmissionEvent }) {
  const entries = Object.entries(event.detail);
  if (entries.length === 0 && !event.evidence_ref) return null;

  return (
    <details className="group/detail mt-2">
      <summary className="inline-flex cursor-pointer list-none font-mono text-caption uppercase tracking-caps text-muted transition-colors hover:text-secondary">
        <span className="group-open/detail:hidden">+ detail</span>
        <span className="hidden group-open/detail:inline">− detail</span>
      </summary>
      <pre className="mt-2 max-h-64 overflow-auto border border-border bg-border/10 px-3 py-2 font-mono text-caption leading-relaxed text-secondary">
        {JSON.stringify(
          event.evidence_ref
            ? { ...event.detail, evidence_ref: event.evidence_ref }
            : event.detail,
          null,
          2
        )}
      </pre>
    </details>
  );
}

function TimelineRow({
  step,
  isLast,
  rejected,
}: {
  step: Step;
  isLast: boolean;
  rejected: boolean;
}) {
  const meta = getSubmissionStateMeta(step.state);
  const pending = step.status === "pending" || step.status === "halted";

  return (
    <li className="relative flex gap-4">
      <div className="relative flex w-2 flex-none justify-center">
        {isLast ? null : (
          <span
            aria-hidden
            className="absolute bottom-0 top-3 w-px bg-border-strong"
          />
        )}
        <span
          aria-hidden
          className={`mt-1.5 size-2 flex-none ${markerClassName(step.status, rejected)}`}
        />
      </div>

      <div className="min-w-0 flex-1 pb-5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <p
            className={`text-body-lg ${
              pending
                ? "text-muted"
                : step.status === "current"
                  ? "text-accent"
                  : step.status === "stalled"
                    ? "text-rust"
                    : "text-foreground"
            }`}
          >
            {meta.label}
            {step.status === "current" ? (
              <span className="ml-2 font-mono text-caption uppercase tracking-caps text-accent">
                in progress
              </span>
            ) : null}
            {step.status === "stalled" ? (
              <span className="ml-2 font-mono text-caption uppercase tracking-caps text-rust">
                stopped
              </span>
            ) : null}
          </p>

          {step.event ? (
            <p className="font-mono text-caption text-muted">
              {formatUtcTime(step.event.created_at)}
              {step.sincePrevious !== null && step.sincePrevious > 0 ? (
                <span className="text-secondary">
                  {" +"}
                  {formatDuration(step.sincePrevious)}
                </span>
              ) : null}
            </p>
          ) : null}
        </div>

        <p
          className={`mt-1 text-body leading-normal ${pending ? "text-muted" : "text-secondary"}`}
        >
          {meta.description}
        </p>

        {step.event ? <DetailDisclosure event={step.event} /> : null}
      </div>
    </li>
  );
}

function RejectionRow({ event }: { event: SubmissionEvent }) {
  const reason =
    typeof event.detail.reason === "string" ? event.detail.reason : null;

  return (
    <li className="relative flex gap-4">
      <div className="relative flex w-2 flex-none justify-center">
        <span aria-hidden className="mt-1.5 size-2 flex-none bg-rust" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <p className="text-body-lg text-rust">Rejected</p>
          <p className="font-mono text-caption text-muted">
            {formatUtcTime(event.created_at)}
          </p>
        </div>
        <p className="mt-1 break-words font-mono text-body text-rust">
          {reason ?? "No reason recorded."}
        </p>
        <DetailDisclosure event={event} />
      </div>
    </li>
  );
}

export function PipelineTimeline({
  events,
  latestState,
  stalled = false,
}: {
  events: SubmissionEvent[];
  /** API `latest_state`; may run ahead of the event trail. */
  latestState: string;
  /** Job backing the current stage failed; no further events are coming. */
  stalled?: boolean;
}) {
  const firstByState = new Map<string, SubmissionEvent>();
  for (const event of events) {
    if (!firstByState.has(event.state)) firstByState.set(event.state, event);
  }

  const rejection = firstByState.get("rejected") ?? null;
  // Prefer API latest_state over the last event (it can run ahead).
  // Terminal states (benched / rejected) are done, not "in progress".
  const currentState = !isTerminalState(latestState) ? latestState : null;
  const currentIndex = currentState ? stageIndex(currentState) : -1;

  // Deltas use wall-clock order so a skipped state does not inflate them.
  const previousOf = new Map<SubmissionEvent, SubmissionEvent | null>();
  events.forEach((event, index) => {
    previousOf.set(event, index > 0 ? events[index - 1] : null);
  });

  function toStep(state: string): Step {
    const event = firstByState.get(state) ?? null;
    const previous = event ? (previousOf.get(event) ?? null) : null;
    const index = stageIndex(state);
    const reachedViaLatest =
      currentIndex !== -1 && index !== -1 && index < currentIndex;
    const status: StepStatus =
      state === currentState
        ? stalled
          ? "stalled"
          : "current"
        : event || reachedViaLatest
          ? "done"
          : rejection || stalled
            ? "halted"
            : "pending";
    return {
      state,
      status,
      event,
      sincePrevious:
        event && previous
          ? elapsedBetween(previous.created_at, event.created_at)
          : null,
    };
  }

  const offPath = events.filter(
    (event) => event.state !== "rejected" && stageIndex(event.state) === -1
  );

  return (
    <section aria-label="Pipeline" className="border border-border">
      <div className="border-b border-border px-5 py-4 sm:px-6">
        <h2 className="font-mono text-body-sm uppercase tracking-caps text-muted">
          Pipeline
        </h2>
      </div>

      <div className="divide-y divide-border">
        {SUBMISSION_PHASES.map((phase) => {
          const steps = phase.states.map(toStep);
          const done = steps.filter((s) => s.event).length;
          const active = steps.some((s) => s.status === "current");

          return (
            <div key={phase.id} className="px-5 py-5 sm:px-6">
              <div className="mb-4 flex items-baseline justify-between gap-4">
                <Eyebrow
                  size="caption"
                  tone={
                    active
                      ? "accent"
                      : done === steps.length
                        ? "secondary"
                        : "muted"
                  }
                >
                  {phase.label}
                </Eyebrow>
                <span className="font-mono text-caption text-muted">
                  {done}/{steps.length}
                </span>
              </div>

              <ol>
                {steps.map((step, index) => (
                  <TimelineRow
                    key={step.state}
                    step={step}
                    isLast={index === steps.length - 1}
                    rejected={Boolean(rejection)}
                  />
                ))}
              </ol>
            </div>
          );
        })}

        {offPath.length > 0 ? (
          <div className="px-5 py-5 sm:px-6">
            <Eyebrow size="caption" tone="secondary" className="mb-4">
              Other events
            </Eyebrow>
            <ol>
              {offPath.map((event, index) => (
                <TimelineRow
                  key={`${event.state}-${event.created_at}`}
                  step={{
                    state: event.state,
                    status: "done",
                    event,
                    sincePrevious: null,
                  }}
                  isLast={index === offPath.length - 1}
                  rejected={Boolean(rejection)}
                />
              ))}
            </ol>
          </div>
        ) : null}

        {rejection ? (
          <div className="bg-rust/5 px-5 py-5 sm:px-6">
            <ol>
              <RejectionRow event={rejection} />
            </ol>
          </div>
        ) : null}
      </div>
    </section>
  );
}
