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

export function formatDurationRemaining(
  closesAt: string,
  now = Date.now()
): string {
  const end = new Date(closesAt).getTime();
  if (Number.isNaN(end)) return "—";
  const ms = end - now;
  if (ms <= 0) return "Closed";
  const totalMinutes = Math.floor(ms / 60_000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}
