import { Cpu, Layers, Timer, TrendingUp } from "lucide-react";
import { gpuIconFor, shortSku } from "@/components/dashboard/gpu";
import { StatStrip, StatTile } from "@/components/dashboard/panel";
import { formatRatio } from "@/lib/api/format";
import type { Campaign, SubmissionsPage } from "@/lib/api/types";

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

function GpuTile({ campaign }: { campaign: Campaign }) {
  const skus = campaign.gpu_skus;
  const { gpu_count } = campaign.bench;

  if (skus.length === 0) {
    return <StatTile icon={Cpu} label="Target GPUs" value="—" />;
  }

  const shown = skus.slice(0, 2).map(shortSku).join(" · ");
  const value = skus.length > 2 ? `${shown} +${skus.length - 2}` : shown;

  return (
    <StatTile
      icon={gpuIconFor(skus)}
      label="Target GPUs"
      value={<span title={skus.join(", ")}>{value}</span>}
      hint={`${gpu_count}× GPU per bench`}
    />
  );
}

function SubmissionsTile({ data }: { data: SubmissionsPage | null }) {
  if (!data) {
    return <StatTile icon={Layers} label="Submissions" value="—" />;
  }

  const rows = data.submissions;
  const pass = rows.filter((row) => row.bench_verdict === "pass").length;
  const fail = rows.filter(
    (row) => row.bench_verdict !== null && row.bench_verdict !== "pass"
  ).length;
  const pending = rows.length - pass - fail;
  // Only the loaded page is available; a bar next to the campaign total would
  // read as global (mental-model mismatch). Show mix only when the page is the
  // full set.
  const complete = rows.length === data.total;

  return (
    <StatTile
      icon={Layers}
      label="Submissions"
      value={data.total}
      hint={
        data.total === 0
          ? "none yet"
          : complete
            ? `${pass} passing · ${fail} rejected`
            : `${rows.length} listed below`
      }
    >
      {complete ? <MixBar pass={pass} fail={fail} pending={pending} /> : null}
    </StatTile>
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
    <StatStrip label="Campaign summary" className="grid-cols-2 lg:grid-cols-4">
      <GpuTile campaign={campaign} />
      <SubmissionsTile data={submissions} />
      <StatTile
        icon={TrendingUp}
        label="Speedup floor"
        value={`≥ ${formatRatio(cross_env.min_speedup_each)}`}
        hint={
          skuCount > 1
            ? `${cross_env.aggregate} of ${skuCount} GPU SKUs`
            : cross_env.speedup_metric.replaceAll("_", " ")
        }
      />
      <StatTile
        icon={Timer}
        label="p99 latency"
        value={`${campaign.sla.p99_ttft_ms} / ${campaign.sla.p99_itl_ms} ms`}
        hint="TTFT / ITL ceiling"
      />
    </StatStrip>
  );
}
