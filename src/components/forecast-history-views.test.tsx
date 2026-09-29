// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ForecastHistoryViews } from "./forecast-history-views";
import { PollingTrendViews } from "./polling-trend-views";
import type { PollingChartGraphicProps } from "./polling-chart-loader";
import type { CandidateTrend } from "@/lib/polling";
import { isoDayNumber } from "@/lib/format";

const loaded = vi.hoisted(() => ({ chart: vi.fn<(props: PollingChartGraphicProps) => void>() }));
vi.mock("./polling-chart-loader", () => ({
  PollingChartLoader: (props: PollingChartGraphicProps) => { loaded.chart(props); return null; },
}));

const series = [{ id: "chow", name: "Olivia Chow", color: "purple", hatch: false }];
const allTrends: CandidateTrend[] = [{
  id: "chow",
  markers: [
    { x: isoDayNumber("2026-07-30"), y: 0.7, poll_id: "old" },
    { x: isoDayNumber("2026-09-29"), y: 0.8, poll_id: "new" },
  ],
  curve: [{ x: isoDayNumber("2026-07-30"), y: 0.71 }, { x: isoDayNumber("2026-09-29"), y: 0.79 }],
}];
const recentTrends = [{ ...allTrends[0], markers: [allTrends[0].markers[1]] }];
const props = { allTrends, recentTrends, series,
  allSummaryRows: ["Olivia Chow: all release dates."],
  recentSummaryRows: ["Olivia Chow: recent release dates."],
};
afterEach(() => { cleanup(); loaded.chart.mockClear(); });

describe("forecast history views", () => {
  it("defaults to recent updates and preserves the full-history fit, probability scale and text equivalent", () => {
    render(<ForecastHistoryViews {...props} />);
    const all = screen.getByRole("button", { name: "All polls" });
    const recent = screen.getByRole("button", { name: "Since nominations closed" });
    expect(recent.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("status").textContent).toBe("1 poll release published after Aug 21, 2026. Trend lines use the full forecast history.");
    expect(screen.getByText(props.recentSummaryRows[0])).toBeTruthy();
    let chart = loaded.chart.mock.calls.at(-1)![0];
    expect(chart.trends[0].markers).toHaveLength(1);
    expect(chart.trends[0].curve).toBe(allTrends[0].curve);
    expect(chart.yDomain).toEqual([0, 100]);
    expect(chart.xDomain).toEqual([isoDayNumber("2026-08-22"), isoDayNumber("2026-09-29") + 0.5]);
    fireEvent.click(all);
    expect(all.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText(props.allSummaryRows[0])).toBeTruthy();
    expect(screen.queryByText(props.recentSummaryRows[0])).toBeNull();
    chart = loaded.chart.mock.calls.at(-1)![0];
    expect(chart.trends[0].markers).toHaveLength(2);
    expect(chart.trends[0].curve).toBe(allTrends[0].curve);
    expect(chart.xDomain).toBeUndefined();
    fireEvent.click(recent);
    expect(screen.getByText(props.recentSummaryRows[0])).toBeTruthy();
  });

  it("keeps the two instances of the shared toggle independent", () => {
    render(<>
      <PollingTrendViews allTrends={allTrends} qualifiedTrends={recentTrends} series={series} />
      <ForecastHistoryViews {...props} />
    </>);
    const polling = within(screen.getByRole("group", { name: "Polls shown in the trend chart" }));
    const forecast = within(screen.getByRole("group", { name: "Poll releases shown in the forecast history chart" }));
    fireEvent.click(forecast.getByRole("button", { name: "All polls" }));
    expect(polling.getByRole("button", { name: "Since nominations closed" }).getAttribute("aria-pressed")).toBe("true");
    expect(forecast.getByRole("button", { name: "All polls" }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(polling.getByRole("button", { name: "All polls" }));
    fireEvent.click(forecast.getByRole("button", { name: "Since nominations closed" }));
    expect(polling.getByRole("button", { name: "All polls" }).getAttribute("aria-pressed")).toBe("true");
    expect(forecast.getByRole("button", { name: "Since nominations closed" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("allows the full history when the recent period is empty", () => {
    render(<ForecastHistoryViews {...props} recentTrends={[]} recentSummaryRows={[]} />);
    expect(screen.getByText("No forecast updates since nominations closed yet.")).toBeTruthy();
    expect(loaded.chart).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "All polls" }));
    expect(screen.getByText(props.allSummaryRows[0])).toBeTruthy();
  });
});
