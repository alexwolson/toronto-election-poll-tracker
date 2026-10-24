// @vitest-environment jsdom

import { readFileSync } from "node:fs";
import path from "node:path";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import councilFixture from "../../../fixtures/council_race_cards.json";
import trusteeFixture from "../../../fixtures/trustee_race_cards.json";
import { serveHistory } from "@/lib/live-history";
import { switchesFrom } from "@/lib/live-serve";
import { liveColour } from "@/lib/live-colour";
import { chowWard } from "@/lib/chow-2023";
import { shortLabel } from "@/lib/live-labels";
import { resultsMapData } from "@/lib/results-map-data";
import { resultsWards } from "@/lib/results-wards";
import type { CouncilRaceCardsFeed, TrusteeRaceCardsFeed } from "@/types/feeds";
import type { LiveHistory, LivePayload } from "@/types/live";
import { clockTicks, MayorCount, MayorWards, RaceCount } from "./live-count-view";
import { LiveMapView } from "./live-map-view";

function read(file: string): string {
  return readFileSync(path.resolve(__dirname, "../../../fixtures/live", file), "utf8");
}

const council = councilFixture as unknown as CouncilRaceCardsFeed;
const trustees = trusteeFixture as unknown as TrusteeRaceCardsFeed;
const WARDS = resultsWards(council);
const MAP = resultsMapData(council, trustees);
const NIGHT = JSON.parse(read("mock-night/payload.json")) as LivePayload;
const BEFORE = JSON.parse(read("payload/before-results-2026.json")) as LivePayload;
const HISTORY: LiveHistory = serveHistory({
  entries: (JSON.parse(read("mock-night/history.json")) as unknown[]).map((e) => JSON.stringify(e)),
  switches: switchesFrom([]),
});

const live = vi.hoisted(() => ({ history: null as LiveHistory | null, query: "" }));
vi.mock("./live-results-poller", () => ({ useLiveHistoryIfProvided: () => live.history }));
vi.mock("next/navigation", () => ({ usePathname: () => "/results/", useSearchParams: () => new URLSearchParams(live.query) }));

afterEach(() => {
  cleanup();
  live.query = "";
});

describe("LiveMapView", () => {
  it("draws all 25 wards, each named with what its shade says", () => {
    render(<LiveMapView data={MAP} payload={NIGHT} wards={WARDS} ward={null} />);
    const wards = screen.getAllByRole("button", { name: /^Ward \d+ / });
    expect(wards).toHaveLength(25);
    expect(wards[0].getAttribute("aria-label")).toMatch(/leads by [\d.]+ points|No votes counted yet|tied/);
  });

  it("shows the held ward's figures and links to its page", () => {
    render(<LiveMapView data={MAP} payload={NIGHT} wards={WARDS} ward={null} />);
    fireEvent.click(screen.getByRole("button", { name: /^Ward 7 / }));
    const panel = screen.getByRole("complementary", { name: "Ward 7 details" });
    expect(within(panel).getByText(/voting areas in/)).toBeTruthy();
    // Its council race, opened in full on the dashboard.
    expect(within(panel).getByRole("link", { name: /Ward 7 council race/ }).getAttribute("href")).toMatch(/^\/humber-river-black-creek\/?$/);
  });

  it("switches to council and says, for each ward, whether a running incumbent leads", () => {
    render(<LiveMapView data={MAP} payload={NIGHT} wards={WARDS} ward={null} />);
    fireEvent.click(screen.getByRole("button", { name: "Council" }));
    const labels = screen.getAllByRole("button", { name: /^Ward \d+ / }).map((w) => w.getAttribute("aria-label") ?? "");
    // The fixture's Council feed predates incumbent_candidacy_id: never a guess, only open seats or not known.
    expect(labels.every((l) => /Open seat|Incumbent not known|No votes counted yet|Acclaimed/.test(l))).toBe(true);
    expect(screen.getByText("Open seat")).toBeTruthy();
  });

  it("names incumbents by candidacy once the Backend says who they are", () => {
    const race = NIGHT.races.find((r) => r.id === "councillor-1")!;
    const leader = race.candidates[0];
    const data = { ...MAP, council: { ...MAP.council, "1": [leader.candidacy_id!] } };
    render(<LiveMapView data={data} payload={NIGHT} wards={WARDS} ward={null} />);
    fireEvent.click(screen.getByRole("button", { name: "Council" }));
    expect(screen.getByRole("button", { name: /^Ward 1 / }).getAttribute("aria-label")).toMatch(/Incumbent leading/);
  });

  it("shows reporting as a measure, with a legend in words", () => {
    render(<LiveMapView data={MAP} payload={NIGHT} wards={WARDS} ward={null} />);
    fireEvent.click(screen.getByRole("button", { name: "Voting areas in" }));
    const legend = screen.getByRole("list", { name: "Map legend" });
    expect(within(legend).getByText("All in")).toBeTruthy();
    expect(within(legend).getByText("Under half")).toBeTruthy();
  });

  it("before results, says when the map fills in and shades nothing", () => {
    render(<LiveMapView data={MAP} payload={BEFORE} wards={WARDS} ward={null} />);
    expect(screen.getByText(/fills in as wards report after 8 p\.m\./)).toBeTruthy();
    expect(screen.queryByRole("list", { name: "Map legend" })).toBeNull();
  });

  it("offers the same figures as a table", () => {
    render(<LiveMapView data={MAP} payload={NIGHT} wards={WARDS} ward={null} />);
    const table = screen.getByRole("table");
    expect(within(table).getAllByRole("row")).toHaveLength(26);
  });

  it("sets Chow's share in the held ward beside her 2023 share there", () => {
    render(<LiveMapView data={MAP} payload={NIGHT} wards={WARDS} ward={null} />);
    fireEvent.click(screen.getByRole("button", { name: /^Ward 7 / }));
    const panel = screen.getByRole("complementary", { name: "Ward 7 details" });
    const chow = within(panel).getByText("Olivia Chow").closest("li")!;
    expect(chow.textContent).toBe("Olivia Chow26.1%28.1% in 2023");
    // Said once each: the lead is in the status line, her share in her row.
    expect(within(panel).queryByText(/^Lead$/)).toBeNull();
    expect(within(panel).getAllByText("26.1%")).toHaveLength(1);
    expect(panel.querySelector(".live-map__reported")!.textContent).toBe("10,913 votes counted · 34 of 45 voting areas in");
  });

  it("lists the panel's candidates alphabetically by last name, whoever leads (#122)", () => {
    render(<LiveMapView data={MAP} payload={NIGHT} wards={WARDS} ward={null} />);
    const names = (num: string) => {
      fireEvent.click(screen.getByRole("button", { name: new RegExp(`^Ward ${num} `) }));
      const panel = screen.getByRole("complementary", { name: `Ward ${num} details` });
      return { names: within(panel).getAllByRole("listitem").map((li) => li.firstChild!.textContent), status: panel.querySelector(".live-map__status")!.textContent };
    };
    // Ward 4: Chow leads, but Bradford comes first alphabetically.
    const four = names("4");
    expect(four.status).toMatch(/^Olivia Chow leads by/);
    expect(four.names).toEqual(["Brad Bradford", "Olivia Chow"]);
    // Ward 1: Bradford leads, and the order is the same.
    expect(names("1").names).toEqual(["Brad Bradford", "Olivia Chow"]);
  });

  it("gives Chow's 2023 share in the mayor table, with its source, and not for council", () => {
    render(<LiveMapView data={MAP} payload={NIGHT} wards={WARDS} ward={null} />);
    const table = screen.getByRole("table");
    expect(within(table).getByRole("columnheader", { name: "Olivia Chow in 2023" })).toBeTruthy();
    expect(within(within(table).getByRole("rowheader", { name: /^2 / }).closest("tr")!).getByText("21.2%")).toBeTruthy();
    expect(screen.getByRole("link", { name: /certified results of the 2023 by-election/ }).textContent).toContain("↗");
    expect(screen.getByText(/2023 shares \(37\.2% citywide\)/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Council" }));
    expect(within(screen.getByRole("table")).queryByRole("columnheader", { name: "Olivia Chow in 2023" })).toBeNull();
    expect(screen.queryByText(/certified results of the 2023 by-election/)).toBeNull();
  });

  it("before results, already gives Chow's 2023 share and its source", () => {
    render(<LiveMapView data={MAP} payload={BEFORE} wards={WARDS} ward={null} />);
    fireEvent.click(screen.getByRole("button", { name: /^Ward 2 / }));
    const panel = screen.getByRole("complementary", { name: "Ward 2 details" });
    expect(within(panel).getByText("Olivia Chow").closest("li")!.textContent).toBe("Olivia Chow21.2% in 2023");
    const table = screen.getByRole("table");
    expect(within(within(table).getByRole("rowheader", { name: /^2 / }).closest("tr")!).getByText("21.2%")).toBeTruthy();
    expect(screen.getByText(/certified results of the 2023 by-election/)).toBeTruthy();
  });
});

describe("LiveMapView outlines (#126)", () => {
  const wardPath = (num: string) => screen.getByRole("button", { name: new RegExp(`^Ward ${num} `) });
  const outlines = () => document.querySelector(".live-map__outlines")!;

  it("draws the held and hovered wards' outlines above every ward, out of the pointer's way", () => {
    render(<LiveMapView data={MAP} payload={NIGHT} wards={WARDS} ward="7" />);
    const layer = outlines();
    // Painted after (so above) the last ward, since SVG paints in document order.
    const lastWard = wardPath(String(MAP.wards[MAP.wards.length - 1].num));
    expect(lastWard.compareDocumentPosition(layer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(layer.getAttribute("aria-hidden")).toBe("true");
    expect(layer.getAttribute("pointer-events")).toBe("none");

    const held = layer.querySelector(".is-held")!;
    expect(held.getAttribute("d")).toBe(wardPath("7").getAttribute("d"));
    expect(layer.querySelector(".is-active")).toBeNull();

    fireEvent.mouseEnter(wardPath("12"));
    expect(layer.querySelector(".is-active")!.getAttribute("d")).toBe(wardPath("12").getAttribute("d"));
    fireEvent.mouseLeave(wardPath("12"));
    expect(layer.querySelector(".is-active")).toBeNull();
  });

  it("outlines the keyboard-focused ward in the focus colour, whatever the mouse does", () => {
    render(<LiveMapView data={MAP} payload={NIGHT} wards={WARDS} ward="7" />);
    fireEvent.focus(wardPath("7"));
    expect(outlines().querySelector(".is-focus")!.getAttribute("d")).toBe(wardPath("7").getAttribute("d"));
    fireEvent.mouseEnter(wardPath("12"));
    fireEvent.mouseLeave(wardPath("12"));
    expect(outlines().querySelector(".is-focus")).toBeTruthy();
    fireEvent.blur(wardPath("7"));
    expect(outlines().querySelector(".is-focus")).toBeNull();
  });

  it("draws no focus outline when a click focuses the ward", () => {
    render(<LiveMapView data={MAP} payload={NIGHT} wards={WARDS} ward="7" />);
    fireEvent.pointerDown(wardPath("3"));
    fireEvent.focus(wardPath("3"));
    fireEvent.click(wardPath("3"));
    expect(outlines().querySelector(".is-focus")).toBeNull();
  });

  it("outlines the page's own ward when another is held", () => {
    render(<LiveMapView data={MAP} payload={NIGHT} wards={WARDS} ward="7" />);
    fireEvent.click(wardPath("3"));
    expect(outlines().querySelector(".is-home")!.getAttribute("d")).toBe(wardPath("7").getAttribute("d"));
    expect(outlines().querySelector(".is-held")!.getAttribute("d")).toBe(wardPath("3").getAttribute("d"));
  });
});

describe("LiveMapView ward card (#130)", () => {
  const wardPath = (num: string) => screen.getByRole("button", { name: new RegExp(`^Ward ${num} `) });
  const card = () => document.querySelector(".live-map__card");
  const pinned = () => screen.queryByRole("region", { name: /^Ward \d+ .* results$/ });

  it("shows a card for the ward under the mouse, out of the pointer's way", () => {
    render(<LiveMapView data={MAP} payload={NIGHT} wards={WARDS} ward={null} />);
    expect(card()).toBeNull();
    fireEvent.mouseEnter(wardPath("12"));
    expect(card()!.textContent).toMatch(/^Ward 12 /);
    expect(card()!.classList.contains("is-hover")).toBe(true);
    expect(within(card() as HTMLElement).queryByRole("button", { name: "Close" })).toBeNull();
    fireEvent.mouseLeave(wardPath("12"));
    expect(card()).toBeNull();
  });

  it("pins the card on a click, with Close; the pinned ward is the held ward", () => {
    render(<LiveMapView data={MAP} payload={NIGHT} wards={WARDS} ward={null} />);
    fireEvent.click(wardPath("3"));
    expect(pinned()!.getAttribute("aria-label")).toMatch(/^Ward 3 /);
    fireEvent.mouseEnter(wardPath("12"));
    expect(pinned()!.getAttribute("aria-label")).toMatch(/^Ward 3 /);
    fireEvent.mouseLeave(wardPath("12"));
    fireEvent.click(within(pinned()!).getByRole("button", { name: "Close" }));
    expect(pinned()).toBeNull();
    expect(wardPath("3").getAttribute("aria-pressed")).toBe("true");
  });

  it("unpins on a second click of the same ward, and on Escape", () => {
    render(<LiveMapView data={MAP} payload={NIGHT} wards={WARDS} ward={null} />);
    fireEvent.click(wardPath("3"));
    fireEvent.click(wardPath("3"));
    expect(pinned()).toBeNull();
    fireEvent.click(wardPath("5"));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(pinned()).toBeNull();
  });

  it("unpins on a click anywhere else on the map, and Enter on the pinned ward", () => {
    render(<LiveMapView data={MAP} payload={NIGHT} wards={WARDS} ward={null} />);
    fireEvent.click(wardPath("3"));
    fireEvent.click(screen.getByRole("list", { name: "Map legend" }));
    expect(pinned()).toBeNull();
    fireEvent.focus(wardPath("3"));
    expect(pinned()).toBeTruthy();
    fireEvent.keyDown(wardPath("3"), { key: "Enter" });
    expect(pinned()).toBeNull();
  });

  it("hands focus back to the ward on Escape", () => {
    render(<LiveMapView data={MAP} payload={NIGHT} wards={WARDS} ward={null} />);
    fireEvent.click(wardPath("3"));
    within(pinned()!).getByRole("button", { name: "Close" }).focus();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(pinned()).toBeNull();
    expect(document.activeElement).toBe(wardPath("3"));
  });

  it("keeps the side panel on the held ward while the card shows the hovered one", () => {
    render(<LiveMapView data={MAP} payload={NIGHT} wards={WARDS} ward="7" />);
    fireEvent.mouseEnter(wardPath("12"));
    expect(screen.getByRole("complementary", { name: "Ward 7 details" })).toBeTruthy();
  });

  it("pins the card at the ward when the keyboard focuses it", () => {
    render(<LiveMapView data={MAP} payload={NIGHT} wards={WARDS} ward="7" />);
    fireEvent.focus(wardPath("7"));
    expect(pinned()!.getAttribute("aria-label")).toMatch(/^Ward 7 /);
  });

  it("opens a shared link's ward pinned, and a plain map with no card", () => {
    live.query = "view=map&ward=9";
    render(<LiveMapView data={MAP} payload={NIGHT} wards={WARDS} ward={null} />);
    expect(pinned()!.getAttribute("aria-label")).toMatch(/^Ward 9 /);
    cleanup();
    live.query = "view=map";
    render(<LiveMapView data={MAP} payload={NIGHT} wards={WARDS} ward="7" />);
    expect(card()).toBeNull();
  });
});

describe("LiveMapView selection in the URL (#126)", () => {
  const pressed = (name: string) => screen.getByRole("button", { name }).getAttribute("aria-pressed");

  it("opens the map a shared link describes", () => {
    live.query = "view=map&race=council&show=reporting&ward=7";
    render(<LiveMapView data={MAP} payload={NIGHT} wards={WARDS} ward={null} />);
    expect(pressed("Council")).toBe("true");
    expect(pressed("Voting areas in")).toBe("true");
    expect(screen.getByRole("button", { name: /^Ward 7 / }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("complementary", { name: "Ward 7 details" })).toBeTruthy();
  });

  it("writes the reader's changes back to the URL, replacing the entry and keeping the view", () => {
    live.query = "view=map";
    const replace = vi.spyOn(window.history, "replaceState");
    render(<LiveMapView data={MAP} payload={NIGHT} wards={WARDS} ward={null} />);
    expect(replace).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Council" }));
    expect(replace).toHaveBeenLastCalledWith(null, "", "/results/?view=map&race=council");
    fireEvent.click(screen.getByRole("button", { name: /^Ward 7 / }));
    expect(replace).toHaveBeenLastCalledWith(null, "", "/results/?view=map&race=council&ward=7");
    fireEvent.click(screen.getByRole("button", { name: "Mayor" }));
    fireEvent.click(screen.getByRole("button", { name: "Candidate share" }));
    const key = NIGHT.races.find((r) => r.id === "mayor")!.candidates[1].key;
    fireEvent.change(screen.getByRole("combobox", { name: "Candidate" }), { target: { value: key } });
    expect(replace).toHaveBeenLastCalledWith(
      null,
      "",
      `/results/?${new URLSearchParams({ view: "map", show: "share", candidate: key, ward: "7" })}`,
    );
    replace.mockRestore();
  });

  it("never writes back a candidate that isn't in the race", () => {
    live.query = "view=map&show=share&candidate=NOBODY";
    const replace = vi.spyOn(window.history, "replaceState");
    render(<LiveMapView data={MAP} payload={NIGHT} wards={WARDS} ward={null} />);
    fireEvent.click(screen.getByRole("button", { name: /^Ward 7 / }));
    const first = NIGHT.races.find((r) => r.id === "mayor")!.candidates[0].key;
    expect(replace).toHaveBeenLastCalledWith(
      null,
      "",
      `/results/?${new URLSearchParams({ view: "map", show: "share", candidate: first, ward: "7" })}`,
    );
    replace.mockRestore();
  });

  it("links the held ward's race on the map's contest to that race in full", () => {
    live.query = "view=map&race=council&show=reporting";
    render(<LiveMapView data={MAP} payload={NIGHT} wards={WARDS} ward={null} />);
    fireEvent.click(screen.getByRole("button", { name: /^Ward 7 / }));
    const panel = screen.getByRole("complementary", { name: "Ward 7 details" });
    expect(within(panel).getByRole("link", { name: /in full/ }).getAttribute("href")).toMatch(/^\/humber-river-black-creek\/?$/);
  });
});

describe("LiveMapView vs 2023", () => {
  const show = (payload: LivePayload) => {
    render(<LiveMapView data={MAP} payload={payload} wards={WARDS} ward={null} />);
    fireEvent.click(screen.getByRole("button", { name: "vs 2023" }));
  };
  const label = (num: string) => screen.getByRole("button", { name: new RegExp(`^Ward ${num} `) });

  it("is a mayor measure only, and never the default", () => {
    render(<LiveMapView data={MAP} payload={NIGHT} wards={WARDS} ward={null} />);
    expect(screen.getByRole("button", { name: "vs 2023" }).getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(screen.getByRole("button", { name: "Council" }));
    expect(screen.queryByRole("button", { name: "vs 2023" })).toBeNull();
  });

  it("says, for each ward, her share now and her share there in 2023 (Alex, 2026-10-21)", () => {
    show(NIGHT);
    const mayor = NIGHT.races.find((r) => r.id === "mayor")!;
    for (const num of ["10", "12"]) {
      const w = chowWard(mayor, mayor.wards!.find((x) => x.num === num)!)!;
      const change = Math.round((w.live! - w.share2023) * 10) / 10;
      const words = `Olivia Chow ${w.live!.toFixed(1)}%, ${change >= 0 ? "up" : "down"} from ${w.share2023.toFixed(1)}% in 2023`;
      expect(label(num).getAttribute("aria-label")).toBe(`Ward ${num} ${WARDS.find((x) => x.num === num)!.name}: ${words}`);
      const step = Math.abs(change) < 2 ? "--live-div-0" : change > 0 ? (change < 5 ? "--live-div-better-1" : "--live-div-better-2") : change > -5 ? "--live-div-worse-1" : "--live-div-worse-2";
      expect(label(num).getAttribute("style")).toContain(step);
    }
    const legend = screen.getByRole("list", { name: "Map legend" });
    expect(within(legend).getAllByRole("listitem").map((li) => li.textContent)).toEqual([
      "Up 5+ points",
      "Up 2–5 points",
      "Within 2 points",
      "Down 2–5 points",
      "Down 5+ points",
    ]);
  });

  it("leaves a ward with no votes counted unshaded, and says so", () => {
    const payload = structuredClone(NIGHT);
    payload.races.find((r) => r.id === "mayor")!.wards!.find((w) => w.num === "3")!.votes = null;
    show(payload);
    expect(label("3").getAttribute("aria-label")).toMatch(/: No votes counted yet$/);
    expect(label("3").getAttribute("style") ?? "").not.toContain("--ward-fill");
    expect(within(screen.getByRole("list", { name: "Map legend" })).getByText("No votes counted yet")).toBeTruthy();
  });

  it("before results, shades nothing", () => {
    show(BEFORE);
    expect(label("3").getAttribute("aria-label")).toMatch(/: Results from 8 p\.m\.$/);
    expect(screen.queryByRole("list", { name: "Map legend" })).toBeNull();
  });
});

describe("The count on the race type pages (Alex, 2026-10-21)", () => {
  it("before results, says when the charts and the ward table start", () => {
    live.history = HISTORY;
    render(<MayorCount payload={BEFORE} />);
    render(<MayorWards payload={BEFORE} wards={WARDS} />);
    expect(screen.getAllByText(/start when results come in/)).toHaveLength(1);
    expect(screen.getByText(/The table fills in when results come in/)).toBeTruthy();
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("while the history loads, says so, and the ward table shows without it", () => {
    live.history = null;
    render(<MayorCount payload={NIGHT} />);
    render(<MayorWards payload={NIGHT} wards={WARDS} />);
    expect(screen.getByRole("status").textContent).toMatch(/Loading the count/);
    expect(screen.getByRole("heading", { name: "Mayor: results by ward" })).toBeTruthy();
    expect(screen.getAllByRole("row")).toHaveLength(26);
  });

  it("gives every chart a table, a row per point in the history", () => {
    live.history = HISTORY;
    render(<MayorCount payload={NIGHT} />);
    expect(screen.getAllByText("Show as a table").length).toBeGreaterThanOrEqual(2);
    expect(within(screen.getAllByRole("table")[0]).getAllByRole("row").length).toBeGreaterThanOrEqual(HISTORY.t.length);
  });

  it("draws the mayor's named candidates and everyone else, without lines for the minor field", () => {
    live.history = HISTORY;
    render(<MayorCount payload={NIGHT} />);
    const frame = screen.getByRole("heading", { name: "Share of the votes counted" }).closest("figure")!;
    expect(within(frame).getByText("Everyone else")).toBeTruthy();
    expect(within(frame).queryByText("Alexander")).toBeNull();
  });

  it("sorts the ward table by lead when asked", () => {
    render(<MayorWards payload={NIGHT} wards={WARDS} />);
    const button = screen.getByRole("button", { name: /^Lead$/ });
    fireEvent.click(button);
    expect(button.closest("th")!.getAttribute("aria-sort")).toBe("descending");
  });

  it("charts a race opened in full, with its table, and nothing before its count starts", () => {
    live.history = HISTORY;
    const race = NIGHT.races.find((r) => r.id === "councillor-4")!;
    render(<RaceCount race={race} />);
    const frame = screen.getByRole("heading", { name: "Share of the votes counted over the night" }).closest("figure")!;
    expect(within(frame).getByText("Show as a table")).toBeTruthy();
    cleanup();
    const { container } = render(<RaceCount race={BEFORE.races.find((r) => r.id === "councillor-4")!} />);
    expect(container.innerHTML).toBe("");
  });
});

describe("RaceCount colours", () => {
  it("draws each candidate in the colour the race block gives them", () => {
    live.history = HISTORY;
    const race = NIGHT.races.find((r) => r.id === "councillor-4")!;
    render(<RaceCount race={race} />);
    const figure = screen.getByRole("heading", { name: "Share of the votes counted over the night" }).closest("figure")!;
    const legend = figure.querySelector<HTMLElement>(".live-legend")!;
    const coloured = race.candidates.filter((c) => liveColour(c, "none") !== "none");
    expect(coloured.length).toBeGreaterThan(0);
    for (const c of coloured) {
      const item = within(legend).queryByText(shortLabel(c))?.closest("li");
      if (item) expect(item.querySelector("line")!.getAttribute("stroke")).toBe(liveColour(c));
    }
    expect(coloured.some((c) => within(legend).queryByText(shortLabel(c)))).toBe(true);
  });
});

describe("LiveMapView school boards: their own ward boundaries", () => {
  for (const board of ["tdsb", "tcdsb"] as const) {
    it(`draws the ${board.toUpperCase()}'s trustee wards, each shaded by its own race`, () => {
      const feed = trustees.boards.find((b) => b.board_id === board)!;
      render(<LiveMapView data={MAP} payload={NIGHT} wards={WARDS} ward={null} contests={[board]} />);
      const shapes = screen.getAllByRole("button", { name: /^Ward \d+ / });
      expect(shapes).toHaveLength(feed.map!.features.length);
      expect(shapes).not.toHaveLength(25);
      const first = feed.wards[0];
      fireEvent.click(screen.getByRole("button", { name: new RegExp(`^Ward ${first.ward_id} `) }));
      const panel = screen.getByRole("complementary", { name: `Ward ${first.ward_id} details` });
      const district = first.district_name.replace(/^Ward \d+\s*[—–-]\s*/, "");
      expect(panel.textContent).toContain(`Ward ${first.ward_id} ${district}`);
      expect(within(panel).getByRole("link", { name: /in full/ }).getAttribute("href")).toMatch(new RegExp(`^/${board}/${first.ward_id}/?$`));
    });
  }
});

describe("LiveMapView: the French boards (Alex, 2026-10-21)", () => {
  it("draws Viamonde's areas, then MonAvenir's on asking, without touching the page's URL", () => {
    live.query = "race=french";
    const replace = vi.spyOn(window.history, "replaceState");
    render(<LiveMapView data={MAP} payload={NIGHT} wards={WARDS} ward={null} contests={["viamonde", "monavenir"]} />);
    const count = (board: string) => trustees.boards.find((b) => b.board_id === board)!.map!.features.length;
    expect(screen.getAllByRole("button", { name: /^Ward \d+ / })).toHaveLength(count("viamonde"));
    fireEvent.click(screen.getByRole("button", { name: "MonAvenir" }));
    expect(screen.getAllByRole("button", { name: /^Ward \d+ / })).toHaveLength(count("monavenir"));
    const first = trustees.boards.find((b) => b.board_id === "monavenir")!.wards[0];
    fireEvent.click(screen.getByRole("button", { name: new RegExp(`^Ward ${first.ward_id} `) }));
    for (const [, , url] of replace.mock.calls) expect(String(url)).toContain("race=french");
    replace.mockRestore();
  });
});

describe("LiveMapView on a race type's page", () => {
  it("shows that race type, with no choice of race, whatever the URL says", () => {
    live.query = "race=mayor&show=vs2023";
    render(<LiveMapView data={MAP} payload={NIGHT} wards={WARDS} ward={null} contests={["council"]} />);
    expect(screen.queryByRole("group", { name: "Race" })).toBeNull();
    expect(screen.getByRole("button", { name: "Incumbent" }).getAttribute("aria-pressed")).toBe("true");
  });
});

describe("clockTicks", () => {
  it("labels the start of the night when the first half hour is well after it", () => {
    const eight = new Date("2026-10-26T20:00:12-04:00").getTime();
    const half = new Date("2026-10-26T20:30:00-04:00").getTime();
    expect(clockTicks(eight, half + 60_000)).toEqual([eight, half]);
    // A start just before a tick is left to that tick, so the labels never collide.
    expect(clockTicks(half - 60_000, half + 60_000)).toEqual([half]);
  });
});
