import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CandidateHistoryItem } from "@/components/candidate-history";
import { TrusteeBoardTabs } from "@/components/trustee-board-tabs";
import { TrusteeRaceContextTag } from "@/components/trustee-race-context-tag";
import { TrusteeWardCoverage } from "@/components/trustee-ward-coverage";
import { loadCouncilRaceCards, loadTrusteeRaceCards } from "@/lib/feeds";
import { formatDetailedSharePct, formatSharePct } from "@/lib/format";
import {
  incumbentTrustees,
  isExpectedTrusteeWard,
  isTrusteeBoardId,
  TRUSTEE_BOARD_NAV,
  trusteeBoard,
  trusteeBoardFallback,
  trusteeWard,
} from "@/lib/trustees";

export const dynamicParams = false;

export function generateStaticParams() {
  return TRUSTEE_BOARD_NAV.flatMap((board) =>
    board.wards.map((ward) => ({ board: board.boardId, ward })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ board: string; ward: string }>;
}): Promise<Metadata> {
  const { board: boardId, ward: wardId } = await params;
  if (!isTrusteeBoardId(boardId) || !isExpectedTrusteeWard(boardId, wardId)) notFound();
  const feed = await loadTrusteeRaceCards();
  const board = trusteeBoard(feed, boardId);
  const ward = trusteeWard(board, wardId);
  const boardName = board?.short_name ?? trusteeBoardFallback(boardId).shortName;
  return { title: `${ward?.district_name ?? `Ward ${wardId}`} — ${boardName} 2026` };
}

export default async function TrusteeWardPage({
  params,
}: {
  params: Promise<{ board: string; ward: string }>;
}) {
  const { board: boardId, ward: wardId } = await params;
  if (!isTrusteeBoardId(boardId) || !isExpectedTrusteeWard(boardId, wardId)) notFound();
  const [feed, council] = await Promise.all([
    loadTrusteeRaceCards(),
    loadCouncilRaceCards(),
  ]);
  const board = trusteeBoard(feed, boardId);
  const ward = trusteeWard(board, wardId);
  const fallback = trusteeBoardFallback(boardId);

  if (!board || !ward) {
    return (
      <main id="main-content" className="np-shell">
        <TrusteeBoardTabs activeBoard={boardId} />
        <section className="ward-detail-section">
          <h1>{fallback.shortName} Ward {wardId}</h1>
          <p className="forecast-unavailable">Trustee data is currently unavailable.</p>
        </section>
      </main>
    );
  }

  const incumbents = incumbentTrustees(ward);
  const prior = ward.comparable_prior_result;
  const acclaimedCandidate = ward.acclaimed ? ward.candidates[0] : null;

  return (
    <main id="main-content" className="np-shell ward-profile-shell">
      <p className="np-kicker">
        <Link href={`/trustees/${board.board_id}`} className="text-link">
          {board.short_name}
        </Link>{" "}
        · School board trustees
      </p>
      <TrusteeBoardTabs activeBoard={boardId} />

      <section className="race-hero trustee-ward-hero">
        <h1>{ward.district_name}</h1>
        <TrusteeRaceContextTag category={ward.race_context.category} />
        <p className="race-hero-dek">{board.display_name}</p>
        <TrusteeWardCoverage
          cityWards={ward.city_wards}
          council={council}
          className="trustee-ward-area"
        />
      </section>

      <section className="ward-detail-section">
        <h2>The 2026 election</h2>
        {acclaimedCandidate ? (
          <p>
            {acclaimedCandidate.is_incumbent
              ? `${acclaimedCandidate.display_name}, the sitting trustee, has been re-elected by acclamation.`
              : `${acclaimedCandidate.display_name} has been elected by acclamation.`} No
            vote will be held in this trustee race.
          </p>
        ) : (
          <>
            <p>{ward.candidates.length} candidates are on the certified ballot.</p>
            {incumbents.length === 1 && (
              <p>
                {incumbents[0].display_name} is a sitting trustee seeking another term.
              </p>
            )}
            {incumbents.length > 1 && (
              <p>
                {incumbents.map((candidate) => candidate.display_name).join(" and ")} are
                sitting trustees seeking another term.
              </p>
            )}
            {ward.race_context.signal && (
              <p className="trustee-prior-win-signal">
                {ward.race_context.signal.subject_name} won this ward in{" "}
                {ward.race_context.signal.election_year} with{" "}
                {formatDetailedSharePct(ward.race_context.signal.vote_share)} of votes cast.
              </p>
            )}
          </>
        )}
      </section>

      {prior && (
        <section className="ward-detail-section">
          <h2>Last comparable election ({prior.year})</h2>
          <dl className="prior-result-grid">
            <div>
              <dt>Winner</dt>
              <dd>{prior.winner_name} · {formatSharePct(prior.winner_share)}</dd>
            </div>
            {prior.runner_up_name && prior.runner_up_share !== null && (
              <div>
                <dt>Runner-up</dt>
                <dd>{prior.runner_up_name} · {formatSharePct(prior.runner_up_share)}</dd>
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
        <h2>The certified field ({ward.candidates.length})</h2>
        <ul className="trustee-candidate-list">
          {ward.candidates.map((candidate) => (
            <CandidateHistoryItem
              key={candidate.candidacy_id}
              name={candidate.display_name}
              history={candidate.past_elections}
              currentOfficeType={candidate.is_incumbent ? "trustee" : undefined}
              summaryPrefix={candidate.is_incumbent ? "Incumbent Trustee" : undefined}
            />
          ))}
        </ul>
      </section>
    </main>
  );
}
