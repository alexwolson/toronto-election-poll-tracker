// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
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

const TEXT = "The 2026 election is over. The forecast is archived as last published on Oct 26.";

describe("the site-wide election banner", () => {
  it("says the election is over and links to the results", () => {
    render(<ElectionBanner />);
    const region = screen.getByRole("region", { name: "Election announcement" });
    expect(region.className).toBe("banner");
    expect(screen.getByText("Final results")).toBeTruthy();
    expect(screen.getByText(TEXT)).toBeTruthy();
    expect(screen.getByRole("link").getAttribute("href")).toBe("/results");
    expect(screen.getByText("See the results →")).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull(); // no dismiss
  });

  it("prerenders the final wording, whatever the clock: the site is static now", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(Date.parse("2026-10-24T10:00:00-04:00"));
    const html = renderToStaticMarkup(<ElectionBanner />);
    expect(html).toContain(TEXT);
    expect(html).not.toContain("Results from 8 p.m.");
    expect(html).not.toContain("The count is under way.");
  });

  it("stays off the results pages themselves: the citywide page, each race's and the French boards'", () => {
    for (const path of ["/results", "/results/", "/parkdale-high-park/", "/toronto-st-pauls/", "/tdsb/5/", "/tcdsb/12/", "/conseils-scolaires/"]) {
      mocks.pathname.mockReturnValue(path);
      expect(renderToStaticMarkup(<ElectionBanner />), path).toBe("");
    }
    for (const path of ["/", "/wards/4/", "/trustees/tdsb/5/", "/how-it-works/"]) {
      mocks.pathname.mockReturnValue(path);
      expect(renderToStaticMarkup(<ElectionBanner />), path).toContain(TEXT);
    }
  });
});
