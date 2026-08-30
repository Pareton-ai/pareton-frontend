"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { formatScore } from "@/lib/api/format";
import type { ScoreProgressPoint } from "@/lib/api/types";

/** Plot box insets. Left carries the score axis, bottom the round axis. */
const PAD = { top: 16, right: 16, bottom: 30, left: 46 };
const HEIGHT = 300;
const COMPACT_HEIGHT = 240;
/** Width used for the server render, before the container reports its own. */
const SSR_WIDTH = 900;
const COMPACT_BELOW = 560;
const MAX_X_LABELS = 7;

type Domain = { min: number; max: number; ticks: number[] };

/**
 * Axis domain rounded out to human steps (0.1, 0.25, 0.5 …).
 *
 * Always spans zero: a score of 0.0 means the image matched baseline speed, so
 * the axis has to show where baseline sits even when every entry beat it.
 */
function niceDomain(values: readonly number[], tickCount = 4): Domain {
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  const span = max - min || 1;
  const rawStep = span / tickCount;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const normalized = rawStep / magnitude;
  const step =
    (normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10) *
    magnitude;

  const niceMin = Math.floor(min / step) * step;
  const niceMax = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  // Steps like 0.1 accumulate float error, so each tick is recomputed from the
  // index rather than added onto the last one.
  const count = Math.round((niceMax - niceMin) / step);
  for (let i = 0; i <= count; i += 1) {
    ticks.push(Number((niceMin + i * step).toPrecision(12)));
  }
  return { min: niceMin, max: niceMax, ticks };
}

/** Every axis label would collide past a handful of rounds, so thin them out. */
function labelledOrdinals(count: number): Set<number> {
  const shown = new Set<number>();
  if (count === 0) return shown;
  const stride = Math.max(1, Math.ceil(count / MAX_X_LABELS));
  for (let i = 0; i < count - 1; i += stride) shown.add(i);
  // The newest round is the one people look for, so it is always labelled; a
  // strided tick right next to it would only collide.
  if (stride > 1) shown.delete(count - 2);
  shown.add(count - 1);
  return shown;
}

/**
 * A layout effect so the real width lands before the browser paints.
 *
 * The server has no container to measure and renders at `SSR_WIDTH`; measuring
 * in a passive effect would let that approximation paint first and then snap.
 * React only warns about layout effects when they run on the server, which
 * this one never does.
 */
const useBeforePaint =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

/** Container width, measured on the client so axis text stays at true size. */
function useMeasuredWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(SSR_WIDTH);

  useBeforePaint(() => {
    const node = ref.current;
    if (!node) return;
    if (node.clientWidth > 0) setWidth(node.clientWidth);
    const observer = new ResizeObserver(([entry]) => {
      const next = entry?.contentRect.width;
      if (next && next > 0) setWidth(next);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return { ref, width };
}

function statusNote(point: ScoreProgressPoint): string {
  if (point.leader_score !== null) return "";
  return point.status === "void"
    ? "voided, no score"
    : point.status === "complete"
      ? "no leader score"
      : `${point.status}, not scored yet`;
}

/**
 * Leader score per round, with every entry's score behind it.
 *
 * The accent line is the crown: one point per round that produced a leader
 * score. Rounds that voided break the line and are bridged with a dashed
 * segment, so a gap reads as "nothing was scored here" rather than as a dip.
 * Faint dots are the other images that ran in the same round, which is what
 * makes a jump legible as a field pulling ahead instead of one number moving.
 */
export function ScoreProgressChart({
  points,
  scoringLabel,
}: {
  /** Ordered oldest round first. */
  points: readonly ScoreProgressPoint[];
  /** Scoring rule name, used as the axis caption. */
  scoringLabel: string;
}) {
  const { ref, width } = useMeasuredWidth();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const compact = width < COMPACT_BELOW;
  const height = compact ? COMPACT_HEIGHT : HEIGHT;
  const plotLeft = compact ? PAD.left - 8 : PAD.left;
  const plotWidth = Math.max(1, width - plotLeft - PAD.right);
  const plotHeight = Math.max(1, height - PAD.top - PAD.bottom);
  const plotBottom = PAD.top + plotHeight;

  const scores = points.flatMap((point) => [
    ...(point.leader_score !== null ? [point.leader_score] : []),
    ...point.entries.flatMap((entry) =>
      entry.score !== null ? [entry.score] : []
    ),
  ]);
  const domain = niceDomain(scores);

  const xFor = (index: number) =>
    points.length <= 1
      ? plotLeft + plotWidth / 2
      : plotLeft + (index / (points.length - 1)) * plotWidth;

  const yFor = (score: number) =>
    plotBottom -
    ((score - domain.min) / (domain.max - domain.min || 1)) * plotHeight;

  /** Indices with a leader score, in order, for the connecting line. */
  const scored = points.flatMap((point, index) =>
    point.leader_score !== null
      ? [{ index, x: xFor(index), y: yFor(point.leader_score) }]
      : []
  );

  const xLabels = labelledOrdinals(points.length);
  const active = activeIndex === null ? null : (points[activeIndex] ?? null);

  const pickNearest = useCallback(
    (clientX: number) => {
      const node = ref.current;
      if (!node || points.length === 0) return;
      const box = node.getBoundingClientRect();
      const local = clientX - box.left;
      const step = points.length <= 1 ? 1 : plotWidth / (points.length - 1);
      const index = Math.round((local - plotLeft) / step);
      setActiveIndex(Math.max(0, Math.min(points.length - 1, index)));
    },
    [plotLeft, plotWidth, points.length, ref]
  );

  const onKeyDown = (event: KeyboardEvent) => {
    const last = points.length - 1;
    const current = activeIndex ?? last;
    const next =
      event.key === "ArrowLeft"
        ? current - 1
        : event.key === "ArrowRight"
          ? current + 1
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? last
              : null;
    if (next === null) {
      if (event.key === "Escape") setActiveIndex(null);
      return;
    }
    event.preventDefault();
    setActiveIndex(Math.max(0, Math.min(last, next)));
  };

  const best = scored.length
    ? Math.max(...scored.map(({ index }) => points[index].leader_score ?? 0))
    : null;
  const summary =
    scored.length === 0
      ? `No round in this campaign has produced a leader score yet. ${points.length} rounds recorded.`
      : `Leader ${scoringLabel} across ${points.length} rounds, from round ${points[0].ordinal} to round ${points[points.length - 1].ordinal}. Best leader score ${formatScore(best ?? 0)}.`;

  return (
    <figure className="m-0">
      <div
        ref={ref}
        tabIndex={0}
        role="group"
        aria-label={`${summary} Use the left and right arrow keys to read each round.`}
        onPointerMove={(event) => pickNearest(event.clientX)}
        onPointerDown={(event) => pickNearest(event.clientX)}
        onPointerLeave={() => setActiveIndex(null)}
        onKeyDown={onKeyDown}
        onBlur={() => setActiveIndex(null)}
        className="relative w-full touch-pan-y select-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
      >
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={summary}
          className="block overflow-visible"
        >
          {/* Grid and score axis. The zero rule is drawn last so it sits over
              the ordinary gridlines: it is the baseline, not a tick. */}
          {domain.ticks.map((tick) => (
            <g key={tick}>
              <line
                x1={plotLeft}
                x2={plotLeft + plotWidth}
                y1={yFor(tick)}
                y2={yFor(tick)}
                className={
                  tick === 0 ? "stroke-border-strong" : "stroke-border"
                }
                strokeWidth={1}
                shapeRendering="crispEdges"
              />
              <text
                x={plotLeft - 10}
                y={yFor(tick)}
                textAnchor="end"
                dominantBaseline="middle"
                className="fill-muted font-mono text-caption tabular-nums"
              >
                {formatScore(tick)}
              </text>
            </g>
          ))}

          {/* Round axis. */}
          {points.map((point, index) =>
            xLabels.has(index) ? (
              <text
                key={point.round_id}
                x={xFor(index)}
                y={plotBottom + 18}
                textAnchor={
                  index === 0
                    ? "start"
                    : index === points.length - 1
                      ? "end"
                      : "middle"
                }
                className="fill-muted font-mono text-caption tabular-nums"
              >
                R{point.ordinal}
              </text>
            ) : null
          )}

          {/* Rounds that produced nothing: a rust tick on the axis, so a break
              in the line has a stated cause instead of just being absent. */}
          {points.map((point, index) =>
            point.status === "void" ? (
              <line
                key={`void-${point.round_id}`}
                x1={xFor(index)}
                x2={xFor(index)}
                y1={plotBottom}
                y2={plotBottom + 5}
                className="stroke-rust"
                strokeWidth={1.5}
                shapeRendering="crispEdges"
              />
            ) : null
          )}

          {/* One line for the crown. Segments that skip a round it never scored
              go dashed, so a gap reads as missing data rather than as a
              measured dip, without the series losing its weight. */}
          {scored.slice(0, -1).map((from, i) => {
            const to = scored[i + 1];
            const contiguous = to.index === from.index + 1;
            return (
              <line
                key={`link-${from.index}`}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                className="stroke-accent"
                strokeWidth={1.5}
                strokeDasharray={contiguous ? undefined : "4 4"}
                strokeLinecap="round"
              />
            );
          })}

          {/* Every other image that ran in the round. */}
          {points.map((point, index) =>
            point.entries.map((entry) =>
              entry.score !== null && entry.score !== point.leader_score ? (
                <circle
                  key={`${point.round_id}-${entry.submission_id}`}
                  cx={xFor(index)}
                  cy={yFor(entry.score)}
                  r={2.5}
                  className="fill-secondary/50"
                />
              ) : null
            )
          )}

          {/* Crosshair for the reading under the cursor. */}
          {active && activeIndex !== null ? (
            <line
              x1={xFor(activeIndex)}
              x2={xFor(activeIndex)}
              y1={PAD.top}
              y2={plotBottom}
              className="stroke-border-strong"
              strokeWidth={1}
              shapeRendering="crispEdges"
            />
          ) : null}

          {/* Leader score per round. The last one carries a halo: on an open
              campaign it is the number every miner is trying to beat. */}
          {scored.map(({ index, x, y }, i) => {
            const isLast = i === scored.length - 1;
            const isActive = index === activeIndex;
            return (
              <g key={`dot-${index}`}>
                {isLast ? (
                  <circle cx={x} cy={y} r={7} className="fill-accent/20" />
                ) : null}
                <circle
                  cx={x}
                  cy={y}
                  r={isActive ? 4.5 : 3}
                  className="fill-accent"
                />
                {isActive ? (
                  <circle
                    cx={x}
                    cy={y}
                    r={4.5}
                    className="fill-none stroke-background"
                    strokeWidth={1.5}
                  />
                ) : null}
              </g>
            );
          })}
        </svg>

        {active && activeIndex !== null ? (
          <Tooltip
            point={active}
            x={xFor(activeIndex)}
            width={width}
            compact={compact}
            /* Sit in the half of the plot the reading is not in, so the
               tooltip never lands on the point it is describing. */
            anchor={
              yFor(active.leader_score ?? domain.min) < PAD.top + plotHeight / 2
                ? "bottom"
                : "top"
            }
            bottomInset={height - plotBottom}
          />
        ) : null}
      </div>

      <figcaption className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-caption text-muted">
        <span className="inline-flex items-center gap-2">
          <span className="inline-block h-px w-4 bg-accent" aria-hidden />
          Leader score
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="inline-block size-1.5 bg-secondary/40" aria-hidden />
          Other entries
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="inline-block h-2 w-px bg-rust" aria-hidden />
          Void round
        </span>
        <span className="ml-auto">{scoringLabel}</span>
      </figcaption>

      {/* Screen readers and copy-paste get the numbers, not just the picture. */}
      <table className="sr-only">
        <caption>Leader {scoringLabel} by round</caption>
        <thead>
          <tr>
            <th scope="col">Round</th>
            <th scope="col">Status</th>
            <th scope="col">Leader score</th>
          </tr>
        </thead>
        <tbody>
          {points.map((point) => (
            <tr key={point.round_id}>
              <td>{point.ordinal}</td>
              <td>{point.status}</td>
              <td>
                {point.leader_score === null
                  ? statusNote(point)
                  : formatScore(point.leader_score)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

/** Reading for one round, pinned beside its crosshair and kept in the box. */
function Tooltip({
  point,
  x,
  width,
  compact,
  anchor,
  bottomInset,
}: {
  point: ScoreProgressPoint;
  x: number;
  width: number;
  compact: boolean;
  /** Which edge of the plot to hang from, picked to dodge the active point. */
  anchor: "top" | "bottom";
  /** Distance from the container floor up to the round axis. */
  bottomInset: number;
}) {
  const boxWidth = compact ? 190 : 230;
  const left = Math.max(0, Math.min(width - boxWidth, x - boxWidth / 2));
  const scoredEntries = point.entries.filter((entry) => entry.score !== null);

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        left,
        width: boxWidth,
        ...(anchor === "top" ? { top: PAD.top } : { bottom: bottomInset + 8 }),
      }}
      className="pointer-events-none absolute z-10 border border-border-strong bg-background px-3 py-2.5 font-mono text-caption shadow-lg"
    >
      <p className="flex items-baseline justify-between gap-3 text-muted">
        <span className="uppercase tracking-caps">Round {point.ordinal}</span>
        <span className={point.status === "void" ? "text-rust" : "text-muted"}>
          {point.status}
        </span>
      </p>
      <p className="mt-2 text-body text-foreground tabular-nums">
        {point.leader_score === null ? (
          <span className="text-muted">{statusNote(point) || "no score"}</span>
        ) : (
          formatScore(point.leader_score)
        )}
      </p>
      {scoredEntries.length > 0 ? (
        <p className="mt-1.5 text-muted">
          {scoredEntries.length} scored
          {point.entries.length > scoredEntries.length
            ? ` · ${point.entries.length - scoredEntries.length} did not`
            : ""}
        </p>
      ) : null}
    </div>
  );
}
