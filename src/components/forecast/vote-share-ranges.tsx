import type { ElectionDaySharesView } from "@/lib/mayoral-forecast";

/**
 * Election-day full-ballot vote shares: a dot at the median and a line across the
 * central interval, one row per named candidate plus the residual pool. Values
 * are in percentage points; the track is the 0–100% axis.
 */
export function VoteShareRanges({ view }: { view: ElectionDaySharesView }) {
  const mass = Math.round(view.intervalMass * 100);
  return (
    <div className="forecast-shares__chart">
      <div className="forecast-shares__scale" aria-hidden="true">
        <span>Vote share</span>
        <span>0%</span>
        <span>50%</span>
        <span>100%</span>
      </div>
      {view.rows.map((row) => (
        <div className="forecast-shares__row" key={row.candidateId ?? "residual"}>
          <span className="forecast-shares__name">
            <span
              className={`candidate-marker candidate-marker--${row.slug}`}
              aria-hidden="true"
            />
            {row.name}
          </span>
          <div
            className="forecast-shares__track"
            role="img"
            aria-label={`${row.name}: middle estimate ${row.median.toFixed(1)}%, central ${mass}% range ${row.lower.toFixed(1)}% to ${row.upper.toFixed(1)}%`}
          >
            <span
              className={`forecast-shares__range${row.hatch ? " forecast-shares__range--hatched" : ""}`}
              style={{
                left: `${row.lower}%`,
                width: `${Math.max(row.upper - row.lower, 0)}%`,
                background: row.colorVar,
              }}
            />
            <span
              className="forecast-shares__dot"
              style={{ left: `${row.median}%`, background: row.colorVar }}
            />
          </div>
          <strong className="forecast-shares__value">{Math.round(row.median)}%</strong>
        </div>
      ))}
      <p className="forecast-caption">
        Dot: middle estimate. Line: central {mass}% of simulated election outcomes; the remaining{" "}
        {100 - mass}% lie outside. Ranges can overlap; they are not chances of winning.
      </p>
    </div>
  );
}
