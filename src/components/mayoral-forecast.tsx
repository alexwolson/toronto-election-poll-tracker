import Link from "next/link";
import type { MayoralRace } from "@/lib/mayoral-api";
import { candidateName } from "@/lib/candidate-presentation";

function pct(value: number) {
  return `${Math.round(value * 100)}%`;
}

function displayDate(value: string | null | undefined) {
  if (!value) return "Date unavailable";
  return new Intl.DateTimeFormat("en-CA", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}

export function MayoralForecast({ race, compact = false }: { race: MayoralRace; compact?: boolean }) {
  const forecast = race.forecast;
  if (forecast.status !== "available") {
    return (
      <div className="forecast-unavailable" role="status">
        <h3>Forecast not published</h3>
        <p>The model is withholding election odds until its evidence and stability checks pass.</p>
        {forecast.unavailable_reasons.length > 0 && <ul>{forecast.unavailable_reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>}
        <p><Link href="/sources#methodology">How publication gates work</Link></p>
      </div>
    );
  }

  return (
    <div className={`forecast-card${compact ? " forecast-card--compact" : ""}`}>
      <p className="forecast-warning"><strong>Model forecast, not a polling average.</strong> These are projected election-day outcomes.</p>
      <div className="forecast-grid">
        {race.target_field.map((id) => {
          const candidate = forecast.candidates[id];
          if (!candidate) return null;
          const share = candidate.projected_share;
          return (
            <article key={id} className={`forecast-candidate forecast-candidate--${id}`}>
              <div className="forecast-candidate-heading"><span className={`candidate-marker candidate-marker--${id}`} aria-hidden="true" /><h3>{candidateName(id)}</h3></div>
              <div className="forecast-headline"><strong>{pct(share.median)}</strong><span>projected vote</span></div>
              <div className="forecast-range" aria-label={`${candidateName(id)} projected share range ${pct(share.low)} to ${pct(share.high)}`}>
                <span style={{ left: `${share.low * 100}%`, width: `${(share.high - share.low) * 100}%` }} />
                <i style={{ left: `${share.median * 100}%` }} />
              </div>
              <p>{pct(share.low)}–{pct(share.high)} likely range</p>
              <p className="forecast-odds"><strong>{pct(candidate.win_probability)}</strong> win probability</p>
            </article>
          );
        })}
      </div>
      {!compact && forecast.residual && <p className="forecast-residual">Other / undecided remains in projected vote share: median {pct(forecast.residual.median)} ({pct(forecast.residual.low)}–{pct(forecast.residual.high)}). It cannot be declared the winner.</p>}
      <p className="forecast-meta font-mono">Model {forecast.model_version} · data through {displayDate(forecast.data_cutoff ?? race.as_of)} · {race.current_field.poll_count} current-field polls</p>
      {!compact && <p><Link href="/sources#methodology" className="text-link">Read the forecast methodology and backtests</Link></p>}
    </div>
  );
}
