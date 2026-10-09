// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ResultsHomePanel } from "./results-home-panel";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function at(iso: string) {
  vi.useFakeTimers({ toFake: ["Date", "setTimeout", "clearTimeout"] });
  vi.setSystemTime(Date.parse(iso));
}

describe("the home page's election night results panel", () => {
  it("says results come from 8 p.m. before 20:00 EDT Oct 26 and links to the results", () => {
    at("2026-10-26T19:59:00-04:00");
    render(<ResultsHomePanel />);
    expect(screen.getByRole("heading", { name: "Election night results" })).toBeTruthy();
    expect(screen.getByText("Results from 8 p.m.")).toBeTruthy();
    expect(screen.queryByText("Live results")).toBeNull();
    expect(screen.getByRole("link").getAttribute("href")).toBe("/results");
  });

  it("says live results from 20:00 EDT Oct 26 by the reader's clock", () => {
    at("2026-10-27T09:30:00+09:00");
    render(<ResultsHomePanel />);
    expect(screen.getByText("Live results")).toBeTruthy();
    expect(screen.queryByText("Results from 8 p.m.")).toBeNull();
  });

  it("switches at 8 p.m. on a page left open", () => {
    at("2026-10-26T19:59:30-04:00");
    render(<ResultsHomePanel />);
    expect(screen.getByText("Results from 8 p.m.")).toBeTruthy();
    act(() => vi.advanceTimersByTime(30_000));
    expect(screen.getByText("Live results")).toBeTruthy();
  });

  it("prerenders the before-8 p.m. wording, whatever the build's clock", () => {
    at("2026-10-27T01:00:00-04:00");
    const html = renderToStaticMarkup(<ResultsHomePanel />);
    expect(html).toContain("Results from 8 p.m.");
  });
});
