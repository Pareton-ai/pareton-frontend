import "server-only";

import { DEFAULT_TIMEOUT_MS, getApiBaseUrl } from "@/lib/api/config";
import { ApiError } from "@/lib/api/errors";

export type ApiFetchOptions = {
  /** Next.js Data Cache revalidate window in seconds. */
  revalidate?: number | false;
  /** Cache tags for on-demand revalidation. */
  tags?: string[];
  /** Optional AbortSignal; combined with the default timeout. */
  signal?: AbortSignal;
  /** Override the default request timeout. */
  timeoutMs?: number;
  /** Extra query string params (undefined/null values omitted). */
  searchParams?: Record<string, string | number | boolean | null | undefined>;
};

function joinUrl(base: string, path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalized}`;
}

function withSearchParams(
  url: string,
  searchParams?: ApiFetchOptions["searchParams"]
): string {
  if (!searchParams) return url;
  const u = new URL(url);
  for (const [key, value] of Object.entries(searchParams)) {
    if (value === undefined || value === null || value === "") continue;
    u.searchParams.set(key, String(value));
  }
  return u.toString();
}

function mergeSignals(
  external: AbortSignal | undefined,
  timeoutMs: number
): { signal: AbortSignal; cleanup: () => void } {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const onExternalAbort = () => controller.abort();
  if (external) {
    if (external.aborted) controller.abort();
    else external.addEventListener("abort", onExternalAbort, { once: true });
  }

  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timer);
      external?.removeEventListener("abort", onExternalAbort);
    },
  };
}

async function readDetail(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      const body = (await response.json()) as { detail?: unknown };
      return body.detail ?? body;
    } catch {
      return undefined;
    }
  }
  try {
    const text = await response.text();
    return text || undefined;
  } catch {
    return undefined;
  }
}

/**
 * The body is read here, inside the try, so the abort timer still covers a
 * download that stalls mid-stream. Reading it after `cleanup()` would leave
 * the timeout guarding only the response headers.
 */
async function request<T>(
  path: string,
  accept: "json" | "text",
  options: ApiFetchOptions
): Promise<T> {
  const base = getApiBaseUrl();
  const url = withSearchParams(joinUrl(base, path), options.searchParams);
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const { signal, cleanup } = mergeSignals(options.signal, timeoutMs);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: accept === "json" ? "application/json" : "text/plain",
      },
      signal,
      next: {
        revalidate: options.revalidate,
        tags: options.tags,
      },
    });

    if (!response.ok) {
      const detail = await readDetail(response);
      throw new ApiError({
        status: response.status,
        path,
        detail,
      });
    }

    return (
      accept === "json" ? await response.json() : await response.text()
    ) as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new ApiError({
        status: 408,
        path,
        detail: "Request timed out",
        message: `API timeout for ${path}`,
      });
    }
    throw new ApiError({
      status: 502,
      path,
      detail: error instanceof Error ? error.message : "Unknown fetch error",
      message: `API unreachable for ${path}`,
    });
  } finally {
    cleanup();
  }
}

/**
 * Single outbound HTTP helper for Pareton API reads.
 *
 * Every server fetch in the app must go through this. Do not call `fetch`
 * against `PARETON_API_URL` from pages or components.
 */
export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  return await request<T>(path, "json", options);
}

/** Same contract as `apiFetch`, for endpoints that serve `text/plain`. */
export async function apiFetchText(
  path: string,
  options: ApiFetchOptions = {}
): Promise<string> {
  return await request<string>(path, "text", options);
}
