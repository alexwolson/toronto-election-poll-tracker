/**
 * PROTOTYPE — throwaway route for the election-night results page
 * (alexwolson/toronto-election-live-projection#7). Three layouts via `?variant=`; see
 * `_components/results-prototype.tsx` for the other prototype params. Run with `npm run dev`
 * and open /prototype/results/.
 */
import { Suspense } from "react";
import { leadForecast, marginOutcomes } from "@/lib/mayoral-forecast";
import { loadMayoralForecast } from "@/lib/feeds";
import { ResultsPrototype } from "./_components/results-prototype";
import "./results-prototype.css";

export const metadata = { title: "PROTOTYPE · Election-night results" };

export default async function ResultsPrototypePage() {
  const feed = await loadMayoralForecast();
  const view = marginOutcomes(feed);
  const lead = leadForecast(feed);
  if (!view || !lead) throw new Error("prototype needs a published forecast fixture");
  return (
    <Suspense>
      <ResultsPrototype forecast={{ view, leadName: lead.name }} />
    </Suspense>
  );
}
