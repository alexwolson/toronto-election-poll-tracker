// @vitest-environment jsdom

import { readFileSync } from "node:fs";
import path from "node:path";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import councilFixture from "../../../fixtures/council_race_cards.json";
import trusteeFixture from "../../../fixtures/trustee_race_cards.json";
import { resultsMapData } from "@/lib/results-map-data";
import { resultsWards, type ResultsWard } from "@/lib/results-wards";
import type { CouncilRaceCardsFeed, TrusteeRaceCardsFeed } from "@/types/feeds";
import type { LivePayload } from "@/types/live";
import { LiveResultsView } from "./live-results-view";

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), query: "" }));
vi.mock("next/navigation", () => ({
  useRouter: () => router,
  usePathname: () => "/results/",
  useSearchParams: () => new URLSearchParams(router.query),
}));

const council = councilFixture as unknown as CouncilRaceCardsFeed;
const WARDS: ResultsWard[] = resultsWards(council);
const MAP = resultsMapData(council, trusteeFixture as unknown as TrusteeRaceCardsFeed);
const payload = JSON.parse(
  readFileSync(path.resolve(__dirname, "../../../fixtures/live/payload/before-results-2026.json"), "utf8"),
) as LivePayload;

/** The dashboard at `/results/?<query>`. */
function renderPage(query = "") {
  router.query = query;
  return render(
    <LiveResultsView
      state={{ results: { heartbeat: payload.seq.all_office, paused: false, closed: false, payload }, failures: 0 }}
      now={payload.seq.all_office}
      wards={WARDS}
      forecast={false}
      mapData={MAP}
    />,
  );
}

function picked(): string {
  return (screen.getByLabelText("Your ward") as HTMLSelectElement).value;
}

function choose(ward: string) {
  fireEvent.change(screen.getByLabelText("Your ward"), { target: { value: ward } });
  fireEvent.click(screen.getByRole("button", { name: "Show" }));
}

function blockStorage() {
  vi.spyOn(window, "localStorage", "get").mockImplementation(() => {
    throw new DOMException("The operation is insecure.", "SecurityError");
  });
}

beforeEach(() => {
  router.push.mockReset();
  router.replace.mockReset();
  router.query = "";
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  window.localStorage.clear();
});

describe("the ward picker and the remembered ward (#13, the dashboard)", () => {
  it("remembers the ward chosen with the picker and makes it yours in place", () => {
    renderPage();
    choose("14");
    expect(window.localStorage.getItem("results-ward")).toBe("14");
    expect(router.replace).toHaveBeenCalledWith("/results/?myward=14", { scroll: false });
    expect(router.push).not.toHaveBeenCalled();
  });

  it("keeps the page's other parameters when the ward changes", () => {
    renderPage("race=council&sort=close");
    choose("3");
    expect(router.replace).toHaveBeenCalledWith("/results/?race=council&sort=close&myward=3", { scroll: false });
  });

  it("shows the remembered ward in the picker and never navigates", async () => {
    window.localStorage.setItem("results-ward", "14");
    await act(async () => {
      renderPage();
    });
    expect(picked()).toBe("14");
    expect(router.push).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("a shared link with another ward shows it and leaves the memory unchanged", async () => {
    window.localStorage.setItem("results-ward", "14");
    await act(async () => {
      renderPage("myward=3");
    });
    expect(picked()).toBe("3");
    expect(window.localStorage.getItem("results-ward")).toBe("14");
  });

  it("opening a race leaves the memory unchanged", async () => {
    window.localStorage.setItem("results-ward", "14");
    await act(async () => {
      renderPage("race=council");
    });
    const block = screen.getByRole("link", { name: "Ward 3 Etobicoke-Lakeshore" });
    expect(block.getAttribute("href")).toBe("/results?race=council&open=councillor-3");
    fireEvent.click(block);
    expect(window.localStorage.getItem("results-ward")).toBe("14");
  });

  it("with storage blocked, remembers nothing and the page works normally", async () => {
    blockStorage();
    await act(async () => {
      renderPage();
    });
    expect(picked()).toBe("");
    choose("14");
    expect(router.replace).toHaveBeenCalledWith("/results/?myward=14", { scroll: false });
    expect(screen.getByRole("heading", { level: 3, name: "Mayor" })).toBeTruthy();
  });
});
