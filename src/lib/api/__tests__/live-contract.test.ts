/**
 * Opt-in live check against the deployed API. Skipped unless
 * PARETON_LIVE_API_TESTS is set (`npm run test:live`).
 */

import { describe, expect, it } from "vitest";
import { parseSubmissionDetail, parseSubmissionsPage } from "@/lib/api/parse";
import { getFailedSubmissionJob, isStalled } from "@/lib/api/types";

const API = process.env.PARETON_API_URL ?? "https://api.pareton.ai";
const CID =
  process.env.PARETON_LIVE_CAMPAIGN_ID ??
  "c02a40b0-6eb3-4853-827e-22d4794b814e";

describe.skipIf(!process.env.PARETON_LIVE_API_TESTS)(
  "live api contract",
  () => {
    it("parses every live submission in the campaign", async () => {
      const listBody = await (
        await fetch(`${API}/v1/campaigns/${CID}/submissions?limit=50`)
      ).json();
      const page = parseSubmissionsPage(listBody, {
        campaign_id: CID,
        limit: 50,
        offset: 0,
      });
      expect(page.submissions.length).toBeGreaterThan(0);

      for (const row of page.submissions) {
        expect(row.committed_at).not.toBe("");
        expect(row.latest_state).not.toBe("");
      }

      for (const row of page.submissions) {
        const body = await (
          await fetch(
            `${API}/v1/campaigns/${CID}/submissions/${encodeURIComponent(row.patch_hash)}`
          )
        ).json();
        const detail = parseSubmissionDetail(body);
        const failed = getFailedSubmissionJob(detail.jobs);

        console.log(
          `${row.patch_hash.slice(0, 20)} state=${detail.latest_state} jobs=${detail.jobs
            .map((j) => `${j.kind}:${j.status}`)
            .join(" ")} stalled=${isStalled(detail.latest_state, detail.jobs)}${
            failed ? ` err=${failed.last_error}` : ""
          }`
        );

        expect(detail.latest_state).toBe(body.latest_state);
        expect(detail.submission.campaign_id).toBe(CID);
        expect(detail.submission.patch_hash).toBe(row.patch_hash);
        expect(detail.jobs).toHaveLength(body.jobs.length);
        expect(detail.jobs.every((j) => j.kind !== "" && j.status !== "")).toBe(
          true
        );
        expect(detail.events.every((e) => e.created_at !== "")).toBe(true);
        expect(detail.bench_verdict).toBe(body.bench_verdict);
      }
    }, 60_000);
  }
);
