"use client";

import { Icon, type IconName } from "../icons";

export function ProfileVisual() {
  const specs: [IconName, string, string][] = [
    ["cube", "Model", "GLM-5 · FP8"],
    ["chip", "Hardware", "H200 + secondary GPU env"],
    ["layers", "Serving", "vLLM · production flags"],
    ["activity", "Workload", "real traffic distribution"],
    ["shield", "SLA gates", "p99 TTFT · latency floor"],
    ["target", "Success metric", "GPU-hours saved at SLA"],
  ];
  return (
    <div className="max-w-lg border border-border">
      {specs.map(([icon, label, value]) => (
        <div
          key={label}
          className="flex items-center gap-3 border-b border-border px-4 py-2.5 last:border-b-0"
        >
          <Icon name={icon} className="h-3.5 w-3.5 shrink-0 text-accent" />
          <span className="shrink-0 font-mono text-body uppercase tracking-caps text-muted">
            {label}
          </span>
          <span className="ml-auto text-right font-mono text-body text-secondary">
            {value}
          </span>
        </div>
      ))}
    </div>
  );
}
