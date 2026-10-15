import type { CSSProperties } from "react";

export type BarRow = {
  label: string;
  value: number;
  /** Text at the bar tip, e.g. "+54%". */
  display: string;
  /** `muted` for a reference or failing bar, `provisional` for a hatched one. */
  tone?: "accent" | "muted" | "provisional";
  /** Short qualifier shown under the label, e.g. "Provisional". */
  note?: string;
};

/**
 * Horizontal bar chart, server-rendered with no client JS.
 *
 * One series, so the title names it and there is no legend. Every bar carries a
 * direct label at its tip, and a visually hidden table repeats the data for
 * screen readers.
 */
export function BarChart({
  title,
  caption,
  rows,
  max,
  columns,
}: {
  title: string;
  caption?: string;
  rows: BarRow[];
  /** Axis maximum. Defaults to the largest value. */
  max?: number;
  /** Header cells for the accessible table. */
  columns: [string, string];
}) {
  const top = max ?? Math.max(...rows.map((r) => r.value));
  const pct = (v: number) => `${Math.min(100, (v / top) * 100)}%`;

  return (
    <figure className="chart">
      <figcaption className="chart-head">
        <span className="chart-title">{title}</span>
        {caption && <span className="chart-sub">{caption}</span>}
      </figcaption>
      <div className="chart-plot" aria-hidden="true">
        {rows.map((row) => (
          <div
            key={row.label}
            className={`chart-row is-${row.tone ?? "accent"}`}
            title={`${row.label}: ${row.display}`}
          >
            <span className="chart-label">
              {row.label}
              {row.note && <em>{row.note}</em>}
            </span>
            <span className="chart-track">
              <span
                className="chart-bar"
                style={{ "--w": pct(row.value) } as CSSProperties}
              />
              <span
                className="chart-value"
                style={{ "--w": pct(row.value) } as CSSProperties}
              >
                {row.display}
              </span>
            </span>
          </div>
        ))}
      </div>
      {/* Tables ignore a 1px width, so the wrapper does the hiding. */}
      <div className="sr-only">
        <table>
          <caption>{title}</caption>
          <thead>
            <tr>
              <th scope="col">{columns[0]}</th>
              <th scope="col">{columns[1]}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label}>
                <th scope="row">
                  {row.label}
                  {row.note ? ` (${row.note})` : ""}
                </th>
                <td>{row.display}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}

/** Headline numbers that open a results post. */
export function Stats({
  items,
}: {
  items: { value: string; label: string }[];
}) {
  return (
    <dl className="stats">
      {items.map((item) => (
        <div key={item.label}>
          <dt className="mono">{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
