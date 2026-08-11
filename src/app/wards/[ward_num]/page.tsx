import { getWard, getWards } from "@/lib/council-api";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getVulnerabilityBand,
  getVulnerabilitySignals,
} from "@/lib/vulnerability";
import { VulnerabilityPill } from "@/components/vulnerability-pill";
import { SignalRangeBar } from "@/components/signal-range-bar";
import { getWardDisplayName } from "@/lib/ward-names";
import {
  displayCouncilDate,
  forecastReasonLabel,
  wardRationale,
} from "@/lib/council-presentation";

interface Props {
  params: Promise<{ ward_num: string }>;
}

const STATUS_LABEL = {
  safe: "Safe",
  competitive: "Competitive",
  open: "Open",
} as const;

function signalDirection(direction: "up" | "down" | "flat") {
  if (direction === "up") return { label: "Raises vulnerability", className: "driver-direction--risk" };
  if (direction === "down") return { label: "Reduces vulnerability", className: "driver-direction--protective" };
  return { label: "Mixed or neutral", className: "driver-direction--neutral" };
}

export default async function WardDetailPage({ params }: Props) {
  const { ward_num } = await params;
  const wardNum = parseInt(ward_num, 10);

  if (isNaN(wardNum) || wardNum < 1 || wardNum > 25) notFound();

  const [data, allWardsData] = await Promise.all([getWard(wardNum), getWards()]);
  if (data.error === "not_found") notFound();

  if (!data.ward) {
    return (
      <main id="main-content" className="np-shell ward-profile-shell">
        <Link href="/wards" className="np-back-link font-mono">← All wards</Link>
        <h1>Ward {wardNum}</h1>
        <p className="empty-state">Ward data is temporarily unavailable. Please try again shortly.</p>
      </main>
    );
  }

  const { ward } = data;
  const challengers = [...data.challengers].sort((a, b) => {
    const order = { "well-known": 0, known: 1, unknown: 2 };
    return order[a.name_recognition_tier] - order[b.name_recognition_tier] || a.candidate_name.localeCompare(b.candidate_name);
  });
  const vulnerabilityBand = getVulnerabilityBand(ward.defeatability_score);
  const vulnerabilitySignals = getVulnerabilitySignals(ward);
  const displayName = ward.is_running ? ward.councillor_name : "Open seat";
  const wardLabel = getWardDisplayName(ward.ward);
  const allWards = allWardsData.wards;

  function signalRange(field: "vote_share" | "electorate_share" | "pop_growth_pct") {
    const values = allWards.map((item) => item[field]).filter((value): value is number => value !== undefined);
    return values.length > 0 ? { min: Math.min(...values), max: Math.max(...values) } : { min: 0, max: 1 };
  }

  const signalRanges = {
    vote_share: { ...signalRange("vote_share"), minLabel: "more vulnerable", maxLabel: "less vulnerable", moreVulnerableSide: "min" as const },
    electorate_share: { ...signalRange("electorate_share"), minLabel: "more vulnerable", maxLabel: "less vulnerable", moreVulnerableSide: "min" as const },
    pop_growth_pct: { ...signalRange("pop_growth_pct"), minLabel: "less vulnerable", maxLabel: "more vulnerable", moreVulnerableSide: "max" as const },
  };
  const signalValues = {
    vote_share: ward.vote_share,
    electorate_share: ward.electorate_share,
    pop_growth_pct: ward.pop_growth_pct,
  };
  const toPercent = (value: number) => `${(value * 100).toFixed(1)}%`;

  const publishedProbability = ward.forecast.status === "available"
    ? ward.forecast.incumbent_win_probability
    : null;

  return (
    <main id="main-content" className="np-shell ward-profile-shell">
      <Link href="/wards" className="np-back-link font-mono">← All wards</Link>

      <header className="ward-profile-header">
        <p className="np-kicker">Ward profile</p>
        <h1>{wardLabel}</h1>
      </header>

      <section className={`verdict-card verdict-card--${ward.race_class}`} aria-labelledby="verdict-heading">
        <div className="verdict-card-topline">
          <span className={`race-status race-status--${ward.race_class}`}>{STATUS_LABEL[ward.race_class]}</span>
          <span className="font-mono">{displayName}{ward.is_byelection_incumbent ? " · By-election incumbent" : ""}</span>
        </div>
        <h2 id="verdict-heading">{ward.race_class === "open" ? "An open contest" : `${STATUS_LABEL[ward.race_class]} for the incumbent`}</h2>
        <p>{wardRationale(ward)}</p>
        {publishedProbability !== null ? (
          <p className="published-ward-forecast"><strong>{Math.round(publishedProbability * 100)}%</strong> modelled incumbent win probability</p>
        ) : (
          <details className="inline-explanation">
            <summary>Why no win probability is shown</summary>
            <ul>
              {ward.forecast.unavailable_reasons.map((reason) => <li key={reason}>{forecastReasonLabel(reason)}</li>)}
            </ul>
          </details>
        )}
      </section>

      <section className="ward-drivers" aria-labelledby="drivers-heading">
        <h2 id="drivers-heading" className="section-title">Key evidence</h2>
        {ward.is_running ? (
          <div className="driver-grid">
            {vulnerabilitySignals.map((signal) => {
              const direction = signalDirection(signal.direction);
              return (
                <article key={signal.id} className="driver-card">
                  <h3>{signal.label}</h3>
                  <strong>{signal.valueLabel}</strong>
                  <span className={`driver-direction ${direction.className}`}>{direction.label}</span>
                  <p>{signal.summary}</p>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="open-seat-summary">No incumbent is running. {challengers.length} candidates are currently registered.</p>
        )}
      </section>

      <section className="ward-detail-sections" aria-label="Assessment detail">
        <details>
          <summary>How this assessment was made</summary>
          <div className="detail-section-body">
            {ward.is_running ? (
              <>
                <div className="signal-overview">
                  <div>
                    <h3>Vulnerability</h3>
                    <p>Structural exposure based on past vote share, electorate reach, and ward growth. It is not the same as win probability.</p>
                  </div>
                  <div><VulnerabilityPill band={vulnerabilityBand} /><span className="signal-score font-mono">Score {Math.round(ward.defeatability_score)}</span></div>
                </div>
                <div className="signal-card-list">
                  {vulnerabilitySignals.map((signal) => (
                    <article key={signal.id} className="signal-card">
                      <div>
                        <h3>{signal.label} · {signal.valueLabel}</h3>
                        <p>{signal.explanation}</p>
                        <p className="signal-interpretation">{signal.summary}</p>
                      </div>
                      <SignalRangeBar
                        value={signalValues[signal.id]}
                        min={signalRanges[signal.id].min}
                        max={signalRanges[signal.id].max}
                        formatValue={toPercent}
                        moreVulnerableSide={signalRanges[signal.id].moreVulnerableSide}
                        minLabel={signalRanges[signal.id].minLabel}
                        maxLabel={signalRanges[signal.id].maxLabel}
                      />
                    </article>
                  ))}
                </div>
                <p className="methodology-link-inline"><Link href="/sources#council-methodology">Read the Council methodology</Link></p>
              </>
            ) : <p className="empty-state">Structural incumbent signals are unavailable because this is an open seat.</p>}
          </div>
        </details>
      </section>

      {ward.evidence.ward_polling.polls.length > 0 && (
        <section className="ward-poll-evidence" aria-labelledby="ward-poll-heading">
          <p className="np-kicker">Observed evidence</p>
          <h2 id="ward-poll-heading" className="section-title">Ward polling</h2>
          <p className="section-dek">These are published vote-intention readings, not win probabilities. Different or hypothetical candidate fields remain visible but do not enter a current-field average.</p>
          {ward.evidence.ward_polling.polls.map((poll) => (
            <article key={poll.poll_id} className="ward-poll-card">
              <div className="ward-poll-card-header">
                <h3>{poll.firm} · {displayCouncilDate(poll.date_published)}</h3>
                <span className="np-tag">{poll.ballot_status === "current_field" ? "Current field" : "Different candidate field"}</span>
              </div>
              <p>{poll.sample_size} respondents · {poll.denominator}; {Math.round(poll.undecided_share * 100)}% of the full sample was undecided.</p>
              <div className="table-scroll" tabIndex={0} aria-label={`${poll.firm} ward poll results`}>
                <table>
                  <thead><tr><th>Choice</th><th>Share</th><th>Status</th></tr></thead>
                  <tbody>
                    {poll.candidates.map((candidate) => (
                      <tr key={candidate.id}>
                        <th scope="row">{candidate.name}</th>
                        <td>{(candidate.share * 100).toFixed(0)}%</td>
                        <td>{candidate.registration_status === "registered" ? "Registered" : candidate.registration_status === "unregistered" ? "Not registered in this snapshot" : "Combined residual"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          ))}
        </section>
      )}

      <section className="challenger-roster" aria-labelledby="challenger-heading">
        <h2 id="challenger-heading" className="section-title">Registered candidates</h2>
        {challengers.length === 0 ? (
          <p className="empty-state">No challengers are registered yet.</p>
        ) : (
          <details className="challenger-disclosure">
            <summary>View all {challengers.length} challenger{challengers.length === 1 ? "" : "s"}</summary>
            <ul className="challenger-list">
            {challengers.map((candidate) => (
              <li key={candidate.candidate_name}>
                <div><strong>{candidate.candidate_name}{candidate.is_endorsed_by_departing ? " ★" : ""}</strong>
                <span className="np-tag">{candidate.is_returning_runner_up ? "Returning runner-up" : candidate.name_recognition_tier === "unknown" ? "Registered" : candidate.name_recognition_tier}</span></div>
                  {candidate.prior_ward_vote_share !== null && candidate.prior_ward_vote_share !== undefined && (
                    <span>Prior ward result: {(candidate.prior_ward_vote_share * 100).toFixed(1)}% in {candidate.prior_ward_election_year}</span>
                  )}
              </li>
            ))}
            </ul>
          </details>
        )}
      </section>
    </main>
  );
}
