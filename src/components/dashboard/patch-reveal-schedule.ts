export type PatchRevealSchedule = {
  enabled: boolean;
  refreshAt?: string | null;
};

// Browsers clamp larger delays to 1ms. Re-arm long reveal waits in chunks.
const MAX_TIMEOUT_MS = 2_147_483_647;

/** One visible-tab timer for evaluation updates, the reveal deadline, and retries. */
export function startPatchRevealRefresh(
  { enabled, refreshAt }: PatchRevealSchedule,
  intervalMs: number,
  refresh: () => void
): () => void {
  const parsed = Date.parse(refreshAt ?? "");
  const deadline = Number.isFinite(parsed) ? parsed : null;
  if (!enabled && deadline === null) return () => {};

  let timer: ReturnType<typeof setTimeout> | undefined;

  const schedule = () => {
    if (document.hidden) return;
    const remaining = deadline === null ? Infinity : deadline - Date.now();
    const delay =
      remaining > 0
        ? enabled
          ? Math.min(intervalMs, remaining)
          : remaining
        : intervalMs;
    timer = setTimeout(tick, Math.min(delay, MAX_TIMEOUT_MS));
  };

  const tick = () => {
    if (document.hidden) return;
    // A long timeout chunk can finish before the actual deadline.
    if (enabled || (deadline !== null && Date.now() >= deadline)) refresh();
    schedule();
  };

  const onVisibility = () => {
    clearTimeout(timer);
    if (document.hidden) return;
    // Re-read on return: the deadline or availability may have changed.
    refresh();
    schedule();
  };

  document.addEventListener("visibilitychange", onVisibility);
  if (deadline !== null && Date.now() >= deadline) tick();
  else schedule();

  return () => {
    clearTimeout(timer);
    document.removeEventListener("visibilitychange", onVisibility);
  };
}
