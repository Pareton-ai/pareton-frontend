"use client";

import { Icon } from "../icons";

export function BenchmarkVisual() {
  const rows = [
    {
      metric: "GPU-hours",
      baseline: "100",
      patched: "93",
      delta: "−7%",
      improved: true,
    },
    {
      metric: "Throughput",
      baseline: "1.00×",
      patched: "1.08×",
      delta: "+8%",
      improved: true,
    },
    {
      metric: "p99 TTFT",
      baseline: "850 ms",
      patched: "820 ms",
      delta: "−30 ms",
      improved: true,
    },
    {
      metric: "Quality / SLA",
      baseline: "Pass",
      patched: "Pass",
      delta: "—",
      improved: false,
    },
  ];
  return (
    <div className="max-w-xl">
      <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
        <div className="flex flex-1 items-center gap-3 border border-border px-4 py-3">
          <Icon name="server" className="h-4 w-4 shrink-0 text-muted" />
          <div>
            <p className="font-mono text-body uppercase tracking-caps text-muted">
              Current baseline
            </p>
            <p className="mt-0.5 font-mono text-body text-secondary">
              vLLM + accepted patches
            </p>
          </div>
        </div>
        <div className="z-10 -my-3 flex justify-center sm:-mx-4 sm:my-0">
          <span className="flex h-9 w-9 rotate-45 items-center justify-center border border-border-strong bg-background">
            <span className="-rotate-45 font-mono text-body tracking-caps text-secondary">
              VS
            </span>
          </span>
        </div>
        <div className="flex flex-1 items-center gap-3 border border-accent/70 bg-accent-dim px-4 py-3">
          <Icon name="server" className="h-4 w-4 shrink-0 text-accent" />
          <div>
            <p className="font-mono text-body uppercase tracking-caps text-accent">
              Patched engine
            </p>
            <p className="mt-0.5 font-mono text-body text-secondary">
              baseline + candidate diff
            </p>
          </div>
        </div>
      </div>
      <table className="mt-6 w-full border border-border">
        <thead>
          <tr className="border-b border-border">
            {["Metric", "Baseline", "Patched", "Delta"].map((head) => (
              <th
                key={head}
                className="px-3 py-2 text-left font-mono text-body font-normal uppercase tracking-caps text-muted last:text-right"
              >
                {head}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="font-mono text-body">
          {rows.map((row) => (
            <tr
              key={row.metric}
              className="border-b border-border last:border-b-0"
            >
              <td className="px-3 py-2.5 font-sans text-body text-secondary">
                {row.metric}
              </td>
              <td className="px-3 py-2.5 text-muted">{row.baseline}</td>
              <td className="px-3 py-2.5 text-foreground">{row.patched}</td>
              <td
                className={`px-3 py-2.5 text-right ${
                  row.improved ? "text-accent" : "text-muted"
                }`}
              >
                {row.delta}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-4 font-mono text-body uppercase tracking-caps text-muted">
        Same workload trace · same hardware · same SLA gates
      </p>
    </div>
  );
}
