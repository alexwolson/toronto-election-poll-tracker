import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { CouncilRaceCardsFeed, TrusteeRaceCardsFeed } from "@/types/feeds";
import { resultsMapData } from "./results-map-data";

function fixture<T>(name: string): T {
  return JSON.parse(readFileSync(path.resolve(__dirname, "../../fixtures", name), "utf8")) as T;
}

const COUNCIL = fixture<CouncilRaceCardsFeed>("council_race_cards.json");
const TRUSTEES = fixture<TrusteeRaceCardsFeed>("trustee_race_cards.json");

describe("resultsMapData", () => {
  it("carries the 25 ward shapes in ward order", () => {
    const data = resultsMapData(COUNCIL, TRUSTEES);
    expect(data.wards.map((w) => w.num)).toEqual(Array.from({ length: 25 }, (_, i) => String(i + 1)));
    expect(data.wards[0].path.length).toBeGreaterThan(10);
    expect(data.view_box).toBe("0 0 1000 720");
  });

  it("names each ward's TDSB and TCDSB race", () => {
    const { areas } = resultsMapData(COUNCIL, TRUSTEES);
    const tdsb = TRUSTEES.boards.find((b) => b.board_id === "tdsb")!.wards.find((w) => w.city_wards.includes(3))!;
    expect(areas["3"].tdsb).toBe(`tdsb-${tdsb.ward_id}`);
    expect(Object.values(areas).every((a) => a.tdsb !== null && a.tcdsb !== null)).toBe(true);
  });

  it("gives council incumbents by candidacy, none for an open seat, and not known without the field", () => {
    const withIds: CouncilRaceCardsFeed = structuredClone(COUNCIL);
    withIds.wards["1"].incumbent_candidacy_id = "can_x";
    withIds.wards["1"].is_open_seat = false;
    withIds.wards["11"].is_open_seat = true;
    delete withIds.wards["2"].incumbent_candidacy_id;
    withIds.wards["2"].is_open_seat = false;
    const { council } = resultsMapData(withIds, TRUSTEES);
    expect(council["1"]).toEqual(["can_x"]);
    expect(council["11"]).toEqual([]);
    expect(council["2"]).toBeNull();
  });

  it("gives trustee incumbents from their flags, none for an open race, and not known when the flags don't say", () => {
    const { trustee } = resultsMapData(COUNCIL, TRUSTEES);
    for (const board of TRUSTEES.boards.filter((b) => b.board_id === "tdsb" || b.board_id === "tcdsb")) {
      for (const ward of board.wards) {
        const id = `${board.board_id}-${ward.ward_id}`;
        const flagged = ward.candidates.filter((c) => c.is_incumbent === true).map((c) => c.candidacy_id);
        if (ward.race_context.category === "open") expect(trustee[id], id).toEqual(flagged.length ? null : []);
        else expect(trustee[id], id).toEqual(flagged.length ? flagged : null);
      }
    }
  });
});
