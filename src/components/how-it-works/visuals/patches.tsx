"use client";

import { ArrowDown, Icon } from "../icons";

export function PatchesVisual() {
  const patches = [
    {
      initial: "A",
      add: "enable prefix caching",
      remove: "default cache policy",
    },
    {
      initial: "B",
      add: "dynamic batch sizing",
      remove: "fixed batch size",
    },
    {
      initial: "C",
      add: "optimize KV allocation",
      remove: "existing allocation path",
    },
  ];
  return (
    <div className="max-w-xl">
      <div className="flex items-center gap-3 border border-border px-4 py-3">
        <Icon name="server" className="h-4 w-4 shrink-0 text-secondary" />
        <div>
          <p className="font-mono text-body uppercase tracking-caps text-muted">
            Current baseline
          </p>
          <p className="mt-0.5 font-mono text-body text-secondary">
            vLLM + accepted patches
          </p>
        </div>
        <span className="ml-auto font-mono text-body uppercase tracking-caps text-muted">
          the patch target
        </span>
      </div>
      <div className="flex justify-center py-0.5">
        <ArrowDown className="text-muted" />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {patches.map((patch) => (
          <div key={patch.initial} className="border border-border p-4">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center border border-border-strong font-mono text-body text-secondary">
                {patch.initial}
              </span>
              <p className="font-mono text-body uppercase tracking-caps text-muted">
                Contributor {patch.initial}
              </p>
            </div>
            <div className="mt-3 space-y-1.5 font-mono text-body leading-normal">
              <p>
                <span className="mr-1.5 text-accent">+</span>
                <span className="text-foreground">{patch.add}</span>
              </p>
              <p>
                <span className="mr-1.5 text-rust">−</span>
                <span className="text-muted">{patch.remove}</span>
              </p>
              <p className="text-muted">…</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
