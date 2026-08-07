"use client";

import { Icon, RepeatIcon } from "../icons";
import { CheckItem } from "../check-item";

export function RepeatVisual() {
  return (
    <div className="max-w-lg">
      <div className="flex items-center gap-4 border border-border px-5 py-4">
        <RepeatIcon className="h-4 w-4 shrink-0 text-accent" />
        <p className="text-body leading-relaxed text-secondary">
          The new baseline becomes the floor — the next round of patches targets
          it, until the agreed success threshold is reached.
        </p>
      </div>
      <div className="mt-4 border border-border px-5 py-4">
        <div className="flex items-center gap-2.5">
          <Icon name="trophy" className="h-4 w-4 shrink-0 text-accent" />
          <p className="font-mono text-body uppercase tracking-caps text-secondary">
            Success threshold reached
          </p>
        </div>
        <ul className="mt-4 space-y-3">
          <CheckItem>Verified optimized engine</CheckItem>
          <CheckItem>Before / after savings report</CheckItem>
          <CheckItem>Ready for deployment</CheckItem>
        </ul>
      </div>
    </div>
  );
}
