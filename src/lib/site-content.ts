/**
 * Single source of truth for the landing page's prose. Landing components
 * and the agent Markdown view (`home-markdown.ts`) all read from here, so
 * copy only ever lives in one place.
 */

export const siteContent = {
  name: "Pareton",
  eyebrow: "Inference optimization",
  title: "Faster. Cheaper. Verified on yours.",
  /** Substring of `title` rendered italic on the page. */
  titleEmphasis: "yours",
  heroDescription:
    "Models are converging in quality. Cost and latency are the edge. Pareton searches the serving config space until a better engine holds on the workload you already run.",
  /** Substring of `heroDescription` rendered bold. */
  heroDescriptionBold:
    "Pareton searches the serving config space until a better engine holds on the workload you already run.",
  buildStatus: "Coming Soon · Bittensor Subnet 10",
  /** Axes of the search space, cycled around the hero mark. */
  heroAxes: [
    "Model",
    "Hardware",
    "Serving Configs",
    "Workload",
    "Quantization",
    "Launch Flags",
    "Kernel",
    "Traffic Shape",
    "Serving Stack",
  ],

  nav: [
    { label: "Method", href: "#method" },
    { label: "Docs", href: "/docs" },
    { label: "Dashboard", href: "/dashboard", end: true },
  ],

  /** Agent Markdown link list. Broader than the visible nav. */
  links: [
    { label: "Docs", href: "/docs" },
    { label: "Dashboard", href: "/dashboard" },
    { label: "X", href: "https://x.com/pareton_ai" },
    { label: "GitHub", href: "https://github.com/pareton-ai" },
    { label: "Contact", href: "mailto:xavier@pareton.ai" },
  ],

  /** Icon buttons in the close banner. `id` maps to an icon in socials.tsx. */
  socials: [
    { id: "x", label: "X / Twitter", href: "https://x.com/pareton_ai" },
    {
      id: "linkedin",
      label: "LinkedIn",
      href: "https://www.linkedin.com/company/pareton",
    },
    { id: "discord", label: "Discord", href: "https://discord.gg/bittensor" },
    { id: "github", label: "GitHub", href: "https://github.com/pareton-ai" },
    { id: "email", label: "Email", href: "mailto:xavier@pareton.ai" },
  ],

  heroCta: { label: "Talk to us", href: "mailto:xavier@pareton.ai" },
  talkCta: { label: "View a campaign", href: "/dashboard" },

  colophon: [
    { k: "Priority", v: "GPU-hours at SLA" },
    { k: "Hard gate", v: "p99 TTFT / ITL" },
    { k: "Search space", v: "Kernels, KV, batch, quant, and more" },
    { k: "Baseline rule", v: "Only moves forward" },
  ],

  brief: {
    index: "01 · Brief",
    text: "Inference demand is compounding faster than efficiency improves.",
    emphasis:
      "Pareton exists to close the gap, one validated configuration at a time.",
  },

  howItWorks: {
    index: "02 · Method",
    title: "How a better engine gets in.",
    lead: "We only keep a change if your latency cap still holds.",
    loopNote: "Then we try again",
    scrollCue: "Scroll to step through",
    steps: [
      {
        index: "01",
        label: "Setup",
        sub: "What you run today",
        title: "You tell us what you run. We freeze it.",
        body: "That snapshot is the ruler. Every later change is judged against it, not against a public leaderboard.",
      },
      {
        index: "02",
        label: "Test",
        sub: "Fair comparison",
        title: "A change only counts if it beats today.",
        body: "Same GPUs. Same traffic. Same latency cap. If it is not cheaper, it is discarded.",
      },
      {
        index: "03",
        label: "Keep",
        sub: "New starting point",
        title: "A win becomes the new today. Then we search again.",
        body: "Keep it, or throw it out. The starting point only gets better.",
      },
    ],
  },

  laws: {
    index: "03 · Why it holds",
    title: "Measured against your production baseline. Not a leaderboard.",
    items: [
      {
        index: "01",
        title: "Your workload is the benchmark",
        body: "Every candidate is scored on the profile you approved: real traffic shape, production flags, and the hardware you actually serve on.",
      },
      {
        index: "02",
        title: "Auditable patches, not knobs",
        body: "Improvements arrive as reviewable code and configuration diffs. You can see what changed, why it won, and what it did not touch.",
      },
      {
        index: "03",
        title: "Fragile gains are rejected",
        body: "Build, quality, compatibility, and cross-GPU gates run before the bench. A trick that only works on one trace does not ship.",
      },
      {
        index: "04",
        title: "The loop is the team you did not hire",
        body: "Search continues after the first win. Each promotion raises the floor, so GPU-hours, throughput, and latency keep moving.",
      },
    ],
  },

  buyers: {
    index: "04 · Buyers",
    title: "Built for the people who own GPU spend and SLA.",
    items: [
      {
        role: "ML platform",
        title: "Inference and serving leads",
        body: "You run vLLM, TensorRT-LLM, or SGLang in production. You need the kernel and KV-cache work without freezing a quarter of the team.",
      },
      {
        role: "Infrastructure",
        title: "Heads of infra and GPU ops",
        body: "Utilization and cost per token are the line. Pareton reports in GPU-hours at SLA, on the SKUs you already bought.",
      },
      {
        role: "Technical eval",
        title: "Staff ML engineers",
        body: "You will read the campaign, the patch, and the bench. The product is a numeric record of what was tried, what failed, what shipped.",
      },
    ],
  },

  close: {
    title: "Pushing the Pareto frontier of inference.",
    body: "If you already serve models under a real SLA, send the profile. We will tell you whether the search is worth running.",
    primary: { label: "Talk to us", href: "mailto:xavier@pareton.ai" },
    secondary: { label: "Open the dashboard", href: "/dashboard" },
  },

  tagline: "Faster. Cheaper. Verified on yours",
} as const;

export type SiteContent = typeof siteContent;
