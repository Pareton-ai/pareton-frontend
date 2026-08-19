import { ChevronRight, Workflow } from "lucide-react";
import type { ReactNode } from "react";
import { Panel } from "@/components/dashboard/panel";
import { Eyebrow } from "@/components/ui/eyebrow";
import {
  elapsedBetween,
  formatDuration,
  formatUtc,
  formatUtcTime,
} from "@/lib/api/format";
import {
  firstEventByState,
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

function DetailItem({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <dt className="font-mono text-caption uppercase tracking-caps text-muted">
        {label}
      </dt>
      <dd className="mt-1 break-words font-mono text-body text-secondary">
        {children}
      </dd>
    </div>
  );
}

/**
 * Body of an expanded step: what the stage means, when it landed, and whatever
 * the worker wrote alongside the event.
 *
 * Only rendered for stages the run has actually reached.
 */
function StepDetails({ step }: { step: Step }) {
  const meta = getSubmissionStateMeta(step.state);
  const { event } = step;
  const entries = event ? Object.entries(event.detail) : [];

  return (
    <div className="mb-1 mt-2 border border-border bg-border/10 px-3 py-3">
      <p className="text-body leading-relaxed text-secondary">
        {meta.description}
      </p>

      <dl className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-2">
        <DetailItem label="Recorded">
          {event ? (
            formatUtc(event.created_at)
          ) : (
            <span className="text-muted">Not recorded</span>
          )}
        </DetailItem>
        <DetailItem label="Since previous step">
          {step.sincePrevious !== null ? (
            formatDuration(step.sincePrevious)
          ) : (
            <span className="text-muted">—</span>
          )}
        </DetailItem>
        {/* The wire name is what support and Axiom queries are keyed on. */}
        <DetailItem label="State">{step.state}</DetailItem>
        {event?.evidence_ref ? (
          <DetailItem label="Evidence">{event.evidence_ref}</DetailItem>
        ) : null}
      </dl>

      {entries.length > 0 ? (
        <pre className="mt-3 max-h-64 overflow-auto border border-border bg-background px-3 py-2 font-mono text-caption leading-relaxed text-secondary">
          {JSON.stringify(event?.detail, null, 2)}
        </pre>
      ) : (
        <p className="mt-3 font-mono text-caption text-muted">
          No structured detail recorded for this step.
        </p>
      )}
    </div>
  );
}

function stepLabelClassName(status: StepStatus): string {
  if (status === "pending" || status === "halted") return "text-muted";
  if (status === "current") return "text-accent";
  if (status === "stalled") return "text-rust";
  return "text-foreground";
}

function StepLabel({ step }: { step: Step }) {
  const meta = getSubmissionStateMeta(step.state);

  return (
    <span
      className={`flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 ${stepLabelClassName(step.status)}`}
    >
      <span className="text-body-lg">{meta.label}</span>
      {step.status === "current" ? (
        <span className="font-mono text-caption uppercase tracking-caps text-accent">
          in progress
        </span>
      ) : null}
      {step.status === "stalled" ? (
        <span className="font-mono text-caption uppercase tracking-caps text-rust">
          stopped
        </span>
      ) : null}
    </span>
  );
}

/**
 * Clock and delta as two fixed gutters so a column of `13:32:16` / `+854ms`
 * still lines up when the next row is `+17s` or carries an "in progress" badge.
 *
 * `HH:MM:SS` is 8ch in the mono caption. The delta gutter fits `+59m 59s`.
 */
function StepWhen({
  at,
  deltaMs,
}: {
  at: string | null;
  deltaMs: number | null;
}) {
  const showDelta = deltaMs !== null && deltaMs > 0;

  return (
    <span className="flex shrink-0 items-baseline gap-2 font-mono text-caption tabular-nums">
      {at ? (
        <time
          dateTime={at}
          title={formatUtc(at)}
          className="w-[8ch] whitespace-nowrap text-right text-muted"
        >
          {formatUtcTime(at)}
        </time>
      ) : (
        <span className="w-[8ch]" />
      )}
      <span className="w-[8ch] whitespace-nowrap text-secondary">
        {showDelta ? `+${formatDuration(deltaMs)}` : null}
      </span>
    </span>
  );
}

/**
 * One collapsed line per stage: marker, label, then when it happened.
 *
 * Thirteen stages each carrying a sentence read as a wall of prose and pushed
 * the benchmark numbers off the screen, so the prose moved into a disclosure on
 * the row. Unreached stages have nothing to disclose, so they stay a static
 * label with no chevron. The stage in progress (or the one that stopped) opens
 * by default, since that is the step a reader came for.
 *
 * The connector sits outside the `summary` so it stretches over an open row.
 */
function TimelineRow({
  step,
  isLast,
  rejected,
}: {
  step: Step;
  isLast: boolean;
  rejected: boolean;
}) {
  const reached = step.status !== "pending" && step.status !== "halted";
  const active = step.status === "current" || step.status === "stalled";

  return (
    <li className="relative flex gap-3">
      <div className="relative flex w-2 flex-none justify-center">
        {isLast ? null : (
          <span
            aria-hidden
            className="absolute bottom-0 top-2.5 w-px bg-border-strong"
          />
        )}
        <span
          aria-hidden
          className={`mt-2 size-2 flex-none ${markerClassName(step.status, rejected)}`}
        />
      </div>

      {reached ? (
        <details
          open={active}
          className={`group/step min-w-0 flex-1 ${isLast ? "" : "pb-3"}`}
        >
          <summary className="flex cursor-pointer list-none items-baseline justify-between gap-x-3 rounded-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
            <StepLabel step={step} />
            <span className="flex shrink-0 items-baseline gap-2">
              <StepWhen
                at={step.event?.created_at ?? null}
                deltaMs={step.sincePrevious}
              />
              <ChevronRight
                aria-hidden
                className="size-3.5 shrink-0 self-center text-muted transition-transform group-open/step:rotate-90"
              />
            </span>
          </summary>
          <StepDetails step={step} />
        </details>
      ) : (
        <div
          className={`flex min-w-0 flex-1 items-baseline justify-between gap-x-4 ${isLast ? "" : "pb-3"}`}
        >
          <StepLabel step={step} />
        </div>
      )}
    </li>
  );
}

function RejectionRow({
  event,
  sincePrevious,
}: {
  event: SubmissionEvent;
  sincePrevious: number | null;
}) {
  const reason =
    typeof event.detail.reason === "string" ? event.detail.reason : null;
  const entries = Object.entries(event.detail);

  return (
    <li className="relative flex gap-3">
      <div className="relative flex w-2 flex-none justify-center">
        <span aria-hidden className="mt-1 size-2 flex-none bg-rust" />
      </div>
      {/* Open by default: the reason is the whole point of a rejected run. */}
      <details open className="group/step min-w-0 flex-1">
        <summary className="flex cursor-pointer list-none items-baseline justify-between gap-x-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
          <span className="min-w-0 flex-1 text-body-lg text-rust">
            Rejected
          </span>
          <span className="flex shrink-0 items-baseline gap-2">
            <StepWhen at={event.created_at} deltaMs={sincePrevious} />
            <ChevronRight
              aria-hidden
              className="size-3.5 shrink-0 self-center text-muted transition-transform group-open/step:rotate-90"
            />
          </span>
        </summary>

        <div className="mt-2 border border-rust/30 px-3 py-3">
          <p className="break-words font-mono text-body text-rust">
            {reason ?? "No reason recorded."}
          </p>
          <dl className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-2">
            <DetailItem label="Recorded">
              {formatUtc(event.created_at)}
            </DetailItem>
            <DetailItem label="Since previous step">
              {sincePrevious !== null ? (
                formatDuration(sincePrevious)
              ) : (
                <span className="text-muted">—</span>
              )}
            </DetailItem>
            {event.evidence_ref ? (
              <DetailItem label="Evidence">{event.evidence_ref}</DetailItem>
            ) : null}
          </dl>
          {entries.length > 0 ? (
            <pre className="mt-3 max-h-64 overflow-auto border border-border bg-background px-3 py-2 font-mono text-caption leading-relaxed text-secondary">
              {JSON.stringify(event.detail, null, 2)}
            </pre>
          ) : null}
        </div>
      </details>
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
  const firstByState = firstEventByState(events);
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

  function sincePreviousOf(event: SubmissionEvent | null): number | null {
    if (!event) return null;
    const previous = previousOf.get(event) ?? null;
    return previous
      ? elapsedBetween(previous.created_at, event.created_at)
      : null;
  }

  function toStep(state: string): Step {
    const event = firstByState.get(state) ?? null;
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
      sincePrevious: sincePreviousOf(event),
    };
  }

  // Keyed on the phases, not the stage order: those lists answer different
  // questions. A state can be ordered (so progress counts it) without belonging
  // to a rendered phase, e.g. `sampled`, which only sampling campaigns emit.
  // Filtering on stage order would render such an event nowhere at all.
  const phaseStates: ReadonlySet<string> = new Set(
    SUBMISSION_PHASES.flatMap((phase) => phase.states)
  );
  const offPath = events.filter(
    (event) => event.state !== "rejected" && !phaseStates.has(event.state)
  );

  const allStates = SUBMISSION_PHASES.flatMap((phase) => phase.states);
  const totalDone = allStates.filter((state) => {
    const { status } = toStep(state);
    return status === "done" || status === "current" || status === "stalled";
  }).length;

  return (
    <Panel
      icon={Workflow}
      title="Pipeline"
      meta={`${totalDone}/${allStates.length} stages`}
    >
      {SUBMISSION_PHASES.map((phase) => {
        const steps = phase.states.map(toStep);
        const done = steps.filter(
          (s) =>
            s.status === "done" ||
            s.status === "current" ||
            s.status === "stalled"
        ).length;
        const active = steps.some((s) => s.status === "current");

        return (
          <div key={phase.id} className="px-4 py-4">
            <div className="mb-3 flex items-baseline justify-between gap-4">
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
        <div className="px-4 py-4">
          <Eyebrow size="caption" tone="secondary" className="mb-3">
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
        <div className="bg-rust/5 px-4 py-4">
          <ol>
            <RejectionRow
              event={rejection}
              sincePrevious={sincePreviousOf(rejection)}
            />
          </ol>
        </div>
      ) : null}
    </Panel>
  );
}
