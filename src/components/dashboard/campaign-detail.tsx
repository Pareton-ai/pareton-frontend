import { Countdown } from "@/components/dashboard/countdown";
import { CopyableMono } from "@/components/dashboard/copyable-mono";
import { Field } from "@/components/dashboard/field";
import { CampaignStatusChip } from "@/components/dashboard/status-chip";
import { formatUtc, truncateHash, truncateMiddle } from "@/lib/api/format";
import type { Campaign } from "@/lib/api/types";

export function CampaignDetailHeader({ campaign }: { campaign: Campaign }) {
  const { model } = campaign.bench;

  return (
    <section className="border border-border">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border px-5 py-5 sm:px-6">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <CampaignStatusChip status={campaign.status} />
            <span className="font-mono text-body-sm text-muted">
              {truncateMiddle(campaign.campaign_id, 10, 8)}
            </span>
          </div>
          <h1 className="mt-4 text-display-section font-medium tracking-tight text-foreground">
            {model.hf_repo}
            <span className="text-secondary">
              {" "}
              @{truncateMiddle(model.hf_revision, 8, 6)}
            </span>
          </h1>
          <p className="mt-2 font-mono text-body-sm text-secondary">
            dtype {model.dtype}
            {model.quantization ? ` · ${model.quantization}` : ""}
            {" · "}
            max_model_len {model.max_model_len}
          </p>
        </div>

        {campaign.status === "open" ? (
          // Render-time window check for the public dashboard snapshot.
          // eslint-disable-next-line react-hooks/purity -- Date.now is the open/closed boundary
          new Date(campaign.window.closes_at).getTime() > Date.now() ? (
            <div className="text-right">
              <p className="font-mono text-caption uppercase tracking-caps text-muted">
                Closes in
              </p>
              <Countdown
                closesAt={campaign.window.closes_at}
                className="mt-2 text-title text-accent"
              />
            </div>
          ) : (
            <p className="font-mono text-body-sm uppercase tracking-caps text-muted">
              Closing
            </p>
          )
        ) : null}
      </div>

      <div className="divide-y divide-border">
        <Field label="Window">
          <p className="font-mono text-body-sm text-secondary">
            {formatUtc(campaign.window.opens_at)}
            {" → "}
            {formatUtc(campaign.window.closes_at)}
          </p>
        </Field>

        <Field label="Target GPU SKUs">
          <p className="font-mono text-body-sm text-secondary">
            {campaign.gpu_skus.join(", ") || "—"}
            {campaign.bench.gpu_count > 1
              ? ` · ${campaign.bench.gpu_count}× GPUs`
              : ""}
          </p>
        </Field>

        <Field label="SLA gates">
          <ul className="space-y-1 font-mono text-body-sm text-secondary">
            <li>p99 TTFT ≤ {campaign.sla.p99_ttft_ms} ms</li>
            <li>p99 ITL ≤ {campaign.sla.p99_itl_ms} ms</li>
            <li className="text-caption leading-normal">
              {campaign.sla.quality_floor_spec}
            </li>
          </ul>
        </Field>

        <Field label="Baseline">
          <p className="break-all font-mono text-body-sm text-secondary">
            {campaign.baseline_repo}
          </p>
          <div className="mt-2">
            <CopyableMono
              value={campaign.baseline_commit}
              display={truncateMiddle(campaign.baseline_commit, 10, 8)}
            />
          </div>
        </Field>

        <Field label="Manifest hash">
          <CopyableMono
            value={campaign.manifest_hash}
            display={truncateHash(campaign.manifest_hash)}
          />
        </Field>

        <Field label="Image digests">
          <div className="flex flex-col items-start gap-2">
            <CopyableMono
              value={campaign.base_image_digest}
              display={`base ${truncateHash(campaign.base_image_digest)}`}
            />
            <CopyableMono
              value={campaign.bench.baseline_engine_image_digest}
              display={`engine ${truncateHash(campaign.bench.baseline_engine_image_digest)}`}
            />
          </div>
        </Field>

        <Field label="Priority metric">
          <p className="font-mono text-body-sm text-secondary">
            {campaign.priority_metric.replaceAll("_", " ") || "—"}
          </p>
        </Field>

        <Field label="Success threshold">
          <p className="font-mono text-body-sm text-secondary">
            {campaign.success_threshold || "—"}
          </p>
        </Field>

        <Field label="Bench speedup floor">
          <p className="font-mono text-body-sm text-secondary">
            min_speedup_each ≥ {campaign.bench.cross_env.min_speedup_each}
            <span className="text-muted">
              {" "}
              · {campaign.bench.cross_env.speedup_metric.replaceAll("_", " ")}
            </span>
          </p>
        </Field>
      </div>
    </section>
  );
}
