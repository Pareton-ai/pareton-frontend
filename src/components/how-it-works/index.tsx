"use client";

import { useEffect, useRef, useState } from "react";
import { siteContent } from "@/lib/site-content";
import { SectionHeader } from "@/components/ui/section-header";
import { Eyebrow } from "@/components/ui/eyebrow";
import { RepeatIcon } from "./icons";
import { StepDetail } from "./step-detail";
import { steps } from "./steps";

const LG_QUERY = "(min-width: 1024px)";

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

  const header = (
    <SectionHeader
      eyebrow={siteContent.howItWorks.eyebrow}
      title={siteContent.howItWorks.title}
    />
  );

  return (
    <section id="how-it-works" className="border-t border-border">
      {/* Mobile header — on desktop it lives inside the sticky scene */}
      <div className="mx-auto w-full max-w-6xl px-6 pt-16 sm:px-12 lg:hidden">
        {header}
      </div>

      {/* Desktop: sticky scrollytelling track */}
      <div
        ref={trackRef}
        className="relative hidden lg:block"
        style={{ height: `${steps.length * 72}vh` }}
      >
        <div className="sticky top-0 flex h-svh flex-col justify-center">
          <div className="mx-auto w-full max-w-6xl px-12">{header}</div>
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
                          className={`font-mono text-body tracking-caps transition-colors ${
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
                          className={`text-body-lg transition-colors ${
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
                  className={`font-mono text-body uppercase tracking-caps transition-colors ${
                    active === steps.length - 1
                      ? "text-secondary"
                      : "text-muted"
                  }`}
                >
                  Feeds the next optimization round
                </span>
              </div>
              <div
                aria-hidden="true"
                className={`mt-8 flex items-center gap-3 pl-1 transition-opacity duration-300 ${
                  active === 0 ? "opacity-100" : "opacity-0"
                }`}
              >
                <span className="relative flex h-[22px] w-[14px] items-start justify-center rounded-full border border-border-strong pt-[3px]">
                  <span className="scroll-cue-dot h-[4px] w-[1.5px] rounded-full bg-muted" />
                </span>
                <Eyebrow className="m-0" tone="muted">
                  Scroll to step through
                </Eyebrow>
              </div>
            </div>

            {/* All panels are stacked in one grid cell so the box keeps the
                height of the tallest step — otherwise the sticky scene
                re-centers on every step change and the page jitters. */}
            <div className="grid min-h-[520px] border border-border bg-background p-10">
              {steps.map((step, i) => (
                <div
                  key={step.index}
                  aria-hidden={i !== active}
                  className={`col-start-1 row-start-1 transition-opacity duration-200 ease-out ${
                    i === active
                      ? "opacity-100"
                      : "pointer-events-none invisible opacity-0"
                  }`}
                >
                  <StepDetail step={step} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile: sticky progress chip + scroll-through list */}
      <div ref={mobileRef} className="mt-8 lg:hidden">
        <div className="sticky top-0 z-20 border-y border-border bg-background/85 backdrop-blur-sm">
          <div className="mx-auto flex w-full max-w-6xl items-baseline justify-between px-6 py-3 sm:px-12">
            <span className="font-mono text-body tracking-caps text-accent">
              {steps[active].index} / {String(steps.length).padStart(2, "0")}
            </span>
            <Eyebrow className="m-0" tone="muted">
              {steps[active].label}
            </Eyebrow>
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
