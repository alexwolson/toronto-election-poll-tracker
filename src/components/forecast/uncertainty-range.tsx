import type { UncertaintyBreakdownView } from "@/lib/mayoral-forecast";

/**
 * Where the uncertainty comes from (ADR 0056): the leader margin under each
 * source of doubt on its own, then all three together, drawn as bands on one
 * shared axis with the tie marked and a tick at the middle. The last row is
 * the published forecast and is set apart. The value at the right is each
 * source's share of the uncertainty, which the three sources add up to 100%;
 * the ranges themselves do not add. Shares the chart grammar
 * (label | track | value) with the other forecast views.
 */
export function UncertaintyRange({ view }: { view: UncertaintyBreakdownView }) {
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
        <span className="forecast-chart__axis-value">Share</span>
      </div>
      <div role="list" aria-label="Where the uncertainty comes from">
        {view.rows.map((row) => {
          const left = at(row.lower);
          const right = at(row.upper);
          const challengerWidth = Math.max(0, Math.min(right, tie) - left);
          const leaderLeft = Math.max(left, tie);
          const leaderWidth = Math.max(0, right - leaderLeft);
          return (
            <div
              className={`forecast-chart__row${row.combined ? " forecast-chart__row--combined" : ""}`}
              role="listitem"
              key={row.key}
            >
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
              <strong className="forecast-chart__value">{Math.round(row.share * 100)}%</strong>
            </div>
          );
        })}
      </div>
    </div>
  );
}
