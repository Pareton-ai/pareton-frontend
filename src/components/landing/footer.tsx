import { siteContent } from "@/lib/site-content";

export function Footer() {
  return (
    <footer className="foot">
      <div className="wrap">
        <p className="mono">
          © {new Date().getFullYear()} {siteContent.name}
        </p>
        <p className="mono">{siteContent.tagline}</p>
      </div>
    </footer>
  );
}
