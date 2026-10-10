// @vitest-environment jsdom

import { readFileSync } from "node:fs";
import path from "node:path";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import councilFixture from "../../../fixtures/council_race_cards.json";
import { resultsWards, type ResultsWard } from "@/lib/results-wards";
import type { CouncilRaceCardsFeed } from "@/types/feeds";
import type { LivePayload } from "@/types/live";
import { LiveResultsView } from "./live-results-view";

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

const council = councilFixture as unknown as CouncilRaceCardsFeed;
const WARDS: ResultsWard[] = resultsWards(council);
const payload = JSON.parse(
  readFileSync(path.resolve(__dirname, "../../../fixtures/live/payload/before-results-2026.json"), "utf8"),
) as LivePayload;

function renderPage(ward: string | null = null) {
  return render(
    <LiveResultsView
      state={{ results: { heartbeat: payload.seq.all_office, paused: false, payload }, failures: 0 }}
      now={payload.seq.all_office}
      wards={WARDS}
      ward={WARDS.find((w) => w.num === ward) ?? null}
      ballot={[]}
      forecast={null}
    />,
  );
}

function choose(ward: string) {
  fireEvent.change(screen.getByLabelText("Your ward"), { target: { value: ward } });
  fireEvent.click(screen.getByRole("button", { name: "Show results" }));
}

function blockStorage() {
  vi.spyOn(window, "localStorage", "get").mockImplementation(() => {
    throw new DOMException("The operation is insecure.", "SecurityError");
  });
}

beforeEach(() => {
  router.push.mockReset();
  router.replace.mockReset();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  window.localStorage.clear();
});

describe("the ward picker and the remembered ward (#13)", () => {
  it("remembers the ward chosen with the picker and opens it", () => {
    renderPage();
    choose("14");
    expect(window.localStorage.getItem("results-ward")).toBe("14");
    expect(router.push).toHaveBeenCalledWith("/results/14");
  });

  it("shows the remembered ward as a 'Back to Ward N' chip and never redirects", async () => {
    window.localStorage.setItem("results-ward", "14");
    await act(async () => {
      renderPage();
    });
    const chip = screen.getByRole("link", { name: "Back to Ward 14" });
    expect(chip.getAttribute("href")).toBe("/results/14");
    expect(router.push).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("hides the chip on the remembered ward's own page", async () => {
    window.localStorage.setItem("results-ward", "14");
    await act(async () => {
      renderPage("14");
    });
    expect(screen.queryByRole("link", { name: "Back to Ward 14" })).toBeNull();
  });

  it("a shared link to another ward leaves the memory unchanged", async () => {
    window.localStorage.setItem("results-ward", "14");
    await act(async () => {
      renderPage("3");
    });
    expect(window.localStorage.getItem("results-ward")).toBe("14");
    expect(screen.getByRole("link", { name: "Back to Ward 14" })).toBeTruthy();
  });

  it("a tile tap leaves the memory unchanged", async () => {
    window.localStorage.setItem("results-ward", "14");
    await act(async () => {
      renderPage();
    });
    const tile = screen.getByRole("link", { name: /Ward 3 · Etobicoke-Lakeshore/ });
    expect(tile.getAttribute("href")).toBe("/results/3");
    fireEvent.click(tile);
    expect(window.localStorage.getItem("results-ward")).toBe("14");
  });

  it("with storage blocked, remembers nothing and the page works normally", async () => {
    blockStorage();
    await act(async () => {
      renderPage();
    });
    expect(screen.queryByRole("link", { name: /Back to Ward/ })).toBeNull();
    choose("14");
    expect(router.push).toHaveBeenCalledWith("/results/14");
    expect(screen.getByRole("heading", { level: 3, name: "Mayor" })).toBeTruthy();
  });
});
