import { ChevronRight, Workflow } from "lucide-react";
import type { ReactNode } from "react";
import { LiveElapsed } from "@/components/dashboard/live-elapsed";
import { Panel } from "@/components/dashboard/panel";
import { Eyebrow } from "@/components/ui/eyebrow";
import {
  elapsedBetween,
  formatDuration,
  formatUtc,
  formatUtcTime,
} from "@/lib/api/format";
import {
  annotateRoundPlan,
  groupRoundPlan,
  roundPlanProgress,
  type AnnotatedRoundPlanStep,
  type PlanStepStatus,
} from "@/lib/api/round-plan";
import type { RoundDetail } from "@/lib/api/types";

function markerClassName(status: PlanStepStatus): string {
  if (status === "done") return "bg-accent";
  if (status === "current") {
    return "bg-accent ring-2 ring-accent/30 motion-safe:animate-pulse";
  }
  if (status === "stalled") return "bg-rust ring-2 ring-rust/30";
  return "border border-border-strong bg-background";
}

function stepLabelClassName(status: PlanStepStatus): string {
  if (status === "pending" || status === "halted") return "text-muted";
  if (status === "current") return "text-accent";
  if (status === "stalled") return "text-rust";
  return "text-foreground";
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

function StepLabel({
  step,
  now,
}: {
  step: AnnotatedRoundPlanStep;
  now: string;
}) {
  const sinceMs =
    step.at !== null && (step.status === "current" || step.status === "stalled")
      ? elapsedBetween(step.at, now)
      : null;

  return (
    <span
      className={`flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 ${stepLabelClassName(step.status)}`}
    >
      <span className="text-body-lg">{step.label}</span>
      {step.status === "current" ? (
        <span className="font-mono text-caption uppercase tracking-caps text-accent">
          {sinceMs !== null && step.at !== null ? (
            <>
              in progress ·{" "}
              <LiveElapsed
                since={step.at}
                initialMs={sinceMs}
                className="text-accent"
              />
            </>
          ) : (
            "in progress"
          )}
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

function StepDetails({ step }: { step: AnnotatedRoundPlanStep }) {
  return (
    <div className="mb-1 mt-2 border border-border bg-border/10 px-3 py-3">
      <p className="text-body leading-relaxed text-secondary">
        {step.description}
      </p>
      <dl className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-2">
        <DetailItem label="Recorded">
          {step.at ? (
            formatUtc(step.at)
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
        <DetailItem label="Phase">{step.phase}</DetailItem>
      </dl>
    </div>
  );
}

function TimelineRow({
  step,
  isLast,
  now,
}: {
  step: AnnotatedRoundPlanStep;
  isLast: boolean;
  now: string;
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
          className={`mt-2 size-2 flex-none ${markerClassName(step.status)}`}
        />
      </div>

      {reached ? (
        <details
          open={active}
          className={`group/step min-w-0 flex-1 ${isLast ? "" : "pb-3"}`}
        >
          <summary className="flex cursor-pointer list-none items-baseline justify-between gap-x-3 rounded-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
            <StepLabel step={step} now={now} />
            <span className="flex shrink-0 items-baseline gap-2">
              <StepWhen at={step.at} deltaMs={step.sincePrevious} />
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
          <StepLabel step={step} now={now} />
        </div>
      )}
    </li>
  );
}

/**
 * The whole run plan, with the current step marked.
 *
 * Reuses the submission pipeline's visual language. The index math lives in
 * `round-plan.ts` because a phase that cycles nine times is not monotonic.
 */
export function RoundPlan({ round, now }: { round: RoundDetail; now: string }) {
  const steps = annotateRoundPlan(round, now);
  const groups = groupRoundPlan(steps);
  const { done, total } = roundPlanProgress(steps);

  return (
    <Panel icon={Workflow} title="Run" meta={`${done}/${total} steps`}>
      {groups.map((group) => {
        const groupDone = group.steps.filter(
          (s) =>
            s.status === "done" ||
            s.status === "current" ||
            s.status === "stalled"
        ).length;
        const active = group.steps.some((s) => s.status === "current");
        const stalled = group.steps.some((s) => s.status === "stalled");

        return (
          <div key={group.id} className="px-4 py-4">
            <div className="mb-3 flex items-baseline justify-between gap-4">
              <Eyebrow
                size="caption"
                tone={
                  stalled
                    ? "rust"
                    : active
                      ? "accent"
                      : groupDone === group.steps.length
                        ? "secondary"
                        : "muted"
                }
              >
                {group.label}
              </Eyebrow>
              <span className="font-mono text-caption text-muted">
                {groupDone}/{group.steps.length}
              </span>
            </div>
            <ol>
              {group.steps.map((step, index) => (
                <TimelineRow
                  key={step.id}
                  step={step}
                  isLast={index === group.steps.length - 1}
                  now={now}
                />
              ))}
            </ol>
          </div>
        );
      })}
    </Panel>
  );
}
