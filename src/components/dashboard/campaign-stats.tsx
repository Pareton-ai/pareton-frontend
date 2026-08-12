import { Cpu, Layers, Timer, TrendingUp } from "lucide-react";
import type { ComponentType, ReactNode } from "react";
import type { Campaign, SubmissionsPage } from "@/lib/api/types";

/** Any icon that takes a className, so brand marks sit beside Lucide glyphs. */
type TileIcon = ComponentType<{ className?: string }>;

function Tile({
  icon: Icon,
  label,
  value,
  hint,
  children,
}: {
  icon: TileIcon;
  label: string;
  value: ReactNode;
  hint?: string;
  children?: ReactNode;
}) {
  return (
    <div className="bg-background px-5 py-4">
      <div className="flex items-center gap-2">
        <Icon className="size-3.5 shrink-0 text-muted" />
        <p className="font-mono text-caption uppercase tracking-caps text-muted">
          {label}
        </p>
      </div>
      <p className="mt-3 font-mono text-title text-foreground">{value}</p>
      {children}
      {hint ? (
        <p className="mt-2 font-mono text-body-sm text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

/** Pass / rejected / in-flight split of the submissions listed below. */
function MixBar({
  pass,
  fail,
  pending,
}: {
  pass: number;
  fail: number;
  pending: number;
}) {
  const total = pass + fail + pending;
  if (total === 0) return null;

  const segments = [
    { count: pass, className: "bg-accent", noun: "passing" },
    { count: fail, className: "bg-rust", noun: "rejected" },
    { count: pending, className: "bg-border-strong", noun: "in flight" },
  ].filter((segment) => segment.count > 0);

  const label = segments
    .map((segment) => `${segment.count} ${segment.noun}`)
    .join(", ");

  return (
    <div
      className="mt-3 flex h-1 w-full gap-px overflow-hidden bg-border"
      role="img"
      aria-label={label}
      title={label}
    >
      {segments.map((segment) => (
        <span
          key={segment.noun}
          className={segment.className}
          style={{ width: `${(segment.count / total) * 100}%` }}
        />
      ))}
    </div>
  );
}

/** Simple Icons NVIDIA mark; fills with `currentColor`. */
function NvidiaMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
      aria-hidden
    >
      <path d="M8.948 8.798v-1.43a6.7 6.7 0 0 1 .424-.018c3.922-.124 6.493 3.374 6.493 3.374s-2.774 3.851-5.75 3.851c-.398 0-.787-.062-1.158-.185v-4.346c1.528.185 1.837.857 2.747 2.385l2.04-1.714s-1.492-1.952-4-1.952a6.016 6.016 0 0 0-.796.035m0-4.735v2.138l.424-.027c5.45-.185 9.01 4.47 9.01 4.47s-4.08 4.964-8.33 4.964c-.37 0-.733-.035-1.095-.097v1.325c.3.035.61.062.91.062 3.957 0 6.82-2.023 9.593-4.408.459.371 2.34 1.263 2.73 1.652-2.633 2.208-8.772 3.984-12.253 3.984-.335 0-.653-.018-.971-.053v1.864H24V4.063zm0 10.326v1.131c-3.657-.654-4.673-4.46-4.673-4.46s1.758-1.944 4.673-2.262v1.237H8.94c-1.528-.186-2.73 1.245-2.73 1.245s.68 2.412 2.739 3.11M2.456 10.9s2.164-3.197 6.5-3.533V6.201C4.153 6.59 0 10.653 0 10.653s2.35 6.802 8.948 7.42v-1.237c-4.84-.6-6.492-5.936-6.492-5.936z" />
    </svg>
  );
}

/** Datacenter / workstation families Pareton campaigns ship against. */
function isNvidiaSku(sku: string): boolean {
  return /(?:^|[_-])(A10|A30|A40|A100|H100|H200|B100|B200|L4|L40S?|V100|P100|T4|GH200|GB200|RTX\d*)(?:[_-]|$)/i.test(
    sku
  );
}

/** `A100_80GB` reads as `A100`; the memory size is implied by the family. */
function shortSku(sku: string): string {
  return sku.replace(/[_-]\d+\s*GB$/i, "");
}

function GpuTile({ campaign }: { campaign: Campaign }) {
  const skus = campaign.gpu_skus;
  const { gpu_count } = campaign.bench;

  if (skus.length === 0) {
    return <Tile icon={Cpu} label="Target GPUs" value="—" />;
  }

  const shown = skus.slice(0, 2).map(shortSku).join(" · ");
  const value = skus.length > 2 ? `${shown} +${skus.length - 2}` : shown;

  return (
    <Tile
      icon={skus.every(isNvidiaSku) ? NvidiaMark : Cpu}
      label="Target GPUs"
      value={<span title={skus.join(", ")}>{value}</span>}
      hint={`${gpu_count}× GPU per bench`}
    />
  );
}

function SubmissionsTile({ data }: { data: SubmissionsPage | null }) {
  if (!data) {
    return <Tile icon={Layers} label="Submissions" value="—" />;
  }

  const rows = data.submissions;
  const pass = rows.filter((row) => row.bench_verdict === "pass").length;
  const fail = rows.filter(
    (row) => row.bench_verdict !== null && row.bench_verdict !== "pass"
  ).length;
  const pending = rows.length - pass - fail;
  const complete = rows.length === data.total;

  return (
    <Tile
      icon={Layers}
      label="Submissions"
      value={data.total}
      hint={
        data.total === 0
          ? "none yet"
          : complete
            ? `${pass} passing · ${fail} rejected`
            : `${rows.length} on this page`
      }
    >
      <MixBar pass={pass} fail={fail} pending={pending} />
    </Tile>
  );
}

/**
 * The four facts that decide whether a miner works this campaign: the hardware
 * needed, the competition, and the two bars a patch has to clear. Deliberately
 * free of the window, which stops meaning anything once campaigns run open
 * ended.
 */
export function CampaignStats({
  campaign,
  submissions,
}: {
  campaign: Campaign;
  submissions: SubmissionsPage | null;
}) {
  const { cross_env } = campaign.bench;
  const skuCount = campaign.gpu_skus.length;

  return (
    <section
      aria-label="Campaign summary"
      className="grid grid-cols-2 gap-px border border-border bg-border lg:grid-cols-4"
    >
      <GpuTile campaign={campaign} />
      <SubmissionsTile data={submissions} />
      <Tile
        icon={TrendingUp}
        label="Speedup floor"
        value={`≥ ${cross_env.min_speedup_each}×`}
        hint={
          skuCount > 1
            ? `${cross_env.aggregate} of ${skuCount} GPU SKUs`
            : cross_env.speedup_metric.replaceAll("_", " ")
        }
      />
      <Tile
        icon={Timer}
        label="p99 latency"
        value={`${campaign.sla.p99_ttft_ms} / ${campaign.sla.p99_itl_ms} ms`}
        hint="TTFT / ITL ceiling"
      />
    </section>
  );
}
