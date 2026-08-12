import {
  Clock,
  Layers,
  Timer,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { Countdown } from "@/components/dashboard/countdown";
import { formatDurationRemaining, formatUtc } from "@/lib/api/format";
import type { Campaign, SubmissionsPage } from "@/lib/api/types";

function Tile({
  icon: Icon,
  label,
  value,
  valueClassName = "text-foreground",
  hint,
  children,
}: {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  valueClassName?: string;
  hint?: string;
  children?: ReactNode;
}) {
  return (
    <div className="bg-background px-5 py-4">
      <div className="flex items-center gap-2">
        <Icon className="size-3.5 shrink-0 text-muted" aria-hidden />
        <p className="font-mono text-caption uppercase tracking-caps text-muted">
          {label}
        </p>
      </div>
      <p className={`mt-3 font-mono text-title ${valueClassName}`}>{value}</p>
      {children}
      {hint ? (
        <p className="mt-2 font-mono text-body-sm text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

/** Single-fill progress rule, e.g. how much of the window has burned down. */
function Meter({ fraction, label }: { fraction: number; label: string }) {
  return (
    <div
      className="mt-3 h-1 w-full bg-border"
      role="img"
      aria-label={label}
      title={label}
    >
      <div
        className="h-full bg-accent"
        style={{ width: `${Math.round(fraction * 100)}%` }}
      />
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

function WindowTile({ campaign }: { campaign: Campaign }) {
  const opensAt = new Date(campaign.window.opens_at).getTime();
  const closesAt = new Date(campaign.window.closes_at).getTime();
  // Render-time snapshot of the window; the page revalidates on a short cycle.
  // eslint-disable-next-line react-hooks/purity -- Date.now is the window boundary
  const now = Date.now();

  if (Number.isNaN(opensAt) || Number.isNaN(closesAt)) {
    return <Tile icon={Clock} label="Window" value="—" />;
  }

  if (now < opensAt) {
    return (
      <Tile
        icon={Clock}
        label="Opens in"
        value={formatDurationRemaining(campaign.window.opens_at, now)}
        hint={formatUtc(campaign.window.opens_at)}
      />
    );
  }

  if (now >= closesAt) {
    return (
      <Tile
        icon={Clock}
        label="Window"
        value="Closed"
        hint={formatUtc(campaign.window.closes_at)}
      >
        <Meter fraction={1} label="Window complete" />
      </Tile>
    );
  }

  const elapsed = (now - opensAt) / (closesAt - opensAt);

  return (
    <Tile
      icon={Clock}
      label="Closes in"
      value={
        <Countdown
          closesAt={campaign.window.closes_at}
          className="text-title"
        />
      }
      valueClassName="text-accent"
      hint={formatUtc(campaign.window.closes_at)}
    >
      <Meter
        fraction={elapsed}
        label={`${Math.round(elapsed * 100)}% of the window elapsed`}
      />
    </Tile>
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
 * The four numbers that decide whether a miner works this campaign: time left,
 * competition, and the two bars a patch has to clear.
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
      <WindowTile campaign={campaign} />
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
