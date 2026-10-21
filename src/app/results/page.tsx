import type { Metadata } from "next";
import { ResultsBallot } from "@/components/results/live-results-poller";
import { loadCouncilRaceCards, loadMayoralForecast, loadTrusteeRaceCards } from "@/lib/feeds";
import { resultsMapData } from "@/lib/results-map-data";
import { resultsForecast } from "@/lib/mayoral-forecast";
import { resultsWards } from "@/lib/results-wards";

export const metadata: Metadata = {
  title: "Election Night Results — Toronto Election",
  description:
    "The City of Toronto's unofficial count for every race on Oct. 26, 2026, updated about every minute from 8 p.m.",
};

/** The results dashboard: every race citywide, by type (Alex, 2026-10-20). The count arrives in
 *  the browser. */
export default async function ResultsPage() {
  const [council, trustees, forecast] = await Promise.all([
    loadCouncilRaceCards(),
    loadTrusteeRaceCards(),
    loadMayoralForecast(),
  ]);
  return (
    <ResultsBallot
      wards={resultsWards(council)}
      forecast={resultsForecast(forecast)}
      mapData={resultsMapData(council, trustees)}
    />
  );
}
