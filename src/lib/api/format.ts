/** Shared display helpers for dashboard monospace digests / times. */

export function truncateHash(value: string, head = 10, tail = 6): string {
  const cleaned = value.replace(/^sha256:/, "");
  const prefix = value.startsWith("sha256:") ? "sha256:" : "";
  if (cleaned.length <= head + tail + 1) return value;
  return `${prefix}${cleaned.slice(0, head)}…${cleaned.slice(-tail)}`;
}

export function truncateMiddle(value: string, head = 8, tail = 6): string {
  if (value.length <= head + tail + 1) return value;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

/** Digest without its algorithm prefix, for columns where every row is sha256. */
export function truncateDigest(value: string, head = 8, tail = 6): string {
  return truncateMiddle(value.replace(/^sha256:/, ""), head, tail);
}

export function formatUtc(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return (
    new Intl.DateTimeFormat("en-US", {
      timeZone: "UTC",
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date) + " UTC"
  );
}

/** Date and clock without the year, for dense columns headed with the zone. */
export function formatUtcShort(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

/** Clock time only, for dense timelines where the date is already in context. */
export function formatUtcTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

/**
 * Speedup ratio, e.g. `1.11×`.
 *
 * Two decimals keeps a column of measured ratios aligned. The cap sits at four
 * because campaign thresholds are declared rather than measured: a floor of
 * 1.11111111 has to print as `1.1111×` instead of running off its tile.
 */
export function formatRatio(value: number): string {
  return `${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  })}×`;
}

/** Compact elapsed span, e.g. `2.8s`, `4m 12s`, `1h 31m`. */
export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "—";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  const seconds = ms / 1000;
  if (seconds < 60) {
    return `${seconds < 10 ? seconds.toFixed(1) : Math.round(seconds)}s`;
  }
  const totalSeconds = Math.round(seconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, "0")}m`;
  return `${minutes}m ${String(totalSeconds % 60).padStart(2, "0")}s`;
}

/** Elapsed time between two ISO timestamps, or `null` if either is unusable. */
export function elapsedBetween(from: string, to: string): number | null {
  const start = new Date(from).getTime();
  const end = new Date(to).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return null;
  return end - start;
}
