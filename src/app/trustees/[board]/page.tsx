import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHero } from "@/components/page-hero";
import { RaceIndexSection } from "@/components/race-index-section";
import { TrusteeBoardTabs } from "@/components/trustee-board-tabs";
import { TrusteeRaceContextTag } from "@/components/trustee-race-context-tag";
import { TrusteeWardCoverage } from "@/components/trustee-ward-coverage";
import { loadCouncilRaceCards, loadTrusteeRaceCards } from "@/lib/feeds";
import {
  cityWardAreaNames,
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

function districtTitle(districtName: string) {
  return districtName.split(" — ", 2)[1] ?? districtName;
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
      <PageHero
        headingId="trustees-heading"
        title={board?.display_name ?? fallback.displayName}
        className="trustee-hero"
      />

      <TrusteeBoardTabs activeBoard={boardId} />

      <RaceIndexSection
        headingId="trustee-wards-heading"
        title={board ? `The ${board.wards.length} wards` : "Trustee wards"}
        map={board?.map ?? null}
        note={
          board?.board_id === "tdsb" ? (
            <p className="trustee-race-context-note">
              TDSB wards were redrawn for 2026, so earlier results are not directly
              comparable.
            </p>
          ) : board ? (
            <p className="trustee-race-context-note">
              Races with the lowest previous winning share appear first. This order
              describes the last comparable result; it is not a forecast.
            </p>
          ) : null
        }
      >
        {board ? (
          <ul className="race-index-list trustee-ward-list">
            {wards?.map((ward) => {
              const incumbents = incumbentTrustees(ward);
              const category = ward.race_context.category;
              const showContext = showTrusteeRaceContextTag(category);
              const areaNames = cityWardAreaNames(ward.city_wards, council);
              const normalizedDistrictName = ward.district_name.toLocaleLowerCase();
              const coverageRepeatsHeading =
                areaNames.length === ward.city_wards.length &&
                areaNames.every((area) =>
                  normalizedDistrictName.includes(area.toLocaleLowerCase()),
                );
              return (
                <li key={ward.contest_id}>
                  <Link
                    href={`/trustees/${board.board_id}/${ward.ward_id}`}
                    className={`race-index-card trustee-ward-link${showContext ? ` trustee-ward-link--${trusteeRaceContextClass(category)}` : ""}`}
                  >
                    <span className="race-index-card__eyebrow">Ward {ward.ward_id}</span>
                    <h3 className="race-index-card__heading trustee-ward-link__heading">
                      {districtTitle(ward.district_name)}
                    </h3>
                    <TrusteeRaceContextTag category={category} className="race-index-tag" />
                    {!coverageRepeatsHeading && (
                      <TrusteeWardCoverage
                        cityWards={ward.city_wards}
                        council={council}
                        className="trustee-ward-link__area"
                      />
                    )}
                    <span className="race-index-card__facts trustee-ward-link__facts">
                      <span>{trusteeFieldStatus(ward)}</span>
                      {incumbents.length === 1 && (
                        <span>
                          {category === "one_incumbent"
                            ? incumbents[0].display_name
                            : `Incumbent: ${incumbents[0].display_name}`}
                        </span>
                      )}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="forecast-unavailable">
            Trustee race information is not available yet.
          </p>
        )}
      </RaceIndexSection>
    </main>
  );
}
