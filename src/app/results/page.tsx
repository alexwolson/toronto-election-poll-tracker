import type { Metadata } from "next";
import { ResultsHome } from "@/components/results/results-home";
import { loadCouncilRaceCards, loadMayoralCandidates, loadMayoralForecast, loadTrusteeRaceCards } from "@/lib/feeds";
import { homeRaces, mayorNotes, namedMayoralCandidates } from "@/lib/home-data";
import { resultsForecast } from "@/lib/mayoral-forecast";
import { raceSetups } from "@/lib/race-setup";
import { resultsMapData } from "@/lib/results-map-data";
import { resultsWards } from "@/lib/results-wards";

export const metadata: Metadata = {
  title: "Election Night Results — Toronto Election",
  description:
    "The City of Toronto's unofficial count for every race on Oct. 26, 2026, updated about every minute from 8 p.m.",
};

/** The citywide results page (results redesign, Alex, 2026-10-24). The count arrives in the browser. */
export default async function ResultsPage() {
  const [council, trustees, forecast, candidates] = await Promise.all([
    loadCouncilRaceCards(),
    loadTrusteeRaceCards(),
    loadMayoralForecast(),
    loadMayoralCandidates().catch(() => null),
  ]);
  return (
    <ResultsHome
      homes={homeRaces(raceSetups(council, trustees))}
      wards={resultsWards(council)}
      forecast={resultsForecast(forecast)}
      mapData={resultsMapData(council, trustees)}
      named={namedMayoralCandidates(forecast)}
      notes={mayorNotes(candidates)}
    />
  );
}
