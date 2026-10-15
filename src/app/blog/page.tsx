import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { BlogShell } from "@/components/blog/blog-shell";
import { blogPosts, formatPostDate, type BlogPost } from "@/lib/blog";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Field notes, results, and engineering write-ups from Pareton, the inference optimization subnet on Bittensor.",
  alternates: { canonical: "/blog" },
};

function PostMeta({ post }: { post: BlogPost }) {
  return (
    <p className="mono meta">
      <span className="cat">{post.category}</span>
      <time dateTime={post.date}>{formatPostDate(post.date)}</time>
    </p>
  );
}

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
            Talks, results, and what we learn making inference faster and
            cheaper on real workloads.
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
              <PostMeta post={lead} />
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
        <section className="wrap post-grid">
          {rest.map((post) => (
            <Link key={post.slug} href={`/blog/${post.slug}`} className="card">
              <div className="card-img">
                <Image
                  src={post.cover.src}
                  alt={post.cover.alt}
                  width={post.cover.width}
                  height={post.cover.height}
                  sizes="(min-width: 1024px) 560px, 100vw"
                />
              </div>
              <PostMeta post={post} />
              <h2>{post.title}</h2>
              <p className="dek">{post.dek}</p>
            </Link>
          ))}
        </section>
      )}
    </BlogShell>
  );
}
