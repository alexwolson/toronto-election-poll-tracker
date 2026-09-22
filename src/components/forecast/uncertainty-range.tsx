import { chance, type UncertaintyLadderView } from "@/lib/mayoral-forecast";

/**
 * Where the uncertainty comes from (ADR 0056): the leader margin at three
 * snapshots of the same simulations, drawn as bands on one shared axis with
 * the tie marked and a tick at the middle. The band widens row by row while
 * its middle barely moves; the value at the right is how often the challenger
 * is ahead at that point. Shares the chart grammar (label | track | value)
 * with the other forecast views.
 */
export function UncertaintyRange({ view }: { view: UncertaintyLadderView }) {
  const span = view.axisMax - view.axisMin;
  const at = (points: number) => ((points - view.axisMin) / span) * 100;
  const tie = at(0);
  const points = (value: number) => `${value > 0 ? "+" : ""}${Math.round(value)}`;
  return (
    <div className="forecast-chart forecast-chart--uncertainty">
      <div className="forecast-chart__axis" aria-hidden="true">
        <span />
        <span className="forecast-chart__axis-track">
          <span>{view.challenger.surname} ahead</span>
          <span>tie</span>
          <span>{view.leader.surname} ahead</span>
        </span>
        <span className="forecast-chart__axis-value">{view.challenger.surname} ahead</span>
      </div>
      <div role="list" aria-label="Where the uncertainty comes from">
        {view.rows.map((row) => {
          const left = at(row.lower);
          const right = at(row.upper);
          const challengerWidth = Math.max(0, Math.min(right, tie) - left);
          const leaderLeft = Math.max(left, tie);
          const leaderWidth = Math.max(0, right - leaderLeft);
          return (
            <div className="forecast-chart__row" role="listitem" key={row.key}>
              <span className="forecast-chart__label">{row.label}</span>
              <span
                className="forecast-chart__track"
                role="img"
                aria-label={`${row.label}: ${view.leader.surname} minus ${view.challenger.surname} from ${points(row.lower)} to ${points(row.upper)} points, middle ${points(row.median)}`}
              >
                <span className="forecast-chart__line" style={{ left: `${tie}%` }} />
                {challengerWidth > 0 && (
                  <span
                    className="forecast-chart__band"
                    style={{
                      left: `${left}%`,
                      width: `${challengerWidth}%`,
                      background: view.challenger.colorVar,
                    }}
                  />
                )}
                {leaderWidth > 0 && (
                  <span
                    className="forecast-chart__band"
                    style={{
                      left: `${leaderLeft}%`,
                      width: `${leaderWidth}%`,
                      background: view.leader.colorVar,
                    }}
                  />
                )}
                <span
                  className="forecast-chart__tick"
                  style={{ left: `${at(row.median)}%`, background: view.leader.colorVar }}
                />
              </span>
              <strong className="forecast-chart__value">{chance(row.challengerAhead)}</strong>
            </div>
          );
        })}
      </div>
    </div>
  );
}
