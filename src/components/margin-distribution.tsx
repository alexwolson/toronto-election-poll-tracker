import type {
  HistoricalMargin,
  MarginDistributionView,
} from "@/lib/mayoral-forecast";

/**
 * The winning-margin panel. The forecast margin (winner minus runner-up) is
 * split into four named outcomes — Close, Clear win, Comfortable, Landslide —
 * drawn as bars whose HEIGHT and SHADE both grow with how likely the 2026 result
 * lands there. They sit on a share-of-the-vote axis, and the seven past Toronto
 * mayoral results are marked on that same axis at the margins they finished with.
 *
 * ADR 0006 / 0003 / 0032: height and shade are ORDINAL cues (taller/darker = more
 * likely) — a binned re-presentation of the already-gated density, never a number
 * — so there is no numeric y-axis and no probability is printed. The panel renders
 * only when close_result publishes (enforced upstream in the selector). Pure
 * server-rendered SVG, themed through CSS tokens.
 */

const VIEW_W = 720;
const M = { left: 46, right: 24 };
const PLOT_W = VIEW_W - M.left - M.right;
const TICK_STEP = 10; // points between axis ticks

const TOP = 32; // top of the tallest bar
const BAR_MAX = 118; // full-height bar (weight === 1)
const BASE = TOP + BAR_MAX; // the axis
const BAR_MIN = 3; // a near-zero band still shows a visible sliver
const HIST_TOP = BASE + 46; // first row of past-election labels
const ROW_H = 20; // vertical space for one two-line label lane
const CHAR_W = 5.4;
const LABEL_PAD = 10;

type PlacedMarker = HistoricalMargin & { x: number; lane: number };

/** Lane-pack the past-election labels so the tight left cluster never overlaps.
 *  Pure and module-level (no mutation during React render). */
function layoutMarkers(
  markers: HistoricalMargin[],
  xOf: (pp: number) => number,
): { placed: PlacedMarker[]; laneCount: number } {
  const laneRightEdge: number[] = [];
  const placed = markers.map((m) => {
    const x = xOf(m.marginPp);
    const halfWidth = (Math.max(m.matchup.length, m.label.length) * CHAR_W) / 2;
    let lane = laneRightEdge.findIndex((edge) => x - halfWidth >= edge + LABEL_PAD);
    if (lane === -1) {
      lane = laneRightEdge.length;
      laneRightEdge.push(0);
    }
    laneRightEdge[lane] = x + halfWidth;
    return { ...m, x, lane };
  });
  return { placed, laneCount: laneRightEdge.length || 1 };
}

export function MarginDistribution({ view }: { view: MarginDistributionView }) {
  const { bands, markers } = view;

  const xMax = Math.max(
    bands[bands.length - 1]?.hiPp ?? 50,
    ...markers.map((m) => m.marginPp),
  );
  const xOf = (pp: number) => M.left + (pp / xMax) * PLOT_W;

  const { placed, laneCount } = layoutMarkers(markers, xOf);
  const viewH = HIST_TOP + laneCount * ROW_H + 8;

  const ticks = Array.from(
    { length: Math.floor(xMax / TICK_STEP) + 1 },
    (_, i) => i * TICK_STEP,
  );

  const yAxisX = M.left - 16;

  return (
    <svg
      className="margin-dist"
      viewBox={`0 0 ${VIEW_W} ${viewH}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={
        "The forecast margin between the top two candidates, split into four " +
        "outcomes — close result, clear win, comfortable, landslide — drawn as bars " +
        "that are taller and darker where the 2026 result is more likely to land, on " +
        "a share-of-the-vote scale, with the seven past Toronto mayoral results " +
        "marked underneath at the margins they finished with."
      }
    >
      {/* y-side: an ordinal likelihood cue — taller = more likely, no numbers */}
      <line
        className="margin-dist__yaxis"
        x1={yAxisX}
        y1={BASE}
        x2={yAxisX}
        y2={TOP - 2}
      />
      <path
        className="margin-dist__yaxis-arrow"
        d={`M${yAxisX - 3},${TOP + 4} L${yAxisX},${TOP - 3} L${yAxisX + 3},${TOP + 4}`}
      />
      <text
        className="margin-dist__yaxis-label"
        x={yAxisX - 6}
        y={(TOP + BASE) / 2}
        transform={`rotate(-90 ${yAxisX - 6} ${(TOP + BASE) / 2})`}
      >
        How likely in 2026 →
      </text>

      {/* faint gridlines for the measured feel */}
      {ticks.map((t) => (
        <line
          key={`g${t}`}
          className="margin-dist__gridline"
          x1={xOf(t)}
          y1={TOP}
          x2={xOf(t)}
          y2={BASE}
        />
      ))}

      {/* the outcome bars: height AND shade grow with likelihood */}
      {bands.map((b) => {
        const x = xOf(b.loPp);
        const w = xOf(b.hiPp) - xOf(b.loPp);
        const h = Math.max(b.weight * BAR_MAX, BAR_MIN);
        const y = BASE - h;
        return (
          <g key={b.name}>
            <rect
              className="margin-dist__bar"
              x={x}
              y={y}
              width={w}
              height={h}
              style={{ opacity: 0.2 + b.weight * 0.55 }}
            />
            <text className="margin-dist__bar-name" x={x + w / 2} y={y - 6}>
              {b.name}
            </text>
          </g>
        );
      })}

      {/* the axis: share of the vote, shared by the bars and the history below */}
      <line
        className="margin-dist__baseline"
        x1={M.left}
        y1={BASE}
        x2={VIEW_W - M.right}
        y2={BASE}
      />
      {ticks.map((t) => (
        <g key={t} className="margin-dist__tick">
          <line x1={xOf(t)} y1={BASE} x2={xOf(t)} y2={BASE + 5} />
          <text className="margin-dist__tick-num" x={xOf(t)} y={BASE + 16}>
            {t === 0 ? "tied" : `${t}%`}
          </text>
        </g>
      ))}
      <text className="margin-dist__axis-caption" x={(M.left + VIEW_W - M.right) / 2} y={BASE + 30}>
        how far ahead the winner finished, as a share of the vote
      </text>

      {/* past elections at their exact margins, on the same axis */}
      {placed.map((m) => {
        const top = HIST_TOP + m.lane * ROW_H;
        return (
          <g key={m.year} className="margin-dist__marker">
            <circle className="margin-dist__marker-dot" cx={m.x} cy={BASE} r={3} />
            <line x1={m.x} y1={BASE + 4} x2={m.x} y2={top - 8} />
            <text className="margin-dist__marker-matchup" x={m.x} y={top}>
              {m.matchup}
            </text>
            <text className="margin-dist__marker-year" x={m.x} y={top + 10}>
              {m.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
