import type { ElectionDaySharesView } from "@/lib/mayoral-forecast";

/**
 * Election-day full-ballot vote shares: a tinted band across the central
 * interval and a tick at the middle estimate, one row per named candidate plus
 * the residual pool, on a 0–100% track with the 50% line marked. Shares the
 * chart grammar (label | track | value) with the other forecast views.
 */
export function VoteShareRanges({ view }: { view: ElectionDaySharesView }) {
  const mass = Math.round(view.intervalMass * 100);
  return (
    <div className="forecast-chart forecast-chart--shares">
      <div className="forecast-chart__axis" aria-hidden="true">
        <span />
        <span className="forecast-chart__axis-track">
          <span>0%</span>
          <span>50% of votes</span>
          <span>100%</span>
        </span>
        <span className="forecast-chart__axis-value">Middle</span>
      </div>
      {view.rows.map((row) => (
        <div className="forecast-chart__row" key={row.candidateId ?? "residual"}>
          <span className="forecast-chart__label">
            <span
              className={`candidate-marker candidate-marker--${row.slug}`}
              aria-hidden="true"
            />
            {row.name}
          </span>
          <span
            className="forecast-chart__track"
            role="img"
            aria-label={`${row.name}: middle estimate ${row.median.toFixed(1)}%, central ${mass}% range ${row.lower.toFixed(1)}% to ${row.upper.toFixed(1)}%`}
          >
            <span className="forecast-chart__line" style={{ left: "50%" }} />
            <span
              className={`forecast-chart__band${row.hatch ? " forecast-chart__band--hatched" : ""}`}
              style={{
                left: `${row.lower}%`,
                width: `${Math.max(row.upper - row.lower, 0)}%`,
                background: row.colorVar,
              }}
            />
            <span
              className="forecast-chart__tick"
              style={{ left: `${row.median}%`, background: row.colorVar }}
            />
          </span>
          <strong className="forecast-chart__value">{Math.round(row.median)}%</strong>
        </div>
      ))}
      <p className="forecast-caption">
        Tick: middle estimate. Band: central {mass}% of simulated election outcomes; the remaining{" "}
        {100 - mass}% lie outside. Ranges can overlap; they are not chances of winning.
      </p>
    </div>
  );
}
