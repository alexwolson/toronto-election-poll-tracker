// @vitest-environment jsdom

import { readFileSync } from "node:fs";
import path from "node:path";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import councilFixture from "../../../fixtures/council_race_cards.json";
import trusteeFixture from "../../../fixtures/trustee_race_cards.json";
import { serveHistory } from "@/lib/live-history";
import { switchesFrom } from "@/lib/live-serve";
import { resultsMapData } from "@/lib/results-map-data";
import { resultsWards } from "@/lib/results-wards";
import { wardBallotRaceIds } from "@/lib/ward-ballot";
import type { CouncilRaceCardsFeed, TrusteeRaceCardsFeed } from "@/types/feeds";
import type { LiveHistory, LivePayload } from "@/types/live";
import { LiveCountView } from "./live-count-view";
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

const live = vi.hoisted(() => ({ history: null as LiveHistory | null }));
vi.mock("./live-results-poller", () => ({ useLiveHistory: () => live.history }));
vi.mock("next/navigation", () => ({ usePathname: () => "/results/", useSearchParams: () => new URLSearchParams() }));

afterEach(cleanup);

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
    expect(within(panel).getByRole("link", { name: /Ward 7 results/ }).getAttribute("href")).toMatch(/^\/results\/7\/?\?view=map$/);
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
    expect(screen.getByText(/fills in as wards report, from 8 p\.m\./)).toBeTruthy();
    expect(screen.queryByRole("list", { name: "Map legend" })).toBeNull();
  });

  it("offers the same figures as a table", () => {
    render(<LiveMapView data={MAP} payload={NIGHT} wards={WARDS} ward={null} />);
    const table = screen.getByRole("table");
    expect(within(table).getAllByRole("row")).toHaveLength(26);
  });
});

describe("LiveCountView", () => {
  const AREAS = {};

  it("before results, says when the charts start", () => {
    live.history = HISTORY;
    render(<LiveCountView payload={BEFORE} wards={WARDS} ballot={[]} ward={null} areas={AREAS} />);
    expect(screen.getByText(/start once the City reports results/)).toBeTruthy();
  });

  it("while the history loads, says so", () => {
    live.history = null;
    render(<LiveCountView payload={NIGHT} wards={WARDS} ballot={[]} ward={null} areas={AREAS} />);
    expect(screen.getByRole("status").textContent).toMatch(/Loading the count/);
  });

  it("gives every chart a table, the mayor by ward and every race by how much is in", () => {
    live.history = HISTORY;
    render(<LiveCountView payload={NIGHT} wards={WARDS} ballot={[]} ward={null} areas={AREAS} />);
    expect(screen.getAllByText("Show as a table").length).toBeGreaterThanOrEqual(4);
    expect(screen.getByRole("heading", { name: "Mayor, ward by ward" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Every race, least counted first" })).toBeTruthy();
    // One row per point in the history.
    const pace = screen.getAllByRole("table")[0];
    expect(within(pace).getAllByRole("row")).toHaveLength(HISTORY.t.length + 1);
  });

  it("sorts the ward table by lead when asked", () => {
    live.history = HISTORY;
    render(<LiveCountView payload={NIGHT} wards={WARDS} ballot={[]} ward={null} areas={AREAS} />);
    const button = screen.getByRole("button", { name: /^Lead$/ });
    fireEvent.click(button);
    expect(button.closest("th")!.getAttribute("aria-sort")).toBe("descending");
  });

  it("on a ward page, charts that ward's races", () => {
    live.history = HISTORY;
    render(
      <LiveCountView payload={NIGHT} wards={WARDS} ballot={wardBallotRaceIds("4", trustees)} ward="4" areas={AREAS} />,
    );
    expect(screen.getByRole("heading", { name: "On the Ward 4 ballot" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: /^Councillor, Ward 4/ })).toBeTruthy();
  });
});
