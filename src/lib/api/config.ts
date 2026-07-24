/**
 * Server-side Pareton API configuration.
 *
 * `PARETON_API_URL` is read only on the server (via `apiFetch`). Defaults to the
 * public production host so local `npm run dev` works without extra setup.
 */

export const DEFAULT_API_URL = "https://api.pareton.ai";

/** Default request timeout for outbound API calls. */
export const DEFAULT_TIMEOUT_MS = 10_000;

export function getApiBaseUrl(): string {
  const raw = process.env.PARETON_API_URL?.trim();
  if (!raw) return DEFAULT_API_URL;
  return raw.replace(/\/+$/, "");
}
