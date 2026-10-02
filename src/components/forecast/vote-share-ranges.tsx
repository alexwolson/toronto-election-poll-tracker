import type { ElectionDaySharesView } from "@/lib/mayoral-forecast";
import { ShareRangeChart } from "@/components/share-range-chart";

export function VoteShareRanges({ view }: { view: ElectionDaySharesView }) {
  const mass = Math.round(view.intervalMass * 100);
  return (
    <ShareRangeChart
      rows={view.rows.map((row) => ({
        id: row.candidateId ?? "residual",
        name: row.name,
        point: row.median,
        lower: row.lower,
        upper: row.upper,
        color: row.colorVar,
        markerSlug: row.slug,
        hatch: row.hatch,
      }))}
      pointLabel="Middle"
      pointDescription="middle estimate"
      rangeDescription={`central ${mass}% range`}
      caption={
        <>
          Tick: middle estimate. Band: the middle {mass}% of simulated outcomes.
          Ranges are not chances of winning.
        </>
      }
    />
  );
}
