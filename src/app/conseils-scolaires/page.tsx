import type { Metadata } from "next";
import { FrenchBoards } from "@/components/results/french-boards";
import { loadCouncilRaceCards, loadTrusteeRaceCards } from "@/lib/feeds";
import { raceSetups } from "@/lib/race-setup";
import { resultsMapData } from "@/lib/results-map-data";

export const metadata: Metadata = {
  title: "Conseils scolaires de langue française / French-language school boards — Toronto Election",
  description: "Résultats non officiels pour Viamonde et MonAvenir à Toronto. Unofficial results for Toronto's French-language school boards.",
};

/** The French-language boards' one bilingual page (Alex, 2026-10-24). */
export default async function FrenchBoardsPage() {
  const [council, trustees] = await Promise.all([loadCouncilRaceCards(), loadTrusteeRaceCards()]);
  const data = resultsMapData(council, trustees);
  return <FrenchBoards setups={raceSetups(council, trustees).filter((s) => s.kind === "french")} map={{ view_box: data.view_box, boards: data.boards, wards: data.wards }} />;
}
