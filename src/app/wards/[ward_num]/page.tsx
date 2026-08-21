import Link from "next/link";
import { notFound } from "next/navigation";
import { loadCouncilRaceCards } from "@/lib/feeds";
import { wardAttentionLevel, type AttentionLevel } from "@/lib/council";
import {
  historyHeadline,
  officeLabel,
  partyLabel,
  resultLabel,
} from "@/lib/council-history";
import {
  incumbentExposureFacts,
  ownHistorySignals,
  raceHistorySignals,
} from "@/lib/council-signals";
import { formatDate, formatSharePct } from "@/lib/format";
import type { CouncilCandidate, CouncilRaceCard, PastElection } from "@/types/feeds";

const ATTENTION_LABEL: Record<AttentionLevel, string> = {
  high: "High attention",
  elevated: "Elevated attention",
  quiet: "Quiet race",
  open: "Open seat",
};

export function generateStaticParams() {
  return Array.from({ length: 25 }, (_, i) => ({ ward_num: String(i + 1) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ ward_num: string }>;
}) {
  const { ward_num } = await params;
  const council = await loadCouncilRaceCards();
  const card = council.wards[ward_num];
  const name = card?.ward_name ?? `Ward ${ward_num}`;
  return { title: `${name} — Toronto 2026 Council` };
}

function PastElectionRow({ election }: { election: PastElection }) {
  const party = partyLabel(election.party_name);
  return (
    <li className="past-election">
      <span className="past-election__year">{election.year}</span>
      <span className="past-election__office">
        {officeLabel(election)}
        {election.district_name ? `, ${election.district_name}` : ""}
      </span>
      {party && <span className="past-election__party">{party}</span>}
      <span className={`past-election__result past-election__result--${election.result}`}>
        {resultLabel(election)}
      </span>
    </li>
  );
}

function DirectionIcon({ direction }: { direction: "positive" | "negative" }) {
  const positive = direction === "positive";
  const label = positive ? "positive historical signal" : "negative historical signal";
  // a rising (positive) or falling (negative) zigzag — direction only, no magnitude
  const points = positive ? "2,11 6,7 9,9 14,3" : "2,3 6,7 9,5 14,11";
  return (
    <svg
      className={`signal-icon signal-icon--${direction}`}
      width="16"
      height="14"
      viewBox="0 0 16 14"
      role="img"
      aria-label={label}
    >
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function CandidateItem({
  candidate,
  isIncumbent,
}: {
  candidate: CouncilCandidate;
  isIncumbent: boolean;
}) {
  const history = candidate.past_elections;
  const signals = ownHistorySignals(candidate.historical_hints);
  const headline = historyHeadline(history, isIncumbent);
  const expandable = history.length > 0 || signals.length > 0;

  const label = (
    <>
      <span className="candidate-row__name">{candidate.display_name}</span>
      {headline && <span className="candidate-row__headline">{headline}</span>}
    </>
  );

  if (!expandable) {
    return <li className="candidate-row candidate-row--plain">{label}</li>;
  }

  return (
    <li className="candidate-row">
      <details>
        <summary className="candidate-row__summary">{label}</summary>
        <div className="candidate-row__body">
          {history.length > 0 && (
            <ul className="past-elections">
              {history.map((election, i) => (
                <PastElectionRow key={i} election={election} />
              ))}
            </ul>
          )}
          {signals.length > 0 && (
            <div className="signal-group">
              <ul className="signal-list">
                {signals.map((sig) => (
                  <li key={sig.key} className={`signal signal--${sig.direction}`}>
                    <DirectionIcon direction={sig.direction} />
                    <span>{sig.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </details>
    </li>
  );
}

function WardDetail({ card }: { card: CouncilRaceCard }) {
  const attention = wardAttentionLevel(card);
  const inc = card.incumbent;
  const prior = card.prior_result;
  const exposureFacts = incumbentExposureFacts(card);
  const raceSignals = raceHistorySignals(card);

  return (
    <main id="main-content" className="np-shell">
      <p className="np-kicker">
        <Link href="/wards" className="text-link">
          Council
        </Link>{" "}
        · Ward {card.ward}
      </p>
      <section className="race-hero">
        <h1>{card.ward_name ?? `Ward ${card.ward}`}</h1>
        <span className={`ward-attn-tag ward-attn-tag--${attention}`}>
          {ATTENTION_LABEL[attention]}
        </span>
        <p className="race-hero-dek" style={{ marginTop: "0.75rem" }}>
          {card.is_open_seat
            ? "No incumbent is running — this is an open seat."
            : `${inc.name} is the incumbent, seeking another term.`}
        </p>
      </section>

      {!card.is_open_seat && (
        <section className="ward-detail-section">
          <h2>The incumbent</h2>
          <dl className="prior-result-grid">
            <div>
              <dt>Councillor</dt>
              <dd>{inc.name}</dd>
            </div>
            <div>
              <dt>Council wins</dt>
              <dd>{inc.council_wins}</dd>
            </div>
            {inc.defeatability_score !== null && (
              <div>
                <dt>Defeatability index</dt>
                <dd>{inc.defeatability_score}</dd>
              </div>
            )}
            {inc.most_recent_win && (
              <div>
                <dt>Last won</dt>
                <dd>
                  {inc.most_recent_win.year} · {formatSharePct(inc.most_recent_win.vote_share)}
                </dd>
              </div>
            )}
          </dl>
          {exposureFacts.length > 0 && (
            <>
              <p className="derived-item__label" style={{ marginTop: "1rem" }}>
                Why this race draws attention
              </p>
              <ul className="trigger-list">
                {exposureFacts.map((f) => (
                  <li key={f.key}>{f.text}</li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}

      {prior && (
        <section className="ward-detail-section">
          <h2>Last election ({prior.year})</h2>
          <dl className="prior-result-grid">
            <div>
              <dt>Winner</dt>
              <dd>
                {prior.winner_name} · {formatSharePct(prior.winner_share)}
              </dd>
            </div>
            {prior.runner_up_name && prior.runner_up_share !== null && (
              <div>
                <dt>Runner-up</dt>
                <dd>
                  {prior.runner_up_name} · {formatSharePct(prior.runner_up_share)}
                </dd>
              </div>
            )}
            {prior.margin_share !== null && (
              <div>
                <dt>Margin</dt>
                <dd>{formatSharePct(prior.margin_share)}</dd>
              </div>
            )}
            <div>
              <dt>Field size</dt>
              <dd>{prior.field_size}</dd>
            </div>
          </dl>
        </section>
      )}

      <section className="ward-detail-section">
        <h2>The 2026 field ({card.candidates.length})</h2>
        {raceSignals.length > 0 && (
          <ul className="signal-list" style={{ marginBottom: "0.75rem" }}>
            {raceSignals.map((sig) => (
              <li key={sig.key} className={`signal signal--${sig.direction}`}>
                <DirectionIcon direction={sig.direction} />
                <span>{sig.text}</span>
              </li>
            ))}
          </ul>
        )}
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {card.candidates.map((c) => (
            <CandidateItem
              key={c.display_name}
              candidate={c}
              isIncumbent={!card.is_open_seat && c.display_name === card.incumbent.name}
            />
          ))}
        </ul>
      </section>

      {card.ward_polls.length > 0 && (
        <section className="ward-detail-section">
          <h2>Ward polls</h2>
          {card.ward_polls.map((poll) => (
            <div key={poll.poll_id} style={{ marginBottom: "1rem" }}>
              <p className="font-mono" style={{ fontSize: "0.7rem", color: "var(--text-faint)" }}>
                {poll.firm} · {formatDate(poll.date_conducted)} · n={poll.sample_size ?? "—"}
                {poll.undecided_share !== null && (
                  <> · {formatSharePct(poll.undecided_share)} undecided</>
                )}
              </p>
              <ul style={{ listStyle: "none", padding: 0, margin: "0.35rem 0 0" }}>
                {poll.candidates.map((c) => (
                  <li
                    key={c.candidate_id}
                    className="font-mono"
                    style={{ fontSize: "0.78rem", padding: "0.15rem 0" }}
                  >
                    {formatSharePct(c.share)} — {c.candidate_name}
                    {c.is_incumbent && (
                      <span className="candidate-row__tag">incumbent</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}
    </main>
  );
}

export default async function WardPage({
  params,
}: {
  params: Promise<{ ward_num: string }>;
}) {
  const { ward_num } = await params;
  const num = Number(ward_num);
  if (!Number.isInteger(num) || num < 1 || num > 25) notFound();

  const council = await loadCouncilRaceCards();
  const card = council.wards[ward_num];
  if (!card) notFound();

  return <WardDetail card={card} />;
}
