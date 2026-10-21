import { readFileSync } from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import councilFixture from "../../../fixtures/council_race_cards.json";
import trusteeFixture from "../../../fixtures/trustee_race_cards.json";
import { resultsMapData } from "@/lib/results-map-data";
import { resultsWards, type ResultsWard } from "@/lib/results-wards";
import { RESULTS_WARDS, wardBallotRaceIds } from "@/lib/ward-ballot";
import type { CouncilRaceCardsFeed, TrusteeRaceCardsFeed } from "@/types/feeds";
import type { LivePayload } from "@/types/live";
import { serveLive, SWITCHES, switchesFrom, type SwitchName } from "@/lib/live-serve";
import { CHOW_2023 } from "@/lib/chow-2023";
import { TURNOUT } from "@/lib/turnout";
import { LiveResultsView } from "./live-results-view";

const navigation = vi.hoisted(() => ({ view: null as string | null }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/results/",
  useSearchParams: () => new URLSearchParams(navigation.view ? { view: navigation.view } : {}),
}));

// Seam 7 (#17): the Ward Ballot pages rendered from the golden payloads.
function golden(name: string): LivePayload {
  return JSON.parse(
    readFileSync(path.resolve(__dirname, "../../../fixtures/live/payload", name), "utf8"),
  ) as LivePayload;
}

const council = councilFixture as unknown as CouncilRaceCardsFeed;
const trustees = trusteeFixture as unknown as TrusteeRaceCardsFeed;
const WARDS: ResultsWard[] = resultsWards(council);
const MAP = resultsMapData(council, trustees);

const MINUTE = 60_000;

/** Render `/results/` (no ward) or `/results/<ward>/` as a reader whose newest
 *  heartbeat is `age` ms old. */
function render(
  payload: LivePayload,
  {
    ward = null as string | null,
    age = MINUTE,
    failures = 0,
    forecast = true,
    paused = false,
    closed = false,
  } = {},
) {
  const heartbeat = Math.max(payload.seq.all_office, payload.seq.ward_by_ward);
  return renderToStaticMarkup(
    <LiveResultsView
      state={{ results: { heartbeat, paused, closed, payload }, failures }}
      now={heartbeat + age}
      wards={WARDS}
      ward={WARDS.find((w) => w.num === ward) ?? null}
      ballot={ward === null ? [] : wardBallotRaceIds(ward, trustees)}
      forecast={forecast}
      mapData={MAP}
    />,
  );
}

/** The markup's text, tags dropped. */
function text(html: string): string {
  return html.replace(/<[^>]*>/g, "");
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
    expect(html).toContain('<h1 id="results-heading" class="visually-hidden">Election night results</h1>');
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
    // The mayor folds before results as while counting: the forecast's two, then the rest (#115).
    expect(tallyNames(card(html, "mayor"))).toEqual(["Brad Bradford", "Olivia Chow", "51 other candidates"]);
  });

  it("lists every ward as 'Ward N Name' with no default, then the MyVote pointer", () => {
    const html = render(golden("before-results-2026.json"));
    const options = [...html.matchAll(/<option value="(\d+)"[^>]*>([^<]*)<\/option>/g)];
    expect(options.map((m) => m[2].replaceAll("&#x27;", "'"))).toEqual(WARDS.map((w) => `Ward ${w.num} ${w.name}`));
    expect(html).not.toMatch(/<option value="\d+"[^>]*selected/);
    expect(html).toContain('href="https://www.toronto.ca/city-government/elections/voter-information/myvote/"');
    expect(html.indexOf("Ward 25 Scarborough-Rouge Park")).toBeLessThan(html.indexOf("MyVote"));
    expect(text(html)).toContain("Don&#x27;t know your ward? Look it up on MyVote ↗");
  });
});

describe("LiveResultsView: a ward's page", () => {
  it("renders the ward's councillor, TDSB and TCDSB races, then the French boards", () => {
    const html = render(golden("before-results-2026.json"), { ward: "14" });
    expect(html).toContain('<h1 id="results-heading" class="visually-hidden">Ward 14 Toronto-Danforth</h1>');
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
    expect(html).toContain("0 of 1,535 voting areas in");
    expect(html).toContain('class="forecast-chart live-tally"');
    expect(text(html)).toContain("Geneviève Oger");
    expect(text(html)).toContain("The only candidate, so there is no vote.");
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
    expect(html).toMatch(/href="\/results\/1"><h3[^>]*>Ward 1 · <span>Etobicoke North<\/span><\/h3>/);
    const before = render(golden("before-results-2026.json"));
    // The page says it once (#115); no tile repeats it.
    expect(count(before, "Results from 8 p.m.")).toBe(1);
    expect(tile(before, "1")).not.toContain("Results from 8 p.m.");
  });

  it("at 0%, carry an empty progress line and no status of their own (#115)", () => {
    const html = tile(render(golden("no-units-in-2026.json")), "14");
    expect(html).toContain("0 of 48 voting areas in");
    expect(html).not.toContain("No voting areas have reported yet");
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

  it("before the first good poll, shows the picker, a loading line and the tiles, then the notice after three failures", () => {
    const view = (failures: number) =>
      renderToStaticMarkup(
        <LiveResultsView
          state={{ results: null, failures }}
          now={0}
          wards={WARDS}
          ward={null}
          ballot={[]}
          forecast
          mapData={MAP}
        />,
      );
    expect(view(0)).toContain("Loading live results");
    expect(view(0)).toContain("Your ward");
    // The tiles come from the static ward list, not the payload.
    expect(tileHrefs(view(0))).toEqual(RESULTS_WARDS.map((n) => `/results/${n}`));
    expect(tileHrefs(view(3))).toHaveLength(25);
    expect(view(3)).toContain("Can&#x27;t reach live results; retrying");
  });
});

/** The mayor's notes at the very bottom of the page (Alex): the 2023 benchmark and the disclosures. */
function notes(html: string): string {
  const start = html.indexOf('class="mayor-notes"');
  expect(start, "mayor notes").toBeGreaterThan(-1);
  return html.slice(start);
}

/** The HTML of one race's card, from its heading to the next card. */
function card(html: string, raceId: string): string {
  const start = html.indexOf(`id="live-race-${raceId}"`);
  expect(start, raceId).toBeGreaterThan(-1);
  const next = html.indexOf('id="live-race-', start + 1);
  const tiles = html.indexOf("results-council-heading", start);
  const end = [next, tiles].filter((i) => i > -1).reduce((a, b) => Math.min(a, b), html.length);
  return html.slice(start, end);
}

/** One ward's council tile: from its link to the link's end. */
function tile(html: string, ward: string): string {
  const start = html.indexOf(`href="/results/${ward}"`);
  return html.slice(start, html.indexOf("</a>", start));
}

/** Names in a tally, in row order. */
function tallyNames(cardHtml: string): string[] {
  return [...cardHtml.matchAll(/<span class="live-tally__name">([^<]*)<\/span>/g)].map((m) =>
    m[1].replaceAll("&#x27;", "'"),
  );
}

/** The 2026 golden as if counting had started: each race's `leaders` (in order)
 *  take the most votes, the rest fewer, and every ward's mayoral vote follows. */
function counting2026(leaders: Record<string, string[]>): LivePayload {
  const payload = golden("before-results-2026.json");
  payload.state = "results";
  for (const race of payload.races) {
    const ahead = leaders[race.id] ?? [];
    const order = [
      ...ahead.map((name) => race.candidates.find((c) => c.full_name === name)!),
      ...race.candidates.filter((c) => !ahead.includes(c.full_name)),
    ];
    const votes = order.map((_, i) => (order.length - i) * 100);
    const total = votes.reduce((a, b) => a + b, 0);
    race.candidates = order.map((c, i) => ({ ...c, votes: votes[i], share: Math.round((votes[i] / total) * 10000) / 100 }));
    race.state = "counting";
    race.progress = { received: 1, total: 10 };
    for (const w of race.wards ?? []) {
      w.progress = { received: 2, total: 40 };
      w.votes_counted = total;
      w.votes = Object.fromEntries(race.candidates.map((c) => [c.key, c.votes!]));
    }
  }
  return payload;
}

describe("LiveResultsView: the tally", () => {
  it("shows a council race as a result: votes first, the share beside them, a field of 16 folded (Alex)", () => {
    const html = card(render(golden("council-counting-2022.json"), { ward: "1" }), "councillor-1");
    expect(html).toMatch(/<span class="live-tally__name">Vincent Crisanti<\/span>/);
    // The bars end at the most anyone can still reach (86.23%, to 87%): Crisanti's 41.2% fills 47.4%.
    expect(html).toMatch(/class="forecast-chart__bar" style="width:47\.3\d*%;background:var\(--color-disengaged\)"/);
    expect(text(html)).toMatch(/6,800\s*41\.2% of counted votes/);
    // More than five candidates fold to the top two and the rest.
    expect(tallyNames(html)).toEqual(["Vincent Crisanti", "Avtar Minhas", "14 other candidates"]);
  });

  it("shows the tally once every voting area is in", () => {
    const html = card(render(golden("all-units-in-2018.json"), { ward: "1" }), "councillor-1");
    expect(text(html)).toContain("Voting areas inAll in");
    expect(html).toContain("forecast-chart live-tally");
  });

  it("before 8 p.m. and before the first voting area, shows the counting layout, empty (#115)", () => {
    const beforePayload = golden("before-results-2026.json");
    const before = render(beforePayload, { ward: "14" });
    const none = render(golden("no-units-in-2026.json"), { ward: "14" });
    const names = beforePayload.races.find((r) => r.id === "councillor-14")!.candidates.map((c) => c.full_name);
    for (const html of [before, none]) {
      const council = card(html, "councillor-14");
      // Every candidate as a tally row, in ballot order; never a run of names.
      expect(tallyNames(council)).toEqual(names);
      expect(council).not.toContain(" · Nadia");
      expect(council).not.toContain("Results from 8 p.m.");
      expect(council).not.toContain("No voting areas have reported yet");
      // No bars and no ranges yet.
      expect(council).not.toContain("live-tally__key");
      expect(council).not.toContain("live-tally__estimate");
    }
    expect(card(none, "councillor-14")).toContain("0 of 48 voting areas in");
    expect(card(before, "councillor-14")).not.toContain("voting areas in");
  });

  it("says the page's state once, in the status line (#115)", () => {
    const before = render(golden("before-results-2026.json"), { ward: "14" });
    expect(count(before, "Results from 8 p.m.")).toBe(1);
    expect(text(before)).toContain("Results from 8 p.m. · City of Toronto unofficial results");
    const none = render(golden("no-units-in-2026.json"), { ward: "14" });
    expect(count(none, "No voting areas have reported yet")).toBe(1);
    expect(text(none)).toMatch(/City count as of \d{1,2}:\d{2} [ap]\.m\. · No voting areas have reported yet · City of Toronto unofficial results/);
    // Once a voting area is in, the line no longer says none are.
    expect(render(golden("council-counting-2022.json"), { ward: "1" })).not.toContain("No voting areas have reported yet");
  });
});

describe("LiveResultsView: the mayor card", () => {
  it("folds the counted field to the top two and 'N other candidates', with a button to show everyone", () => {
    const payload = golden("mayor-counting-2023.json");
    const mayor = payload.races[0];
    const html = card(render(payload), "mayor");
    const n = mayor.candidates.length;
    expect(tallyNames(html)).toEqual([...mayor.candidates.slice(0, 2).map((c) => c.full_name), `${n - 2} other candidates`]);
    expect(html).not.toContain(mayor.candidates[2].full_name);
    const rest = mayor.candidates.slice(2);
    const restVotes = rest.reduce((sum, c) => sum + c.votes!, 0);
    // The folded row leads with its votes, like the leaders (Alex).
    expect(html).toMatch(new RegExp(`live-tally__value"[^>]*>${restVotes.toLocaleString("en-CA")}<`));
    // The folded row's name is the toggle, with a down arrow (Alex): no separate button.
    expect(html).toMatch(
      new RegExp(`<button type="button" class="live-tally__expand" aria-expanded="false"[^>]*><span class="live-tally__name">${n - 2} other candidates</span><span class="live-tally__chevron" aria-hidden="true">`),
    );
    expect(html).not.toContain("live-tally__more");
  });

  it("orders the card: the tally, its key, the toggle, turnout, the 2023 benchmark, then the disclosures (audit)", () => {
    const payload = counting2026({ mayor: ["Brad Bradford", "Olivia Chow"] });
    const mayor = payload.races.find((r) => r.id === "mayor")!;
    mayor.possible = Object.fromEntries(mayor.candidates.map((c) => [c.key, { low: 1, high: 90 }]));
    const page = render(payload, { ward: "9" });
    const html = card(page, "mayor");
    expect(html.indexOf("live-tally__name")).toBeLessThan(html.indexOf('class="live-turnout"'));
    // The benchmark and the disclosures are the page's very last part, after every view (Alex).
    expect(page.indexOf('class="mayor-notes"')).toBeGreaterThan(page.indexOf("results-council-heading"));
    const tail = notes(page);
    const at = (needle: string) => {
      const i = tail.indexOf(needle);
      expect(i, needle).toBeGreaterThan(-1);
      return i;
    };
    const order = [at("in the wards counted so far"), at(">About this comparison<"), at("The final pre-election forecast")];
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(html).not.toContain("What’s this?");
    // The ward's mayoral vote is in the bars now (#125), not a section of its own.
    expect(html).not.toContain("Mayoral vote in Ward");
  });

  it("groups the accuracy record with the pre-election forecast at the bottom (#118)", () => {
    const html = notes(render(golden("gated-live-2022.json"), { ward: "1" }));
    const record = html.indexOf("How accurate is this estimate?");
    expect(record).toBeGreaterThan(-1);
    expect(record).toBeLessThan(html.indexOf("The final pre-election forecast"));
    const group = html.slice(html.indexOf('class="live-card-more"'));
    expect(group).toContain("How accurate is this estimate?");
    expect(group).toContain("The final pre-election forecast");
  });

  it("shows a field of three whole, and folds four to two and '2 other candidates'", () => {
    const three = golden("mayor-counting-2023.json");
    three.races[0].candidates = three.races[0].candidates.slice(0, 3);
    expect(tallyNames(card(render(three), "mayor"))).toHaveLength(3);
    expect(card(render(three), "mayor")).not.toContain("live-tally__expand");
    // Every candidate up to five (Alex); six fold to the top two and "4 other candidates".
    const five = golden("mayor-counting-2023.json");
    five.races[0].candidates = five.races[0].candidates.slice(0, 5);
    expect(tallyNames(card(render(five), "mayor"))).toHaveLength(5);
    const six = golden("mayor-counting-2023.json");
    six.races[0].candidates = six.races[0].candidates.slice(0, 6);
    expect(tallyNames(card(render(six), "mayor")).at(-1)).toBe("4 other candidates");
  });

  it("folds before results too, to the forecast's two, with a button to show everyone (#115)", () => {
    const html = card(render(golden("before-results-2026.json")), "mayor");
    expect(tallyNames(html)).toEqual(["Brad Bradford", "Olivia Chow", "51 other candidates"]);
    expect(html).toMatch(/class="live-tally__expand"[^>]*><span class="live-tally__name">51 other candidates</);
    // Empty rows: a dash for the share, no votes line.
    expect(html).toContain('<strong class="forecast-chart__value live-tally__value">–</strong>');
    expect(html).not.toContain("votes</span>");
  });

  it("on a ward's page, gives each mayoral row a second bar for the ward, and both progress lines (#125)", () => {
    const payload = golden("mayor-counting-2023.json");
    const html = card(render(payload, { ward: "1" }), "mayor");
    expect(html).not.toContain("Mayoral vote in Ward");
    // Both counts, labelled: the city's, then the ward's.
    expect(text(html)).toMatch(/Voting areas in1,221 of 1,451[^]*Ward 1: 49 of 52/);
    // Every row, the folded one included, has its ward bar; Ward 1's top candidate by its 16,744 counted.
    const rows = html.split('class="forecast-chart__row').slice(1);
    expect(rows.length).toBe(3);
    for (const r of rows) expect(r).toContain("live-tally__wtrack");
    expect(text(html)).toContain("Ward 1 · 5,493 votes");
    expect(html).toMatch(/live-tally__wvalue">32\.8%</);
    // /results/ keeps one bar per candidate.
    expect(card(render(payload), "mayor")).not.toContain("live-tally__wtrack");
  });

  it("keeps the final forecast collapsed: a link to it, labelled as neither the count nor the projection", () => {
    for (const name of ["before-results-2026.json", "mayor-counting-2023.json"]) {
      // Before results the mayor's card has it; once the count starts, the page's notes do.
      const html = name.startsWith("before") ? card(render(golden(name)), "mayor") : notes(render(golden(name)));
      expect(html).toMatch(/<div class="faq"><details class="live-forecast"><summary>The final pre-election forecast<\/summary>/);
      expect(html).toContain("It is not the count and not the projection.");
      expect(html).toMatch(/<a href="\/">home page<\/a>/);
      // #17's "Not shown anywhere": the forecast's named margin outcomes (#54).
      expect(html).not.toMatch(/ahead by 2 or more|Within 2 points/);
    }
  });

  it("hides the final forecast once the count is complete, or when there is none", () => {
    expect(render(golden("all-units-in-2018.json"))).not.toContain("The final pre-election forecast");
    expect(render(golden("mayor-counting-2023.json"), { forecast: false })).not.toContain(
      "The final pre-election forecast",
    );
  });
});

describe("LiveResultsView: the French-language boards", () => {
  it("show openly after TDSB and TCDSB, under one label and note (#116)", () => {
    for (const name of ["before-results-2026.json", "no-units-in-2026.json"]) {
      const html = render(golden(name), { ward: "14" });
      expect(html, name).not.toContain("live-french");
      expect(html, name).not.toContain("Voting for a French-language board?");
      const label = html.indexOf(">French-language school boards<");
      expect(label, name).toBeGreaterThan(html.indexOf('id="live-race-tcdsb-'));
      expect(html.indexOf('id="live-race-viamonde-'), name).toBeGreaterThan(label);
      expect(html.indexOf('id="live-race-monavenir-'), name).toBeGreaterThan(html.indexOf('id="live-race-viamonde-'));
      expect(count(html, "French-language school boards"), name).toBe(1);
      expect(count(html, "Count and possible range only: no estimate for these boards."), name).toBe(1);
      // No board card sits inside a disclosure.
      expect(html.slice(html.indexOf('id="live-race-viamonde-') - 400, html.indexOf('id="live-race-viamonde-')), name).not.toContain("<details");
    }
  });

  it("are not on /results/", () => {
    expect(render(golden("before-results-2026.json"))).not.toContain("French-language board");
  });
});

describe("LiveResultsView: council tiles while counting", () => {
  it("show the leader, Reporting Progress and an empty slot for the ranges", () => {
    const html = tile(render(golden("council-counting-2022.json")), "1");
    expect(html).toContain("Ward 1 · <span>Etobicoke North</span>");
    expect(html).toContain("Vincent Crisanti 41.2%");
    expect(html).toContain("51 of 55 voting areas in");
    // A stub projection draws no range, so the tile's range line stays empty.
    expect(html).toContain('<p class="t-body-small live-tile__ranges" data-ranges=""></p>');
  });

  it("show the ward alone before results", () => {
    const html = tile(render(golden("before-results-2026.json")), "1");
    expect(html).not.toContain("Results from 8 p.m.");
    expect(html).not.toContain("data-ranges");
  });
});

describe("LiveResultsView: names and colours (#16)", () => {
  it("label leaders by the registry last name, or the full Ballot Name", () => {
    const html = render(
      counting2026({
        "councillor-17": ["Hassan Mubarak Noor Mohamed"],
        "councillor-21": ["Nisha Kumari"],
        "councillor-25": ["Kannan S'ree Jr"],
      }),
    );
    expect(tile(html, "17")).toMatch(/Noor Mohamed \d/);
    expect(tile(html, "17")).not.toContain("Hassan");
    expect(tile(html, "21")).toMatch(/Nisha Kumari \d/);
    expect(tile(html, "25")).toMatch(/S&#x27;ree Jr \d/);
  });

  it("show full Ballot Names in the tally, and Di Francesco whole", () => {
    const payload = counting2026({ "tcdsb-1": ["Jennifer Di Francesco"] });
    const tcdsb1 = payload.races.find((r) => r.id === "tcdsb-1")!;
    const ward = WARDS.find((w) => wardBallotRaceIds(w.num, trustees).includes("tcdsb-1"))!;
    const html = card(render(payload, { ward: ward.num }), "tcdsb-1");
    expect(tallyNames(html)[0]).toBe("Jennifer Di Francesco");
    expect(tallyNames(html)).toHaveLength(tcdsb1.candidates.length);
  });

  it("label the two Chows by full name, and colour only the forecast-named candidates", () => {
    // The two Chows on top: each by full name, in the tally and the ward line.
    const chows = card(render(counting2026({ mayor: ["Braeden Chow", "Olivia Chow"] }), { ward: "1" }), "mayor");
    expect(tallyNames(chows).slice(0, 2)).toEqual(["Braeden Chow", "Olivia Chow"]);
    const row = (html: string, name: string) => {
      const at = html.indexOf(`<span class="live-tally__name">${name}</span>`);
      return html.slice(html.lastIndexOf('<div class="forecast-chart__row', at), html.indexOf("</strong>", at));
    };
    expect(row(chows, "Olivia Chow")).toContain("candidate-marker--chow");
    expect(row(chows, "Olivia Chow")).toContain("background:var(--color-chow)");
    expect(row(chows, "Braeden Chow")).not.toContain("candidate-marker");
    expect(row(chows, "Braeden Chow")).toContain("background:var(--color-disengaged)");
    // Bradford's colour and marker, in the tally and the ward line.
    const bradford = card(render(counting2026({ mayor: ["Brad Bradford", "Olivia Chow"] }), { ward: "1" }), "mayor");
    expect(row(bradford, "Brad Bradford")).toContain("background:var(--color-bradford)");
  });
});

describe("LiveResultsView: never shown (#7, #12)", () => {
  it("never shows a share as '0.0%': '<0.1%' with votes, '0%' with none", () => {
    for (const name of ["council-counting-2022.json", "mayor-counting-2023.json", "all-units-in-2018.json", "gated-live-2022.json"]) {
      const html = text(render(golden(name), { ward: "1" }));
      expect(html, name).not.toMatch(/(?<![\d.])0\.0%/);
    }
    const payload = golden("council-counting-2022.json");
    const race = payload.races.find((r) => r.id === "councillor-1")!;
    // Five candidates, so every one shows (Alex).
    race.candidates = race.candidates.slice(0, 5);
    const last = race.candidates.at(-1)!;
    last.votes = 1;
    last.share = 0;
    const html = card(render(payload, { ward: "1" }), "councillor-1");
    const lastRow = text(html).slice(text(html).indexOf(last.full_name));
    expect(lastRow).toMatch(/^[^·]*1&lt;0\.1% of counted votes/);
  });

  it("has no chance-to-win wording in any reader state", () => {
    for (const name of [
      "before-results-2026.json",
      "no-units-in-2026.json",
      "no-figures-2026.json",
      "council-counting-2022.json",
      "mayor-counting-2023.json",
      "all-units-in-2018.json",
    ]) {
      const html = render(golden(name), { ward: "1" });
      expect(html, name).not.toMatch(/chance|favou?red|odds|likely to win/i);
    }
  });
});

describe("LiveResultsView: gated projections and the Possible Range (#45, ADR 0002)", () => {
  /** A tally row's markup, from its name to its value. */
  function row(cardHtml: string, name: string): string {
    const at = cardHtml.indexOf(`<span class="live-tally__name">${name}</span>`);
    expect(at, name).toBeGreaterThan(-1);
    return cardHtml.slice(cardHtml.lastIndexOf('<div class="forecast-chart__row', at), cardHtml.indexOf("</strong>", at));
  }

  it("draws each candidate's Estimated and Possible Ranges over their counted-share bar", () => {
    const mayor = card(render(golden("gated-live-2022.json"), { ward: "1" }), "mayor");
    // The mayor's rows are the count alone (Alex): the Estimated Range is the panel beside them.
    expect(text(mayor)).toContain("Possible 9–94%");
    const tory = row(mayor, "Tory John");
    // The bars end at the most anyone can still reach (Tory's 94.34%, rounded up to 95%), in place
    // of out-of-reach zones (Alex): Tory's 62.42% fills 65.7% of the track.
    expect(tory).not.toContain("live-tally__reach");
    expect(tory).toMatch(/class="forecast-chart__bar" style="width:65\.7\d*%/);
    expect(tory).not.toContain("live-tally__possible");
    expect(tory).not.toContain("live-tally__estimate");
    // Council races are results too: their projection is the panel, not brackets (Alex).
    const council = card(render(golden("gated-live-2022.json"), { ward: "1" }), "councillor-1");
    expect(council).not.toContain("live-tally__estimate");
    expect(council).toContain('class="mayor-projection"');
    // The folded row stands for many candidates and carries no range.
    const others = `${golden("gated-live-2022.json").races[0].candidates.length - 2} other candidates`;
    expect(row(mayor, others)).not.toContain("live-tally__reach");
    expect(row(mayor, others)).not.toContain("live-tally__estimate");
    // No key: "Counted" alone says nothing the bar doesn't (no 2023 mark in 2022).
    expect(count(mayor, 'class="live-tally__key')).toBe(0);
    expect(text(mayor)).not.toContain("Out of reach");
    expect(mayor).not.toContain("live-tally__glyph--reach");
    expect(text(mayor)).not.toContain("Possible range");
    expect(text(mayor)).not.toMatch(/certain win/i);
  });

  it("explains both ranges once per card, and the mayor's 2023 record behind 'How accurate is this estimate?'", () => {
    const html = render(golden("gated-live-2022.json"), { ward: "1" });
    const mayor = text(card(html, "mayor"));
    // The projection panel names its band (Alex); the cards' key keeps the longer wording.
    expect(mayor).toContain("90% confidence interval");
    expect(count(mayor, "9 in 10")).toBe(0);
    expect(notes(html)).toMatch(
      /<details class="live-record"><summary>How accurate is this estimate\?<\/summary>[^]*worse than expected in the 2023 by-election/,
    );
    expect(text(card(html, "councillor-1"))).not.toContain("2023 by-election");
    expect(count(text(card(html, "councillor-1")), "90% confidence interval")).toBe(1);
  });

  it("shows only the Possible Range, and no 2023 record, below the approved mayor's ESS floor", () => {
    const html = card(render(golden("gated-low-ess-2022.json"), { ward: "1" }), "mayor");
    expect(text(html)).toContain("Possible 9–94%");
    expect(text(html)).not.toContain("Estimated final");
    expect(text(html)).not.toContain("Estimated: where");
    expect(row(html, "Tory John")).not.toContain("live-tally__estimate");
    // The record is about the estimate: with none on screen it has nothing to describe (#54).
    expect(text(html)).not.toContain("How accurate is this estimate?");
    expect(text(html)).not.toContain("2023 by-election");
  });

  /** A tally row's whole markup, to the next row or the chart's end. */
  function wholeRow(cardHtml: string, name: string): string {
    const at = cardHtml.indexOf(`<span class="live-tally__name">${name}</span>`);
    const start = cardHtml.lastIndexOf('<div class="forecast-chart__row', at);
    const next = cardHtml.indexOf('<div class="forecast-chart__row', at);
    return cardHtml.slice(start, next === -1 ? undefined : next);
  }

  /** A row's line of figures. */
  function meta(rowHtml: string): string {
    const start = rowHtml.indexOf('<span class="live-tally__meta">');
    return rowHtml.slice(start, rowHtml.indexOf("</span></div>", start));
  }

  /** Ward 1's race with ranges that eliminate its third candidate, and the rest still in it. */
  function thirdOut(): { payload: LivePayload; third: string } {
    const payload = golden("gated-live-2022.json");
    const race = payload.races.find((r) => r.id === "councillor-1")!;
    // Five candidates, so every one shows unfolded (Alex: a result folds above five).
    race.candidates = race.candidates.slice(0, 5);
    const [leader, second, third] = race.candidates;
    race.possible = {
      ...race.possible,
      [leader.key]: { low: 40, high: 60 },
      [second.key]: { low: 25, high: 45 },
      [third.key]: { low: 5, high: 25 },
    };
    for (const other of race.candidates.slice(3)) race.possible[other.key] = { low: 1, high: 39.99 };
    return { payload, third: third.full_name };
  }

  it("puts the candidates who cannot win under one 'Mathematically eliminated' break (#90, #105)", () => {
    const { payload, third } = thirdOut();
    const html = card(render(payload, { ward: "1" }), "councillor-1");
    expect(count(html, "Mathematically eliminated")).toBe(1);
    expect(text(html)).toContain("Mathematically eliminated · can’t win even with every vote still out");
    expect(html).not.toContain("badge--status");
    // Contenders first, then the break, then the eliminated, greyed.
    const names = tallyNames(html);
    expect(names.at(-1)).toBe(third);
    expect(html.indexOf("live-tally__break")).toBeLessThan(html.indexOf(`<span class="live-tally__name">${third}</span>`));
    expect(html.indexOf("live-tally__break")).toBeGreaterThan(html.indexOf(`<span class="live-tally__name">${names.at(-2)}</span>`));
    expect(row(html, third)).toContain("forecast-chart__row--out");
    // Quiet rows (#105): votes first, the share of the count beside them.
    expect(text(meta(wholeRow(html, third)))).toMatch(/^(&lt;)?[\d.]+% of counted votes$/);
    // The wide ranges of the golden's mayor eliminate no one.
    expect(render(golden("gated-live-2022.json"), { ward: "1" })).not.toContain("Mathematically eliminated");
  });

  it("shows no Certain win anywhere: no line, key, caption or legend (#119)", () => {
    const { payload, third } = thirdOut();
    const race = payload.races.find((r) => r.id === "councillor-1")!;
    const [leader] = race.candidates;
    const html = card(render(payload, { ward: "1" }), "councillor-1");
    expect(html).not.toContain("live-tally__win");
    expect(html).not.toContain("glyph--win");
    expect(text(html)).not.toMatch(/certain win/i);
    expect(text(meta(wholeRow(html, leader.full_name)))).toMatch(/^[\d.]+% of counted votes$/);
    // The Possible Range's figures are for screen readers; the estimate is the panel beside.
    expect(wholeRow(html, leader.full_name)).toMatch(/<span class="visually-hidden">Possible 40–60%<\/span>/);
    // The Mathematically Eliminated badge stays.
    expect(row(html, third)).toBeTruthy();
    expect(html).toContain("live-tally__break");
  });

  it("folds the mayor's eliminated field under the break, and leaves a field still in it above", () => {
    const payload = golden("gated-live-2022.json");
    const mayor = payload.races.find((r) => r.id === "mayor")!;
    mayor.possible = Object.fromEntries(
      mayor.candidates.map((c, i) => [c.key, i < 2 ? { low: 30 + i, high: 40 + i } : { low: 0, high: 20 }]),
    );
    const html = card(render(payload, { ward: "1" }), "mayor");
    const names = tallyNames(html);
    expect(names.slice(0, 2)).toEqual(mayor.candidates.slice(0, 2).map((c) => c.full_name));
    expect(names.at(-1)).toMatch(/other candidates$/);
    expect(html).toContain("live-tally__break");
    expect(html.indexOf("live-tally__break")).toBeLessThan(html.indexOf("other candidates"));
    expect(html.indexOf("live-tally__break")).toBeGreaterThan(html.indexOf(names[1]));
    // Wide ranges: no one out, no break, the folded row stays where it was.
    const wide = card(render(golden("gated-live-2022.json"), { ward: "1" }), "mayor");
    expect(wide).not.toContain("live-tally__break");
  });

  it("gives council tiles their top two candidates' Estimated Ranges", () => {
    const html = tile(render(golden("gated-live-2022.json")), "1");
    expect(text(html)).toContain("Crisanti Vincent 37–43% · Minhas Avtar 20–25%");
  });

  it("says why a level shows the count: its gate failed, or the projection is paused", () => {
    const html = render(golden("gated-off-2022.json"), { ward: "1" });
    expect(text(card(html, "councillor-1"))).toContain(
      "No projection for council races tonight. In replays of past election nights it did not beat simply reading the count, so this page shows the count as the City reports it.",
    );
    expect(text(card(html, "mayor"))).toContain("No projection for the mayor&#x27;s race tonight.");
    const trustee = card(html, html.match(/id="live-race-(tdsb-\d+)"/)![1]);
    expect(text(trustee)).toContain(
      "Projection paused for school board trustee races. The count below is as the City reports it.",
    );
    expect(text(card(html, "councillor-1"))).not.toContain("Estimated final");
    // The Possible Range is arithmetic on the count and stays.
    expect(text(card(html, "councillor-1"))).toContain("Possible 4–93%");
    expect(text(tile(html, "1"))).toContain("Count only");
  });

  it("notes that the French-language boards are never projected", () => {
    const html = render(golden("no-units-in-2026.json"), { ward: "1" });
    expect(text(html)).toContain("Count and possible range only: no estimate for these boards.");
  });

  it("explains a counting French-language board's Possible Range (#97)", () => {
    const payload = golden("no-units-in-2026.json");
    const onBallot = wardBallotRaceIds("1", trustees);
    const race = payload.races.find(
      (r) => r.level === "french_trustee" && r.candidates.length > 1 && onBallot.includes(r.id),
    )!;
    race.state = "counting";
    race.progress = { received: 100, total: 389 };
    race.candidates = race.candidates.map((c, i) => ({ ...c, votes: i === 0 ? 200 : 100 / (race.candidates.length - 1) }));
    race.possible = Object.fromEntries(race.candidates.map((c) => [c.key, { low: 4, high: 92 }]));
    const html = card(render(payload, { ward: "1" }), race.id);
    // A result like the rest, with no projection panel: the boards have no estimate.
    expect(html).toContain("forecast-chart__bar");
    expect(html).not.toContain("mayor-projection");
    expect(text(html)).not.toContain("confidence interval");
  });

  it("never shows a win probability on a gated night", () => {
    for (const name of ["gated-live-2022.json", "gated-off-2022.json"]) {
      const html = render(golden(name), { ward: "1" });
      expect(html, name).not.toMatch(/chance|favou?red|odds|likely to win|probabilit/i);
    }
  });
});

describe("LiveResultsView: per-race checks and Withdrawals (#43)", () => {
  const WITHDRAWN = "No projection for this race right now. The count is as the City reports it.";

  /** A ward whose Ward Ballot holds `raceId`. */
  function wardWith(raceId: string): string {
    const ward = RESULTS_WARDS.find((w) => wardBallotRaceIds(w, trustees).includes(raceId));
    expect(ward, raceId).toBeDefined();
    return ward!;
  }

  it("keeps a withdrawn race's tally and says only that there is no projection", () => {
    // councillor-5's count is above its expected total: the one fault that still withdraws.
    const html = render(golden("withdrawals-2022.json"), { ward: "5" });
    const ward5 = text(card(html, "councillor-5"));
    expect(ward5).toContain(WITHDRAWN);
    expect(ward5).toContain("Voting areas in28 of 65");
    expect(ward5).not.toContain("Estimated final");
    expect(ward5).toContain("Possible");
    expect(html).not.toContain("count_above_expected");
  });

  it("hides Reporting Progress that fails its check, and the range carries on (#97)", () => {
    const html = render(golden("withdrawals-2022.json"), { ward: "3" });
    const ward3 = text(card(html, "councillor-3"));
    expect(ward3).toContain("Voting areas inNot available");
    expect(ward3).not.toContain(WITHDRAWN);
    expect(ward3).toContain("Projected finish");
    expect(text(tile(render(golden("withdrawals-2022.json")), "3"))).toContain("Voting areas: not available");
    expect(html).not.toContain("polls_received_above_polls");
  });

  it("keeps the mayoral projection through a ward's vote-sum mismatch (#97)", () => {
    const mayor = text(card(render(golden("withdrawals-2022.json"), { ward: "1" }), "mayor"));
    expect(mayor).not.toContain(WITHDRAWN);
    expect(mayor).toContain("Tory John");
    // The projection stands: the panel beside the count shows it.
    expect(mayor).toContain("Projected finish");
  });

  it("shows a name the bundle doesn't hold as written, with nothing special", () => {
    const ward8 = text(card(render(golden("withdrawals-2022.json"), { ward: "8" }), "councillor-8"));
    expect(ward8).toContain("Someone Unregistered");
    expect(ward8).toContain("Projected finish");
    expect(ward8).not.toContain(WITHDRAWN);
  });

  it("shows no Withdrawal wording where the level's gate already explains the count", () => {
    const payload = golden("gated-off-2022.json");
    payload.races.find((r) => r.id === "councillor-1")!.withdrawal = { reason: "votes_received_mismatch" };
    const ward1 = text(card(render(payload, { ward: "1" }), "councillor-1"));
    expect(ward1).toContain("No projection for council races tonight.");
    expect(ward1).not.toContain(WITHDRAWN);
  });

  it("hides 2022's MonAvenir polls 0 Reporting Progress and keeps its count", () => {
    const html = render(golden("council-counting-2022.json"), { ward: wardWith("monavenir-4") });
    const monavenir = text(card(html, "monavenir-4"));
    expect(monavenir).toContain("Voting areas: not available");
    expect(monavenir).not.toContain("539 of 0");
    expect(monavenir).not.toContain(WITHDRAWN);
  });
});

describe("LiveResultsView: the switches (#49)", () => {
  /** A golden as the route serves it with the given switches off. */
  function switched(name: string, off: SwitchName[]) {
    const raw = readFileSync(path.resolve(__dirname, "../../../fixtures/live/payload", name), "utf8");
    const switches = switchesFrom(SWITCHES.map((s) => (off.includes(s) ? "off" : null)));
    return serveLive({ payload: raw, heartbeats: ["1", null], switches });
  }

  const PAUSED = "Projection paused for council races. The count below is as the City reports it.";

  it("says a switched-off level's projection is paused, and its tiles show the count only", () => {
    const { payload } = switched("gated-live-2022.json", ["council"]);
    const html = render(payload, { ward: "1" });
    expect(text(card(html, "councillor-1"))).toContain(PAUSED);
    expect(text(card(html, "councillor-1"))).not.toContain("Estimated final");
    expect(text(card(html, "councillor-1"))).toContain("Possible ");
    expect(text(tile(html, "1"))).toContain("Count only");
    expect(text(card(html, "mayor"))).not.toContain("Projection paused");
  });

  it("pauses every level with all projections off", () => {
    const html = render(switched("gated-live-2022.json", ["projections"]).payload, { ward: "1" });
    expect(text(card(html, "mayor"))).toContain("Projection paused for the mayor&#x27;s race.");
    expect(text(card(html, "councillor-1"))).toContain(PAUSED);
    const trustee = card(html, html.match(/id="live-race-(tdsb-\d+)"/)![1]);
    expect(text(trustee)).toContain("Projection paused for school board trustee races.");
    expect(html).not.toContain("Estimated final");
  });

  it("drops the mayor's 2023 record with its variant switched off", () => {
    const mayor = text(card(render(switched("gated-live-2022.json", ["mayor_variant"]).payload, { ward: "1" }), "mayor"));
    expect(mayor).toContain("Projection paused for the mayor&#x27;s race.");
    expect(mayor).not.toContain("2023 by-election");
    expect(mayor).not.toContain("Estimated final");
  });

  it("replaces live results with the page pause and the City's link", () => {
    const { payload, paused } = switched("gated-live-2022.json", ["page"]);
    const html = render(payload, { ward: "1", paused });
    expect(text(html)).toContain("Live results are paused. See the City of Toronto&#x27;s results:");
    expect(html).toContain('href="https://www.toronto.ca/city-government/elections/election-results-reports/election-results/"');
    expect(cardTitles(html)).toEqual([]);
    expect(html).not.toMatch(/Estimated final|Possible |City count as of|voting areas in/);
    expect(text(html)).not.toMatch(/Tory|Crisanti/);
    // The tiles stay as links to each ward.
    expect(tileHrefs(html)).toEqual(RESULTS_WARDS.map((n) => `/results/${n}`));
    // A paused Rehearsal still says it is one.
    const rehearsal = render({ ...payload, rehearsal: true }, { paused: true });
    expect(rehearsal).toContain("Rehearsal: not real results");
  });
});

describe("LiveResultsView: Night Close (#51)", () => {
  const ELECTED = "Elected (unofficial)";

  it("labels each fully reported race's leader 'Elected (unofficial)' only at Night Close", () => {
    const payload = golden("all-units-in-2018.json");
    expect(render(payload, { ward: "1" })).not.toContain(ELECTED);
    const html = render(payload, { ward: "1", closed: true });
    for (const [race, leader, runnerUp] of [
      ["mayor", "John Tory", "Jennifer Keesmaat"],
      ["councillor-1", "Michael Ford", "Vincent Crisanti"],
    ]) {
      const rows = text(card(html, race));
      expect(count(rows, ELECTED), race).toBe(1);
      expect(rows.indexOf(ELECTED)).toBeGreaterThan(rows.indexOf(leader));
      expect(rows.indexOf(ELECTED)).toBeLessThan(rows.indexOf(runnerUp));
    }
    expect(text(tile(html, "1"))).toMatch(/Ford [\d.]+% · Elected \(unofficial\)/);
  });

  it("never labels a race still counting, or a tie at the top, even at Night Close", () => {
    const counting = render(golden("council-counting-2022.json"), { ward: "1", closed: true });
    expect(counting).not.toContain(ELECTED);
    const payload = golden("all-units-in-2018.json");
    const ward1 = payload.races.find((r) => r.id === "councillor-1")!;
    ward1.candidates[1].votes = ward1.candidates[0].votes;
    const tied = render(payload, { ward: "1", closed: true });
    expect(card(tied, "councillor-1")).not.toContain(ELECTED);
    expect(tile(tied, "1")).not.toContain(ELECTED);
    expect(card(tied, "mayor")).toContain(ELECTED);
  });

  it("says 'Final unofficial count as of …' with no refresh line and no staleness banner", () => {
    const payload = golden("council-counting-2022.json");
    const html = render(payload, { ward: "1", closed: true, age: 3 * 60 * MINUTE });
    expect(text(html)).toContain("Final unofficial count as of 9:46 p.m.");
    expect(text(html)).not.toContain("City of Toronto unofficial results");
    expect(html).not.toContain("City count as of");
    expect(html).not.toContain("Refreshes every minute");
    expect(html).not.toContain("may be out of date");
  });

  it("names no final count time before results, and still drops the refresh line", () => {
    const html = text(render(golden("before-results-2026.json"), { closed: true }));
    expect(html).not.toContain("Final unofficial count");
    expect(html).not.toContain("Refreshes every minute");
  });

  it("keeps a tile's label when the leader's share is missing", () => {
    const payload = golden("all-units-in-2018.json");
    payload.races.find((r) => r.id === "councillor-1")!.candidates[0].share = null;
    expect(text(tile(render(payload, { closed: true }), "1"))).toContain("Michael Ford · Elected (unofficial)");
  });

  it("hides the final forecast at Night Close", () => {
    expect(render(golden("mayor-counting-2023.json"), { closed: true })).not.toContain("The final pre-election forecast");
  });
});

describe("LiveResultsView: acclaimed races (#117)", () => {
  /** A ward page whose ballot holds an acclaimed race, and that race's id. */
  function acclaimed(name: string, closed = false): { html: string; id: string; page: string } {
    const payload = golden(name);
    for (const num of RESULTS_WARDS) {
      const race = payload.races.find((r) => r.candidates.length === 1 && wardBallotRaceIds(num, trustees).includes(r.id));
      if (race) {
        const page = render(payload, { ward: num, closed });
        return { html: card(page, race.id), id: race.id, page };
      }
    }
    throw new Error(`no acclaimed race on any ballot in ${name}`);
  }

  it("shows the candidate as a row with an Acclaimed badge, on an outlined card", () => {
    for (const name of ["before-results-2026.json", "no-units-in-2026.json"]) {
      const { html, id, page } = acclaimed(name);
      expect(page, name).toContain(`<section class="card live-acclaimed" aria-labelledby="live-race-${id}">`);
      expect(html, name).toMatch(/<p class="live-acclaimed__row"><span class="live-acclaimed__name">[^<]+<\/span> <span class="badge badge--acclaimed">Acclaimed<\/span><\/p>/);
      expect(text(html), name).toContain("The only candidate, so there is no vote.");
      expect(html, name).not.toContain("was acclaimed:");
    }
  });

  it("never carries Elected (unofficial), even after Night Close", () => {
    const { html } = acclaimed("no-units-in-2026.json", true);
    expect(html).toContain("badge--acclaimed");
    expect(html).not.toContain("badge--status");
    expect(html).not.toContain("Elected (unofficial)");
  });
});

describe("LiveResultsView: Brad Bradford in full (#121)", () => {
  it("names him in full on a ward page, as Olivia Chow is", () => {
    const html = card(render(counting2026({ mayor: ["Brad Bradford", "Olivia Chow"] }), { ward: "9" }), "mayor");
    expect(tallyNames(html).slice(0, 2)).toEqual(["Brad Bradford", "Olivia Chow"]);
  });
});

describe("LiveResultsView: Chow's 2023 share on her ward bar (#125)", () => {
  const share2023 = (num: string) => CHOW_2023.wards[num].share;
  /** One tally row, from its opening div to the next row or the list's end. */
  function rowOf(html: string, name: string): string {
    const at = html.indexOf(`<span class="live-tally__name">${name}</span>`);
    const start = html.lastIndexOf('<div class="forecast-chart__row', at);
    const next = html.indexOf('<div class="forecast-chart__row', at);
    return html.slice(start, next > -1 ? next : html.indexOf("live-tally__axis", at));
  }

  it("marks her 2023 share in the ward on her ward bar, gives it in her caption, and names it in the key", () => {
    const html = card(render(counting2026({ mayor: ["Brad Bradford", "Olivia Chow"] }), { ward: "9" }), "mayor");
    const chow = rowOf(html, "Olivia Chow");
    expect(chow).toContain(`class="live-tally__then" style="left:${share2023("9")}%"`);
    expect(text(chow)).toContain(`${share2023("9").toFixed(1)}% in 2023`);
    expect(rowOf(html, "Brad Bradford")).not.toContain("live-tally__then");
    expect(text(html)).toContain("Olivia Chow in 2023");
    expect(html).toContain("live-tally__glyph--then");
  });

  it("shows the mark before results, on an empty ward bar", () => {
    const html = card(render(golden("before-results-2026.json"), { ward: "9" }), "mayor");
    const chow = rowOf(html, "Olivia Chow");
    expect(chow).toContain("live-tally__wtrack");
    expect(chow).toContain(`class="live-tally__then" style="left:${share2023("9")}%"`);
  });
});

describe("LiveResultsView: an incumbent councillor's share in the ward's last election", () => {
  function rowOf(html: string, name: string): string {
    const at = html.indexOf(`<span class="live-tally__name">${name}</span>`);
    expect(at, name).toBeGreaterThan(-1);
    const start = html.lastIndexOf('<div class="forecast-chart__row', at);
    const next = html.indexOf('<div class="forecast-chart__row', at);
    return html.slice(start, next > -1 ? next : html.length);
  }
  const counting = () => counting2026({});

  it("marks it on the incumbent's bar, in their caption and in the key", () => {
    // Five candidates, Crisanti among them, so every one shows (Alex: a result folds above five).
    const payload = counting();
    const race = payload.races.find((r) => r.id === "councillor-1")!;
    const crisantiCandidate = race.candidates.find((c) => c.full_name === "Vincent Crisanti")!;
    race.candidates = [crisantiCandidate, ...race.candidates.filter((c) => c !== crisantiCandidate).slice(0, 4)];
    const html = card(render(payload, { ward: "1" }), "councillor-1");
    const crisanti = rowOf(html, "Vincent Crisanti");
    // On the result's scale: the mark sits at 41.07% of the share, past the bar's own scale.
    expect(crisanti).toMatch(/class="live-tally__then" style="left:[\d.]+%"/);
    expect(text(crisanti)).toContain("41.1% in 2022");
    expect(text(html)).toContain("Crisanti in 2022");
    expect(rowOf(html, "Abraham Abbey")).not.toContain("live-tally__then");
  });

  it("names a by-election as one", () => {
    const html = card(render(counting(), { ward: "15" }), "councillor-15");
    expect(text(rowOf(html, "Rachel Chernos Lin"))).toContain("54.8% in the 2024 by-election");
    expect(text(html)).toContain("Chernos Lin in the 2024 by-election");
  });

  it("gives no mark to a councillor who last won another ward, or where no incumbent runs", () => {
    expect(card(render(counting(), { ward: "14" }), "councillor-14")).not.toContain("live-tally__then");
    expect(card(render(counting(), { ward: "4" }), "councillor-4")).not.toContain("live-tally__then");
  });

  it("shows the mark before results, on an empty bar", () => {
    const html = card(render(golden("before-results-2026.json"), { ward: "1" }), "councillor-1");
    expect(rowOf(html, "Vincent Crisanti")).toContain('class="live-tally__then" style="left:41.07%"');
  });
});

describe("LiveResultsView: the voters' list bar", () => {
  const T = TURNOUT;
  const w = (x: number) => `width:${+x.toFixed(2)}%`;
  const bar = (html: string) => {
    const at = html.indexOf('class="live-turnout"');
    expect(at, "turnout bar").toBeGreaterThan(-1);
    return html.slice(at, html.indexOf("</figure>", at));
  };

  it("before 8 p.m., shows the advance vote citywide, and the 2023 mark (only 2023, Alex)", () => {
    const city = bar(card(render(golden("before-results-2026.json")), "mayor"));
    expect(city).toContain(`live-turnout__seg live-turnout__seg--advance" style="${w((100 * T.advance_voters["2026"]) / T.city.electors_2026)}`);
    expect(text(city)).toContain("222,550 advance voters (10.4%)");
    expect(city).toContain(`style="left:${T.city.share_2023}%"`);
    expect(city).not.toContain(`style="left:${T.city.share_2022}%"`);
    expect(text(city)).toContain("Turnout in 2023: 38.4%");
    expect(text(city)).not.toContain("2022");
    // The City's advance figure is citywide only: a ward's bar has the marks alone.
    const ward = bar(card(render(golden("before-results-2026.json"), { ward: "9" }), "mayor"));
    expect(ward).not.toContain("--advance");
    expect(ward).toContain(`style="left:${T.wards["9"].share_2023}%"`);
  });

  it("while counting, splits the counted votes by candidate and hatches the rest as not yet known", () => {
    const payload = counting2026({ mayor: ["Brad Bradford", "Olivia Chow"] });
    const mayor = payload.races.find((r) => r.id === "mayor")!;
    const w9 = mayor.wards!.find((x) => x.num === "9")!;
    const html = bar(card(render(payload, { ward: "9" }), "mayor"));
    const e = T.wards["9"].electors_2026;
    const bradford = mayor.candidates.find((c) => c.full_name === "Brad Bradford")!;
    expect(html).toContain(w((100 * w9.votes![bradford.key]) / e));
    expect(html).toContain("live-turnout__seg--pending");
    expect(text(html)).toMatch(/[\d.]+% counted so far/);
    expect(text(html)).not.toMatch(/[\d.]+% voted/);
    // A council race has its ward's voters' list too, with its 2022 turnout marked (Alex).
    const council = card(render(payload, { ward: "9" }), "councillor-9");
    expect(council).toContain("live-turnout");
    expect(text(council)).toMatch(/Turnout in 2022: [\d.]+%/);
  });

  it("once the ward's count is complete, the rest is who didn't vote", () => {
    const payload = counting2026({ mayor: ["Brad Bradford", "Olivia Chow"] });
    const w9 = payload.races.find((r) => r.id === "mayor")!.wards!.find((x) => x.num === "9")!;
    w9.progress = { received: 40, total: 40 };
    const html = bar(card(render(payload, { ward: "9" }), "mayor"));
    expect(html).toContain("live-turnout__seg--novote");
    expect(text(html)).toMatch(/[\d.]+% voted/);
    expect(html).not.toContain("--pending");
  });

  it("citywide on /results/ too, complete once every voting area is in", () => {
    const payload = counting2026({ mayor: ["Brad Bradford", "Olivia Chow"] });
    const mayor = payload.races.find((r) => r.id === "mayor")!;
    expect(bar(card(render(payload), "mayor"))).toContain("--pending");
    mayor.state = "all_units_in";
    mayor.progress = { received: 10, total: 10 };
    expect(bar(card(render(payload), "mayor"))).toContain("--novote");
  });

  it("explains its measure once, in the card's disclosures", () => {
    const html = card(render(golden("before-results-2026.json")), "mayor");
    expect(count(text(html), "Valid votes for mayor over the voters’ list before election day")).toBe(1);
    const more = html.slice(html.indexOf('class="live-card-more"'));
    expect(more).toContain("<summary>About turnout</summary>");
    expect(more).toContain("Valid votes for mayor over the voters’ list before election day");
    expect(render(golden("before-results-2026.json"))).not.toContain("Advance voters:");
  });
});

describe("LiveResultsView: the results audit (2026-10-20)", () => {
  it("has no kicker labels above headings, and heads the French-language boards with a heading", () => {
    const html = render(golden("gated-live-2022.json"), { ward: "1" });
    expect(html).not.toContain('class="kicker"');
    expect(render(golden("no-units-in-2026.json"), { ward: "1" })).toMatch(/<h3[^>]*>French-language school boards<\/h3>/);
  });

  it("groups thousands in voting-area counts", () => {
    expect(text(render(golden("mayor-counting-2023.json")))).toContain("1,221 of 1,451");
    expect(text(render(golden("council-counting-2022.json"), { ward: "1" }))).toContain("1,535 voting areas in");
  });

  it("labels a council tile's ranges as the estimated final", () => {
    const html = render(golden("gated-live-2022.json"));
    expect(text(tile(html, "1"))).toMatch(/Estimated final: [^·]+ \d+–\d+% · /);
  });

  it("sets the mayor's turnout after its candidates", () => {
    const html = card(render(golden("gated-live-2022.json"), { ward: "1" }), "mayor");
    expect(html.indexOf('class="live-turnout"')).toBeGreaterThan(html.indexOf("live-tally__axis"));
  });
});

describe("LiveResultsView: the mayor leads the page", () => {
  /** The markup of the mayor lead section. */
  const lead = (html: string) => {
    const start = html.indexOf('class="mayor-lead"');
    return start < 0 ? "" : html.slice(start, html.indexOf("</section>", start));
  };

  it("opens with the mayor's two leaders, their estimated finals and the count lead, before the views", () => {
    // 2022 mid-count golden: Tory 62.42% (59–65%), Penalosa 18.09% (16–21%), 767 of 1,535 voting areas.
    const html = render(golden("gated-live-2022.json"));
    const section = text(lead(html));
    expect(section).toMatch(/Tory John[^]*62\.4%/);
    expect(section).not.toContain("Estimated final 59–65%");
    expect(text(section)).toContain("59–65%");
    expect(section).toMatch(/Penalosa Gil[^]*18\.1%/);
    expect(text(section)).toContain("16–21%");
    expect(section).toContain("29 other candidates");
    expect(text(section)).not.toContain("In the count");
    expect(section).toContain("Voting areas in767 of 1,535");
    expect(html.indexOf('class="mayor-lead"')).toBeLessThan(html.indexOf('aria-label="Results views"'));
  });

  it("is the mayor's only view: every candidate expands in place, with the out-of-reach zones and the key", () => {
    const html = render(golden("gated-live-2022.json"));
    expect(count(html, 'id="live-race-mayor"')).toBe(1);
    expect(html).not.toContain("mayor-lead__more");
    const section = lead(html);
    expect(section).toMatch(/class="live-tally__expand"[^>]*><span class="live-tally__name">29 other candidates</);
    expect(section).not.toContain("live-tally__reach");
    expect(section).not.toContain("live-tally__axis");
    expect(section).toContain('class="live-turnout"');
  });

  it("gives the ward's share under each leader on a ward page", () => {
    // Ward 1, 2022 golden: Tory 5,119 of the ward's votes (67.2%), Penalosa 478 (6.3%).
    const section = lead(render(golden("gated-live-2022.json"), { ward: "1" }));
    expect(text(section)).toContain("Ward 1 · 5,119 votes");
    expect(section).toMatch(/live-tally__wvalue">67\.2%</);
    expect(section).toMatch(/live-tally__wvalue">6\.3%</);
  });

  it("with everything in and no estimate, shows the final count", () => {
    const section = text(lead(render(golden("all-units-in-2018.json"))));
    // The votes counted lead (2018: 479,659), the share beside them.
    expect(section).toMatch(/John Tory[^]*479,659[^]*63\.5% of counted votes/);
    expect(section).not.toContain("Estimated final");
    expect(section).toContain("Voting areas inAll in");
  });

  it("before results, keeps the mayor card in the races, with no lead", () => {
    const html = render(golden("before-results-2026.json"));
    expect(lead(html)).toBe("");
    expect(cardTitles(html)).toEqual(["Mayor"]);
  });

  it("puts the status and the ward picker in one bar, with the page title for screen readers", () => {
    const html = render(golden("gated-live-2022.json"), { ward: "1" });
    expect(html).toMatch(/<h1 id="results-heading" class="visually-hidden">Ward 1 Etobicoke North<\/h1>/);
    expect(html).toMatch(/class="results-bar"[^]*City count as of[^]*Your ward/);
    // On a ward page the picker shows the ward.
    expect(html).toMatch(/<option value="1" selected="">Ward 1 Etobicoke North<\/option>/);
  });
});

describe("LiveResultsView: the projected finish beside the mayor's leaders", () => {
  const panel = (html: string) => {
    const at = html.indexOf('class="mayor-projection"');
    return at < 0 ? "" : html.slice(at, html.indexOf("</figure>", at));
  };

  it("gives the two leaders' central projections large, and their ranges on one axis", () => {
    // 2022 golden, the band shown: Tory mid 62.33 (58.84–65.48), Penalosa mid 17.93 (16.19–20.59).
    const p = panel(render(golden("gated-live-2022.json")));
    expect(text(p)).toContain("Projected finish");
    expect(text(p)).toMatch(/Tory John[^]*62\.3%[^]*Penalosa Gil[^]*17\.9%/);
    expect(text(p)).toContain("59–65%");
    expect(text(p)).toContain("16–21%");
    expect(count(p, 'class="mayor-projection__range"')).toBe(2);
  });

  it("is absent when no Estimated Range shows", () => {
    expect(panel(render(golden("all-units-in-2018.json")))).toBe("");
  });
});

describe("LiveResultsView: a result with missing figures", () => {
  it("shows a dash, never 0, for a candidate the City gives no votes", () => {
    const payload = golden("council-counting-2022.json");
    const race = payload.races.find((r) => r.id === "councillor-1")!;
    race.candidates = race.candidates.slice(0, 3).map((c, i) => (i === 2 ? { ...c, votes: null, share: null } : c));
    const html = card(render(payload, { ward: "1" }), "councillor-1");
    const last = race.candidates[2].full_name;
    const row = html.slice(html.indexOf(`>${last}<`));
    expect(row).toMatch(/live-tally__value"[^>]*>–</);
    expect(text(row.slice(0, row.indexOf("forecast-chart__row", 10)))).not.toContain("of counted votes");
  });
});
