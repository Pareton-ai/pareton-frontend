/**
 * Blog index. Post bodies live in `src/components/blog/posts/`, keyed by slug,
 * so this module stays plain data for the index, metadata, and sitemap.
 */

export type BlogImage = {
  src: string;
  alt: string;
  width: number;
  height: number;
};

export type BlogPost = {
  slug: string;
  /** ISO date, `YYYY-MM-DD`. */
  date: string;
  category: string;
  title: string;
  /** One or two sentences under the title, and the meta description. */
  dek: string;
  author: string;
  readingMinutes: number;
  cover: BlogImage & { caption?: string };
};

export const blogPosts: readonly BlogPost[] = [
  {
    slug: "exploit-summit-2026",
    date: "2026-10-15",
    category: "Field notes",
    title: "The pit crew, not the engine",
    dek: "Notes from Xavier Lyu's talk at Exploit Summit in Montréal: why inference gains compound, and why they only count on the workload you already run.",
    author: "Pareton",
    readingMinutes: 5,
    cover: {
      src: "/blog/exploit-summit-2026/hero.jpg",
      alt: "Xavier Lyu on stage at Exploit Summit, in front of a slide titled Compounding Inference Optimization",
      width: 2400,
      height: 1350,
      caption:
        "Xavier Lyu presenting Compounding Inference Optimization. Montréal, September 28.",
    },
  },
  {
    slug: "liquid-inference",
    date: "2026-10-14",
    category: "Network",
    title: "Pareton joins Liquid Inference as a verified provider",
    dek: "Inference is turning into a market with live prices. On a market like that, cost per token is the whole game.",
    author: "Pareton",
    readingMinutes: 3,
    cover: {
      src: "/blog/liquid-inference/cover.jpg",
      alt: "Every token, priced live. Pareton is now a verified provider on the Liquid Inference network.",
      width: 2400,
      height: 1350,
    },
  },
  {
    slug: "engy",
    date: "2026-10-01",
    category: "Partnership",
    title: "Engy is getting faster",
    dek: "Three rounds into our Kimi K3 campaign, the leading patch serves Engy's traffic about 25% faster end-to-end, on the same eight B300 GPUs.",
    author: "Pareton",
    readingMinutes: 4,
    cover: {
      src: "/blog/engy/cover.jpg",
      alt: "Partnership: Engy is getting faster. Pareton now tunes how Engy runs its AI models.",
      width: 3200,
      height: 1800,
    },
  },
  {
    slug: "qwen3-8-throughput",
    date: "2026-09-23",
    category: "Results",
    title: "Same model. Same GPUs. Up to 54% more tokens per second.",
    dek: "We benchmarked the top miner patch for Qwen3.8-27B against the pinned baseline with NVIDIA's AIPerf. Output throughput rose 23 to 54% across every load we tested.",
    author: "Pareton",
    readingMinutes: 4,
    cover: {
      src: "/blog/qwen3-8-throughput/cover.jpg",
      alt: "Chart: Qwen3.8-27B on SGLang and four RTX 5090s. Output throughput versus baseline: +54% at 4 concurrent requests, +50% at 8, +40% at 16, +23% at 32.",
      width: 3200,
      height: 1800,
    },
  },
  {
    slug: "gpu-memory-tensor-parallelism",
    date: "2026-09-20",
    category: "Engineering",
    title: "More GPUs don't always mean more usable memory",
    dek: "A workload hit an out-of-memory error. Doubling the GPUs would not have fixed it. Here is why, and what did.",
    author: "Pareton",
    readingMinutes: 4,
    cover: {
      src: "/blog/gpu-memory-tensor-parallelism/cover.jpg",
      alt: "Diagram comparing TP=4 and TP=8: model weights and KV cache are distributed across GPUs, temporary memory per GPU stays the same.",
      width: 1199,
      height: 675,
    },
  },
];

export function getPost(slug: string): BlogPost | undefined {
  return blogPosts.find((post) => post.slug === slug);
}

const dateFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

export function formatPostDate(date: string): string {
  return dateFormat.format(new Date(`${date}T00:00:00Z`));
}
