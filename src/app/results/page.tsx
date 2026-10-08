import type { Metadata } from "next";
import { LiveResultsPoller } from "@/components/results/live-results-poller";

export const metadata: Metadata = {
  title: "Election Night Results — Toronto Election",
  description:
    "The City of Toronto's unofficial count for every race on Oct. 26, 2026, updated about every minute from 8 p.m.",
};

/** Static shell; the count arrives in the browser from /live/results.json (#30). */
export default function ResultsPage() {
  return (
    <main id="main-content" className="np-shell">
      <LiveResultsPoller />
    </main>
  );
}
