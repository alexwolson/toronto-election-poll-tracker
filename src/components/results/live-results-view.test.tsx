import { readFileSync } from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import councilFixture from "../../../fixtures/council_race_cards.json";
import trusteeFixture from "../../../fixtures/trustee_race_cards.json";
import { resultsWards, type ResultsWard } from "@/lib/results-wards";
import { RESULTS_WARDS, wardBallotRaceIds } from "@/lib/ward-ballot";
import type { CouncilRaceCardsFeed, TrusteeRaceCardsFeed } from "@/types/feeds";
import type { LivePayload } from "@/types/live";
import { LiveResultsView } from "./live-results-view";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));

// Seam 7 (#17): the Ward Ballot pages rendered from the golden payloads.
function golden(name: string): LivePayload {
  return JSON.parse(
    readFileSync(path.resolve(__dirname, "../../../fixtures/live/payload", name), "utf8"),
  ) as LivePayload;
}

const council = councilFixture as unknown as CouncilRaceCardsFeed;
const trustees = trusteeFixture as unknown as TrusteeRaceCardsFeed;
const WARDS: ResultsWard[] = resultsWards(council);

const MINUTE = 60_000;

/** Render `/results/` (no ward) or `/results/<ward>/` as a reader whose newest
 *  heartbeat is `age` ms old. */
function render(
  payload: LivePayload,
  { ward = null as string | null, age = MINUTE, failures = 0 } = {},
) {
  const heartbeat = Math.max(payload.seq.all_office, payload.seq.ward_by_ward);
  return renderToStaticMarkup(
    <LiveResultsView
      state={{ results: { heartbeat, payload }, failures }}
      now={heartbeat + age}
      wards={WARDS}
      ward={WARDS.find((w) => w.num === ward) ?? null}
      ballot={ward === null ? [] : wardBallotRaceIds(ward, trustees)}
    />,
  );
}

function count(html: string, text: string): number {
  return html.split(text).length - 1;
}

function cardTitles(html: string): string[] {
  return [...html.matchAll(/<h3 id="live-race-[^"]*">([^<]*)<\/h3>/g)].map((m) => m[1]);
}

function tileHrefs(html: string): string[] {
  return [...html.matchAll(/<a class="race-index-card[^"]*" href="([^"]*)"/g)].map((m) => m[1]);
}

describe("LiveResultsView: /results/ before a ward is picked", () => {
  it("shows the picker, the citywide mayor card, then the 25 council tiles; no trustee races", () => {
    const payload = golden("before-results-2026.json");
    const html = render(payload);
    expect(html).toContain('<h1 id="results-heading">Election night results</h1>');
    expect(cardTitles(html)).toEqual(["Mayor"]);
    expect(html).not.toContain("in your ward");
    expect(html).not.toMatch(/TDSB|TCDSB|Viamonde|MonAvenir/);
    expect(tileHrefs(html)).toEqual(RESULTS_WARDS.map((n) => `/results/${n}`));
    expect(html).toContain("Council across the city");
    // Picker before the mayor card, the mayor card before the tiles.
    const picker = html.indexOf("Your ward");
    expect(picker).toBeGreaterThan(-1);
    expect(picker).toBeLessThan(html.indexOf("live-race-mayor"));
    expect(html.indexOf("live-race-mayor")).toBeLessThan(html.indexOf('href="/results/1"'));
    // Mayoral candidates in ballot order.
    const mayor = payload.races[0].candidates.map((c) => c.full_name);
    let at = html.indexOf("live-race-mayor");
    for (const name of mayor) {
      const found = html.indexOf(name, at);
      expect(found, name).toBeGreaterThan(at);
      at = found;
    }
  });

  it("lists every ward as 'Ward N Name' with no default, then the MyVote pointer", () => {
    const html = render(golden("before-results-2026.json"));
    const options = [...html.matchAll(/<option value="(\d+)"[^>]*>([^<]*)<\/option>/g)];
    expect(options.map((m) => m[2].replaceAll("&#x27;", "'"))).toEqual(WARDS.map((w) => `Ward ${w.num} ${w.name}`));
    expect(html).not.toMatch(/<option value="\d+"[^>]*selected/);
    expect(html).toContain('href="https://www.toronto.ca/city-government/elections/voter-information/myvote/"');
    expect(html.indexOf("Ward 25 Scarborough-Rouge Park")).toBeLessThan(html.indexOf("MyVote"));
  });
});

describe("LiveResultsView: a ward's page", () => {
  it("renders the ward's councillor, TDSB and TCDSB races, then the French boards", () => {
    const html = render(golden("before-results-2026.json"), { ward: "14" });
    expect(html).toContain('<h1 id="results-heading">Ward 14 Toronto-Danforth</h1>');
    expect(cardTitles(html)).toEqual([
      "Mayor",
      "Councillor, Ward 14 Toronto-Danforth",
      "TDSB Ward 5",
      "TCDSB Ward 11",
      "Viamonde Ward 3",
      "MonAvenir Ward 4",
    ]);
    expect(html).toContain("Maqsood Ahmad");
    expect(html).toContain("Elina Feyginberg");
    expect(html).toContain("Angela Kennedy");
    // Another ward's councillor race is a tile, not a card.
    expect(html).not.toContain("Abraham Abbey");
    expect(tileHrefs(html)).toHaveLength(25);
  });

  it("while counting, shows each race's tally, Reporting Progress and the City count time", () => {
    const html = render(golden("council-counting-2022.json"), { ward: "1" });
    // The older of the two seqs (both 9:46 p.m. here).
    expect(html).toContain("City count as of 9:46 p.m.");
    expect(html).toContain("51 of 55 voting areas in");
    expect(html).toMatch(/class="live-progress__fill" style="width:92\.7\d*%"/);
    expect(html).toContain("Vincent Crisanti");
    expect(html).toContain("6,800");
    expect(html).toContain("41.2%");
    expect(html).toContain("No voting areas have reported yet");
    expect(html).toContain('<table class="ward-poll-results">');
    expect(html).toContain("Geneviève Oger was acclaimed: the only candidate, so there is no vote.");
    expect(html).not.toContain("Results from 8 p.m.");
    expect(html).not.toContain("Rehearsal: not real results");
    expect(html).not.toContain("may be out of date");
  });

  it("takes the City count time from the older seq", () => {
    // all_office 8:56 p.m., ward_by_ward 8:26 p.m.
    expect(render(golden("mayor-counting-2023.json"))).toContain("City count as of 8:26 p.m.");
  });

  it("shows fully reported and unreadable races in their own words", () => {
    expect(render(golden("all-units-in-2018.json"), { ward: "1" })).toContain("All voting areas in");
    expect(render(golden("no-figures-2026.json"), { ward: "14" })).toContain(
      "No figures from the City for this race right now",
    );
  });

  it("says Reporting Progress is not available when a counting race has none", () => {
    const payload = golden("council-counting-2022.json");
    payload.races.find((r) => r.id === "councillor-1")!.progress = null;
    const html = render(payload, { ward: "1" });
    expect(html).toContain("Voting areas: not available");
    expect(html).toContain("Vincent Crisanti");
  });
});

describe("LiveResultsView: the council tiles", () => {
  it("label each ward and its race's state, and link to the ward's page", () => {
    const html = render(golden("council-counting-2022.json"));
    expect(html).toMatch(/href="\/results\/1"><h3[^>]*>Ward 1 · <span>Etobicoke North<\/span><\/h3><p[^>]*>51 of 55 voting areas in<\/p>/);
    const before = render(golden("before-results-2026.json"));
    expect(count(before, "Results from 8 p.m.")).toBe(26);
  });
});

describe("LiveResultsView: page status", () => {
  it("shows the staleness banner only when the newest heartbeat is over 5 minutes old", () => {
    const payload = golden("council-counting-2022.json");
    expect(render(payload, { ward: "1", age: 5 * MINUTE })).not.toContain("may be out of date");
    const stale = render(payload, { ward: "1", age: 5 * MINUTE + 1 });
    expect(stale).toContain(
      "We haven&#x27;t been able to read the City&#x27;s results since 9:46 p.m. The count below may be out of date.",
    );
    expect(stale).toMatch(/<p class="callout" role="status">We haven/);
    // The count stays on the page.
    expect(stale).toContain("51 of 55 voting areas in");
  });

  it("shows the rehearsal bar only on a rehearsal payload", () => {
    const payload = golden("council-counting-2022.json");
    expect(render(payload)).not.toContain("Rehearsal: not real results");
    const rehearsal = { ...payload, election_desc: "2026 Municipal Election REHEARSAL", rehearsal: true };
    expect(render(rehearsal)).toContain('<span class="badge badge--soon">Rehearsal: not real results</span>');
  });

  it("after three failed polls, says so and keeps the last count", () => {
    const payload = golden("council-counting-2022.json");
    expect(render(payload, { ward: "1", failures: 2 })).not.toContain("Can&#x27;t reach live results");
    const html = render(payload, { ward: "1", failures: 3 });
    expect(html).toContain('<p class="callout" role="status">Can&#x27;t reach live results; retrying</p>');
    expect(html).toContain("51 of 55 voting areas in");
  });

  it("before the first good poll, shows the picker and a loading line, then the notice after three failures", () => {
    const view = (failures: number) =>
      renderToStaticMarkup(
        <LiveResultsView state={{ results: null, failures }} now={0} wards={WARDS} ward={null} ballot={[]} />,
      );
    expect(view(0)).toContain("Loading live results");
    expect(view(0)).toContain("Your ward");
    expect(view(3)).toContain("Can&#x27;t reach live results; retrying");
  });
});
