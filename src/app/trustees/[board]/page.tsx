import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TrusteeBoardTabs } from "@/components/trustee-board-tabs";
import { TrusteeRaceContextTag } from "@/components/trustee-race-context-tag";
import { TrusteeWardCoverage } from "@/components/trustee-ward-coverage";
import { loadCouncilRaceCards, loadTrusteeRaceCards } from "@/lib/feeds";
import {
  incumbentTrustees,
  isTrusteeBoardId,
  showTrusteeRaceContextTag,
  TRUSTEE_BOARD_NAV,
  trusteeBoard,
  trusteeBoardFallback,
  trusteeFieldStatus,
  trusteeRaceContextClass,
} from "@/lib/trustees";

export const dynamicParams = false;

export function generateStaticParams() {
  return TRUSTEE_BOARD_NAV.map((board) => ({ board: board.boardId }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ board: string }>;
}): Promise<Metadata> {
  const { board: boardId } = await params;
  if (!isTrusteeBoardId(boardId)) notFound();
  const feed = await loadTrusteeRaceCards();
  const board = trusteeBoard(feed, boardId);
  const name = board?.display_name ?? trusteeBoardFallback(boardId).displayName;
  return {
    title: `${name} Trustee Races — Toronto 2026`,
    description: `Every certified 2026 ${name} trustee race and candidate.`,
  };
}

export default async function TrusteeBoardPage({
  params,
}: {
  params: Promise<{ board: string }>;
}) {
  const { board: boardId } = await params;
  if (!isTrusteeBoardId(boardId)) notFound();
  const [feed, council] = await Promise.all([
    loadTrusteeRaceCards(),
    loadCouncilRaceCards(),
  ]);
  const board = trusteeBoard(feed, boardId);
  const fallback = trusteeBoardFallback(boardId);
  const wards = board?.wards;

  return (
    <main id="main-content" className="np-shell">
      <section className="race-hero trustee-hero" aria-labelledby="trustees-heading">
        <p className="np-kicker">School board trustees · 2026</p>
        <h1 id="trustees-heading">{board?.display_name ?? fallback.displayName}</h1>
        <p className="race-hero-dek">
          Every race and candidate on Toronto&apos;s certified 2026 trustee ballot.
        </p>
        {board && feed.coverage.methodology_note && (
          <p className="candidate-coverage-note">{feed.coverage.methodology_note}</p>
        )}
      </section>

      <TrusteeBoardTabs activeBoard={boardId} />

      <section className="ward-detail-section" aria-labelledby="trustee-wards-heading">
        <h2 id="trustee-wards-heading">
          {board ? `The ${board.wards.length} wards` : "Trustee wards"}
        </h2>
        {board?.board_id === "tdsb" && (
          <p className="trustee-race-context-note">
            TDSB wards were redrawn for 2026, so prior results cannot be compared
            fairly. Race type simply shows whether a contest is open, includes one or
            two sitting trustees, or was decided by acclamation.
          </p>
        )}
        {board && board.board_id !== "tdsb" && (
          <p className="trustee-race-context-note">
            Races are ordered using the prior winner&apos;s share of votes cast. This is
            a factual comparison, not a forecast.
          </p>
        )}
        {board ? (
          <ul className="trustee-ward-list">
            {wards?.map((ward) => {
              const incumbents = incumbentTrustees(ward);
              const category = ward.race_context.category;
              const showContext = showTrusteeRaceContextTag(category);
              return (
                <li key={ward.contest_id}>
                  <Link
                    href={`/trustees/${board.board_id}/${ward.ward_id}`}
                    className={`trustee-ward-link${showContext ? ` trustee-ward-link--${trusteeRaceContextClass(category)}` : ""}`}
                  >
                    <span className="trustee-ward-link__heading">{ward.district_name}</span>
                    <TrusteeRaceContextTag category={category} />
                    <TrusteeWardCoverage
                      cityWards={ward.city_wards}
                      council={council}
                      className="trustee-ward-link__area"
                    />
                    <span className="trustee-ward-link__facts">
                      <span>{trusteeFieldStatus(ward)}</span>
                      {incumbents.length === 1 && (
                        <span>Incumbent: {incumbents[0].display_name}</span>
                      )}
                      {incumbents.length > 1 && (
                        <span>{incumbents.length} incumbent trustees in the field</span>
                      )}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="forecast-unavailable">Trustee data is currently unavailable.</p>
        )}
      </section>
    </main>
  );
}
