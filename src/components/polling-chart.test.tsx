// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  PollingChart,
  pollingTrendSummaryRows,
  type ChartSeries,
} from "./polling-chart";
import { PollingChartLoader } from "./polling-chart-loader";
import type { CandidateTrend } from "@/lib/polling";

vi.mock("./polling-chart-graphic", () => ({
  PollingChartGraphic: () => <div data-testid="loaded-polling-chart" />,
}));

const SERIES: ChartSeries[] = [
  { id: "candidate-a", name: "Candidate A", color: "#111111", hatch: false },
  { id: "candidate-b", name: "Candidate B", color: "#777777", hatch: true },
  { id: "candidate-c", name: "Candidate C", color: "#999999", hatch: false },
];

const TRENDS: CandidateTrend[] = [
  {
    id: "candidate-a",
    markers: [
      { x: 20_000, y: 0.31, poll_id: "poll-1" },
      { x: 20_010, y: 0.36, poll_id: "poll-2" },
    ],
    curve: [{ x: 20_000, y: 0.31 }, { x: 20_010, y: 0.36 }],
  },
  {
    id: "candidate-b",
    markers: [{ x: 20_010, y: 0.08, poll_id: "poll-2" }],
    curve: null,
  },
  { id: "candidate-c", markers: [], curve: null },
];

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("PollingChart accessibility", () => {
  it("summarizes reported endpoints without inventing missing values", () => {
    const rows = pollingTrendSummaryRows(TRENDS, SERIES);

    expect(rows[0]).toContain("2 published polls, from 31.0%");
    expect(rows[0]).toContain("to 36.0%");
    expect(rows[0]).toContain("A smoothed trend line is shown.");
    expect(rows[1]).toContain("1 published poll reports 8.0%");
    expect(rows[1]).toContain("too few polls tested this candidate");
    expect(rows[2]).toBe("Candidate C: no reported poll values are available.");
  });

  it("keeps the visual chart out of the accessibility tree and exposes its text equivalent", () => {
    const html = renderToStaticMarkup(<PollingChart trends={TRENDS} series={SERIES} />);

    expect(html).toContain('class="polling-chart-graphic" aria-hidden="true"');
    expect(html).toContain("Polling trend summary.");
    expect(html).toContain("A candidate missing from a poll is omitted, not counted as zero.");
    expect(html).toContain("The poll archive below contains every reported value and its source.");
  });

  it("loads the visual chart only after its reserved region nears the viewport", async () => {
    class ImmediateIntersectionObserver {
      constructor(private readonly callback: IntersectionObserverCallback) {}

      observe(target: Element) {
        this.callback(
          [{ isIntersecting: true, target } as IntersectionObserverEntry],
          this as unknown as IntersectionObserver,
        );
      }

      disconnect() {}
      unobserve() {}
      takeRecords() { return []; }
      readonly root = null;
      readonly rootMargin = "240px 0px";
      readonly thresholds = [0];
    }

    vi.stubGlobal("IntersectionObserver", ImmediateIntersectionObserver);
    const { container } = render(<PollingChartLoader trends={TRENDS} series={SERIES} />);

    expect(container.querySelector(".polling-chart-graphic")).toBeTruthy();
    expect(await screen.findByTestId("loaded-polling-chart")).toBeTruthy();
  });
});
