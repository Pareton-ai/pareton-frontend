import { Eyebrow } from "@/components/ui/eyebrow";
import type { Step } from "./steps";
import { steps } from "./steps";

export function StepDetail({ step }: { step: Step }) {
  return (
    <div>
      <Eyebrow size="body" tone="muted">
        Step {step.index} / {String(steps.length).padStart(2, "0")}
      </Eyebrow>
      <h3 className="mt-3 text-title font-medium tracking-tight text-foreground">
        {step.title}
      </h3>
      <p className="mt-3 max-w-xl text-body-lg leading-relaxed text-secondary">
        {step.body}
      </p>
      <div className="mt-8">{step.visual}</div>
    </div>
  );
}
