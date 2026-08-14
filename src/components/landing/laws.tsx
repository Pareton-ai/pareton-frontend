import { siteContent } from "@/lib/site-content";

export function Laws() {
  const { laws } = siteContent;
  return (
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
  );
}
