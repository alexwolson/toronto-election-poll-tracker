// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ElectionBanner } from "./election-banner";

const mocks = vi.hoisted(() => ({ pathname: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname: mocks.pathname }));

beforeEach(() => {
  mocks.pathname.mockReturnValue("/");
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function at(iso: string) {
  vi.useFakeTimers({ toFake: ["Date", "setTimeout", "clearTimeout"] });
  vi.setSystemTime(Date.parse(iso));
}

describe("the site-wide election banner", () => {
  it("names election day and the results time before 20:00 EDT Oct 26, linking to the results", () => {
    at("2026-10-24T10:00:00-04:00");
    render(<ElectionBanner />);
    const region = screen.getByRole("region", { name: "Election announcement" });
    expect(region.className).toBe("banner");
    expect(screen.getByText("Election day")).toBeTruthy();
    expect(screen.getByText("Toronto votes Monday, Oct 26. Results from 8 p.m.")).toBeTruthy();
    expect(screen.getByRole("link").getAttribute("href")).toBe("/results");
    expect(screen.getByText("See the results page →")).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull(); // no dismiss
  });

  it("says the count is under way from 20:00 EDT Oct 26 by the reader's clock", () => {
    at("2026-10-27T09:30:00+09:00");
    render(<ElectionBanner />);
    expect(screen.getByText("Live results")).toBeTruthy();
    expect(screen.getByText("The count is under way.")).toBeTruthy();
    expect(screen.getByText("Follow the count →")).toBeTruthy();
  });

  it("switches at 8 p.m. on a page left open", () => {
    at("2026-10-26T19:59:30-04:00");
    render(<ElectionBanner />);
    expect(screen.getByText("Election day")).toBeTruthy();
    act(() => vi.advanceTimersByTime(30_000));
    expect(screen.getByText("Live results")).toBeTruthy();
  });

  it("says unofficial results from 12:00 EDT Oct 27, and no longer live (#54)", () => {
    at("2026-10-27T12:00:00-04:00");
    render(<ElectionBanner />);
    expect(screen.getByText("Results")).toBeTruthy();
    expect(screen.getByText("Unofficial results are in.")).toBeTruthy();
    expect(screen.queryByText("Live results")).toBeNull();
  });

  it("prerenders the before-8 p.m. wording, whatever the build's clock", () => {
    at("2026-10-27T01:00:00-04:00");
    expect(renderToStaticMarkup(<ElectionBanner />)).toContain("Results from 8 p.m.");
  });

  it("stays off the results pages themselves: the citywide page, each race's and the French boards'", () => {
    at("2026-10-24T10:00:00-04:00");
    for (const path of ["/results", "/results/", "/parkdale-high-park/", "/toronto-st-pauls/", "/tdsb/5/", "/tcdsb/12/", "/conseils-scolaires/"]) {
      mocks.pathname.mockReturnValue(path);
      expect(renderToStaticMarkup(<ElectionBanner />), path).toBe("");
    }
    // Pages before the night keep it.
    for (const path of ["/", "/wards/4/", "/trustees/tdsb/5/", "/how-it-works/"]) {
      mocks.pathname.mockReturnValue(path);
      expect(renderToStaticMarkup(<ElectionBanner />), path).toContain("Results from 8 p.m.");
    }
  });
});
