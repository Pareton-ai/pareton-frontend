/** Dashboard URL builders. Patch hashes contain a colon, so they are encoded. */

const PATCH_HASH_RE = /^sha256:[0-9a-f]{64}$/;

export function campaignHref(campaignId: string): string {
  return `/dashboard/campaigns/${encodeURIComponent(campaignId)}`;
}

export function submissionHref(campaignId: string, patchHash: string): string {
  return `/dashboard/campaigns/${encodeURIComponent(campaignId)}/submissions/${encodeURIComponent(patchHash)}`;
}

/** True for a canonical on-chain patch digest (`sha256:` + 64 lowercase hex). */
export function isPatchHash(value: string): boolean {
  return PATCH_HASH_RE.test(value);
}

/**
 * Read a `patch_hash` route param back into a real hash.
 *
 * Next.js keeps the segment percent-encoded (`sha256%3A…`), and it does so even
 * when the incoming URL used a literal colon, so encoding it again for the API
 * call would double-escape it. Patch hashes are `sha256:` plus hex, so decoding
 * an already-decoded value is a no-op.
 */
export function decodePatchHash(param: string): string {
  try {
    return decodeURIComponent(param);
  } catch {
    return param;
  }
}
