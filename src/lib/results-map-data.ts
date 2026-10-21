/**
 * The static half of the results Map (live-projection #103), built with the page: the ward
 * shapes from the Council feed's map, the TDSB's and TCDSB's own trustee wards from the Trustee
 * feed's maps (Alex, 2026-10-21), each ward's TDSB and TCDSB area, and who the running
 * incumbents are, by candidacy id, so the browser can say whether one leads without ever
 * matching names. The count arrives later, in the browser.
 */

import type { CouncilRaceCardsFeed, RaceMapFeature, TrusteeRaceCardsFeed } from "@/types/feeds";
import { RESULTS_WARDS } from "@/lib/ward-ballot";

export interface ResultsMapWard {
  num: string;
  path: string;
  label: RaceMapFeature["label"];
  /** A trustee ward's district name; council wards take theirs from the ward list. */
  name?: string;
}

export interface ResultsMapData {
  view_box: string;
  wards: ResultsMapWard[];
  /** Each mapped board's trustee wards, by the board's own ward number. */
  boards: Record<(typeof MAPPED_BOARDS)[number], ResultsMapWard[]>;
  /** Ward → running incumbents' candidacy ids; [] for an open seat; null when not known. */
  council: Record<string, string[] | null>;
  /** Trustee race id → the same. */
  trustee: Record<string, string[] | null>;
  /** Ward → the payload ids of its TDSB and TCDSB races. */
  areas: Record<string, { tdsb: string | null; tcdsb: string | null }>;
}

const MAPPED_BOARDS = ["tdsb", "tcdsb", "viamonde", "monavenir"] as const;

function councilIncumbents(card: CouncilRaceCardsFeed["wards"][string] | undefined): string[] | null {
  if (!card) return null;
  if (card.is_open_seat) return [];
  return card.incumbent_candidacy_id ? [card.incumbent_candidacy_id] : null;
}

export function resultsMapData(council: CouncilRaceCardsFeed, trustees: TrusteeRaceCardsFeed): ResultsMapData {
  const features = new Map((council.map?.features ?? []).map((f) => [f.ward_id, f]));
  const boards = MAPPED_BOARDS.map((id) => trustees.boards.find((b) => b.board_id === id));

  const trustee: ResultsMapData["trustee"] = {};
  for (const board of boards) {
    for (const ward of board?.wards ?? []) {
      const flagged = ward.candidates.filter((c) => c.is_incumbent === true).map((c) => c.candidacy_id);
      const open = ward.race_context.category === "open";
      // An open race with a flagged incumbent disagrees with itself: say not known.
      trustee[`${board!.board_id}-${ward.ward_id}`] = open ? (flagged.length ? null : []) : flagged.length ? flagged : null;
    }
  }

  const areaOf = (index: number, ward: string) => {
    const board = boards[index];
    const area = board?.wards.find((w) => w.city_wards.includes(Number(ward)));
    return board && area ? `${board.board_id}-${area.ward_id}` : null;
  };

  return {
    view_box: council.map?.view_box ?? "0 0 1000 720",
    wards: RESULTS_WARDS.flatMap((num) => {
      const feature = features.get(num);
      return feature ? [{ num, path: feature.path, label: feature.label }] : [];
    }),
    boards: Object.fromEntries(
      MAPPED_BOARDS.map((id, i) => {
        const board = boards[i];
        // "Ward 2 — Etobicoke Centre; Etobicoke-Lakeshore": the map already says the ward.
        const names = new Map((board?.wards ?? []).map((w) => [w.ward_id, w.district_name.replace(/^Ward \d+\s*[—–-]\s*/, "")]));
        return [id, (board?.map?.features ?? []).map((f) => ({ num: f.ward_id, path: f.path, label: f.label, name: names.get(f.ward_id) }))];
      }),
    ) as ResultsMapData["boards"],
    council: Object.fromEntries(RESULTS_WARDS.map((num) => [num, councilIncumbents(council.wards[num])])),
    trustee,
    areas: Object.fromEntries(RESULTS_WARDS.map((num) => [num, { tdsb: areaOf(0, num), tcdsb: areaOf(1, num) }])),
  };
}
