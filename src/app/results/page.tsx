import type { Metadata } from "next";
import { ResultsBallot } from "@/components/results/live-results-poller";
import { loadCouncilRaceCards, loadMayoralForecast } from "@/lib/feeds";
import { resultsForecast } from "@/lib/mayoral-forecast";
import { resultsWards } from "@/lib/results-wards";

export const metadata: Metadata = {
  title: "Election Night Results — Toronto Election",
  description:
    "The City of Toronto's unofficial count for every race on Oct. 26, 2026, updated about every minute from 8 p.m.",
};

/** Before a ward is picked: the picker, the citywide mayor card, then the 25
 *  council tiles. No default ward (#13). The count arrives in the browser. */
export default async function ResultsPage() {
  const [council, forecast] = await Promise.all([loadCouncilRaceCards(), loadMayoralForecast()]);
  return <ResultsBallot wards={resultsWards(council)} ward={null} ballot={[]} forecast={resultsForecast(forecast)} />;
}
