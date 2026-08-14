import { siteContent } from "@/lib/site-content";

export function Colophon() {
  return (
    <section className="colophon" aria-label="What the loop is scored on">
      {siteContent.colophon.map((row) => (
        <div key={row.k}>
          <p className="mono k">{row.k}</p>
          <p className="v">{row.v}</p>
        </div>
      ))}
    </section>
  );
}
