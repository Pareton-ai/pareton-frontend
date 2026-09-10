"use client";

import { Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
  const params = useSearchParams();

  return useCallback(
    (value: string) => {
      const next = new URLSearchParams(params.toString());
      if (value && value !== clearWhen) next.set(key, value);
      else next.delete(key);
      // Page 4 of the old list is not page 4 of the new one.
      next.delete("submissions");
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, params, key, clearWhen]
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

  useEffect(() => {
    latest.current = value;
    if (value === initialValue) return;
    const id = setTimeout(() => {
      // Guard against a timer that outlived its keystroke.
      if (latest.current !== value) return;
      startTransition(() => write(value));
    }, DEBOUNCE_MS);
    return () => clearTimeout(id);
    // `write` is rebuilt whenever the URL changes, which would restart the
    // timer mid-type; the typed value is what should retrigger this.
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

export type OutcomeChoice = { value: string; label: string };

/**
 * Outcome picker as a native select.
 *
 * Native because it is the one control that is already correct on every
 * device: a real picker sheet on a phone, type-ahead and arrow keys on a
 * desktop, and no focus trap of our own to get wrong. The colour that a chip
 * row carried lives on the dot beside it instead, which is the only tone that
 * matters once one is chosen.
 */
export function OutcomeSelect({
  value,
  choices,
  allValue,
  toneClassName,
}: {
  value: string;
  choices: readonly OutcomeChoice[];
  /** The choice that means "no filter", so it drops out of the URL. */
  allValue: string;
  toneClassName: string;
}) {
  const write = useParamWriter("outcome", allValue);
  const [isPending, startTransition] = useTransition();

  return (
    /* A native select is as wide as its longest option, and "Round assigned"
       is wide enough to push the sort control onto a third row. Flexing on a
       phone lets it give way instead; from `sm` up it sizes to content. */
    <label className="inline-flex min-h-8 min-w-0 flex-1 items-center gap-2 border border-border pl-2.5 pr-1 transition-colors focus-within:border-border-strong hover:border-border-strong sm:flex-none">
      <span
        aria-hidden
        className={`size-2 shrink-0 rounded-full ${
          isPending ? "animate-pulse bg-accent" : toneClassName
        }`}
      />
      <span className="sr-only">Filter by outcome</span>
      <select
        value={value}
        onChange={(event) => {
          const next = event.target.value;
          startTransition(() => write(next));
        }}
        className="w-full min-w-0 cursor-pointer appearance-none truncate bg-transparent py-1 pr-5 font-mono text-caption uppercase tracking-caps text-secondary focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        {choices.map((choice) => (
          <option
            key={choice.value}
            value={choice.value}
            className="bg-background"
          >
            {choice.label}
          </option>
        ))}
      </select>
      {/* The select's own arrow is hidden by appearance-none, so draw one. */}
      <svg
        aria-hidden
        viewBox="0 0 10 6"
        className="pointer-events-none -ml-5 size-2.5 shrink-0 text-muted"
      >
        <path
          d="M1 1l4 4 4-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        />
      </svg>
    </label>
  );
}
