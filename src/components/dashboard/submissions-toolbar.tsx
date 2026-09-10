"use client";

import { Select } from "@base-ui/react/select";
import {
  Ban,
  Check,
  ChevronDown,
  CircleCheck,
  CircleDashed,
  CircleSlash,
  CircleX,
  Clock,
  Container,
  Copy,
  Download,
  FileCheck,
  FileDiff,
  GitCommitHorizontal,
  Hammer,
  Hand,
  Layers,
  LoaderCircle,
  Package,
  Search,
  ShieldCheck,
  Swords,
  Unplug,
  X,
} from "lucide-react";
import type { DashboardIcon } from "@/components/dashboard/panel";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

/**
 * Search and outcome controls for the submissions table.
 *
 * These two are client components where the rest of the dashboard is links:
 * typing has no href, and a seven-option list is a picker rather than a row of
 * chips once a campaign has a hundred submissions. Both still write to the URL,
 * so a filtered view stays shareable and the back button steps through it.
 */

const DEBOUNCE_MS = 250;

/**
 * Set one query param and return to page one.
 *
 * These components build their own URL from the live search params rather than
 * taking a callback: a function cannot cross the server/client boundary, and
 * passing a href per option would ship the whole matrix of them. An empty or
 * default value drops the param, so the plain campaign link stays canonical.
 */
function useParamWriter(key: string, clearWhen: string) {
  const router = useRouter();
  const pathname = usePathname();

  return useCallback(
    (value: string) => {
      // Read the live URL rather than a `useSearchParams()` snapshot taken
      // when this callback was built. A debounced write lands up to 250ms
      // later, and the sort or outcome may have moved in between: rebuilding
      // from the stale snapshot would silently revert whichever control the
      // reader touched last. It also keeps this callback's identity stable,
      // so a URL change cannot restart a caller's debounce mid-type.
      const next = new URLSearchParams(window.location.search);
      if (value && value !== clearWhen) next.set(key, value);
      else next.delete(key);
      // Page 4 of the old list is not page 4 of the new one.
      next.delete("submissions");
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, key, clearWhen]
  );
}

/**
 * Free-text search over miner and patch hash.
 *
 * `replace` rather than `push`: a keystroke is not a place you want to walk
 * back through one character at a time. The input keeps its own value and is
 * never driven by the URL, so a slow render cannot reorder what you typed.
 */
export function SubmissionSearch({
  initialValue,
  placeholder,
}: {
  initialValue: string;
  placeholder: string;
}) {
  const write = useParamWriter("q", "");
  const [value, setValue] = useState(initialValue);
  const [isPending, startTransition] = useTransition();
  const latest = useRef(initialValue);
  /** The last term this box put in the URL, as opposed to one it was handed. */
  const written = useRef(initialValue);

  // Adopt a search that changed somewhere else: Clear filters, the back
  // button, a shared link. Without this the box still holds the old term,
  // reads the difference as a keystroke, and writes it straight back, so
  // Clear filters appears to do nothing.
  useEffect(() => {
    if (initialValue === written.current) return;
    written.current = initialValue;
    setValue(initialValue);
  }, [initialValue]);

  useEffect(() => {
    latest.current = value;
    if (value === initialValue) return;
    const id = setTimeout(() => {
      // Guard against a timer that outlived its keystroke.
      if (latest.current !== value) return;
      written.current = value;
      startTransition(() => write(value));
    }, DEBOUNCE_MS);
    return () => clearTimeout(id);
    // `write` is stable by construction; the typed value drives this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, initialValue]);

  return (
    /* Full width on a phone so the pickers wrap onto their own line rather
       than squeezing the search box and clipping the last control. */
    <div className="relative flex w-full min-w-0 items-center sm:w-auto sm:max-w-xs sm:flex-1">
      <Search
        className={`pointer-events-none absolute left-2.5 size-3.5 shrink-0 ${
          isPending ? "animate-pulse text-accent" : "text-muted"
        }`}
        aria-hidden
      />
      <input
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        aria-label="Search submissions by miner or patch hash"
        spellCheck={false}
        autoComplete="off"
        className="min-h-8 w-full min-w-0 border border-border bg-transparent pl-8 pr-8 font-mono text-caption text-foreground transition-colors placeholder:text-muted/70 hover:border-border-strong focus:border-border-strong focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent [&::-webkit-search-cancel-button]:hidden"
      />
      {value ? (
        <button
          type="button"
          onClick={() => setValue("")}
          aria-label="Clear search"
          className="absolute right-1.5 inline-flex size-6 items-center justify-center text-muted transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <X className="size-3.5" aria-hidden />
        </button>
      ) : null}
    </div>
  );
}

/**
 * A choice carries its tone, not its icon.
 *
 * An icon is a React component, and a component is a function, so it cannot
 * cross the server/client boundary any more than a callback can. The server
 * sends the tone name and the lookup happens here.
 */
export type OutcomeChoice = { value: string; label: string; tone: string };

/**
 * A distinct mark per pipeline state, so the list reads as stages rather than
 * as four repeated circles.
 *
 * `SUBMISSION_STATE_META` is partial on purpose, and this is too: a state the
 * backend adds later falls through to its tone below and still draws
 * something sensible, so neither map has to be edited in lockstep.
 */
const STATE_ICONS: Record<string, DashboardIcon> = {
  committed: GitCommitHorizontal,
  picked_up: Hand,
  fetched: Download,
  verified: ShieldCheck,
  applied: FileDiff,
  surface_ok: FileCheck,
  building: Hammer,
  image_pushed: Container,
  built: Package,
  bench_queued: Clock,
  round_assigned: Swords,
  infra_failed: Unplug,
  scored: CircleCheck,
  disqualified: Ban,
  rejected: CircleX,
  rejected_duplicate: Copy,
};

/** Fallback per tone. `all` is the absence of a filter, so it keeps its own. */
const TONE_ICONS: Record<string, DashboardIcon> = {
  all: Layers,
  success: CircleCheck,
  danger: CircleSlash,
  progress: LoaderCircle,
  neutral: CircleDashed,
};

/**
 * Colour per tone, borrowed from the status chips in the rows below.
 *
 * Shape alone is not enough at 14px: a check and a slash inside the same
 * circle read as the same mark until you look. Colour separates the outcome
 * that failed from the one that passed, and transitional states stay grey so
 * they compete with neither.
 */
const TONE_CLASS: Record<string, string> = {
  all: "text-muted",
  success: "text-accent",
  danger: "text-rust",
  progress: "text-muted",
  neutral: "text-muted",
};

function choiceIcon(choice: OutcomeChoice): DashboardIcon {
  return (
    STATE_ICONS[choice.value] ?? TONE_ICONS[choice.tone] ?? TONE_ICONS.neutral
  );
}

function toneClass(tone: string): string {
  return TONE_CLASS[tone] ?? TONE_CLASS.neutral;
}

/**
 * Outcome picker.
 *
 * Built on Base UI's Select rather than a bare `<select>`: the native control
 * renders its menu through the operating system, which arrives light, in a
 * system font, and with no room for the tone icons that make the list
 * scannable. This keeps the keyboard behaviour, focus handling and screen
 * reader semantics of the native one and lets the popup match the dashboard.
 */
export function OutcomeSelect({
  value,
  choices,
  allValue,
}: {
  value: string;
  choices: readonly OutcomeChoice[];
  /** The choice that means "no filter", so it drops out of the URL. */
  allValue: string;
}) {
  const write = useParamWriter("outcome", allValue);
  const [isPending, startTransition] = useTransition();
  const byValue = new Map(choices.map((choice) => [choice.value, choice]));

  return (
    <Select.Root
      value={value}
      onValueChange={(next) => startTransition(() => write(String(next)))}
    >
      <Select.Trigger
        aria-label="Filter by outcome"
        className="inline-flex min-h-8 min-w-0 flex-1 items-center gap-2 border border-border pl-2.5 pr-2 font-mono text-caption uppercase tracking-caps text-secondary transition-colors hover:border-border-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent data-[popup-open]:border-border-strong sm:flex-none"
      >
        <Select.Value>
          {(current: string) => {
            const choice = byValue.get(current) ?? byValue.get(allValue);
            if (!choice) return null;
            const Icon = choiceIcon(choice);
            return (
              <span className="flex min-w-0 items-center gap-2">
                <Icon
                  className={`size-3.5 shrink-0 ${
                    isPending
                      ? "animate-pulse text-accent"
                      : toneClass(choice.tone)
                  }`}
                  aria-hidden
                />
                <span className="truncate">{choice.label}</span>
              </span>
            );
          }}
        </Select.Value>
        <Select.Icon className="ml-auto flex shrink-0">
          <ChevronDown className="size-3 text-muted" aria-hidden />
        </Select.Icon>
      </Select.Trigger>

      <Select.Portal>
        <Select.Positioner
          side="bottom"
          align="start"
          sideOffset={4}
          /* A plain dropdown under the trigger. The default overlaps the
             trigger to sit the chosen row over its own label, which reads as
             a misplaced popup against a bordered flat toolbar. */
          alignItemWithTrigger={false}
          className="z-50"
        >
          <Select.Popup className="min-w-[var(--anchor-width)] border border-border-strong bg-background py-1 shadow-lg">
            <Select.List>
              {choices.map((choice) => {
                const Icon = choiceIcon(choice);
                return (
                  <Select.Item
                    key={choice.value}
                    value={choice.value}
                    className="flex cursor-pointer items-center gap-2 py-1.5 pl-2.5 pr-8 font-mono text-caption uppercase tracking-caps text-secondary outline-none select-none data-[highlighted]:bg-accent-dim data-[highlighted]:text-foreground data-[selected]:text-foreground"
                  >
                    <Icon
                      className={`size-3.5 shrink-0 ${toneClass(choice.tone)}`}
                      aria-hidden
                    />
                    <Select.ItemText className="truncate">
                      {choice.label}
                    </Select.ItemText>
                    <Select.ItemIndicator className="ml-auto flex shrink-0 pl-3">
                      <Check className="size-3.5 text-accent" aria-hidden />
                    </Select.ItemIndicator>
                  </Select.Item>
                );
              })}
            </Select.List>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}
