import candidatesFixture from "../../fixtures/mayoral_candidates.json";
import councilFixture from "../../fixtures/council_race_cards.json";
import trusteeFixture from "../../fixtures/trustee_race_cards.json";
import { describe, expect, it } from "vitest";
import type { CouncilRaceCardsFeed, TrusteeRaceCardsFeed } from "@/types/feeds";
import { validateCouncil, validateMayoralCandidates, validateTrusteeRaceCards } from "./feeds";

describe("validateMayoralCandidates", () => {
  it("accepts the complete certified fixture", () => {
    const feed = validateMayoralCandidates(candidatesFixture);
    expect(feed?.schema_version).toBe(5);
    expect(feed?.ballot_certified).toBe(true);
    expect(feed?.candidates).toHaveLength(53);
    expect(
      feed?.candidates.find((candidate) => candidate.display_name === "Olivia Chow"),
    ).toMatchObject({
      display_name: "Olivia Chow",
      is_incumbent: true,
    });
  });

  it("rejects malformed candidate rows", () => {
    expect(
      validateMayoralCandidates({
        schema_version: 5,
        event_id: "toronto-2026",
        contest_id: "mayor-2026",
        election_date: "2026-10-26",
        ballot_certified: true,
        coverage: candidatesFixture.coverage,
        candidates: [{ display_name: "Missing fields" }],
      }),
    ).toBeNull();
  });

  it("rejects a provisional feed that exposes candidates", () => {
    expect(
      validateMayoralCandidates({
        schema_version: 5,
        event_id: "toronto-2026",
        contest_id: "mayor-2026",
        election_date: "2026-10-26",
        ballot_certified: false,
        coverage: candidatesFixture.coverage,
        candidates: candidatesFixture.candidates,
      }),
    ).toBeNull();
  });

  it("requires Results-owned labels on 2003+ ward histories", () => {
    const malformed = structuredClone(candidatesFixture);
    const election = malformed.candidates
      .flatMap((candidate) => candidate.past_elections)
      .find(
        (row) =>
          row.election_date >= "2003-01-01" &&
          (row.office_type === "councillor" || row.office_type === "trustee"),
      );
    if (!election) throw new Error("fixture must contain an in-scope ward history");
    election.district_display_name = null;

    expect(validateMayoralCandidates(malformed)).toBeNull();
  });
});

describe("validateTrusteeRaceCards", () => {
  it("accepts the complete enriched four-board feed", () => {
    const feed = validateTrusteeRaceCards(trusteeFixture);

    expect(feed?.boards.map((board) => board.board_id)).toEqual([
      "tdsb",
      "tcdsb",
      "viamonde",
      "monavenir",
    ]);
    expect(feed?.coverage.cohort_size).toBe(118);
    expect(feed?.boards.flatMap((board) => board.wards)).toHaveLength(29);
    const wards = feed?.boards.flatMap((board) => board.wards) ?? [];
    expect(wards.filter((ward) => ward.comparable_prior_result !== null)).toHaveLength(14);
    expect(feed?.boards[0].wards.every((ward) => ward.comparable_prior_result === null)).toBe(
      true,
    );
  });

  it("rejects an incomplete board or candidate cohort", () => {
    expect(
      validateTrusteeRaceCards({
        ...trusteeFixture,
        boards: trusteeFixture.boards.slice(0, 3),
      }),
    ).toBeNull();
    expect(
      validateTrusteeRaceCards({
        ...trusteeFixture,
        coverage: { ...trusteeFixture.coverage, cohort_size: 117 },
      }),
    ).toBeNull();
  });

  it("rejects a malformed acclamation", () => {
    const malformed = structuredClone(trusteeFixture) as unknown as TrusteeRaceCardsFeed;
    const acclaimed = malformed.boards
      .flatMap((board) => board.wards)
      .find((ward) => ward.acclaimed);
    if (!acclaimed) throw new Error("fixture must include an acclamation");
    acclaimed.result_status = "pending";

    expect(validateTrusteeRaceCards(malformed)).toBeNull();
  });

  it("rejects unsafe boundary and history claims", () => {
    const crossedBoundary = structuredClone(trusteeFixture) as unknown as TrusteeRaceCardsFeed;
    crossedBoundary.boards[0].wards[1].city_wards[0] =
      crossedBoundary.boards[0].wards[0].city_wards[0];
    expect(validateTrusteeRaceCards(crossedBoundary)).toBeNull();

    const inventedTdsbPrior = structuredClone(
      trusteeFixture,
    ) as unknown as TrusteeRaceCardsFeed;
    inventedTdsbPrior.boards[0].wards[0].comparable_prior_result =
      inventedTdsbPrior.boards[1].wards[0].comparable_prior_result;
    expect(validateTrusteeRaceCards(inventedTdsbPrior)).toBeNull();

    const outOfScopeHistory = structuredClone(
      trusteeFixture,
    ) as unknown as TrusteeRaceCardsFeed;
    const candidate = outOfScopeHistory.boards
      .flatMap((board) => board.wards)
      .flatMap((ward) => ward.candidates)
      .find((row) => row.past_elections.length > 0);
    if (!candidate) throw new Error("fixture must contain verified history");
    candidate.past_elections[0].year = 2002;
    candidate.past_elections[0].election_date = "2002-11-12";
    expect(validateTrusteeRaceCards(outOfScopeHistory)).toBeNull();
  });

  it("rejects inconsistent backend race context", () => {
    const wrongPriority = structuredClone(
      trusteeFixture,
    ) as unknown as TrusteeRaceCardsFeed;
    wrongPriority.boards[0].wards[0].race_context.sort_priority = 2;
    expect(validateTrusteeRaceCards(wrongPriority)).toBeNull();

    const thresholdViolation = structuredClone(
      trusteeFixture,
    ) as unknown as TrusteeRaceCardsFeed;
    const signalWard = thresholdViolation.boards
      .flatMap((board) => board.wards)
      .find((ward) => ward.race_context.category === "won_without_majority");
    if (!signalWard || !signalWard.race_context.signal) {
      throw new Error("fixture must contain a prior-win signal");
    }
    signalWard.race_context.signal.vote_share = 0.5;
    expect(validateTrusteeRaceCards(thresholdViolation)).toBeNull();

    const wrongOrder = structuredClone(trusteeFixture) as unknown as TrusteeRaceCardsFeed;
    wrongOrder.boards[1].wards.reverse();
    expect(validateTrusteeRaceCards(wrongOrder)).toBeNull();
  });

  it("drops one malformed optional map without losing its valid race list", () => {
    const malformed = structuredClone(trusteeFixture) as unknown as TrusteeRaceCardsFeed;
    malformed.boards[0].map!.features[0].path = "not an svg path";

    const validated = validateTrusteeRaceCards(malformed);

    expect(validated).not.toBeNull();
    expect(validated?.boards[0].map).toBeNull();
    expect(validated?.boards[1].map?.features).toHaveLength(12);
    expect(validated?.boards[0].wards).toHaveLength(12);
  });
});

describe("validateCouncil", () => {
  it("keeps a complete map and drops a malformed optional map", () => {
    const valid = validateCouncil(councilFixture);
    expect(valid?.map?.features).toHaveLength(25);

    const malformed = structuredClone(councilFixture) as unknown as CouncilRaceCardsFeed;
    malformed.map!.features.pop();
    const validated = validateCouncil(malformed);
    expect(validated?.map).toBeNull();
    expect(Object.keys(validated?.wards ?? {})).toHaveLength(25);
  });
});
