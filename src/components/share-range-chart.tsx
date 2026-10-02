import type { ReactNode } from "react";

export interface ShareRangeRow {
  id: string;
  name: string;
  point: number;
  lower: number;
  upper: number;
  color: string;
  markerSlug?: string;
  hatch?: boolean;
}

/** Shared chart grammar; the caller owns the meaning of the point and band. */
export function ShareRangeChart({
  rows,
  pointLabel,
  pointDescription,
  rangeDescription,
  caption,
  middleLabel = "50% of votes",
}: {
  rows: ShareRangeRow[];
  pointLabel: string;
  pointDescription: string;
  rangeDescription: string;
  caption: ReactNode;
  middleLabel?: string;
}) {
  return (
    <div className="forecast-chart forecast-chart--shares">
      <div className="forecast-chart__axis" aria-hidden="true">
        <span />
        <span className="forecast-chart__axis-track">
          <span>0%</span>
          <span>{middleLabel}</span>
          <span>100%</span>
        </span>
        <span className="forecast-chart__axis-value">{pointLabel}</span>
      </div>
      {rows.map((row) => (
        <div className="forecast-chart__row" key={row.id}>
          <span className="forecast-chart__label">
            {row.markerSlug && (
              <span
                className={`candidate-marker candidate-marker--${row.markerSlug}`}
                aria-hidden="true"
              />
            )}
            {row.name}
          </span>
          <span
            className="forecast-chart__track"
            role="img"
            aria-label={`${row.name}: ${pointDescription} ${row.point.toFixed(1)}%, ${rangeDescription} ${row.lower.toFixed(1)}% to ${row.upper.toFixed(1)}%`}
          >
            <span className="forecast-chart__line" style={{ left: "50%" }} />
            <span
              className={`forecast-chart__band${row.hatch ? " forecast-chart__band--hatched" : ""}`}
              style={{
                left: `${row.lower}%`,
                width: `${Math.max(row.upper - row.lower, 0)}%`,
                background: row.color,
              }}
            />
            <span
              className="forecast-chart__tick"
              style={{ left: `${row.point}%`, background: row.color }}
            />
          </span>
          <strong className="forecast-chart__value">
            {Math.round(row.point)}%
          </strong>
        </div>
      ))}
      <p className="forecast-caption">{caption}</p>
    </div>
  );
}
