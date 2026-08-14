import type { ReactNode } from "react";
import { NavLink } from "@/components/landing/nav-link";
import { siteContent } from "@/lib/site-content";

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

export function Hero() {
  return (
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
  );
}
