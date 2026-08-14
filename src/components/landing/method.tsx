"use client";

import { useEffect, useRef, useState } from "react";
import { siteContent } from "@/lib/site-content";

const LG_QUERY = "(min-width: 1024px)";
const { howItWorks } = siteContent;
const steps = howItWorks.steps;
const PHASES = steps.length;

function RepeatIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 12a8 8 0 0 1 14.6-4M20 12a8 8 0 0 1-14.6 4" />
      <path d="M18 4v4h-4M6 20v-4h4" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12l5 5L20 7" />
    </svg>
  );
}

function MethodHeader() {
  return (
    <>
      <p className="mono kicker">{howItWorks.index}</p>
      <h2>{howItWorks.title}</h2>
      <p className="lead">{howItWorks.lead}</p>
    </>
  );
}

function SetupVisual({ compact = false }: { compact?: boolean }) {
  return (
    <div className="visual">
      <div className="give">
        <article>
          {compact ? null : (
            <svg className="ico" viewBox="0 0 24 24" aria-hidden="true">
              <rect x="5" y="5" width="14" height="14" />
              <path d="M5 10h14" />
            </svg>
          )}
          <h4>Your model</h4>
          <p>The model you already serve.</p>
        </article>
        <article>
          {compact ? null : (
            <svg className="ico" viewBox="0 0 24 24" aria-hidden="true">
              <rect x="4" y="8" width="16" height="10" />
              <path d="M8 8V6h8v2" />
            </svg>
          )}
          <h4>Your GPUs</h4>
          <p>The hardware you already own.</p>
        </article>
        <article>
          {compact ? null : (
            <svg className="ico" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="8" />
              <path d="M12 8v4l3 2" />
            </svg>
          )}
          <h4>Your latency cap</h4>
          <p>The limit you will not break.</p>
        </article>
      </div>
      {compact ? null : (
        <div className="goal">
          <div className="win">
            <p className="mono k">We try to cut</p>
            <p className="v">GPU hours</p>
          </div>
          <div>
            <p className="mono k">We do not move</p>
            <p className="v">Your latency cap</p>
          </div>
        </div>
      )}
    </div>
  );
}

function TestVisual({ compact = false }: { compact?: boolean }) {
  return (
    <div className="visual">
      <div
        className="compare"
        role="img"
        aria-label="Today uses 100 GPU hours. A candidate uses 93, still within the latency cap."
      >
        <div className="compare-col">
          <p className="mono label">Today</p>
          <div className="bar-row">
            <div className="top">
              <span>GPU time</span>
              <b>100</b>
            </div>
            <div className="trackline">
              <span style={{ ["--w" as string]: "100%" }} />
            </div>
          </div>
          {compact ? null : (
            <p className="hold">
              <CheckIcon />
              Within latency cap
            </p>
          )}
        </div>
        {compact ? null : (
          <p className="vs" aria-hidden="true">
            vs
          </p>
        )}
        <div className="compare-col is-win">
          <p className="mono label">Candidate</p>
          <div className="bar-row">
            <div className="top">
              <span>GPU time</span>
              <b>93</b>
            </div>
            <div className="trackline">
              <span style={{ ["--w" as string]: "93%" }} />
            </div>
          </div>
          {compact ? null : (
            <p className="hold">
              <CheckIcon />
              Within latency cap
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function KeepVisual({ compact = false }: { compact?: boolean }) {
  const rounds = [
    { h: "100%", label: "100" },
    { h: "84%", label: "93" },
    { h: "72%", label: "88" },
    { h: "62%", label: "84" },
  ];

  return (
    <div className="visual">
      <div className="verdict">
        <article className="keep">
          <h4>Keep</h4>
          <p>
            {compact
              ? "This is now what you run."
              : "Cheaper, still within the cap. This is now what you run."}
          </p>
        </article>
        <article>
          <h4>Discard</h4>
          <p>
            {compact
              ? "Try the next change."
              : "Not cheaper, or it broke the cap. Try the next change."}
          </p>
        </article>
      </div>
      {compact ? null : (
        <div className="floor">
          <div className="floor-head">
            <p className="mono">GPU time, round by round</p>
            <p className="mono">Lower is better</p>
          </div>
          <div
            className="bars"
            role="img"
            aria-label="GPU time falls from 100 to 93, 88, then 84 across four rounds."
          >
            {rounds.map((round) => (
              <figure key={round.label}>
                <span style={{ ["--h" as string]: round.h }} />
                <figcaption className="mono">{round.label}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const visuals = [SetupVisual, TestVisual, KeepVisual];

export function Method() {
  const [active, setActive] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const mobileRef = useRef<HTMLDivElement>(null);
  const frame = useRef<number | null>(null);

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
        const idx = Math.min(PHASES - 1, Math.floor(progress * PHASES));
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
      const blocks = Array.from(root.querySelectorAll("[data-m]"));
      const io = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              const idx = Number((entry.target as HTMLElement).dataset.m ?? 0);
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

  const scrollToStep = (i: number) => {
    const track = trackRef.current;
    if (!track) return;
    const trackTop = track.getBoundingClientRect().top + window.scrollY;
    const scrollable = track.offsetHeight - window.innerHeight;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    window.scrollTo({
      top: trackTop + (i / PHASES) * scrollable + 2,
      behavior: reduced.matches ? "auto" : "smooth",
    });
  };

  return (
    <section className="method" id="method">
      <div className="wrap method-head mob">
        <MethodHeader />
      </div>

      <div ref={trackRef} className="track">
        <div className="sticky">
          <div className="wrap method-head desk">
            <MethodHeader />
          </div>
          <div className="wrap scene">
            <div>
              {steps.map((step, i) => (
                <button
                  key={step.index}
                  className={`rail-item${i === active ? " is-active" : ""}${
                    i < active ? " is-passed" : ""
                  }`}
                  type="button"
                  aria-current={i === active ? "step" : undefined}
                  onClick={() => scrollToStep(i)}
                >
                  <span className="num">{step.index}</span>
                  <span className="name">{step.label}</span>
                  <span className="mono subs">{step.sub}</span>
                </button>
              ))}
              <p className="mono loop-note">
                <RepeatIcon />
                {howItWorks.loopNote}
              </p>
              <p className={`mono cue${active === 0 ? " is-on" : ""}`}>
                <span className="mouse">
                  <span />
                </span>
                {howItWorks.scrollCue}
              </p>
            </div>

            <div className="plate">
              {steps.map((step, i) => {
                const Visual = visuals[i];
                return (
                  <article
                    key={step.index}
                    className={`phase${i === active ? " is-on" : ""}`}
                    aria-hidden={i !== active}
                  >
                    <h3>{step.title}</h3>
                    <p className="body">{step.body}</p>
                    <Visual />
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div ref={mobileRef} className="wrap mobile-how">
        <div className="chip">
          <span className="mono n">
            {steps[active].index} / {String(PHASES).padStart(2, "0")}
          </span>
          <span className="mono">{steps[active].label}</span>
        </div>
        {steps.map((step, i) => {
          const Visual = visuals[i];
          return (
            <article key={step.index} className="m-phase" data-m={i}>
              <p className="mono kicker">
                {step.index} · {step.label}
              </p>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
              <Visual compact />
            </article>
          );
        })}
      </div>
    </section>
  );
}
