/**
 * Typed failures from `apiFetch`. Pages map these to degraded UI rather than
 * crashing the whole route.
 */

export class ApiError extends Error {
  readonly status: number;
  readonly path: string;
  readonly detail: unknown;

  constructor(opts: {
    status: number;
    path: string;
    detail?: unknown;
    message?: string;
  }) {
    const message =
      opts.message ??
      `API ${opts.status} for ${opts.path}` +
        (opts.detail !== undefined ? `: ${stringifyDetail(opts.detail)}` : "");
    super(message);
    this.name = "ApiError";
    this.status = opts.status;
    this.path = opts.path;
    this.detail = opts.detail;
  }
}

function stringifyDetail(detail: unknown): string {
  if (typeof detail === "string") return detail;
  try {
    return JSON.stringify(detail);
  } catch {
    return String(detail);
  }
}

export function isNotFound(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404;
}

/** True when the API reports DB/backend unavailable (typically HTTP 503). */
export function isUnavailable(error: unknown): boolean {
  return error instanceof ApiError && error.status === 503;
}
