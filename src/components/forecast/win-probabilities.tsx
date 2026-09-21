import { chance, type WinProbabilitiesView } from "@/lib/mayoral-forecast";

/** Full-race win chances, most likely first; the residual pool collectively. */
export function WinProbabilities({ view }: { view: WinProbabilitiesView }) {
  return (
    <div className="forecast-odds__list">
      {view.candidates.map((c) => (
        <div className="forecast-odds__row" key={c.candidateId}>
          <span>
            <span className={`candidate-marker candidate-marker--${c.slug}`} aria-hidden="true" />
            {c.name}
          </span>
          <strong>{chance(c.probability)}</strong>
        </div>
      ))}
      <p className="forecast-caption">
        Chance of winning the whole race, not a share of the vote. {view.pool.label} collectively:{" "}
        {chance(view.pool.probability)}. Rounded independently.
      </p>
    </div>
  );
}
