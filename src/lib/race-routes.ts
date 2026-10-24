/**
 * The race pages' routes (results redesign): which setups exist, each page's neighbours and the
 * other races on its ballots, built once per build from the feeds.
 */

import { loadCouncilRaceCards, loadTrusteeRaceCards } from "@/lib/feeds";
import { raceSetups, type RaceSetup } from "@/lib/race-setup";
import { resultsMapData } from "@/lib/results-map-data";
import type { RaceLink, RacePageProps } from "@/components/results/race-page";

export async function loadRaceSetups(): Promise<{ setups: RaceSetup[]; map: RacePageProps["map"] }> {
  const [council, trustees] = await Promise.all([loadCouncilRaceCards(), loadTrusteeRaceCards()]);
  const data = resultsMapData(council, trustees);
  return { setups: raceSetups(council, trustees), map: { view_box: data.view_box, wards: data.wards } };
}

const link = (s: RaceSetup): RaceLink => ({ id: s.id, href: s.href, title: s.kind === "council" ? s.title : s.title.replace(`${s.boardShort} `, "") });

/** A page's props: its neighbours within the council or the board, and the other races on its ballots. */
export function racePageProps(setup: RaceSetup, setups: RaceSetup[], map: RacePageProps["map"]): RacePageProps {
  const ring = setups.filter((s) => s.kind === setup.kind && s.boardId === setup.boardId);
  const at = ring.indexOf(setup);
  const prev = ring.length > 1 ? ring[(at + ring.length - 1) % ring.length] : null;
  const next = ring.length > 1 ? ring[(at + 1) % ring.length] : null;
  const ballot =
    setup.kind === "council"
      ? setups.filter((s) => s.kind !== "council" && s.cityWards.includes(setup.num)).map((s) => ({ id: s.id, href: s.href, title: s.title }))
      : setup.cityWards.map((w) => setups.find((s) => s.id === `councillor-${w}`)!).filter(Boolean).map((s) => ({ id: s.id, href: s.href, title: `Ward ${s.num} ${s.title}` }));
  return { setup, prev: prev && link(prev), next: next && link(next), map, ballot };
}

/** A council race's slug: the path without its slashes. */
export const councilSlug = (s: RaceSetup) => s.href.replace(/\//g, "");
