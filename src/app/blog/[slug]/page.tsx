import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BlogShell } from "@/components/blog/blog-shell";
import { postBodies } from "@/components/blog/posts";
import { blogPosts, formatPostDate, getPost } from "@/lib/blog";

type Params = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const post = getPost((await params).slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.dek,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.dek,
      publishedTime: post.date,
      images: [{ url: post.cover.src, alt: post.cover.alt }],
    },
    twitter: {
      card: "summary_large_image",
      site: "@Pareton_ai",
      title: post.title,
      description: post.dek,
      images: [post.cover.src],
    },
  };
}

export default async function BlogPostPage({ params }: Params) {
  const { slug } = await params;
  const post = getPost(slug);
  const Body = postBodies[slug];
  if (!post || !Body) notFound();

  return (
    <BlogShell>
      <article className="post">
        <header className="wrap post-head">
          <p className="mono meta">
            <Link href="/blog" className="back">
              Blog
            </Link>
            <span aria-hidden>/</span>
            <span className="cat">{post.category}</span>
          </p>
          <h1>{post.title}</h1>
          <p className="dek">{post.dek}</p>
          <p className="mono byline">
            <span>{post.author}</span>
            <time dateTime={post.date}>{formatPostDate(post.date)}</time>
            <span>{post.readingMinutes} min read</span>
          </p>
        </header>

        <figure className="wrap cover">
          <Image
            src={post.cover.src}
            alt={post.cover.alt}
            width={post.cover.width}
            height={post.cover.height}
            sizes="(min-width: 1180px) 1180px, 100vw"
            priority
          />
          <figcaption>{post.cover.caption}</figcaption>
        </figure>

        <div className="wrap">
          <div className="article-body">
            <Body />
          </div>
        </div>
      </article>
    </BlogShell>
  );
}
