import Image from "next/image";
import { NavLink } from "@/components/landing/nav-link";
import { siteContent } from "@/lib/site-content";

export function Header({
  brandHref = "#top",
  current,
}: {
  /** The landing page scrolls to its top; other pages link home. */
  brandHref?: string;
  /** `href` of the nav item for the page being viewed. */
  current?: string;
}) {
  return (
    <header className="nav">
      <div className="wrap nav-inner">
        <a className="brand" href={brandHref} aria-label={siteContent.name}>
          <Image src="/logo.png" alt="" width={28} height={28} priority />
          <span>{siteContent.name}</span>
        </a>
        <nav className="nav-links" aria-label="Primary">
          {siteContent.nav.map((link) => (
            <NavLink
              key={link.label}
              href={link.href}
              current={link.href === current}
              className={`mono${"end" in link && link.end ? " end" : ""}`}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
}
