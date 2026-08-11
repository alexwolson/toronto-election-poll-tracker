import { getPollingAverages } from "@/lib/mayoral-api";
import { MayoralForecast } from "@/components/mayoral-forecast";
import { getRaceTakeaway } from "@/lib/site-view-models";
import Link from "next/link";
import { candidateName } from "@/lib/candidate-presentation";

function percent(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value)
    ? `${Math.round(value * 100)}%`
    : "Unavailable";
}

function displayDate(value: string | null) {
  if (!value) return "Date unavailable";
  return new Intl.DateTimeFormat("en-CA", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

export default async function Home() {
  const pollsData = await getPollingAverages();

  const race = pollsData.mayoral_race;
  const takeaway = getRaceTakeaway({
    candidates: race.current_field.candidates,
    currentFieldPollCount: race.current_field.poll_count,
    latestPollDate: race.current_field.latest_date,
  });
  const candidateNames = new Map(
    Object.values(pollsData.candidate_status)
      .flat()
      .map((candidate) => [candidate.id, candidate.name])
  );
  const nameFor = (id: string) => candidateNames.get(id) ?? id.charAt(0).toUpperCase() + id.slice(1);
  const leaderName = takeaway.leader ? nameFor(takeaway.leader.id) : null;
  const challengerName = takeaway.leadingChallenger
    ? nameFor(takeaway.leadingChallenger.id)
    : null;

  return (
    <main id="main-content" className="np-shell">
      <section className="race-hero" aria-labelledby="race-heading">
        <p className="np-kicker">Toronto mayor · current field</p>
        <h1 id="race-heading">
          {leaderName && takeaway.leader
            ? `${leaderName} leads the race at ${percent(takeaway.leader.share)}`
            : "Current polling is unavailable"}
        </h1>
        {takeaway.leader && takeaway.leadingChallenger ? (
          <p className="race-hero-dek">
            {challengerName} is the leading challenger at {percent(takeaway.leadingChallenger.share)}.
            {takeaway.alexanderCombinedShare !== null && (
              <> Chris Alexander now accounts for {percent(takeaway.alexanderCombinedShare)} of combined Bradford–Alexander support.</>
            )}
          </p>
        ) : (
          <p className="race-hero-dek">
            There are not enough current-field polls to summarize the race.
          </p>
        )}
        <p className="race-hero-meta font-mono">
          Based on {takeaway.currentFieldPollCount} like-for-like current-field {takeaway.currentFieldPollCount === 1 ? "poll" : "polls"}; latest published {displayDate(takeaway.latestPollDate)}.
        </p>
      </section>

      <section className="polling-takeaway" aria-labelledby="current-field-heading">
        <div className="simple-section-heading">
          <p className="np-kicker">Latest polling</p>
          <h2 id="current-field-heading" className="section-title">The current field</h2>
          <p>Average support in the two polls that tested Chow, Bradford, and Alexander together.</p>
        </div>
        <div className="home-poll-summary" aria-label="Current-field polling average">
          {[...race.target_field, "residual"].map((id) => {
            const share = id === "residual"
              ? race.current_field.residual.share
              : race.current_field.candidates[id];
            return (
              <div key={id}>
                <span className={`candidate-marker candidate-marker--${id}`} aria-hidden="true" />
                <span>{id === "residual" ? "Other / undecided" : candidateName(id)}</span>
                <strong>{percent(share)}</strong>
              </div>
            );
          })}
        </div>
        {race.challenger_lane.availability === "available" && (
          <p className="home-lane-note">
            Within combined Bradford–Alexander support: Bradford {percent(race.challenger_lane.named_split.bradford)}, Alexander {percent(race.challenger_lane.named_split.alexander)}.
          </p>
        )}
        <Link href="/polls" className="text-link">View polling and candidates</Link>
      </section>

      <section className="model-home" aria-labelledby="model-heading">
        <div className="simple-section-heading">
          <p className="np-kicker">Separate model</p>
          <h2 id="model-heading" className="section-title">Election-day forecast</h2>
          <p>Projected outcomes, not a polling average.</p>
        </div>
        <MayoralForecast race={race} compact />
      </section>

      <aside className="methodology-prompt" aria-label="Methodology">
        <strong>How is this calculated?</strong>
        <span>Polls, forecasts, approval, and Council assessments are kept separate.</span>
        <Link href="/sources#methodology">Read the methodology</Link>
      </aside>
    </main>
  );
}
