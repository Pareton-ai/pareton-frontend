/**
 * Single source of truth for the landing page's prose. `page.tsx`,
 * `how-it-works.tsx`, and the agent Markdown view (`home-markdown.ts`) all read
 * from here, so copy only ever lives in one place.
 */

export const siteContent = {
  name: "Pareton",
  eyebrow: "Inference optimization infrastructure",
  title: "The Intelligence Layer for AI Inference",
  heroDescription:
    "AI models are converging in quality; cost and latency are the real competitive edge. Pareton continuously discovers, validates, and deploys the optimal serving configuration for your workload.",
  /** Substring of `heroDescription` rendered italic on the page. */
  heroEmphasis: "your",
  buildStatus: "Build in progress · Coming soon",

  links: [
    { label: "Dashboard", href: "/dashboard" },
    { label: "X", href: "https://x.com/pareton_ai" },
    { label: "GitHub", href: "https://github.com/pareton-ai" },
    { label: "Contact", href: "mailto:xavier@pareton.ai" },
  ],

  howItWorks: {
    eyebrow: "How Pareton works",
    title: "An optimization loop: your profile in, better engine out.",
    steps: [
      {
        index: "01",
        label: "Customer profile",
        title: "You bring the setup. You define better.",
        body: "Tell Pareton what you run in production — model, serving stack, workload profile, hardware — and the SLA gates you won't break. One success metric locks the goal, usually GPU-hours saved at SLA. That customer-approved profile is the yardstick for every candidate that follows.",
      },
      {
        index: "02",
        label: "Contributor patches",
        title: "Contributors propose, you don't rewrite",
        body: "Contributors (miners) submit small, reviewable patches against the current baseline — prefix caching, batch sizing, KV-cache allocation, kernels. Every candidate targets the same frozen profile, so proposals stay comparable.",
      },
      {
        index: "03",
        label: "Validate",
        title: "Automated validation gates everything",
        body: "Before any benchmark runs, the candidate has to build and run, preserve output quality and API compatibility, satisfy the customer's constraints, and work across the required GPU environments. Invalid patches are rejected.",
      },
      {
        index: "04",
        label: "Benchmark",
        title: "Baseline vs. patched, head to head",
        body: "The patched engine and the current baseline run the exact same workload trace, on identical hardware, under the same SLA gates. The comparison is apples-to-apples by construction.",
      },
      {
        index: "05",
        label: "Promote or reject",
        title: "Promote on evidence, or move on",
        body: "One binary call from measurements: did it improve the priority metric without breaking SLA? Yes — merge it and promote the new best baseline. No — discard it and test the next candidate. The baseline only moves forward.",
      },
      {
        index: "06",
        label: "Repeat",
        title: "The loop compounds",
        body: "Rounds repeat until the agreed success threshold is reached. Each accepted patch becomes the floor for the next, so gains compound instead of expiring.",
      },
    ],
  },

  facts: [
    {
      index: "01",
      title: "Continuous search",
      body: "The inference search space — kernels, batching, KV cache, quantization, scheduling — evolves faster than any isolated R&D team can track. Pareton benchmarks it continuously.",
    },
    {
      index: "02",
      title: "Deterministic validation",
      body: "Every candidate configuration is stress-tested across GPU types, context lengths, and request patterns. Only improvements that hold universally reach the baseline.",
    },
    {
      index: "03",
      title: "Compounding baseline",
      body: "Each validated improvement becomes the new floor for the next. Optimization stops being a per-company cost and becomes shared, accumulating infrastructure.",
    },
  ],

  positioning:
    "Inference demand is compounding faster than efficiency improves. The gap shows up in margin, serving latency, and duplicated optimization work. Pareton exists to close it, one validated configuration at a time.",
  /** Trailing clause of `positioning` de-emphasized (secondary) on the page. */
  positioningEmphasis:
    "Pareton exists to close it, one validated configuration at a time.",

  tagline: "Pushing the Pareto frontier of inference",
} as const;

export type SiteContent = typeof siteContent;
