/**
 * Patch artifact URL safety.
 *
 * `retrieval_url` is miner input: it arrives in an on-chain commitment. The
 * backend allowlists it on ingest, but that check lives in another repo, so we
 * re-check here before turning it into a clickable link on pareton.ai.
 *
 * `PARETON_ARTIFACT_BASE_URL` mirrors the backend's
 * `PARETON_S3_PUBLIC_BASE_URL`. Leave it unset while artifacts are served
 * straight from the default bucket.
 */

export const DEFAULT_ARTIFACT_BASE_URL =
  "https://pareton-s3.s3.us-east-2.amazonaws.com";

export function getArtifactHost(): string {
  const raw = process.env.PARETON_ARTIFACT_BASE_URL?.trim();
  try {
    return new URL(raw || DEFAULT_ARTIFACT_BASE_URL).host;
  } catch {
    return new URL(DEFAULT_ARTIFACT_BASE_URL).host;
  }
}

/** True only for HTTPS URLs served by the configured artifact host. */
export function isSafeArtifactUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && parsed.host === getArtifactHost();
  } catch {
    return false;
  }
}
