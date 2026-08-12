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

function Tags({
  values,
  tone = "neutral",
}: {
  values: string[];
  tone?: "neutral" | "accent" | "rust";
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
          className={`inline-flex border px-2 py-0.5 text-caption text-secondary ${border}`}
        >
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

/** Sidebar column: what a patch has to achieve and what it runs against. */
export function CampaignRequirements({ campaign }: { campaign: Campaign }) {
  const { model, cross_env } = campaign.bench;

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
        {cross_env.speedup_metric &&
        cross_env.speedup_metric !== campaign.priority_metric ? (
          <Row label="Speedup metric">
            <span className="text-secondary">
              {cross_env.speedup_metric.replaceAll("_", " ")}
            </span>
          </Row>
        ) : null}
        <Row label="Quality floor">
          <span className="text-secondary">
            {campaign.sla.quality_floor_spec || "—"}
          </span>
        </Row>
      </Panel>

      <Panel icon={Cpu} title="Model">
        <Row label="Precision">
          <span className="text-secondary">
            {model.quantization
              ? `${model.dtype} · ${model.quantization}`
              : model.dtype}
          </span>
        </Row>
        <Row label="Context window">
          <span className="text-secondary">
            {model.max_model_len.toLocaleString("en-US")} tokens
          </span>
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
