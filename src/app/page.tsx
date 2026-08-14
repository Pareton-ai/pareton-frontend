import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { Method } from "@/components/landing/method";
import { landingFontClassName } from "@/lib/landing-fonts";
import { siteContent } from "@/lib/site-content";
import "@/components/landing/landing.css";

const { nav, colophon, brief, laws, buyers, close } = siteContent;

/** Split `text` around `mark`, wrapping the matched part in `wrap`. */
function withEmphasis(
  text: string,
  mark: string,
  wrap: (part: string) => ReactNode
) {
  const at = text.indexOf(mark);
  if (at === -1) return text;
  return (
    <>
      {text.slice(0, at)}
      {wrap(mark)}
      {text.slice(at + mark.length)}
    </>
  );
}

function NavLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  const external = href.startsWith("http") || href.startsWith("mailto:");
  if (external || href.startsWith("#")) {
    return (
      <a
        href={href}
        className={className}
        {...(href.startsWith("http")
          ? { target: "_blank", rel: "noopener noreferrer" }
          : {})}
      >
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

export default function Home() {
  return (
    <div className={`landing ${landingFontClassName}`}>
      <div className="fiber" aria-hidden="true" />

      <header className="nav">
        <div className="wrap nav-inner">
          <a className="brand" href="#top" aria-label={siteContent.name}>
            <Image src="/logo.png" alt="" width={28} height={28} priority />
            <span>{siteContent.name}</span>
          </a>
          <nav className="nav-links" aria-label="Primary">
            {nav.map((link) => (
              <NavLink
                key={link.label}
                href={link.href}
                className={`mono${"end" in link && link.end ? " end" : ""}`}
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main id="top">
        <section className="hero">
          <div className="wrap hero-grid">
            <div className="hero-copy">
              <p className="mono kicker">{siteContent.eyebrow}</p>
              <h1>
                {withEmphasis(
                  siteContent.title,
                  siteContent.titleEmphasis,
                  (part) => (
                    <em>{part}</em>
                  )
                )}
              </h1>
              <p className="lede">{siteContent.heroDescription}</p>
              <div className="actions">
                <NavLink className="btn" href={siteContent.heroCta.href}>
                  {siteContent.heroCta.label}
                </NavLink>
                <NavLink className="text-link" href={siteContent.talkCta.href}>
                  {siteContent.talkCta.label}
                </NavLink>
              </div>
              <p className="mono soon">{siteContent.buildStatus}</p>
            </div>
            <div className="mark-hero" aria-hidden="true">
              <span className="on" />
              <span />
              <span />
              <span className="on" />
              <span className="on" />
              <span />
            </div>
          </div>
        </section>

        <section className="colophon" aria-label="What the loop is scored on">
          {colophon.map((row) => (
            <div key={row.k}>
              <p className="mono k">{row.k}</p>
              <p className="v">{row.v}</p>
            </div>
          ))}
        </section>

        <section className="statement" id="brief">
          <div className="wrap inner">
            <p className="mono">{brief.index}</p>
            <p>
              {brief.text} <em>{brief.emphasis}</em>
            </p>
          </div>
        </section>

        <Method />

        <section className="laws" id="laws">
          <div className="wrap">
            <div className="laws-head">
              <p className="mono">{laws.index}</p>
              <h2>{laws.title}</h2>
            </div>
            <div className="law-grid">
              {laws.items.map((law) => (
                <article key={law.index} className="law">
                  <p className="n">{law.index}</p>
                  <h3>{law.title}</h3>
                  <p>{law.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="buyers" id="audience">
          <div className="wrap">
            <p className="mono">{buyers.index}</p>
            <h2>{buyers.title}</h2>
            <div className="who">
              {buyers.items.map((item) => (
                <article key={item.role}>
                  <p className="mono role">{item.role}</p>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="close" id="contact">
          <div className="wrap">
            <h2>{close.title}</h2>
            <p>{close.body}</p>
            <div className="actions">
              <NavLink className="btn" href={close.primary.href}>
                {close.primary.label}
              </NavLink>
              <NavLink className="text-link" href={close.secondary.href}>
                {close.secondary.label}
              </NavLink>
            </div>
          </div>
        </section>
      </main>

      <footer className="foot">
        <div className="wrap">
          <p className="mono">
            © {new Date().getFullYear()} {siteContent.name}
          </p>
          <p className="mono">{siteContent.tagline}</p>
        </div>
      </footer>
    </div>
  );
}
