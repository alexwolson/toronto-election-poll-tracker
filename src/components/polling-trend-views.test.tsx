// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PollingTrendViews } from "./polling-trend-views";
import type { CandidateTrend } from "@/lib/polling";

vi.mock("./polling-chart-loader", () => ({ PollingChartLoader: () => null }));

const series = [{ id: "chow", name: "Olivia Chow", color: "purple", hatch: false }];
const allTrends: CandidateTrend[] = [{
  id: "chow",
  markers: [
    { x: 20000, y: 0.4, poll_id: "old" },
    { x: 20010, y: 0.5, poll_id: "full-field" },
  ],
  curve: null,
}];
const qualifiedTrends = [{ ...allTrends[0], markers: [allTrends[0].markers[1]] }];

afterEach(cleanup);

describe("polling trend views", () => {
  it("defaults to all polls and switches the chart and accessible summary in both directions", () => {
    render(<PollingTrendViews allTrends={allTrends} qualifiedTrends={qualifiedTrends} series={series}
      allPollNote={<p>Unknown basis poll is excluded.</p>} />);
    const all = screen.getByRole("button", { name: "All polls" });
    const qualified = screen.getByRole("button", { name: "Alexander included" });
    expect(all.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText(/Olivia Chow: 2 polls shown/)).toBeTruthy();
    expect(screen.getByText("Unknown basis poll is excluded.")).toBeTruthy();
    fireEvent.click(qualified);
    expect(qualified.getAttribute("aria-pressed")).toBe("true");
    expect(all.getAttribute("aria-pressed")).toBe("false");
    expect(screen.getByRole("status").textContent).toBe("1 poll reporting Chow, Bradford and Alexander.");
    expect(screen.getByText(/Olivia Chow: 1 poll shown at 50.0%/)).toBeTruthy();
    expect(screen.queryByText(/Olivia Chow: 2 polls shown/)).toBeNull();
    expect(screen.queryByText("Unknown basis poll is excluded.")).toBeNull();
    fireEvent.click(all);
    expect(screen.getByText(/Olivia Chow: 2 polls shown/)).toBeTruthy();
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.getByText("Unknown basis poll is excluded.")).toBeTruthy();
  });

  it("shows an empty state when no comparable poll reports the full field", () => {
    render(<PollingTrendViews allTrends={allTrends} qualifiedTrends={[]} series={series} />);
    fireEvent.click(screen.getByRole("button", { name: "Alexander included" }));
    expect(screen.getByText("No comparable polls report all three candidates yet.")).toBeTruthy();
    expect(screen.queryByText(/Olivia Chow: 2 polls shown/)).toBeNull();
  });
});
