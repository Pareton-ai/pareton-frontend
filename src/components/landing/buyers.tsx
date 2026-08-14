import { siteContent } from "@/lib/site-content";

export function Buyers() {
  const { buyers } = siteContent;
  return (
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
  );
}
