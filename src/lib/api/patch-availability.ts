import { isSafeArtifactUrl } from "./artifacts";
import type { Submission } from "./types";

export type PatchAvailability = {
  mode: "private" | "public_after_reveal";
  url: string;
  downloadable: boolean;
  revealAt: string | null;
};

export function getPatchAvailability(
  submission: Submission
): PatchAvailability {
  if (submission.patch_visibility.mode !== "public_after_reveal") {
    return { mode: "private", url: "", downloadable: false, revealAt: null };
  }
  const downloadable = isSafeArtifactUrl(submission.retrieval_url);
  return {
    mode: "public_after_reveal",
    url: downloadable ? submission.retrieval_url : "",
    downloadable,
    revealAt: submission.patch_reveal_at,
  };
}
