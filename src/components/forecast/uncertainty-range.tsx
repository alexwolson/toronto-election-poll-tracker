import { chance, type UncertaintyLadderView } from "@/lib/mayoral-forecast";

/**
 * Where the uncertainty comes from (ADR 0056): the leader margin at three
 * snapshots of the same simulations, drawn as ranges on one shared axis with
 * the tie marked. The range widens row by row while its middle barely moves;
 * the value at the right is how often the challenger is ahead at that point.
 */
export function UncertaintyRange({ view }: { view: UncertaintyLadderView }) {
  const span = view.axisMax - view.axisMin;
  const at = (points: number) => ((points - view.axisMin) / span) * 100;
  const tie = at(0);
  return (
    <div className="forecast-uncertainty">
      <div className="forecast-uncertainty__axis" aria-hidden="true">
        <span />
        <span className="forecast-uncertainty__axis-track">
          <span>{view.challenger.surname} ahead</span>
          <span>tie</span>
          <span>{view.leader.surname} ahead</span>
        </span>
        <span className="forecast-uncertainty__axis-value">{view.challenger.surname} ahead</span>
      </div>
      <div role="list" aria-label="Where the uncertainty comes from">
        {view.rows.map((row) => {
          const left = at(row.lower);
          const right = at(row.upper);
          const challengerWidth = Math.max(0, Math.min(right, tie) - left);
          const leaderLeft = Math.max(left, tie);
          const leaderWidth = Math.max(0, right - leaderLeft);
          return (
            <div className="forecast-uncertainty__row" role="listitem" key={row.key}>
              <span className="forecast-uncertainty__label">{row.label}</span>
              <span className="forecast-uncertainty__track" aria-hidden="true">
                <span className="forecast-uncertainty__tie" style={{ left: `${tie}%` }} />
                {challengerWidth > 0 && (
                  <span
                    className="forecast-uncertainty__range"
                    style={{
                      left: `${left}%`,
                      width: `${challengerWidth}%`,
                      background: view.challenger.colorVar,
                    }}
                  />
                )}
                {leaderWidth > 0 && (
                  <span
                    className="forecast-uncertainty__range"
                    style={{
                      left: `${leaderLeft}%`,
                      width: `${leaderWidth}%`,
                      background: view.leader.colorVar,
                    }}
                  />
                )}
                <span
                  className="forecast-uncertainty__median"
                  style={{ left: `${at(row.median)}%`, background: view.leader.colorVar }}
                />
              </span>
              <strong className="forecast-uncertainty__value">{chance(row.challengerAhead)}</strong>
            </div>
          );
        })}
      </div>
    </div>
  );
}
