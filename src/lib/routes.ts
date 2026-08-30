/** Dashboard URL builders. Patch hashes contain a colon, so they are encoded. */

const PATCH_HASH_RE = /^sha256:[0-9a-f]{64}$/;

export function campaignHref(campaignId: string): string {
  return `/dashboard/campaigns/${encodeURIComponent(campaignId)}`;
}

/**
 * Sections of the campaign page, in reading order.
 *
 * Tabs are URL state rather than client state so a section is shareable, the
 * browser back button steps between them, and each render fetches only the
 * panel it shows. `rounds` is the default and is omitted from the query.
 */
export const CAMPAIGN_TABS = [
  "rounds",
  "submissions",
  "metadata",
  "leaders",
] as const;

export type CampaignTab = (typeof CAMPAIGN_TABS)[number];

export const DEFAULT_CAMPAIGN_TAB: CampaignTab = "rounds";

/** Read a `?tab=` value, falling back to the default for anything unknown. */
export function parseCampaignTab(value: string | undefined): CampaignTab {
  return CAMPAIGN_TABS.find((tab) => tab === value) ?? DEFAULT_CAMPAIGN_TAB;
}

/**
 * Campaign page with a section tab and independent paginators.
 *
 * `page` is the rounds table, `submissions` the flat outcome list. Both pagers
 * ride along on every link so switching tabs and coming back keeps your place.
 * Page 1 and the default tab are omitted so the bare campaign URL stays the
 * canonical first view.
 */
export function campaignListHref(
  campaignId: string,
  query: { page?: number; submissions?: number; tab?: CampaignTab } = {}
): string {
  const params = new URLSearchParams();
  if (query.tab != null && query.tab !== DEFAULT_CAMPAIGN_TAB) {
    params.set("tab", query.tab);
  }
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

function totalPages(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

/**
 * Campaign-list URL with both pagers clamped to available pages, or null
 * if the current query is already in range. Pass a null total to leave
 * that pager unchanged (list fetch failed).
 */
export function clampedCampaignListHref(
  campaignId: string,
  query: { page: number; submissions: number; tab?: CampaignTab },
  totals: {
    pageSize: number;
    roundsTotal?: number | null;
    submissionsTotal?: number | null;
  }
): string | null {
  const page =
    query.page > 0 && Number.isFinite(query.page) ? Math.floor(query.page) : 1;
  const submissions =
    query.submissions > 0 && Number.isFinite(query.submissions)
      ? Math.floor(query.submissions)
      : 1;
  const nextPage =
    totals.roundsTotal == null
      ? page
      : Math.min(page, totalPages(totals.roundsTotal, totals.pageSize));
  const nextSubmissions =
    totals.submissionsTotal == null
      ? submissions
      : Math.min(
          submissions,
          totalPages(totals.submissionsTotal, totals.pageSize)
        );
  if (nextPage === page && nextSubmissions === submissions) return null;
  return campaignListHref(campaignId, {
    page: nextPage,
    submissions: nextSubmissions,
    tab: query.tab,
  });
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

/** Public explorer page for a Bittensor block. */
export function blockExplorerHref(block: number): string {
  return `https://taomarketcap.com/blocks/${block}`;
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
