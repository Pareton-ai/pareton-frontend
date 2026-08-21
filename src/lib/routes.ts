/** Dashboard URL builders. Patch hashes contain a colon, so they are encoded. */

const PATCH_HASH_RE = /^sha256:[0-9a-f]{64}$/;

export function campaignHref(campaignId: string): string {
  return `/dashboard/campaigns/${encodeURIComponent(campaignId)}`;
}

/**
 * Campaign page with independent paginators.
 *
 * `page` is the rounds table (the primary listing). `submissions` is the
 * flat outcome list underneath. Page 1 is omitted so the bare campaign URL
 * stays the first page of both.
 */
export function campaignListHref(
  campaignId: string,
  query: { page?: number; submissions?: number } = {}
): string {
  const params = new URLSearchParams();
  if (query.page != null && query.page > 1) {
    params.set("page", String(query.page));
  }
  if (query.submissions != null && query.submissions > 1) {
    params.set("submissions", String(query.submissions));
  }
  const qs = params.toString();
  const base = campaignHref(campaignId);
  return qs ? `${base}?${qs}` : base;
}

export function roundHref(campaignId: string, ordinal: number): string {
  return `/dashboard/campaigns/${encodeURIComponent(campaignId)}/rounds/${ordinal}`;
}

/**
 * Read a `rounds/[ordinal]` route param back into an ordinal.
 *
 * Ordinals count from 1, so anything that is not a plain decimal integer
 * (`01`, `-1`, `1e3`, `12abc`, a float) names no round and must 404 rather
 * than reach the API.
 */
export function parseRoundOrdinal(param: string): number | null {
  if (!/^[1-9][0-9]*$/.test(param)) return null;
  const ordinal = Number.parseInt(param, 10);
  return Number.isSafeInteger(ordinal) ? ordinal : null;
}

export function submissionHref(campaignId: string, patchHash: string): string {
  return `/dashboard/campaigns/${encodeURIComponent(campaignId)}/submissions/${encodeURIComponent(patchHash)}`;
}

/** Bittensor subnet the campaigns run on, used for external explorer links. */
const NETUID = 10;

/** Public explorer page for a miner hotkey on our subnet. */
export function minerExplorerHref(hotkey: string): string {
  return `https://taomarketcap.com/subnets/${NETUID}/miners?query=${encodeURIComponent(hotkey)}`;
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
