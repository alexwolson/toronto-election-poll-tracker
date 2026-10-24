import { describe, expect, it } from "vitest";
import council from "../../fixtures/council_race_cards.json";
import trustees from "../../fixtures/trustee_race_cards.json";
import { EDITORIAL_COUNCIL, councilEditorial, suspendedCampaigns, trusteeEditorial } from "./editorial-races";
import type { MayoralCandidatesFeed, TrusteeRaceCardsFeed } from "@/types/feeds";

const TYPES = ["contest", "head", "favourite", "incumbent", "open", "acclaimed"];

describe("editorial-races.json", () => {
  it("sets up all 25 council races with a known type", () => {
    for (let w = 1; w <= 25; w++) {
      expect(TYPES).toContain(councilEditorial(String(w)).type);
    }
    expect(Object.keys(EDITORIAL_COUNCIL)).toHaveLength(25);
  });

  it("names only candidates on that ward's ballot: featured, outside, background lines and poll rows", () => {
    for (const [ward, ed] of Object.entries(EDITORIAL_COUNCIL)) {
      const ballot = new Set((council.wards as Record<string, { candidates: { display_name: string }[] }>)[ward].candidates.map((c) => c.display_name));
      const named = [...ed.featured, ...(ed.outside ?? []), ...Object.keys(ed.lines ?? {}), ...(ed.polls ?? []).flatMap((p) => p.shares.map((s) => s.name))];
      for (const name of named) expect(ballot.has(name), `Ward ${ward}: ${name}`).toBe(true);
    }
  });

  it("features three candidates in a contest and two in a head-to-head", () => {
    for (const ed of Object.values(EDITORIAL_COUNCIL)) {
      if (ed.type === "contest") expect(ed.featured).toHaveLength(3);
      if (ed.type === "head") expect(ed.featured).toHaveLength(2);
    }
  });
});

describe("trusteeEditorial", () => {
  const feed = trustees as unknown as TrusteeRaceCardsFeed;
  const ward = (board: string, id: string) => feed.boards.find((b) => b.board_id === board)!.wards.find((w) => w.ward_id === id)!;

  it("takes the race card's category: two incumbents are a head-to-head between them", () => {
    const ed = trusteeEditorial("tdsb-1", ward("tdsb", "1"));
    expect(ed.type).toBe("head");
    expect(ed.featured).toHaveLength(2);
  });

  it("marks an acclaimed race and features its one candidate", () => {
    const ed = trusteeEditorial("tcdsb-6", ward("tcdsb", "6"));
    expect(ed.type).toBe("acclaimed");
    expect(ed.featured).toHaveLength(1);
  });
});

describe("suspendedCampaigns", () => {
  it("merges the candidate feed's dates with the editor's later ones", () => {
    const feed = { candidates: [{ display_name: "Chris Alexander", campaign_suspended_on: "2026-10-06" }, { display_name: "Olivia Chow", campaign_suspended_on: null }] } as unknown as MayoralCandidatesFeed;
    expect(suspendedCampaigns(feed)).toEqual({ "Chris Alexander": "2026-10-06", "Odessa Paloma Parker": "2026-10-21" });
  });
});
