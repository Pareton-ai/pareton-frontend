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
  cover: BlogImage & { caption: string };
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
];

/**
 * Press, podcasts, and talks hosted somewhere else. Newest first.
 * TODO: swap the two profile links for the episode URLs.
 */
export const blogElsewhere = [
  {
    date: "2026-10-08",
    outlet: "Novelty Search",
    title: "Subnet 10 on Novelty Search, with the Opentensor Foundation",
    href: "https://x.com/opentensor",
  },
  {
    date: "2026-10-07",
    outlet: "TheStreet",
    title:
      "These founders are using a crypto network to chase the most boring thing in AI: paying customers",
    href: "https://www.thestreet.com/crypto/innovation/these-founders-are-using-a-crypto-network-to-chase-the-most-boring-thing-in-ai-paying-customers",
  },
  {
    date: "2026-10-07",
    outlet: "Ventura Labs · Ep. 103",
    title: "Xavier Lyu on target hardware, non-CUDA GPUs, and campaigns",
    href: "https://x.com/VenturaLabs",
  },
] as const;

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
