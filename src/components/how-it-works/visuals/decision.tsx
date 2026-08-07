"use client";

import { ArrowDown, Icon } from "../icons";

export function DecisionVisual() {
  return (
    <div className="max-w-xl">
      <div className="border border-border-strong px-5 py-4 text-center">
        <p className="font-mono text-body uppercase tracking-caps text-muted">
          Priority metric · GPU-hours at SLA
        </p>
        <p className="mt-2 font-mono text-body uppercase leading-relaxed tracking-caps text-foreground">
          Did it improve the metric without breaking SLA?
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col items-center pt-3">
          <span className="font-mono text-body uppercase tracking-caps text-accent">
            Yes
          </span>
          <ArrowDown className="mt-1 text-accent" />
          <div className="mt-1 w-full border border-accent/70 bg-accent-dim p-4">
            <div className="flex items-center gap-2.5">
              <Icon name="merge" className="h-4 w-4 shrink-0 text-accent" />
              <p className="font-mono text-body uppercase tracking-caps text-accent">
                Promote
              </p>
            </div>
            <p className="mt-2.5 text-body leading-relaxed text-secondary">
              Merge into the inference-engine repo. Becomes the new best
              baseline.
            </p>
            <div className="mt-3 flex items-center gap-2 border-t border-accent/50 pt-3">
              <Icon
                name="server"
                className="h-3.5 w-3.5 shrink-0 text-accent"
              />
              <span className="font-mono text-body uppercase tracking-caps text-accent">
                New baseline
              </span>
              <span className="ml-auto font-mono text-body text-secondary">
                −7% GPU-h
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-center pt-3">
          <span className="font-mono text-body uppercase tracking-caps text-rust">
            No
          </span>
          <ArrowDown className="mt-1 text-rust" />
          <div className="mt-1 w-full border border-rust/70 p-4">
            <div className="flex items-center gap-2.5">
              <Icon name="x" className="h-4 w-4 shrink-0 text-rust" />
              <p className="font-mono text-body uppercase tracking-caps text-rust">
                Reject
              </p>
            </div>
            <p className="mt-2.5 text-body leading-relaxed text-secondary">
              Didn&apos;t beat the metric, or broke SLA. Discard and test the
              next candidate.
            </p>
            <div className="mt-3 border-t border-rust/50 pt-3">
              <span className="font-mono text-body uppercase tracking-caps text-muted">
                Next candidate
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
