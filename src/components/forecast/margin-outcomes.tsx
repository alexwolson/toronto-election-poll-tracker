import { chance, type MarginOutcomesView } from "@/lib/mayoral-forecast";

/**
 * The margin between the two poll leaders as three named outcomes, each with
 * its exact share of the simulated elections written on it. Bars are scaled to
 * the largest outcome; the numbers, not the bars, carry the precision.
 */
export function MarginOutcomes({ view }: { view: MarginOutcomesView }) {
  const max = Math.max(...view.rows.map((r) => r.probability), Number.EPSILON);
  return (
    <div className="forecast-outcomes" role="list" aria-label="How far apart the two leading candidates are likely to finish">
      {view.rows.map((row) => (
        <div className="forecast-outcomes__row" role="listitem" key={row.key}>
          <span className="forecast-outcomes__label">{row.label}</span>
          <span className="forecast-outcomes__track" aria-hidden="true">
            <span
              className="forecast-outcomes__bar"
              style={{ width: `${(row.probability / max) * 100}%`, background: row.colorVar }}
            />
          </span>
          <strong className="forecast-outcomes__value">{chance(row.probability)}</strong>
        </div>
      ))}
    </div>
  );
}
