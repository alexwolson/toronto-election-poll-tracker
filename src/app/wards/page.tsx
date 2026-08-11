import { Suspense } from "react";
import { getWards } from "@/lib/council-api";
import { WardsBrowser } from "@/components/wards-browser";
import { getRaceStatusCounts } from "@/lib/site-view-models";
import {
  displayCouncilDate,
  forecastReasonLabel,
} from "@/lib/council-presentation";

export default async function WardsPage() {
  const data = await getWards();
  const wards = data.wards || [];
  const counts = getRaceStatusCounts(wards);

  return (
    <main id="main-content" className="np-shell">
      <header className="council-page-lead">
        <div className="np-kicker">Council</div>
        <div className="np-section-header">
          <h1
            className="font-heading"
            style={{
              fontSize: "clamp(1.8rem, 4vw, 2.8rem)",
              fontWeight: 700,
              margin: 0,
              letterSpacing: "-0.01em",
              color: "var(--text-strong)",
            }}
          >
            All Wards
          </h1>
          <div className="council-status-summary font-mono" aria-label={`${counts.safe} Safe, ${counts.competitive} Competitive, and ${counts.open} Open wards; ${counts.total} total`}>
            <span><strong>{counts.safe}</strong> Safe</span>
            <span><strong>{counts.competitive}</strong> Competitive</span>
            <span><strong>{counts.open}</strong> Open</span>
            <span aria-hidden="true">= {counts.total} wards</span>
          </div>
        </div>
        <p className="section-dek">
          Race status is today’s evidence assessment—not a win probability.
        </p>
      </header>

      <details className="council-forecast-note">
        <summary><strong>Ward probabilities are not published</strong><span>Why?</span></summary>
        <div>
          <p>The site can identify exposed and open races, but the tested model has not cleared the standard required for candidate odds or Council composition. Evidence updated {displayCouncilDate(data.as_of)}.</p>
          <ul>
            {data.council_model.forecast.unavailable_reasons.map((reason) => (
              <li key={reason}>{forecastReasonLabel(reason)}</li>
            ))}
          </ul>
        </div>
      </details>

      <Suspense>
        <WardsBrowser wards={wards} />
      </Suspense>
    </main>
  );
}
