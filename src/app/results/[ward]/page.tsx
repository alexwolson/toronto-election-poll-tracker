import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ResultsBallot } from "@/components/results/live-results-poller";
import { loadCouncilRaceCards, loadTrusteeRaceCards } from "@/lib/feeds";
import { resultsWards, wardLabel } from "@/lib/results-wards";
import { isResultsWard, RESULTS_WARDS, wardBallotRaceIds } from "@/lib/ward-ballot";

// Unknown wards 404 rather than render on demand (research 05 §1b).
export const dynamicParams = false;

export function generateStaticParams() {
  return RESULTS_WARDS.map((ward) => ({ ward }));
}

type Props = { params: Promise<{ ward: string }> };

async function pageWard({ params }: Props) {
  const { ward } = await params;
  if (!isResultsWard(ward)) notFound();
  const wards = resultsWards(await loadCouncilRaceCards());
  return { wards, current: wards.find((w) => w.num === ward)! };
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { current } = await pageWard(props);
  const label = wardLabel(current);
  return {
    title: `${label}: election night results`,
    description: `The City of Toronto's unofficial count for ${label} on Oct. 26, 2026: mayor, councillor and school board trustees, updated about every minute from 8 p.m.`,
  };
}

/** One ward's ballot: the mayor, its councillor and its trustee areas, then the
 *  council tiles. The City ward alone fixes the races (#13). */
export default async function WardResultsPage(props: Props) {
  const [{ wards, current }, trustees] = await Promise.all([pageWard(props), loadTrusteeRaceCards()]);
  return <ResultsBallot wards={wards} ward={current} ballot={wardBallotRaceIds(current.num, trustees)} />;
}
