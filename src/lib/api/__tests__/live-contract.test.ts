/**
 * Opt-in live check against the deployed API. Skipped unless
 * PARETON_LIVE_API_TESTS is set (`npm run test:live`).
 *
 * Do not run this against the currently deployed API: it still serves the
 * pre-round payload. Re-enable after the PAR-80 API is live.
 */

import { describe, expect, it } from "vitest";
import {
  parseCampaign,
  parseSubmissionDetail,
  parseSubmissionsPage,
} from "@/lib/api/parse";
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
            .map((j) => j.status)
            .join(" ")} stalled=${isStalled(detail.latest_state, detail.jobs)}${
            failed ? ` err=${failed.last_error}` : ""
          }`
        );

        expect(detail.latest_state).toBe(body.latest_state);
        expect(detail.submission.campaign_id).toBe(CID);
        expect(detail.submission.patch_hash).toBe(row.patch_hash);
        expect(detail.jobs).toHaveLength(body.jobs.length);
        expect(detail.jobs.every((j) => j.status !== "")).toBe(true);
        expect(detail.events.every((e) => e.created_at !== "")).toBe(true);
        expect(
          detail.round === null || typeof detail.round.ordinal === "number"
        ).toBe(true);
      }
    }, 60_000);

    it("parses live campaign correctness thresholds without crashing on drafts", async () => {
      const openId = "1f0a7c64-3b52-4d19-9a83-5c6e1d2f4b70";
      const draftId = "b3f1c9d2-4a5e-4c8b-9f10-2e7d6a4b8c31";

      const open = parseCampaign(
        await (await fetch(`${API}/v1/campaigns/${openId}`)).json()
      );
      expect(open.bench.correctness).toEqual({
        thresholds: {
          argmax_mismatch_rate: 0.001,
          mean_abs_logprob_diff: 0.0246,
          max_abs_logprob_diff: 0.164,
        },
      });
      expect(open.scoring_rule.name).not.toBe("");

      const draft = parseCampaign(
        await (await fetch(`${API}/v1/campaigns/${draftId}`)).json()
      );
      expect(draft.bench.correctness).toBeNull();
      expect(draft.sla.quality_floor_spec).not.toBe("");
    }, 20_000);
  }
);
