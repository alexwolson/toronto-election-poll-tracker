import { getPollingAverages } from "@/lib/mayoral-api";
import { getWards } from "@/lib/council-api";

const LINK: React.CSSProperties = {
  color: "var(--text-strong)",
  textDecoration: "underline",
  textUnderlineOffset: "2px",
};

const FIRM_REGISTRY: Record<string, string> = {
  "Mainstreet Research": "https://mainstreetresearch.ca",
  "Forum Research": "https://forumresearch.com",
  "Léger": "https://leger360.com",
};

const GLOSSARY = [
  ["Current-field poll", "A poll that tests the candidates currently running, on the same ballot."],
  ["Race status", "A current Council evidence assessment: Safe, Competitive, or Open. It is not a win probability."],
  ["Vulnerability", "An incumbent’s structural exposure based on ward and electoral factors; it is not a win probability."],
  ["Win probability", "A calibrated election forecast. Council probabilities are withheld unless the historical and current-data publication gates pass."],
  ["Projected vote share", "The forecast model’s estimate of a candidate’s election-day support, shown with an uncertainty range. It is not a polling average."],
  ["Residual support", "Responses such as other, undecided, or support for candidates outside the featured field. Residual support stays in the forecast but cannot win."],
  ["Choice set", "The candidate names a poll actually offered. A candidate omitted from that ballot is treated as absent, never as having zero support."],
] as const;

function displayDate(value: string | null) {
  if (!value) return "No polling date is available";
  return new Intl.DateTimeFormat("en-CA", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

function SourceRow({ name, url, description }: { name: string; url: string; description: string }) {
  return (
    <div className="source-row">
      <h3><a href={url} target="_blank" rel="noopener noreferrer" style={LINK}>{name}</a></h3>
      <p>{description}</p>
    </div>
  );
}

export default async function SourcesPage() {
  const [polling, council] = await Promise.all([getPollingAverages(), getWards()]);
  const race = polling.mayoral_race;
  const firms = Array.from(new Set([
    ...polling.poll_history.map((poll) => poll.firm),
    ...race.approval.readings.map((reading) => reading.firm),
  ])).filter(Boolean).sort((a, b) => a.localeCompare(b));
  const latestPollDate = polling.poll_history.map((poll) => poll.date_published).sort().at(-1) ?? null;

  return (
    <main id="main-content" className="np-shell sources-shell">
      <header className="page-lead">
        <p className="np-kicker">Purpose, interpretation, and attribution</p>
        <h1>About &amp; Sources</h1>
        <p>
          This project helps Toronto readers follow the 2026 mayoral and council races by separating what polls directly show from what election forecasts and structural Council signals estimate.
        </p>
      </header>

      <section className="about-primer" aria-labelledby="guidance-heading">
        <h2 id="guidance-heading" className="section-title">Three things to know</h2>
        <ul>
          <li><strong>Polls show what respondents said.</strong> Forecasts estimate election day.</li>
          <li><strong>Council status is an assessment.</strong> Safe, Competitive, and Open are not win probabilities.</li>
          <li><strong>Uncertainty stays visible.</strong> Missing or unsupported outputs are labelled unavailable. Latest poll: {displayDate(latestPollDate)}.</li>
        </ul>
      </section>

      <section className="about-index" aria-label="Detailed project information">
      <details className="about-disclosure limitations">
        <summary>Important limitations</summary>
        <div className="about-disclosure-body">
        <ul>
          <li>Model outputs are not guarantees and can change as candidates, polling, and registrations change.</li>
          <li>Projected vote ranges are model outputs, not polling averages or guarantees.</li>
          <li>Movement between two polls is descriptive, not causal; it cannot prove that one candidate transferred support to another.</li>
          <li>Approval measures views of Olivia Chow. It does not enter projected vote shares or win probabilities.</li>
          <li>When a poll omits a featured candidate, the model redistributes probability only among the choices that poll actually offered plus its residual response. It never records the absent candidate at zero.</li>
          <li>Council race status is an evidence assessment, not a probability. Precise ward odds and Council composition are currently withheld because the tested model does not beat the incumbent-retention baseline.</li>
          <li>The Ward 13 poll is shown as published vote intention. Its 35% incumbent share is not transformed into a synthetic win probability.</li>
        </ul>
        </div>
      </details>

      <details className="about-disclosure glossary">
        <summary>Glossary</summary>
        <div className="about-disclosure-body">
        <dl>
          {GLOSSARY.map(([term, definition]) => (
            <div key={term}><dt>{term}</dt><dd>{definition}</dd></div>
          ))}
        </dl>
        </div>
      </details>

      <details id="methodology" className="about-disclosure methodology-section">
        <summary>How the mayoral forecast works</summary>
        <div className="about-disclosure-body">
        <p className="section-dek">Observed evidence and the forecast are separate products. Expand a step for the assumptions and checks behind the current snapshot.</p>
        <div className="methodology-details">
          <details>
            <summary>1. Preserve each poll’s actual ballot</summary>
            <p>Polls are stored with their original candidate field, sample, firm, date, source URL, candidate shares, and residual responses. The current-field average uses only exact Chow–Bradford–Alexander ballots; head-to-head and older fields remain descriptive evidence.</p>
          </details>
          <details>
            <summary>2. Model ballot-aware choices</summary>
            <p>The forecast is a dynamic multinomial choice-set model. Each poll likelihood contains only named candidates actually offered plus a residual category. Candidate utilities move weekly, while partially pooled firm and ballot-field effects account for systematic differences. A Dirichlet-multinomial layer allows more variation than sampling error alone.</p>
          </details>
          <details id="forecast-method">
            <summary>3. Project the featured election ballot</summary>
            <p>The current featured field—Chow, Bradford, and Alexander—sets the election-day choice set. Campaign drift carries latent support to election day. Residual support remains in every draw, but the winner is selected only from named candidates. Approval is context only and never feeds this calculation.</p>
          </details>
          <details>
            <summary>4. Withhold unstable forecasts</summary>
            <p>Publication requires two current-field polls from two firms, two observations for every featured candidate, recent evidence, converged posterior sampling, successful Toronto backtests, and a stable leader under field, house-error, and drift sensitivity runs. A failed gate produces reasons instead of odds.</p>
            {race.forecast.diagnostics.backtest && (
              <dl className="backtest-metrics">
                <div><dt>Eligible historical cases</dt><dd>{String(race.forecast.diagnostics.backtest.case_count ?? "Unavailable")}</dd></div>
                <div><dt>Share MAE</dt><dd>{typeof race.forecast.diagnostics.backtest.share_mae === "number" ? `${(race.forecast.diagnostics.backtest.share_mae * 100).toFixed(1)} points` : "Unavailable"}</dd></div>
                <div><dt>80% interval coverage</dt><dd>{typeof race.forecast.diagnostics.backtest.coverage_80 === "number" ? `${Math.round(race.forecast.diagnostics.backtest.coverage_80 * 100)}%` : "Unavailable"}</dd></div>
                <div><dt>95% interval coverage</dt><dd>{typeof race.forecast.diagnostics.backtest.coverage_95 === "number" ? `${Math.round(race.forecast.diagnostics.backtest.coverage_95 * 100)}%` : "Unavailable"}</dd></div>
              </dl>
            )}
          </details>
        </div>
        </div>
      </details>

      <details id="council-methodology" className="about-disclosure methodology-section">
        <summary>How Council race status works</summary>
        <div className="about-disclosure-body">
        <div className="methodology-details">
          <details>
            <summary>1. Preserve the prior result</summary>
            <p>Each incumbent profile keeps the prior vote share, electorate share, winning margin, runner-up, election year, and by-election status. The Defeatability Index remains a structural vulnerability signal, not a probability scale.</p>
          </details>
          <details>
            <summary>2. Describe the registered field</summary>
            <p>Candidate registration, prior ward results, returning-runner-up status, and documented recognition are separate evidence. Registration or a generic “known” label alone cannot make a ward Competitive or generate candidate odds.</p>
          </details>
          <details>
            <summary>3. Keep direct polling descriptive</summary>
            <p>Ward polls retain their actual denominator, candidate field, undecided share, residual response, and registration status. Different-field and hypothetical polls remain visible but do not become current-field evidence. Vote intention is never converted into a synthetic win chance.</p>
          </details>
          <details>
            <summary>4. Test forecast claims against Toronto history</summary>
            <p>The incumbent-retention model uses 121 comparable cases from stable-boundary transitions in 2003–2006, 2006–2010, 2010–2014, and 2018–2022. There are only eight incumbent defeats. In leave-one-election-out testing, the model’s Brier score is {typeof council.council_model.forecast.diagnostics.winner_brier === "number" ? council.council_model.forecast.diagnostics.winner_brier.toFixed(3) : "unavailable"}, compared with {typeof council.council_model.forecast.diagnostics.baseline_winner_brier === "number" ? council.council_model.forecast.diagnostics.baseline_winner_brier.toFixed(3) : "unavailable"} for the base-rate benchmark.</p>
          </details>
          <details>
            <summary>5. Withhold unsupported odds and composition</summary>
            <p>Publication requires the final candidate field, enough historical incumbent defeats, and out-of-sample performance better than a simple incumbent-retention baseline on both Brier score and log loss. Those gates currently fail, so the site publishes assessments and evidence instead of false precision.</p>
          </details>
          <details>
            <summary>6. Treat mayoral alignment as context</summary>
            <p>Councillor voting alignment and ward-level mayoral geography can help readers understand a race, but Toronto history does not support a calibrated causal coattail coefficient. They do not enter current race status, ward odds, or Council composition.</p>
          </details>
        </div>
        </div>
      </details>

      <details className="about-disclosure source-section">
        <summary>Polling firms in the current data</summary>
        <div className="about-disclosure-body">
        <p className="section-dek">This list is generated from poll history and approval data. Verified registry entries are linked; other names are shown as published rather than omitted.</p>
        {firms.length > 0 ? (
          <ul className="firm-list">
            {firms.map((firm) => (
              <li key={firm}>
                {FIRM_REGISTRY[firm] ? (
                  <a href={FIRM_REGISTRY[firm]} target="_blank" rel="noopener noreferrer">{firm}</a>
                ) : <span>{firm}</span>}
              </li>
            ))}
          </ul>
        ) : <p className="empty-state">No polling firms are present in the current snapshot.</p>}
        </div>
      </details>

      <details className="about-disclosure source-section">
        <summary>Council data and attribution</summary>
        <div className="about-disclosure-body">
        <div className="attribution-card">
          <h3>Matt Elliott</h3>
          <p className="font-mono"><a href="https://www.thestar.com/users/profile/matt-elliott/" target="_blank" rel="noopener noreferrer">Toronto Star</a> · <a href="https://cityhallwatcher.com" target="_blank" rel="noopener noreferrer">City Hall Watcher</a></p>
          <p>The council projections draw on Elliott’s published Council Defeatability Index and Council Scorecard, used with permission.</p>
          <ul>
            <li><a href="https://toronto.cityhallwatcher.com/p/looking-ahead-to-the-heartbreak-that" target="_blank" rel="noopener noreferrer">Council Defeatability Index</a> — incumbent vote share, electorate share, and ward population growth.</li>
            <li><a href="https://www.councilscorecard.ca/" target="_blank" rel="noopener noreferrer">Council Scorecard</a> — councillor voting alignment under the Chow and Tory mayoralties.</li>
          </ul>
        </div>
        <SourceRow name="Toronto Open Data" url="https://open.toronto.ca/dataset/election-results-official/" description="Official councillor results for 2003, 2006, 2010, 2014, 2018, and 2022; ward-level mayoral results; voter statistics; and 2026 candidate registrations." />
        </div>
      </details>

      <details className="about-disclosure source-section">
        <summary>Additional sources</summary>
        <div className="about-disclosure-body">
        <SourceRow name="Statistics Canada" url="https://statcan.gc.ca" description="Ward population estimates and growth since the 2021 census." />
        <SourceRow name="338Canada" url="https://338canada.com" description="Methodological inspiration for polling aggregation; model by Philippe J. Fournier." />
        </div>
      </details>

      <details className="about-disclosure author-section">
        <summary>About the project</summary>
        <div className="about-disclosure-body">
        <p>Built by Alex Olson in Toronto. He works at the University of Toronto’s Faculty of Applied Science &amp; Engineering, leading the Centre for Analytics &amp; AI Engineering (CARTE) in the Department of Mechanical &amp; Industrial Engineering, with a focus on AI education, curriculum design, and applied machine learning.</p>
        <p>Outside work, he is involved with <a href="https://civictech.ca" target="_blank" rel="noopener noreferrer">Civic Tech Toronto</a> and has a long-standing interest in Toronto municipal politics.</p>
        </div>
      </details>
      </section>
    </main>
  );
}
