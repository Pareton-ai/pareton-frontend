import { StageVerdictChip } from "@/components/dashboard/status-chip";
import { Eyebrow } from "@/components/ui/eyebrow";
import type { BenchReport } from "@/lib/api/types";

const STAGE_LABEL: Record<string, string> = {
  correctness: "Correctness",
  perf_screen: "Perf screen",
  sla_bench: "SLA bench",
};

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function fmt(value: number | null, digits = 2, suffix = ""): string {
  if (value === null) return "—";
  return `${value.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}${suffix}`;
}

function fmtRatio(value: number | null): string {
  return value === null ? "—" : `${value.toFixed(2)}×`;
}

function Metric({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div>
      <p className="font-mono text-caption uppercase tracking-caps text-muted">
        {label}
      </p>
      <p className="mt-1 font-mono text-body-lg text-foreground">{value}</p>
      {hint ? (
        <p className="mt-0.5 font-mono text-caption text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

function MetricRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
      {children}
    </div>
  );
}

function CorrectnessBody({ report }: { report: Record<string, unknown> }) {
  const mismatch = num(report.argmax_mismatch_rate);
  return (
    <MetricRow>
      <Metric
        label="Mean |Δ logprob|"
        value={fmt(num(report.mean_abs_logprob_diff), 4)}
      />
      <Metric
        label="Max |Δ logprob|"
        value={fmt(num(report.max_abs_logprob_diff), 4)}
      />
      <Metric
        label="Argmax mismatch"
        value={mismatch === null ? "—" : `${(mismatch * 100).toFixed(2)}%`}
      />
      <Metric
        label="Prompts"
        value={num(report.num_prompts)?.toLocaleString("en-US") ?? "—"}
        hint={
          num(report.num_positions_compared) !== null
            ? `${num(report.num_positions_compared)?.toLocaleString("en-US")} positions`
            : undefined
        }
      />
    </MetricRow>
  );
}

function PerfScreenBody({ report }: { report: Record<string, unknown> }) {
  const baseline = num(report.baseline_output_tokens_per_s);
  const candidate = num(report.candidate_output_tokens_per_s);
  const ratio = num(report.throughput_ratio);

  return (
    <MetricRow>
      <Metric label="Baseline" value={fmt(baseline, 1, " tok/s")} />
      <Metric label="Candidate" value={fmt(candidate, 1, " tok/s")} />
      <Metric label="Throughput ratio" value={fmtRatio(ratio)} />
    </MetricRow>
  );
}

const SLA_ROWS = [
  { label: "p99 TTFT", path: ["ttft_ms", "p99"], suffix: " ms", digits: 1 },
  { label: "p99 ITL", path: ["itl_ms", "p99"], suffix: " ms", digits: 1 },
  { label: "p99 E2E", path: ["e2e_ms", "p99"], suffix: " ms", digits: 1 },
  { label: "Output", path: ["output_tokens_per_s"], suffix: " tok/s", digits: 1 },
  { label: "Requests", path: ["requests_per_s"], suffix: " req/s", digits: 2 },
  { label: "SLA goodput", path: ["sla_goodput_ratio"], suffix: "", digits: 2 },
] as const;

function dig(source: Record<string, unknown>, path: readonly string[]): unknown {
  let cursor: unknown = source;
  for (const key of path) {
    cursor = record(cursor)[key];
  }
  return cursor;
}

/** Lower is better for latency, so the improvement direction flips. */
function isLatency(path: readonly string[]): boolean {
  return path[0].endsWith("_ms");
}

function SlaBenchBody({ report }: { report: Record<string, unknown> }) {
  const baseline = record(report.baseline);
  const candidate = record(report.candidate);
  if (Object.keys(candidate).length === 0) return null;

  const repetitions = num(report.repetitions);

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] text-left">
          <thead>
            <tr className="font-mono text-caption uppercase tracking-caps text-muted">
              <th className="py-2 font-normal">Metric</th>
              <th className="py-2 text-right font-normal">Baseline</th>
              <th className="py-2 text-right font-normal">Candidate</th>
              <th className="py-2 text-right font-normal">Change</th>
            </tr>
          </thead>
          <tbody>
            {SLA_ROWS.map((row) => {
              const base = num(dig(baseline, row.path));
              const cand = num(dig(candidate, row.path));
              const lowerIsBetter = isLatency(row.path);

              let change: string = "—";
              let better: boolean | null = null;
              if (base !== null && cand !== null && base !== 0) {
                const delta = (cand - base) / base;
                change = `${delta >= 0 ? "+" : ""}${(delta * 100).toFixed(1)}%`;
                better = lowerIsBetter ? delta < 0 : delta > 0;
              }

              return (
                <tr key={row.label} className="border-t border-border/80">
                  <td className="py-2.5 font-mono text-body-sm text-secondary">
                    {row.label}
                  </td>
                  <td className="py-2.5 text-right font-mono text-body-sm text-muted">
                    {fmt(base, row.digits, row.suffix)}
                  </td>
                  <td className="py-2.5 text-right font-mono text-body-sm text-foreground">
                    {fmt(cand, row.digits, row.suffix)}
                  </td>
                  <td
                    className={`py-2.5 text-right font-mono text-body-sm ${
                      better === null
                        ? "text-muted"
                        : better
                          ? "text-accent"
                          : "text-rust"
                    }`}
                  >
                    {change}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {repetitions !== null ? (
        <p className="mt-3 font-mono text-caption text-muted">
          {repetitions} repetition{repetitions === 1 ? "" : "s"}
        </p>
      ) : null}
    </div>
  );
}

function ReportBody({ report: item }: { report: BenchReport }) {
  if (item.stage === "correctness") {
    return <CorrectnessBody report={item.report} />;
  }
  if (item.stage === "perf_screen") {
    return <PerfScreenBody report={item.report} />;
  }
  if (item.stage === "sla_bench") {
    return <SlaBenchBody report={item.report} />;
  }
  return null;
}

function ReportCard({ report: item }: { report: BenchReport }) {
  const body = <ReportBody report={item} />;

  return (
    <div className="px-5 py-5 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Eyebrow size="caption" tone="secondary">
            {STAGE_LABEL[item.stage] ?? item.stage.replaceAll("_", " ")}
          </Eyebrow>
          {item.gpu_sku ? (
            <span className="font-mono text-caption text-muted">
              {item.gpu_sku}
            </span>
          ) : null}
          {item.mock ? (
            <span className="inline-flex border border-rust/40 px-2 py-0.5 font-mono text-caption uppercase tracking-caps text-rust">
              Mock
            </span>
          ) : null}
        </div>
        <StageVerdictChip verdict={item.verdict} />
      </div>

      {body ? <div className="mt-5">{body}</div> : null}

      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2">
        <details className="group/raw">
          <summary className="inline-flex cursor-pointer list-none font-mono text-caption uppercase tracking-caps text-muted transition-colors hover:text-secondary">
            <span className="group-open/raw:hidden">+ raw report</span>
            <span className="hidden group-open/raw:inline">− raw report</span>
          </summary>
          <pre className="mt-2 max-h-80 overflow-auto border border-border bg-border/10 px-3 py-2 font-mono text-caption leading-relaxed text-secondary">
            {JSON.stringify(item.report, null, 2)}
          </pre>
        </details>

        {item.evidence_s3_url ? (
          <a
            href={item.evidence_s3_url}
            rel="noreferrer nofollow"
            target="_blank"
            className="font-mono text-caption uppercase tracking-caps text-accent underline-offset-4 transition-colors hover:underline"
          >
            Evidence ↗
          </a>
        ) : null}
      </div>
    </div>
  );
}

export function BenchReports({ reports }: { reports: BenchReport[] }) {
  if (reports.length === 0) return null;

  const ordered = [...reports].sort((a, b) =>
    a.created_at.localeCompare(b.created_at)
  );

  return (
    <section aria-label="Benchmark results" className="border border-border">
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-border px-5 py-4 sm:px-6">
        <h2 className="font-mono text-body-sm uppercase tracking-caps text-muted">
          Benchmark results
        </h2>
        <p className="font-mono text-body-sm text-muted">
          {ordered.length} report{ordered.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className="divide-y divide-border">
        {ordered.map((item) => (
          <ReportCard
            key={`${item.stage}-${item.gpu_sku ?? "default"}-${item.task_id}`}
            report={item}
          />
        ))}
      </div>
    </section>
  );
}
