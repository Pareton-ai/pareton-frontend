import { NextResponse } from "next/server";
import { BUILD_LOG_MAX_TAIL, getSubmissionBuildLog } from "@/lib/api/endpoints";
import { isNotFound, isUnavailable } from "@/lib/api/errors";
import { decodePatchHash, isPatchHash } from "@/lib/routes";

/**
 * Browser-facing proxy for the build log tail.
 *
 * The dashboard is otherwise server-rendered, but a running build produces
 * output for well over an hour, so the log viewer polls. This keeps
 * `PARETON_API_URL` on the server per `src/lib/api/README.md`.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; patch_hash: string }> }
) {
  const { id: campaignId, patch_hash: rawPatchHash } = await params;
  const patchHash = decodePatchHash(rawPatchHash);
  if (!isPatchHash(patchHash)) {
    return NextResponse.json(
      { available: false, text: "", error: "Invalid patch hash." },
      { status: 404, headers: { "Cache-Control": "no-store" } }
    );
  }
  const requested = Number.parseInt(
    new URL(request.url).searchParams.get("tail") ?? "",
    10
  );
  const tail = Number.isFinite(requested)
    ? Math.min(Math.max(requested, 1), BUILD_LOG_MAX_TAIL)
    : 400;

  try {
    const text = await getSubmissionBuildLog(campaignId, patchHash, { tail });
    return NextResponse.json(
      { available: true, text },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    if (isNotFound(error)) {
      return NextResponse.json(
        { available: false, text: "" },
        { headers: { "Cache-Control": "no-store" } }
      );
    }
    return NextResponse.json(
      {
        available: false,
        text: "",
        error: isUnavailable(error)
          ? "The API is temporarily unavailable."
          : "Could not reach the build log.",
      },
      { status: 502, headers: { "Cache-Control": "no-store" } }
    );
  }
}
