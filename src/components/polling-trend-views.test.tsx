// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PollingTrendViews } from "./polling-trend-views";
import type { CandidateTrend } from "@/lib/polling";
import type { PollingChartGraphicProps } from "./polling-chart-loader";
import { isoDayNumber } from "@/lib/format";

vi.mock("./polling-chart-loader", () => ({
  PollingChartLoader: ({ xDomain, series }: PollingChartGraphicProps) =>
    <div data-testid="chart-window" data-series={series.map((entry) => entry.name).join(",")}>
      {xDomain?.join(",") ?? "full history"}
    </div>,
}));

const series = [{ id: "chow", name: "Olivia Chow", color: "purple", hatch: false }];
const allTrends: CandidateTrend[] = [{
  id: "chow",
  markers: [
    { x: isoDayNumber("2026-07-29"), y: 0.4, poll_id: "old" },
    { x: isoDayNumber("2026-09-24"), y: 0.5, poll_id: "full-field" },
  ],
  curve: null,
}];
const qualifiedTrends = [{ ...allTrends[0], markers: [allTrends[0].markers[1]] }];

afterEach(cleanup);

describe("polling trend views", () => {
  it("defaults to the focused view and switches the chart and accessible summary in both directions", () => {
    render(<PollingTrendViews allTrends={allTrends} qualifiedTrends={qualifiedTrends} series={series}
      allPollNote={<p>Unknown basis poll is excluded.</p>} />);
    const all = screen.getByRole("button", { name: "All polls" });
    const qualified = screen.getByRole("button", { name: "Since nominations closed" });
    expect(qualified.getAttribute("aria-pressed")).toBe("true");
    expect(all.getAttribute("aria-pressed")).toBe("false");
    expect(screen.getByTestId("chart-window").textContent)
      .toBe([isoDayNumber("2026-08-22"), isoDayNumber("2026-09-24") + 0.5].join(","));
    expect(screen.getByRole("status").textContent).toBe("1 poll since nominations closed. Lines use the full polling history.");
    expect(screen.getByText(/Olivia Chow: 1 poll shown at 50.0%/)).toBeTruthy();
    expect(screen.queryByText(/Olivia Chow: 2 polls shown/)).toBeNull();
    expect(screen.queryByText("Unknown basis poll is excluded.")).toBeNull();
    fireEvent.click(all);
    expect(all.getAttribute("aria-pressed")).toBe("true");
    expect(qualified.getAttribute("aria-pressed")).toBe("false");
    expect(screen.getByTestId("chart-window").textContent).toBe("full history");
    expect(screen.getByText(/Olivia Chow: 2 polls shown/)).toBeTruthy();
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.getByText("Unknown basis poll is excluded.")).toBeTruthy();
    fireEvent.click(qualified);
    expect(screen.getByText(/Olivia Chow: 1 poll shown at 50.0%/)).toBeTruthy();
  });

  it("switches the denominator while retaining the period, published shares and its own summary", () => {
    const allRespondents = allTrends.map((trend) => ({ ...trend,
      markers: trend.markers.map((marker) => ({ ...marker, y: 0.36, derived: false })),
    }));
    const recent = [{ ...allRespondents[0], markers: [allRespondents[0].markers[1]] }];
    render(<PollingTrendViews allTrends={allTrends} qualifiedTrends={qualifiedTrends}
      allRespondentTrends={allRespondents} recentAllRespondentTrends={recent} series={series}
      allPollNote={<p>Unknown basis poll is excluded.</p>} />);
    expect(screen.getByTestId("chart-window").getAttribute("data-series")).toBe("Olivia Chow");
    fireEvent.click(screen.getByRole("button", { name: "All respondents" }));
    expect(screen.getByTestId("chart-window").getAttribute("data-series"))
      .toBe("Olivia Chow,Other candidates combined,Undecided / don’t know");
    expect(screen.getByRole("button", { name: "Since nominations closed" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText(/Olivia Chow: 1 poll shown at 36.0%/)).toBeTruthy();
    expect(screen.getByText(/Shares of all respondents, including undecided voters/)).toBeTruthy();
    expect(screen.queryByText(/Points show support among respondents naming a/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "All polls" }));
    expect(screen.getByTestId("chart-window").getAttribute("data-series"))
      .toBe("Olivia Chow,Other candidates combined,Undecided / don’t know");
    expect(screen.getByText(/Olivia Chow: 2 polls shown, from 36.0%/)).toBeTruthy();
    expect(screen.queryByText("Unknown basis poll is excluded.")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Candidate choices" }));
    expect(screen.getByTestId("chart-window").getAttribute("data-series")).toBe("Olivia Chow");
    expect(screen.getByText(/Olivia Chow: 2 polls shown, from 40.0%/)).toBeTruthy();
    expect(screen.getByText("Unknown basis poll is excluded.")).toBeTruthy();
  });

  it("shows an empty state when no comparable poll reports the full field", () => {
    render(<PollingTrendViews allTrends={allTrends} qualifiedTrends={[]} series={series} />);
    expect(screen.getByText("No comparable three-candidate polls since nominations closed yet.")).toBeTruthy();
    expect(screen.queryByText(/Olivia Chow: 2 polls shown/)).toBeNull();
  });
});
