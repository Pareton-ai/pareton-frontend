/**
 * Simplified 3D isometric line-art diagram of the inference optimization
 * search space: a wireframe lattice cube with a single blue optimal
 * configuration pathway threading through it.
 *
 * All geometry is computed from 3D coordinates via isometric projection
 * so the drawing stays mathematically exact.
 */

const S = 72; // scale: 1 cube unit in px
const N = 2; // cube size in units
const COS30 = Math.cos(Math.PI / 6);
const SIN30 = 0.5;

type P3 = [number, number, number];

function project([x, y, z]: P3): [number, number] {
  return [(x - y) * COS30 * S, (x + y) * SIN30 * S - z * S];
}

function d(points: P3[]): string {
  return points
    .map((pt, i) => {
      const [px, py] = project(pt);
      return `${i === 0 ? "M" : "L"}${px.toFixed(1)} ${py.toFixed(1)}`;
    })
    .join(" ");
}

// Outer cube edges, split into visible and hidden (hidden = the three
// edges meeting at the back vertex (0,0,0), drawn dashed, blueprint-style).
const visibleEdges: [P3, P3][] = [
  [
    [N, 0, 0],
    [N, N, 0],
  ],
  [
    [0, N, 0],
    [N, N, 0],
  ],
  [
    [N, 0, N],
    [N, N, N],
  ],
  [
    [0, N, N],
    [N, N, N],
  ],
  [
    [0, 0, N],
    [N, 0, N],
  ],
  [
    [0, 0, N],
    [0, N, N],
  ],
  [
    [N, 0, 0],
    [N, 0, N],
  ],
  [
    [0, N, 0],
    [0, N, N],
  ],
  [
    [N, N, 0],
    [N, N, N],
  ],
];
const hiddenEdges: [P3, P3][] = [
  [
    [0, 0, 0],
    [N, 0, 0],
  ],
  [
    [0, 0, 0],
    [0, N, 0],
  ],
  [
    [0, 0, 0],
    [0, 0, N],
  ],
];

// Midline grid on the three visible faces (top z=N, right x=N, left y=N).
const faceGrid: [P3, P3][] = [
  [
    [1, 0, N],
    [1, N, N],
  ],
  [
    [0, 1, N],
    [N, 1, N],
  ],
  [
    [N, 0, 1],
    [N, N, 1],
  ],
  [
    [N, 1, 0],
    [N, 1, N],
  ],
  [
    [0, N, 1],
    [N, N, 1],
  ],
  [
    [1, N, 0],
    [1, N, N],
  ],
];

// Pathway starts on the left face of the cube (not outside it), so labels
// can sit cleanly to the left without colliding with the stroke.
const entry: P3 = [0, 2, 1.5];
const exit: P3 = [2.55, 1, 0.5];
const pathway: P3[] = [
  entry,
  [0, 1, 1.5],
  [1, 1, 1.5],
  [1, 1, 0.5],
  [2, 1, 0.5],
  exit,
];
const bendNodes: P3[] = pathway.slice(0, -1);

// Arrowhead at the exit, oriented along the +x isometric direction.
function arrowhead(tip: P3): string {
  const [tx, ty] = project(tip);
  const dir = { x: COS30, y: SIN30 };
  const nrm = { x: -SIN30, y: COS30 };
  const L = 9;
  const W = 3.5;
  const bx = tx - dir.x * L;
  const by = ty - dir.y * L;
  return `M${tx.toFixed(1)} ${ty.toFixed(1)} L${(bx + nrm.x * W).toFixed(1)} ${(by + nrm.y * W).toFixed(1)} L${(bx - nrm.x * W).toFixed(1)} ${(by - nrm.y * W).toFixed(1)} Z`;
}

const [entryX, entryY] = project(entry);
const [exitX, exitY] = project(exit);
const [cx, cy] = project([N / 2, N / 2, N / 2]);

// Dimension labels sit on an even ring around the cube center (SVG y-down,
// so angles increase clockwise from the top).
const LABEL_RADIUS = 168;
const DIMENSIONS = [
  "HARDWARE",
  "QUANTIZATION",
  "MODELS",
  "TENSOR PARALLEL",
  "SERVING STACK",
  "SEQ LENGTHS",
  "PREFIX PROMPT",
] as const;

function ringLabel(index: number, total: number) {
  const angle = -Math.PI / 2 + (index * 2 * Math.PI) / total;
  const x = cx + LABEL_RADIUS * Math.cos(angle);
  const y = cy + LABEL_RADIUS * Math.sin(angle);
  const cos = Math.cos(angle);
  const anchor: "start" | "middle" | "end" =
    cos > 0.35 ? "start" : cos < -0.35 ? "end" : "middle";
  return { x, y, anchor };
}

const prefixPrompt = ringLabel(6, DIMENSIONS.length);
const seqLengths = ringLabel(5, DIMENSIONS.length);
const models = ringLabel(2, DIMENSIONS.length);
const tensorParallel = ringLabel(3, DIMENSIONS.length);

// Pathway annotations sit at mid-height between neighboring ring labels,
// with short straight leaders from the path endpoints.
const LEADER_LEN = 28;
const workloadY = (prefixPrompt.y + seqLengths.y) / 2;
const pathwayY = (models.y + tensorParallel.y) / 2;
const workloadTipX = entryX - LEADER_LEN;
const pathwayTipX = exitX + LEADER_LEN;

export function IsoDiagram({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="-300 -200 640 430"
      className={className}
      role="img"
      aria-label="Isometric diagram of the inference optimization search space with a single optimal configuration pathway"
    >
      {/* hidden cube edges */}
      <g
        stroke="var(--border)"
        strokeWidth="1"
        strokeDasharray="3 4"
        fill="none"
      >
        {hiddenEdges.map((e, i) => (
          <path key={i} d={d(e)} />
        ))}
      </g>

      {/* face grid */}
      <g stroke="var(--border)" strokeWidth="1" fill="none">
        {faceGrid.map((e, i) => (
          <path key={i} d={d(e)} />
        ))}
      </g>

      {/* visible cube edges */}
      <g stroke="var(--border-strong)" strokeWidth="1" fill="none">
        {visibleEdges.map((e, i) => (
          <path key={i} d={d(e)} />
        ))}
      </g>

      {/* the single optimal pathway */}
      <path
        d={d(pathway)}
        stroke="var(--accent)"
        strokeWidth="1.75"
        fill="none"
        strokeLinejoin="miter"
      />
      <path d={arrowhead(exit)} fill="var(--accent)" />

      {/* bend nodes */}
      <g fill="var(--background)" stroke="var(--accent)" strokeWidth="1.25">
        {bendNodes.map((pt, i) => {
          const [px, py] = project(pt);
          return (
            <rect
              key={i}
              x={px - 2.75}
              y={py - 2.75}
              width={5.5}
              height={5.5}
            />
          );
        })}
      </g>

      {/* entry annotation — short straight leader, mid between PREFIX PROMPT / SEQ LENGTHS */}
      <g>
        <path
          d={`M${entryX - 6} ${entryY} L${workloadTipX} ${workloadY}`}
          stroke="var(--muted)"
          strokeWidth="1"
          fill="none"
        />
        <text
          x={workloadTipX - 8}
          y={workloadY + 4}
          textAnchor="end"
          fontFamily="var(--font-mono)"
          fontSize="11"
          fill="var(--secondary)"
          letterSpacing="0.08em"
        >
          YOUR WORKLOAD
        </text>
      </g>

      {/* exit annotation — short straight leader, mid between MODELS / TENSOR PARALLEL */}
      <g>
        <path
          d={`M${exitX + 6} ${exitY} L${pathwayTipX} ${pathwayY}`}
          stroke="var(--muted)"
          strokeWidth="1"
          fill="none"
        />
        <text
          x={pathwayTipX + 8}
          y={pathwayY + 4}
          textAnchor="start"
          fontFamily="var(--font-mono)"
          fontSize="11"
          fill="var(--secondary)"
          letterSpacing="0.08em"
        >
          OPTIMAL CONFIG
        </text>
      </g>

      {/* search-space dimension labels — equal angular spacing */}
      <g
        fontFamily="var(--font-mono)"
        fontSize="11"
        fill="var(--muted)"
        letterSpacing="0.08em"
      >
        {DIMENSIONS.map((text, i) => {
          const { x, y, anchor } = ringLabel(i, DIMENSIONS.length);
          return (
            <text key={text} x={x} y={y} textAnchor={anchor}>
              {text}
            </text>
          );
        })}
      </g>
    </svg>
  );
}
