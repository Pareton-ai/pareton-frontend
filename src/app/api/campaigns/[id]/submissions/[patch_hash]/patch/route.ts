import { NextResponse } from "next/server";
import { isSafeArtifactUrl } from "@/lib/api/artifacts";
import { getSubmission } from "@/lib/api/endpoints";
import { isNotFound } from "@/lib/api/errors";
import { isAwaitingPatchRevealTime } from "@/lib/api/types";
import { decodePatchHash, isPatchHash } from "@/lib/routes";

/** Server-only bridge for the patch control, like the existing build-log proxy. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; patch_hash: string }> }
) {
  const { id, patch_hash } = await params;
  const patchHash = decodePatchHash(patch_hash);
  const headers = { "Cache-Control": "no-store" };
  if (!isPatchHash(patchHash)) {
    return NextResponse.json(
      { error: "Invalid patch hash." },
      { status: 404, headers }
    );
  }
  try {
    // This read can publish the diff to S3; allow longer than an ordinary read.
    const detail = await getSubmission(id, patchHash, { timeoutMs: 60_000 });
    if (detail.submission.campaign_id !== id) {
      return NextResponse.json(
        { error: "Submission not found." },
        { status: 404, headers }
      );
    }
    const { retrieval_url: url, patch_reveal_at: revealAt } = detail.submission;
    return NextResponse.json(
      {
        url,
        revealAt,
        downloadable: isSafeArtifactUrl(url),
        awaitingRevealTime: isAwaitingPatchRevealTime(detail),
      },
      { headers }
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Patch availability is temporarily unavailable." },
      { status: isNotFound(error) ? 404 : 503, headers }
    );
  }
}
