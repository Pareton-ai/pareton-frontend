"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/* ------------------------------------------------------------------ */
/* Shared micro-visual primitives                                      */
/* ------------------------------------------------------------------ */

function CheckItem({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-center gap-3">
      <span className="flex h-4 w-4 shrink-0 items-center justify-center border border-accent/50 text-accent">
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
  const specs: [string, string][] = [
    ["Model", "GLM-5 · FP8"],
    ["Serving", "vLLM · production flags"],
    ["Workload", "real traffic distribution"],
    ["Hardware", "H200 + secondary GPU env"],
    ["SLA gates", "p99 TTFT · latency floor"],
    ["Success metric", "GPU-hours saved at SLA"],
  ];
  return (
    <div className="max-w-lg border border-border">
      {specs.map(([label, value]) => (
        <div
          key={label}
          className="flex items-baseline justify-between gap-6 border-b border-border px-4 py-2.5 last:border-b-0"
        >
          <span className="shrink-0 font-mono text-[9.5px] uppercase tracking-[0.14em] text-muted">
            {label}
          </span>
          <span className="text-right font-mono text-[12px] text-secondary">
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
      author: "Contributor A",
      add: "enable prefix caching",
      remove: "default cache policy",
    },
    {
      author: "Contributor B",
      add: "dynamic batch sizing",
      remove: "fixed batch size",
    },
    {
      author: "Contributor C",
      add: "optimize KV allocation",
      remove: "existing allocation path",
    },
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {patches.map((patch) => (
        <div key={patch.author} className="border border-border p-4">
          <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-muted">
            {patch.author}
          </p>
          <div className="mt-3 space-y-1.5 font-mono text-[11.5px] leading-[1.5]">
            <p>
              <span className="mr-1.5 text-accent">+</span>
              <span className="text-foreground">{patch.add}</span>
            </p>
            <p>
              <span className="mr-1.5 text-rust">−</span>
              <span className="text-muted">{patch.remove}</span>
            </p>
          </div>
        </div>
      ))}
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
      <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
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
      delta: "-7%",
      improved: true,
    },
    {
      metric: "Throughput",
      baseline: "1.00x",
      patched: "1.08x",
      delta: "+8%",
      improved: true,
    },
    {
      metric: "p99 TTFT",
      baseline: "850 ms",
      patched: "820 ms",
      delta: "-30 ms",
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
      <table className="w-full border border-border">
        <thead>
          <tr className="border-b border-border">
            {["Metric", "Baseline", "Patched", "Delta"].map((head) => (
              <th
                key={head}
                className="px-3 py-2 text-left font-mono text-[9.5px] font-normal uppercase tracking-[0.14em] text-muted last:text-right"
              >
                {head}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="font-mono text-[12px]">
          {rows.map((row) => (
            <tr
              key={row.metric}
              className="border-b border-border last:border-b-0"
            >
              <td className="px-3 py-2.5 font-sans text-[12.5px] text-secondary">
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
      <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
        Same workload trace · same hardware · same SLA gates
      </p>
    </div>
  );
}

function DecisionVisual() {
  return (
    <div className="max-w-xl">
      <div className="border border-border-strong px-5 py-4">
        <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-muted">
          Acceptance gate
        </p>
        <p className="mt-2 text-[13.5px] leading-[1.55] text-foreground">
          Did it improve the priority metric without breaking SLA?
        </p>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="border border-accent/40 bg-accent-dim p-4">
          <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-accent">
            Promote
          </p>
          <p className="mt-3 text-[12.5px] leading-[1.6] text-secondary">
            Merge into the inference-engine repository. This becomes the new
            best baseline.
          </p>
          <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.12em] text-accent">
            Baseline moves forward
          </p>
        </div>
        <div className="border border-rust/40 p-4">
          <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-rust">
            Reject
          </p>
          <p className="mt-3 text-[12.5px] leading-[1.6] text-secondary">
            Missed the metric, or broke SLA. Discard it and test the next
            candidate.
          </p>
          <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.12em] text-rust">
            Next candidate up
          </p>
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
        <p className="text-[12.5px] leading-[1.6] text-secondary">
          The new baseline becomes the floor — the next round of patches targets
          it, until the agreed success threshold is reached.
        </p>
      </div>
      <ul className="mt-6 space-y-3">
        <CheckItem>Verified optimized engine</CheckItem>
        <CheckItem>Before / after savings report</CheckItem>
        <CheckItem>Ready for deployment</CheckItem>
      </ul>
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
    title: "You bring the setup. You define “better.”",
    body: "Start with your production reality: model, serving stack, workload distribution, and hardware. Then lock the SLA gates and a single success metric — typically GPU-hours saved at SLA. That customer-approved profile becomes the fixed ground truth every candidate is measured against.",
    visual: <ProfileVisual />,
  },
  {
    index: "02",
    label: "Contributor patches",
    title: "Contributors propose, you don't rewrite",
    body: "Contributors (miners) submit reviewable patches against the current baseline — prefix caching, batch sizing, KV-cache allocation, kernels. Every candidate targets the same frozen profile, so proposals stay comparable.",
    visual: <PatchesVisual />,
  },
  {
    index: "03",
    label: "Validate",
    title: "Automated validation gates everything",
    body: "Before any benchmark runs, the candidate has to build and run, preserve output quality and API compatibility, satisfy the customer's constraints, and work across the required GPU environments. Invalid patches are rejected here.",
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
    label: "Accept or reject",
    title: "Accept or reject",
    body: "A candidate is accepted only if it improves the priority metric without breaking SLA — a binary call from measurements, not opinions. Promoted patches merge and become the new best baseline. Rejected ones are discarded and the next candidate is tested.",
    visual: <DecisionVisual />,
  },
  {
    index: "06",
    label: "Repeat",
    title: "The loop compounds",
    body: "Rounds repeat until the agreed success threshold is reached. Each accepted patch becomes the floor for the next, so gains compound instead of expiring — and the result ships with proof.",
    visual: <RepeatVisual />,
  },
];

function StepDetail({ step }: { step: Step }) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
        Step {step.index} / 06
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
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent">
        How Pareton works
      </p>
      <h2 className="mt-4 max-w-xl text-[clamp(1.4rem,2.6vw,1.9rem)] font-medium leading-[1.2] tracking-[-0.02em] text-foreground">
        An optimization loop, not a one-off audit.
      </h2>
      <p className="mt-4 max-w-xl text-[14px] leading-[1.7] text-secondary">
        Six steps per round. Every improvement is validated, benchmarked
        head-to-head against the current baseline, and promoted only on
        evidence.
      </p>
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
     mobile — step whose center is closest to the viewport middle. */
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
      const blocks = Array.from(
        root.querySelectorAll<HTMLElement>("[data-step]")
      );

      const update = () => {
        if (blocks.length === 0) return;
        const mid = window.innerHeight / 2;
        let best = 0;
        let bestDist = Infinity;
        for (const block of blocks) {
          const rect = block.getBoundingClientRect();
          const dist = Math.abs(rect.top + rect.height / 2 - mid);
          if (dist < bestDist) {
            bestDist = dist;
            best = Number(block.dataset.step ?? 0);
          }
        }
        setActive((prev) => (prev === best ? prev : best));
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
                          className={`font-mono text-[10px] tracking-[0.14em] transition-colors ${
                            isActive
                              ? "text-accent"
                              : isPassed
                                ? "text-accent/60"
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
                  className={`font-mono text-[9.5px] uppercase tracking-[0.14em] transition-colors ${
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
            <span className="font-mono text-[10px] tracking-[0.14em] text-accent">
              {steps[active].index} / 06
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
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
