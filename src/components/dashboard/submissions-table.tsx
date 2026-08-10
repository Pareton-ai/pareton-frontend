import Link from "next/link";
import { redirect } from "next/navigation";
import { CopyableMono } from "@/components/dashboard/copyable-mono";
import {
  BenchVerdictChip,
  PipelineChip,
} from "@/components/dashboard/status-chip";
import { SectionUnavailable } from "@/components/dashboard/section-unavailable";
import { getCampaignSubmissions } from "@/lib/api/endpoints";
import { isUnavailable } from "@/lib/api/errors";
import { formatUtc, truncateHash, truncateMiddle } from "@/lib/api/format";
import { submissionHref } from "@/lib/routes";
import type { CampaignStatus, SubmissionsPage } from "@/lib/api/types";

const PAGE_SIZE = 25;

type SubmissionsTableProps = {
  campaignId: string;
  page: number;
  campaignStatus: CampaignStatus;
};

function EmptySubmissions({ status }: { status: CampaignStatus }) {
  const copy =
    status === "open"
      ? {
          title: "Awaiting first submission",
          body: "This campaign is open. Miner patches will appear here as they move through commit → verify → build → bench.",
        }
      : status === "draft"
        ? {
            title: "No submissions yet",
            body: "This campaign has not opened. Submissions will appear here once the window starts.",
          }
        : {
            title: "No submissions",
            body: "This campaign closed without recorded submissions.",
          };

  return (
    <section className="border border-border px-5 py-14 text-center sm:px-6">
      <p className="font-mono text-body-sm uppercase tracking-caps text-accent">
        {copy.title}
      </p>
      <p className="mx-auto mt-4 max-w-lg text-body-lg leading-relaxed text-secondary">
        {copy.body}
      </p>
    </section>
  );
}

function SubmissionsTableView({
  campaignId,
  page,
  data,
}: {
  campaignId: string;
  page: number;
  data: SubmissionsPage;
}) {
  const totalPages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));
  const showingFrom = data.offset + 1;
  const showingTo = Math.min(data.offset + data.submissions.length, data.total);

  return (
    <section aria-label="Submissions" className="border border-border">
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-border px-5 py-4 sm:px-6">
        <h2 className="font-mono text-body-sm uppercase tracking-caps text-muted">
          Submissions
        </h2>
        <p className="font-mono text-body-sm text-muted">
          {showingFrom}–{showingTo} of {data.total}
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px] text-left">
          <thead>
            <tr className="border-b border-border font-mono text-caption uppercase tracking-caps text-muted">
              <th className="px-5 py-3 font-normal sm:px-6">Hotkey</th>
              <th className="px-3 py-3 font-normal">Patch</th>
              <th className="px-3 py-3 font-normal">Submitted</th>
              <th className="px-3 py-3 font-normal">State</th>
              <th className="px-3 py-3 font-normal">Verdict</th>
              <th className="w-10 px-5 py-3 font-normal sm:px-6">
                <span className="sr-only">Open</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {data.submissions.map((row) => (
              <tr
                key={row.patch_hash}
                className="group border-t border-border/80 transition-colors hover:bg-accent-dim/30"
              >
                <td className="px-5 py-3.5 font-mono text-body-sm text-secondary sm:px-6">
                  {truncateMiddle(row.hotkey, 8, 6)}
                </td>
                <td className="px-3 py-3.5">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <Link
                      href={submissionHref(campaignId, row.patch_hash)}
                      className="font-mono text-body-sm text-secondary underline-offset-4 transition-colors hover:underline group-hover:text-foreground"
                    >
                      {truncateHash(row.patch_hash)}
                      <span className="sr-only"> view submission detail</span>
                    </Link>
                    <CopyableMono value={row.patch_hash} display="copy" />
                  </div>
                </td>
                <td className="px-3 py-3.5 font-mono text-body-sm text-secondary">
                  {formatUtc(row.committed_at)}
                </td>
                <td className="px-3 py-3.5">
                  <PipelineChip state={row.latest_state} />
                </td>
                <td className="px-3 py-3.5">
                  <BenchVerdictChip verdict={row.bench_verdict} />
                </td>
                <td className="px-5 py-3.5 text-right font-mono text-body-sm text-muted opacity-0 transition-opacity group-hover:opacity-100 sm:px-6">
                  <Link
                    href={submissionHref(campaignId, row.patch_hash)}
                    aria-label="View submission detail"
                    className="transition-colors hover:text-foreground"
                  >
                    →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center justify-between border-t border-border px-5 py-4 sm:px-6">
          {page > 1 ? (
            <Link
              href={`/dashboard/campaigns/${campaignId}?page=${page - 1}`}
              className="font-mono text-body-sm uppercase tracking-caps text-muted transition-colors hover:text-foreground"
            >
              ← Prev
            </Link>
          ) : (
            <span />
          )}
          <p className="font-mono text-body-sm text-muted">
            Page {page} / {totalPages}
          </p>
          {page < totalPages ? (
            <Link
              href={`/dashboard/campaigns/${campaignId}?page=${page + 1}`}
              className="font-mono text-body-sm uppercase tracking-caps text-muted transition-colors hover:text-foreground"
            >
              Next →
            </Link>
          ) : (
            <span />
          )}
        </div>
      ) : null}
    </section>
  );
}

export async function SubmissionsTable({
  campaignId,
  page,
  campaignStatus,
}: SubmissionsTableProps) {
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const offset = (safePage - 1) * PAGE_SIZE;

  let data: SubmissionsPage | null = null;
  let error: unknown = null;
  try {
    data = await getCampaignSubmissions(campaignId, {
      limit: PAGE_SIZE,
      offset,
    });
  } catch (err) {
    error = err;
  }

  if (error || !data) {
    return (
      <SectionUnavailable
        message={
          isUnavailable(error)
            ? "Submissions are temporarily unavailable (API/DB)."
            : "Could not load submissions."
        }
      />
    );
  }

  if (data.total === 0) {
    return <EmptySubmissions status={campaignStatus} />;
  }

  const totalPages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));
  if (safePage > totalPages) {
    redirect(`/dashboard/campaigns/${campaignId}?page=${totalPages}`);
  }

  return (
    <SubmissionsTableView campaignId={campaignId} page={safePage} data={data} />
  );
}
