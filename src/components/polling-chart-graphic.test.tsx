import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { pollingChartRows, PollingChartTooltip } from "./polling-chart-graphic";
import type { CandidateTrend } from "@/lib/polling";

describe("polling chart source provenance", () => {
  const trends: CandidateTrend[] = [{
    id: "chow", curve: [{ x: 20000, y: 0.5 }],
    markers: [
      { x: 20000, y: 36 / 66, poll_id: "ipsos", firm: "Ipsos", derived: true,
        reportedShare: 0.36, denominator: "All respondents" },
      { x: 20000, y: 0.51, poll_id: "another", firm: "Another firm", derived: false,
        reportedShare: 0.51, denominator: "Decided and leaning voters" },
    ],
  }];

  it("preserves distinct same-day sources and merges curve coordinates without hiding their dots", () => {
    const rows = pollingChartRows(trends);
    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row.details?.chow.poll_id)).toEqual(["ipsos", "another"]);
    expect(rows[0].raw_chow).toBeCloseTo(100 * 36 / 66);
    expect(rows[1].raw_chow).toBe(51);
    expect(rows.map((row) => row.loess_chow)).toEqual([50, 50]);
  });

  it("shows both derived and published shares and their original denominator", () => {
    const row = pollingChartRows(trends)[0];
    const html = renderToStaticMarkup(<PollingChartTooltip active label={20000}
      seriesById={new Map([["chow", "Olivia Chow"]])}
      payload={[{ dataKey: "raw_chow", value: 100 * 36 / 66, payload: row }]} />);
    expect(html).toContain("Ipsos");
    expect(html).toContain("Derived among candidate choices");
    expect(html).toContain("Published basis: All respondents");
    expect(html).toContain("Olivia Chow: 54.5%");
    expect(html).toContain("reported 36.0%");
  });

  it("keeps published decided readings and forecast history free of derivation labels", () => {
    const html = renderToStaticMarkup(<PollingChartTooltip active label={20000}
      seriesById={new Map([["chow", "Olivia Chow"]])}
      payload={[{ dataKey: "raw_chow", value: 51, payload: pollingChartRows(trends)[1] }]} />);
    expect(html).toContain("Olivia Chow: 51.0%");
    expect(html).toContain("Decided and leaning voters");
    expect(html).not.toContain("Derived");
    const history = renderToStaticMarkup(<PollingChartTooltip active label={20000}
      seriesById={new Map([["chow", "Olivia Chow"]])}
      payload={[{ dataKey: "raw_chow", value: 75.5 }]} />);
    expect(history).toContain("Olivia Chow: 75.5%");
    expect(history).not.toContain("Published basis");
  });
});
