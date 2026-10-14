import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { BlogShell } from "@/components/blog/blog-shell";
import { blogElsewhere, blogPosts, formatPostDate } from "@/lib/blog";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Field notes, talks, and campaign write-ups from Pareton, the inference optimization subnet on Bittensor.",
  alternates: { canonical: "/blog" },
};

export default function BlogIndex() {
  const [lead, ...rest] = blogPosts;

  return (
    <BlogShell>
      <section className="blog-head">
        <div className="wrap">
          <p className="mono kicker">Blog</p>
          <h1>
            Notes from the <em>frontier.</em>
          </h1>
          <p className="lede">
            Talks, campaign write-ups, and what we learn making inference faster
            and cheaper on real workloads.
          </p>
        </div>
      </section>

      {lead && (
        <section className="wrap">
          <Link href={`/blog/${lead.slug}`} className="lead-post">
            <div className="lead-img">
              <Image
                src={lead.cover.src}
                alt={lead.cover.alt}
                width={lead.cover.width}
                height={lead.cover.height}
                sizes="(min-width: 1024px) 680px, 100vw"
                priority
              />
            </div>
            <div className="lead-copy">
              <p className="mono meta">
                <span className="cat">{lead.category}</span>
                <time dateTime={lead.date}>{formatPostDate(lead.date)}</time>
              </p>
              <h2>{lead.title}</h2>
              <p className="dek">{lead.dek}</p>
              <p className="mono more">
                Read · {lead.readingMinutes} min <span aria-hidden>→</span>
              </p>
            </div>
          </Link>
        </section>
      )}

      {rest.length > 0 && (
        <section className="wrap post-list">
          {rest.map((post) => (
            <Link key={post.slug} href={`/blog/${post.slug}`} className="row">
              <time className="mono" dateTime={post.date}>
                {formatPostDate(post.date)}
              </time>
              <span className="title">{post.title}</span>
              <span className="mono cat">{post.category}</span>
            </Link>
          ))}
        </section>
      )}

      <section className="wrap elsewhere">
        <p className="mono kicker">Elsewhere</p>
        <ul>
          {blogElsewhere.map((item) => (
            <li key={item.href + item.date}>
              <a href={item.href} target="_blank" rel="noopener noreferrer">
                <span className="mono outlet">{item.outlet}</span>
                <span className="title">{item.title}</span>
                <time className="mono" dateTime={item.date}>
                  {formatPostDate(item.date)}
                </time>
                <span className="arrow" aria-hidden>
                  ↗
                </span>
              </a>
            </li>
          ))}
        </ul>
      </section>
    </BlogShell>
  );
}
