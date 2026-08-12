import {
  Cpu,
  ExternalLink,
  FolderTree,
  GitBranch,
  Target,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { CopyableMono } from "@/components/dashboard/copyable-mono";
import { truncateHash, truncateMiddle } from "@/lib/api/format";
import { cn } from "@/lib/cn";
import type { Campaign } from "@/lib/api/types";

/**
 * Bordered panel with a mono caps header.
 *
 * `bodyClassName` switches between the stacked sidebar form and the wide
 * hairline grid used for the reference band, where the 1px gap over a border
 * background draws the rules between cells.
 */
function Panel({
  icon: Icon,
  title,
  bodyClassName = "divide-y divide-border",
  children,
}: {
  icon: LucideIcon;
  title: string;
  bodyClassName?: string;
  children: ReactNode;
}) {
  return (
    <section aria-label={title} className="border border-border">
      <header className="flex items-center gap-2 border-b border-border px-4 py-3">
        <Icon className="size-3.5 shrink-0 text-muted" aria-hidden />
        <h2 className="font-mono text-caption uppercase tracking-caps text-muted">
          {title}
        </h2>
      </header>
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

function Row({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("px-4 py-3", className)}>
      <p className="font-mono text-caption uppercase tracking-caps text-muted">
        {label}
      </p>
      <div className="mt-1.5 font-mono text-body-sm text-foreground">
        {children}
      </div>
    </div>
  );
}

/** Cell wrapper for a grid panel, restoring the page background over the grid. */
function GridRow(props: { label: string; children: ReactNode }) {
  return <Row {...props} className="bg-background" />;
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

function Tags({
  values,
  tone = "neutral",
  nvidia = false,
}: {
  values: string[];
  tone?: "neutral" | "accent" | "rust";
  /** When true, NVIDIA SKUs get a one-color brand mark. */
  nvidia?: boolean;
}) {
  if (values.length === 0) {
    return <span className="text-muted">—</span>;
  }

  const border =
    tone === "accent"
      ? "border-accent/40"
      : tone === "rust"
        ? "border-rust/40"
        : "border-border";

  return (
    <div className="flex flex-wrap gap-1.5">
      {values.map((value) => (
        <span
          key={value}
          className={`inline-flex items-center gap-1.5 border px-2 py-0.5 text-caption text-secondary ${border}`}
        >
          {nvidia && isNvidiaSku(value) ? (
            <NvidiaMark className="size-3 shrink-0" />
          ) : null}
          {value}
        </span>
      ))}
    </div>
  );
}

/** Strips the scheme so a long artifact URL still reads in a narrow column. */
function linkLabel(url: string): string {
  return truncateMiddle(url.replace(/^https?:\/\//, ""), 28, 12);
}

function ArtifactLink({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex max-w-full items-center gap-1.5 text-secondary underline decoration-border underline-offset-4 transition-colors hover:text-foreground"
    >
      <span className="truncate">{linkLabel(href)}</span>
      <ExternalLink className="size-3 shrink-0" aria-hidden />
    </a>
  );
}

/** Sidebar column: what a patch has to achieve and where it runs. */
export function CampaignRequirements({ campaign }: { campaign: Campaign }) {
  const { model, cross_env, gpu_count } = campaign.bench;

  const modelConfig = [
    model.dtype,
    model.quantization ?? "no quantization",
    `${model.max_model_len.toLocaleString("en-US")} ctx`,
    gpu_count > 1 ? `${gpu_count}× GPUs` : null,
  ].filter((part): part is string => part !== null);

  return (
    <aside className="grid gap-6 sm:grid-cols-2 xl:grid-cols-1 xl:content-start">
      <Panel icon={Target} title="Objective">
        <Row label="Priority metric">
          {campaign.priority_metric.replaceAll("_", " ") || "—"}
        </Row>
        <Row label="Win condition">
          <p className="leading-relaxed text-secondary">
            {campaign.success_threshold || "—"}
          </p>
        </Row>
        <Row label="Speedup metric">
          <span className="text-secondary">
            {cross_env.speedup_metric.replaceAll("_", " ")}
          </span>
        </Row>
        <Row label="Quality floor">
          <span className="text-secondary">
            {campaign.sla.quality_floor_spec || "—"}
          </span>
        </Row>
      </Panel>

      <Panel icon={Cpu} title="Environment">
        <Row label="Target GPU SKUs">
          <Tags values={campaign.gpu_skus} nvidia />
        </Row>
        <Row label="Model config">
          <span className="text-secondary">{modelConfig.join(" · ")}</span>
        </Row>
      </Panel>
    </aside>
  );
}

/**
 * Full-width reference band: the digests and paths needed to reproduce or audit
 * a run. Last in the reading order because nobody opens the page for these.
 */
export function CampaignReference({ campaign }: { campaign: Campaign }) {
  return (
    <div className="space-y-6">
      <Panel
        icon={GitBranch}
        title="Provenance"
        bodyClassName="grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-3"
      >
        <GridRow label="Baseline repo">
          <ArtifactLink href={campaign.baseline_repo} />
        </GridRow>
        <GridRow label="Baseline commit">
          <CopyableMono
            value={campaign.baseline_commit}
            display={truncateMiddle(campaign.baseline_commit, 12, 8)}
          />
        </GridRow>
        <GridRow label="Manifest hash">
          <CopyableMono
            value={campaign.manifest_hash}
            display={truncateHash(campaign.manifest_hash)}
          />
        </GridRow>
        <GridRow label="Base image">
          <CopyableMono
            value={campaign.base_image_digest}
            display={truncateHash(campaign.base_image_digest)}
          />
        </GridRow>
        <GridRow label="Baseline engine">
          <CopyableMono
            value={campaign.bench.baseline_engine_image_digest}
            display={truncateHash(campaign.bench.baseline_engine_image_digest)}
          />
        </GridRow>
        <GridRow label="Workload trace">
          <ArtifactLink href={campaign.workload_trace_url} />
          <div className="mt-1.5">
            <CopyableMono
              value={campaign.workload_trace_sha256}
              display={truncateHash(campaign.workload_trace_sha256)}
            />
          </div>
        </GridRow>
        {campaign.scoring_config_sha256 ? (
          <GridRow label="Scoring config">
            <CopyableMono
              value={campaign.scoring_config_sha256}
              display={truncateHash(campaign.scoring_config_sha256)}
            />
          </GridRow>
        ) : null}
      </Panel>

      <Panel
        icon={FolderTree}
        title="Patch scope"
        bodyClassName="grid gap-px bg-border sm:grid-cols-2"
      >
        <GridRow label="Allowed paths">
          <Tags values={campaign.allowed_paths} tone="accent" />
        </GridRow>
        <GridRow label="Denied paths">
          <Tags values={campaign.denied_paths} tone="rust" />
        </GridRow>
      </Panel>
    </div>
  );
}
