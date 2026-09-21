import { chance, type PairwiseMarginView } from "@/lib/mayoral-forecast";

/**
 * The signed leader-minus-challenger margin as a histogram of the joint
 * election-day draws. Geometry is derived from the feed's bins, never assumed.
 * Bars left of the tie are the challenger's colour, right of it the leader's.
 */
const WIDTH = 660;
const HEIGHT = 220;
const BASELINE = 181;
const BAR_TOP = 26;

export function MarginChart({ view }: { view: PairwiseMarginView }) {
  const [lo, hi] = view.range;
  const scale = WIDTH / (hi - lo);
  const x = (points: number) => (points - lo) * scale;
  const max = Math.max(...view.bins.map((b) => b.probability), Number.EPSILON);
  const tieX = x(0);
  const ticks = [lo, lo / 2, 0, hi / 2, hi];
  const label =
    `Election-day ${view.leader.surname} minus ${view.challenger.surname} margin in vote-share points. ` +
    `Middle outcome ${view.medianPp.toFixed(1)} points; central 80% range ` +
    `${view.lowerPp.toFixed(1)} to ${view.upperPp.toFixed(1)}. ` +
    `${view.challenger.surname} finishes ahead in ${chance(view.challengerAhead)} of simulated outcomes.`;
  return (
    <div className="forecast-margin__chart">
      <div className="forecast-margin__direction" aria-hidden="true">
        <span style={{ color: view.challenger.colorVar }}>← {view.challenger.surname} ahead</span>
        <span style={{ color: view.leader.colorVar }}>{view.leader.surname} ahead →</span>
      </div>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={label} className="forecast-margin__svg">
        {view.bins.map((bin) => {
          const height = (bin.probability / max) * (BASELINE - BAR_TOP);
          const left = x(bin.left);
          const width = x(bin.right) - left;
          return (
            <rect
              key={bin.left}
              className="forecast-margin__bin"
              x={left + 0.75}
              width={Math.max(width - 1.5, 0)}
              y={BASELINE - height}
              height={height}
              fill={bin.right <= 0 ? view.challenger.colorVar : view.leader.colorVar}
              opacity={0.86}
            >
              <title>
                {bin.left} to {bin.right} points: {(bin.probability * 100).toFixed(1)}% of outcomes
              </title>
            </rect>
          );
        })}
        <line className="forecast-margin__tie" x1={tieX} x2={tieX} y1={6} y2={BASELINE + 5} />
        <line className="forecast-margin__baseline" x1={0} x2={WIDTH} y1={BASELINE} y2={BASELINE} />
        {ticks.map((tick) => (
          <text
            key={tick}
            className="forecast-margin__tick"
            x={x(tick)}
            y={HEIGHT - 13}
            textAnchor={tick === hi ? "end" : tick === lo ? "start" : "middle"}
          >
            {tick === 0 ? "Tie" : Math.abs(tick)}
          </text>
        ))}
      </svg>
      <p className="forecast-caption">
        Each bar holds possible election outcomes. The area to the left of a tie is where{" "}
        {view.challenger.surname} finishes ahead of {view.leader.surname}. The horizontal axis is
        the gap in vote-share points. All simulated outcomes are included.
      </p>
    </div>
  );
}
