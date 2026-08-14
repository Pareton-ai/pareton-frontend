import { siteContent } from "@/lib/site-content";

export function Brief() {
  const { brief } = siteContent;
  return (
    <section className="statement" id="brief">
      <div className="wrap inner">
        <p className="mono">{brief.index}</p>
        <p>
          {brief.text} <em>{brief.emphasis}</em>
        </p>
      </div>
    </section>
  );
}
