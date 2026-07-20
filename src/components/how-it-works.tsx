"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/* ------------------------------------------------------------------ */
/* Shared micro-visual primitives                                      */
/* ------------------------------------------------------------------ */

const icons = {
  cube: "M8 1.75 14 5.25v5.5L8 14.25 2 10.75v-5.5L8 1.75ZM2 5.25 8 8.75l6-3.5M8 8.75v5.5",
  layers:
    "M8 1.75 14 4.75 8 7.75 2 4.75 8 1.75ZM2 7.75 8 10.75l6-3M2 10.5 8 13.5l6-3",
  activity: "M1.5 8h2.5l1.5-4.5 3 9 2-6 1 1.5h3",
  chip: "M5 5h6v6H5V5ZM7.25 7.25h1.5v1.5h-1.5v-1.5ZM6 1.5V5M10 1.5V5M6 11v3.5M10 11v3.5M1.5 6H5M1.5 10H5M11 6h3.5M11 10h3.5",
  shield:
    "M8 1.5 13.5 3.5v4c0 3.6-2.4 5.9-5.5 7-3.1-1.1-5.5-3.4-5.5-7v-4L8 1.5ZM5.75 7.75 7.25 9.25l3-3.5",
  target:
    "M13.5 8a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0ZM11 8a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM8 7.2v1.6M7.2 8h1.6",
  server: "M2.5 2.5h11v4h-11v-4ZM2.5 9.5h11v4h-11v-4ZM4.75 4.1v.8M4.75 11.1v.8",
  merge:
    "M6 4a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM6 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM14 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM4 14V6a6 6 0 0 0 6 6",
  x: "M4.5 4.5 11.5 11.5M11.5 4.5 4.5 11.5",
  trophy:
    "M5 2h6v4.5a3 3 0 0 1-6 0V2ZM5 3.25H3.25a1.75 1.75 0 0 0 1.75 2.5M11 3.25h1.75a1.75 1.75 0 0 1-1.75 2.5M8 9.5V12M6.5 12v2M9.5 12v2M5.5 14h5",
} as const;

type IconName = keyof typeof icons;

function Icon({
  name,
  className = "",
}: {
  name: IconName;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      className={className}
      aria-hidden="true"
    >
      <path d={icons[name]} />
    </svg>
  );
}

function CheckItem({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-center gap-3">
      <span className="flex h-4 w-4 shrink-0 items-center justify-center border border-accent text-accent">
        <svg
          width="9"
          height="9"
          viewBox="0 0 10 10"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M1.5 5.5 4 8 8.5 2"
            stroke="currentColor"
            strokeWidth="1.5"
          />
        </svg>
      </span>
      <span className="text-[13px] text-secondary">{children}</span>
    </li>
  );
}

function ArrowDown({ className = "" }: { className?: string }) {
  return (
    <svg
      width="12"
      height="26"
      viewBox="0 0 12 26"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M6 1v19M1.5 15.5 6 20l4.5-4.5"
        stroke="currentColor"
        strokeWidth="1.25"
      />
    </svg>
  );
}

function RepeatIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M13.6 8a5.6 5.6 0 1 1-1.64-3.96M13.8 1.4v3.1h-3.1"
        stroke="currentColor"
        strokeWidth="1.25"
      />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Per-step visuals                                                    */
/* ------------------------------------------------------------------ */

function ProfileVisual() {
  const specs: [IconName, string, string][] = [
    ["cube", "Model", "GLM-5 · FP8"],
    ["chip", "Hardware", "H200 + secondary GPU env"],
    ["layers", "Serving", "vLLM · production flags"],
    ["activity", "Workload", "real traffic distribution"],
    ["shield", "SLA gates", "p99 TTFT · latency floor"],
    ["target", "Success metric", "GPU-hours saved at SLA"],
  ];
  return (
    <div className="max-w-lg border border-border">
      {specs.map(([icon, label, value]) => (
        <div
          key={label}
          className="flex items-center gap-3 border-b border-border px-4 py-2.5 last:border-b-0"
        >
          <Icon name={icon} className="h-3.5 w-3.5 shrink-0 text-accent" />
          <span className="shrink-0 font-mono text-[13px] uppercase tracking-[0.14em] text-muted">
            {label}
          </span>
          <span className="ml-auto text-right font-mono text-[13px] text-secondary">
            {value}
          </span>
        </div>
      ))}
    </div>
  );
}

function PatchesVisual() {
  const patches = [
    {
      initial: "A",
      add: "enable prefix caching",
      remove: "default cache policy",
    },
    {
      initial: "B",
      add: "dynamic batch sizing",
      remove: "fixed batch size",
    },
    {
      initial: "C",
      add: "optimize KV allocation",
      remove: "existing allocation path",
    },
  ];
  return (
    <div className="max-w-xl">
      <div className="flex items-center gap-3 border border-border px-4 py-3">
        <Icon name="server" className="h-4 w-4 shrink-0 text-secondary" />
        <div>
          <p className="font-mono text-[13px] uppercase tracking-[0.14em] text-muted">
            Current baseline
          </p>
          <p className="mt-0.5 font-mono text-[13px] text-secondary">
            vLLM + accepted patches
          </p>
        </div>
        <span className="ml-auto font-mono text-[13px] uppercase tracking-[0.12em] text-muted">
          the patch target
        </span>
      </div>
      <div className="flex justify-center py-0.5">
        <ArrowDown className="text-muted" />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {patches.map((patch) => (
          <div key={patch.initial} className="border border-border p-4">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center border border-border-strong font-mono text-[13px] text-secondary">
                {patch.initial}
              </span>
              <p className="font-mono text-[13px] uppercase tracking-[0.14em] text-muted">
                Contributor {patch.initial}
              </p>
            </div>
            <div className="mt-3 space-y-1.5 font-mono text-[13px] leading-[1.5]">
              <p>
                <span className="mr-1.5 text-accent">+</span>
                <span className="text-foreground">{patch.add}</span>
              </p>
              <p>
                <span className="mr-1.5 text-rust">−</span>
                <span className="text-muted">{patch.remove}</span>
              </p>
              <p className="text-muted">…</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ValidateVisual() {
  return (
    <div className="max-w-lg">
      <ul className="space-y-3">
        <CheckItem>Builds and runs</CheckItem>
        <CheckItem>Output quality preserved</CheckItem>
        <CheckItem>API compatibility preserved</CheckItem>
        <CheckItem>Customer constraints satisfied</CheckItem>
        <CheckItem>Works across required GPU environments</CheckItem>
      </ul>
      <p className="mt-6 font-mono text-[13px] uppercase tracking-[0.12em] text-muted">
        Invalid patches are rejected before benchmarking
      </p>
    </div>
  );
}

function BenchmarkVisual() {
  const rows = [
    {
      metric: "GPU-hours",
      baseline: "100",
      patched: "93",
      delta: "−7%",
      improved: true,
    },
    {
      metric: "Throughput",
      baseline: "1.00×",
      patched: "1.08×",
      delta: "+8%",
      improved: true,
    },
    {
      metric: "p99 TTFT",
      baseline: "850 ms",
      patched: "820 ms",
      delta: "−30 ms",
      improved: true,
    },
    {
      metric: "Quality / SLA",
      baseline: "Pass",
      patched: "Pass",
      delta: "—",
      improved: false,
    },
  ];
  return (
    <div className="max-w-xl">
      <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
        <div className="flex flex-1 items-center gap-3 border border-border px-4 py-3">
          <Icon name="server" className="h-4 w-4 shrink-0 text-muted" />
          <div>
            <p className="font-mono text-[13px] uppercase tracking-[0.14em] text-muted">
              Current baseline
            </p>
            <p className="mt-0.5 font-mono text-[13px] text-secondary">
              vLLM + accepted patches
            </p>
          </div>
        </div>
        <div className="z-10 -my-3 flex justify-center sm:-mx-4 sm:my-0">
          <span className="flex h-9 w-9 rotate-45 items-center justify-center border border-border-strong bg-background">
            <span className="-rotate-45 font-mono text-[13px] tracking-[0.08em] text-secondary">
              VS
            </span>
          </span>
        </div>
        <div className="flex flex-1 items-center gap-3 border border-accent/70 bg-accent-dim px-4 py-3">
          <Icon name="server" className="h-4 w-4 shrink-0 text-accent" />
          <div>
            <p className="font-mono text-[13px] uppercase tracking-[0.14em] text-accent">
              Patched engine
            </p>
            <p className="mt-0.5 font-mono text-[13px] text-secondary">
              baseline + candidate diff
            </p>
          </div>
        </div>
      </div>
      <table className="mt-6 w-full border border-border">
        <thead>
          <tr className="border-b border-border">
            {["Metric", "Baseline", "Patched", "Delta"].map((head) => (
              <th
                key={head}
                className="px-3 py-2 text-left font-mono text-[13px] font-normal uppercase tracking-[0.14em] text-muted last:text-right"
              >
                {head}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="font-mono text-[13px]">
          {rows.map((row) => (
            <tr
              key={row.metric}
              className="border-b border-border last:border-b-0"
            >
              <td className="px-3 py-2.5 font-sans text-[13px] text-secondary">
                {row.metric}
              </td>
              <td className="px-3 py-2.5 text-muted">{row.baseline}</td>
              <td className="px-3 py-2.5 text-foreground">{row.patched}</td>
              <td
                className={`px-3 py-2.5 text-right ${
                  row.improved ? "text-accent" : "text-muted"
                }`}
              >
                {row.delta}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-4 font-mono text-[13px] uppercase tracking-[0.12em] text-muted">
        Same workload trace · same hardware · same SLA gates
      </p>
    </div>
  );
}

function DecisionVisual() {
  return (
    <div className="max-w-xl">
      <div className="border border-border-strong px-5 py-4 text-center">
        <p className="font-mono text-[13px] uppercase tracking-[0.14em] text-muted">
          Priority metric · GPU-hours at SLA
        </p>
        <p className="mt-2 font-mono text-[13px] uppercase leading-[1.7] tracking-[0.1em] text-foreground">
          Did it improve the metric without breaking SLA?
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col items-center pt-3">
          <span className="font-mono text-[13px] uppercase tracking-[0.16em] text-accent">
            Yes
          </span>
          <ArrowDown className="mt-1 text-accent" />
          <div className="mt-1 w-full border border-accent/70 bg-accent-dim p-4">
            <div className="flex items-center gap-2.5">
              <Icon name="merge" className="h-4 w-4 shrink-0 text-accent" />
              <p className="font-mono text-[13px] uppercase tracking-[0.14em] text-accent">
                Promote
              </p>
            </div>
            <p className="mt-2.5 text-[13px] leading-[1.6] text-secondary">
              Merge into the inference-engine repo. Becomes the new best
              baseline.
            </p>
            <div className="mt-3 flex items-center gap-2 border-t border-accent/50 pt-3">
              <Icon name="server" className="h-3.5 w-3.5 shrink-0 text-accent" />
              <span className="font-mono text-[13px] uppercase tracking-[0.12em] text-accent">
                New baseline
              </span>
              <span className="ml-auto font-mono text-[13px] text-secondary">
                −7% GPU-h
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-center pt-3">
          <span className="font-mono text-[13px] uppercase tracking-[0.16em] text-rust">
            No
          </span>
          <ArrowDown className="mt-1 text-rust" />
          <div className="mt-1 w-full border border-rust/70 p-4">
            <div className="flex items-center gap-2.5">
              <Icon name="x" className="h-4 w-4 shrink-0 text-rust" />
              <p className="font-mono text-[13px] uppercase tracking-[0.14em] text-rust">
                Reject
              </p>
            </div>
            <p className="mt-2.5 text-[13px] leading-[1.6] text-secondary">
              Didn&apos;t beat the metric, or broke SLA. Discard and test the
              next candidate.
            </p>
            <div className="mt-3 border-t border-rust/50 pt-3">
              <span className="font-mono text-[13px] uppercase tracking-[0.12em] text-muted">
                Next candidate
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RepeatVisual() {
  return (
    <div className="max-w-lg">
      <div className="flex items-center gap-4 border border-border px-5 py-4">
        <RepeatIcon className="h-4 w-4 shrink-0 text-accent" />
        <p className="text-[13px] leading-[1.6] text-secondary">
          The new baseline becomes the floor — the next round of patches targets
          it, until the agreed success threshold is reached.
        </p>
      </div>
      <div className="mt-4 border border-border px-5 py-4">
        <div className="flex items-center gap-2.5">
          <Icon name="trophy" className="h-4 w-4 shrink-0 text-accent" />
          <p className="font-mono text-[13px] uppercase tracking-[0.14em] text-secondary">
            Success threshold reached
          </p>
        </div>
        <ul className="mt-4 space-y-3">
          <CheckItem>Verified optimized engine</CheckItem>
          <CheckItem>Before / after savings report</CheckItem>
          <CheckItem>Ready for deployment</CheckItem>
        </ul>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Steps                                                               */
/* ------------------------------------------------------------------ */

type Step = {
  index: string;
  label: string;
  title: string;
  body: string;
  visual: ReactNode;
};

const steps: Step[] = [
  {
    index: "01",
    label: "Customer profile",
    title: "You bring the setup. You define better.",
    body: "Tell Pareton what you run in production — model, serving stack, workload profile, hardware — and the SLA gates you won't break. One success metric locks the goal, usually GPU-hours saved at SLA. That customer-approved profile is the yardstick for every candidate that follows.",
    visual: <ProfileVisual />,
  },
  {
    index: "02",
    label: "Contributor patches",
    title: "Contributors propose, you don't rewrite",
    body: "Contributors (miners) submit small, reviewable patches against the current baseline — prefix caching, batch sizing, KV-cache allocation, kernels. Every candidate targets the same frozen profile, so proposals stay comparable.",
    visual: <PatchesVisual />,
  },
  {
    index: "03",
    label: "Validate",
    title: "Automated validation gates everything",
    body: "Before any benchmark runs, the candidate has to build and run, preserve output quality and API compatibility, satisfy the customer's constraints, and work across the required GPU environments. Invalid patches are rejected.",
    visual: <ValidateVisual />,
  },
  {
    index: "04",
    label: "Benchmark",
    title: "Baseline vs. patched, head to head",
    body: "The patched engine and the current baseline run the exact same workload trace, on identical hardware, under the same SLA gates. The comparison is apples-to-apples by construction.",
    visual: <BenchmarkVisual />,
  },
  {
    index: "05",
    label: "Promote or reject",
    title: "Promote on evidence, or move on",
    body: "One binary call from measurements: did it improve the priority metric without breaking SLA? Yes — merge it and promote the new best baseline. No — discard it and test the next candidate. The baseline only moves forward.",
    visual: <DecisionVisual />,
  },
  {
    index: "06",
    label: "Repeat",
    title: "The loop compounds",
    body: "Rounds repeat until the agreed success threshold is reached. Each accepted patch becomes the floor for the next, so gains compound instead of expiring.",
    visual: <RepeatVisual />,
  },
];

function StepDetail({ step }: { step: Step }) {
  return (
    <div>
      <p className="font-mono text-[13px] uppercase tracking-[0.16em] text-muted">
        Step {step.index} / {String(steps.length).padStart(2, "0")}
      </p>
      <h3 className="mt-3 text-[18px] font-medium tracking-[-0.01em] text-foreground">
        {step.title}
      </h3>
      <p className="mt-3 max-w-xl text-[13.5px] leading-[1.7] text-secondary">
        {step.body}
      </p>
      <div className="mt-8">{step.visual}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Section                                                             */
/* ------------------------------------------------------------------ */

const LG_QUERY = "(min-width: 1024px)";

function SectionHeader() {
  return (
    <div>
      <p className="font-mono text-[13px] uppercase tracking-[0.18em] text-accent">
        How Pareton works
      </p>
      <h2 className="mt-4 max-w-xl text-[clamp(1.4rem,2.6vw,1.9rem)] font-medium leading-[1.2] tracking-[-0.02em] text-foreground">
        An optimization loop: your profile in, better engine out.
      </h2>
    </div>
  );
}

export function HowItWorks() {
  const [active, setActive] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const mobileRef = useRef<HTMLDivElement>(null);
  const frame = useRef<number | null>(null);

  /* Scroll-driven active step:
     desktop — progress through a tall sticky track;
     mobile — whichever expanded step crosses the viewport middle. */
  useEffect(() => {
    const mql = window.matchMedia(LG_QUERY);
    let teardown = () => {};

    const setupDesktop = () => {
      const update = () => {
        const track = trackRef.current;
        if (!track || !track.offsetHeight) return;
        const rect = track.getBoundingClientRect();
        const scrollable = rect.height - window.innerHeight;
        if (scrollable <= 0) return;
        const progress = Math.min(1, Math.max(0, -rect.top / scrollable));
        const idx = Math.min(
          steps.length - 1,
          Math.floor(progress * steps.length)
        );
        setActive((prev) => (prev === idx ? prev : idx));
      };
      const onScroll = () => {
        if (frame.current != null) return;
        frame.current = requestAnimationFrame(() => {
          frame.current = null;
          update();
        });
      };
      update();
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onScroll);
      return () => {
        window.removeEventListener("scroll", onScroll);
        window.removeEventListener("resize", onScroll);
        if (frame.current != null) cancelAnimationFrame(frame.current);
        frame.current = null;
      };
    };

    const setupMobile = () => {
      const root = mobileRef.current;
      if (!root) return () => {};
      const blocks = Array.from(root.querySelectorAll("[data-step]"));
      const io = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              const idx = Number(
                (entry.target as HTMLElement).dataset.step ?? 0
              );
              setActive((prev) => (prev === idx ? prev : idx));
            }
          }
        },
        { rootMargin: "-45% 0px -45% 0px" }
      );
      blocks.forEach((block) => io.observe(block));
      return () => io.disconnect();
    };

    const setup = () => {
      teardown();
      teardown = mql.matches ? setupDesktop() : setupMobile();
    };
    setup();
    mql.addEventListener("change", setup);
    return () => {
      mql.removeEventListener("change", setup);
      teardown();
    };
  }, []);

  /* Rail buttons remain as shortcuts: smooth-scroll to the step's range. */
  const scrollToStep = (i: number) => {
    const track = trackRef.current;
    if (!track) return;
    const trackTop = track.getBoundingClientRect().top + window.scrollY;
    const scrollable = track.offsetHeight - window.innerHeight;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    window.scrollTo({
      top: trackTop + (i / steps.length) * scrollable + 2,
      behavior: reduced.matches ? "auto" : "smooth",
    });
  };

  const railFill = ((active + 0.5) / steps.length) * 100;
  const chipProgress = ((active + 1) / steps.length) * 100;

  return (
    <section id="how-it-works" className="border-t border-border">
      {/* Mobile header — on desktop it lives inside the sticky scene */}
      <div className="mx-auto w-full max-w-6xl px-6 pt-16 sm:px-12 lg:hidden">
        <SectionHeader />
      </div>

      {/* Desktop: sticky scrollytelling track */}
      <div
        ref={trackRef}
        className="relative hidden lg:block"
        style={{ height: `${steps.length * 72}vh` }}
      >
        <div className="sticky top-0 flex h-svh flex-col justify-center">
          <div className="mx-auto w-full max-w-6xl px-12">
            <SectionHeader />
          </div>
          <div className="mx-auto mt-12 grid w-full max-w-6xl grid-cols-[minmax(0,4fr)_minmax(0,7fr)] gap-12 px-12">
            <div>
              <ol className="relative border-l border-border">
                <span
                  aria-hidden="true"
                  className="absolute top-0 left-[-1px] w-[2px] bg-accent transition-[height] duration-300 ease-out"
                  style={{ height: `${railFill}%` }}
                />
                {steps.map((step, i) => {
                  const isActive = i === active;
                  const isPassed = i < active;
                  return (
                    <li key={step.index}>
                      <button
                        type="button"
                        onClick={() => scrollToStep(i)}
                        aria-current={isActive ? "step" : undefined}
                        className="group relative flex w-full items-baseline gap-4 py-[13px] pl-7 text-left"
                      >
                        <span
                          aria-hidden="true"
                          className={`absolute top-1/2 left-[-4.5px] h-[9px] w-[9px] -translate-y-1/2 border transition-colors ${
                            isActive
                              ? "border-accent bg-accent"
                              : isPassed
                                ? "border-accent bg-background"
                                : "border-border-strong bg-background group-hover:border-muted"
                          }`}
                        />
                        <span
                          className={`font-mono text-[13px] tracking-[0.14em] transition-colors ${
                            isActive
                              ? "text-accent"
                              : isPassed
                                ? "text-accent"
                                : "text-muted group-hover:text-secondary"
                          }`}
                        >
                          {step.index}
                        </span>
                        <span
                          className={`text-[13.5px] transition-colors ${
                            isActive
                              ? "text-foreground"
                              : isPassed
                                ? "text-secondary"
                                : "text-muted group-hover:text-secondary"
                          }`}
                        >
                          {step.label}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
              <div className="relative flex items-center gap-4 border-l border-border pt-4 pb-1 pl-7">
                <RepeatIcon
                  className={`absolute left-[-8px] h-4 w-4 transition-colors ${
                    active === steps.length - 1 ? "text-accent" : "text-muted"
                  }`}
                />
                <span
                  className={`font-mono text-[13px] uppercase tracking-[0.14em] transition-colors ${
                    active === steps.length - 1
                      ? "text-secondary"
                      : "text-muted"
                  }`}
                >
                  Feeds the next optimization round
                </span>
              </div>
            </div>

            <div className="min-h-[520px] border border-border bg-background p-10">
              <div key={steps[active].index} className="step-panel-enter">
                <StepDetail step={steps[active]} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile: sticky progress chip + scroll-through list */}
      <div ref={mobileRef} className="mt-8 lg:hidden">
        <div className="sticky top-0 z-20 border-y border-border bg-background/85 backdrop-blur-sm">
          <div className="mx-auto flex w-full max-w-6xl items-baseline justify-between px-6 py-3 sm:px-12">
            <span className="font-mono text-[13px] tracking-[0.14em] text-accent">
              {steps[active].index} / {String(steps.length).padStart(2, "0")}
            </span>
            <span className="font-mono text-[13px] uppercase tracking-[0.14em] text-muted">
              {steps[active].label}
            </span>
          </div>
          <span
            aria-hidden="true"
            className="absolute bottom-[-1px] left-0 h-px bg-accent transition-[width] duration-300 ease-out"
            style={{ width: `${chipProgress}%` }}
          />
        </div>
        <div className="mx-auto w-full max-w-6xl px-6 sm:px-12">
          {steps.map((step, i) => (
            <div
              key={step.index}
              data-step={i}
              className="border-b border-border py-14 last:border-b-0"
            >
              <StepDetail step={step} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
