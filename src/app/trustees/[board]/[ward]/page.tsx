import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CandidateHistoryItem, CandidateLinksNote } from "@/components/candidate-history";
import { TrusteeBoardTabs } from "@/components/trustee-board-tabs";
import { TrusteeRaceContextTag } from "@/components/trustee-race-context-tag";
import { TrusteeWardCoverage } from "@/components/trustee-ward-coverage";
import { loadCouncilRaceCards, loadTrusteeRaceCards } from "@/lib/feeds";
import { formatSharePct } from "@/lib/format";
import {
  cityWardAreaNames,
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
          <p className="forecast-unavailable">
            Trustee race information is not available yet.
          </p>
        </section>
      </main>
    );
  }

  const prior = ward.comparable_prior_result;
  const areaNames = cityWardAreaNames(ward.city_wards, council);
  const normalizedDistrictName = ward.district_name.toLocaleLowerCase();
  const coverageRepeatsHeading =
    areaNames.length === ward.city_wards.length &&
    areaNames.every((area) => normalizedDistrictName.includes(area.toLocaleLowerCase()));

  return (
    <main id="main-content" className="np-shell ward-profile-shell">
      <p className="np-kicker">
        <Link href={`/trustees/${board.board_id}`} className="text-link">
          {board.display_name}
        </Link>
      </p>
      <TrusteeBoardTabs activeBoard={boardId} />

      <section className="race-hero trustee-ward-hero">
        <h1>{ward.district_name}</h1>
        <TrusteeRaceContextTag category={ward.race_context.category} />
        {!coverageRepeatsHeading && (
          <TrusteeWardCoverage
            cityWards={ward.city_wards}
            council={council}
            className="trustee-ward-area"
          />
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
              <dt>Candidates</dt>
              <dd>{prior.field_size}</dd>
            </div>
          </dl>
        </section>
      )}

      <section className="ward-detail-section">
        <h2>Candidates on the certified ballot ({ward.candidates.length})</h2>
        {feed.coverage.methodology_note && (
          <p className="candidate-coverage-note">{feed.coverage.methodology_note}</p>
        )}
        <ul className="candidate-list">
          {ward.candidates.map((candidate) => (
            <CandidateHistoryItem
              key={candidate.candidacy_id}
              name={candidate.display_name}
              campaignUrl={candidate.campaign_url}
              history={candidate.past_elections}
              currentOfficeType={candidate.is_incumbent ? "trustee" : undefined}
              summaryPrefix={
                ward.acclaimed
                  ? candidate.is_incumbent
                    ? "Re-elected · Incumbent Trustee"
                    : "Elected"
                  : candidate.is_incumbent
                    ? "Incumbent Trustee"
                    : undefined
              }
            />
          ))}
        </ul>
        {ward.candidates.some((candidate) => candidate.campaign_url) && (
          <CandidateLinksNote />
        )}
      </section>
    </main>
  );
}
