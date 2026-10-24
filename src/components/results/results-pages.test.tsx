import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import councilFixture from "../../../fixtures/council_race_cards.json";
import forecastFixture from "../../../fixtures/mayoral_forecast.json";
import candidatesFixture from "../../../fixtures/mayoral_candidates.json";
import trusteeFixture from "../../../fixtures/trustee_race_cards.json";
import { homeRaces, mayorNotes, namedMayoralCandidates } from "@/lib/home-data";
import { racePageProps } from "@/lib/race-routes";
import { raceSetups, type RaceSetup } from "@/lib/race-setup";
import { resultsMapData } from "@/lib/results-map-data";
import { resultsWards, type ResultsWard } from "@/lib/results-wards";
import { wardBallotRaceIds } from "@/lib/ward-ballot";
import type { CouncilRaceCardsFeed, MayoralCandidatesFeed, MayoralForecastFeed, TrusteeRaceCardsFeed } from "@/types/feeds";
import type { LivePayload } from "@/types/live";
import { serveLive, SWITCHES, switchesFrom, type SwitchName } from "@/lib/live-serve";
import { TURNOUT } from "@/lib/turnout";
import { WORDING } from "@/lib/race-results";
import { FrenchBoards } from "./french-boards";
import { LiveResultsFixture } from "./live-results-poller";
import { RacePage } from "./race-page";
import { ResultsHome } from "./results-home";

const navigation = vi.hoisted(() => ({ query: "" }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/results/",
  useSearchParams: () => new URLSearchParams(navigation.query),
}));

// Seam 7 (#17): the results pages rendered from the golden payloads (results redesign, 2026-10-24).
function golden(name: string): LivePayload {
  return JSON.parse(
    readFileSync(path.resolve(__dirname, "../../../fixtures/live/payload", name), "utf8"),
  ) as LivePayload;
}

const council = councilFixture as unknown as CouncilRaceCardsFeed;
const trustees = trusteeFixture as unknown as TrusteeRaceCardsFeed;
const forecastFeed = forecastFixture as unknown as MayoralForecastFeed;
const WARDS: ResultsWard[] = resultsWards(council);
const MAP = resultsMapData(council, trustees);
const SETUPS = raceSetups(council, trustees);
const HOMES = homeRaces(SETUPS);
const NAMED = namedMayoralCandidates(forecastFeed);
const NOTES = mayorNotes(candidatesFixture as unknown as MayoralCandidatesFeed);
const setupOf = (id: string) => SETUPS.find((s) => s.id === id)!;

const MINUTE = 60_000;

type Page = "home" | "french" | RaceSetup;
type Options = { age?: number; failures?: number; forecast?: boolean; paused?: boolean; closed?: boolean };

/** One page as a reader whose newest heartbeat is `age` ms old. */
function renderPage(payload: LivePayload, page: Page, { age = MINUTE, failures = 0, forecast = true, paused = false, closed = false }: Options = {}) {
  const heartbeat = Math.max(payload.seq.all_office, payload.seq.ward_by_ward);
  const body =
    page === "home" ? (
      <ResultsHome homes={HOMES} wards={WARDS} forecast={forecast} mapData={MAP} named={NAMED} notes={NOTES} />
    ) : page === "french" ? (
      <FrenchBoards setups={SETUPS.filter((s) => s.kind === "french")} map={{ view_box: MAP.view_box, boards: MAP.boards, wards: MAP.wards }} />
    ) : (
      <RacePage {...racePageProps(page, SETUPS, { view_box: MAP.view_box, wards: MAP.wards })} />
    );
  return renderToStaticMarkup(
    <LiveResultsFixture state={{ results: { heartbeat, paused, closed, payload }, failures }} now={heartbeat + age}>
      {body}
    </LiveResultsFixture>,
  );
}

/** `/results/`, or with a ward: `/results/` then each race on the ward's ballot on its own page
 *  (the French boards' on theirs), one render each. */
function render(payload: LivePayload, { ward = null as string | null, ...options }: Options & { ward?: string | null } = {}) {
  if (ward === null) return renderPage(payload, "home", options);
  const parts = [renderPage(payload, "home", options)];
  let french = false;
  for (const id of wardBallotRaceIds(ward, trustees)) {
    if (!payload.races.some((r) => r.id === id)) continue;
    const setup = setupOf(id);
    if (setup.kind === "french") {
      if (!french) parts.push(`<!--page:french-->${renderPage(payload, "french", options)}`);
      french = true;
    } else parts.push(`<!--page:${id}-->${renderPage(payload, setup, options)}`);
  }
  return parts.join("\n");
}

/** The markup's text, tags dropped. */
function text(html: string): string {
  return html.replace(/<[^>]*>/g, "");
}

function count(html: string, text: string): number {
  return html.split(text).length - 1;
}

/** The page without its maps, whose 25 wards each say what they show. */
function withoutMap(html: string): string {
  let out = html;
  for (let start = out.indexOf('class="live-map"'); start !== -1; start = out.indexOf('class="live-map"')) {
    const open = out.lastIndexOf("<section", start);
    out = out.slice(0, open) + out.slice(out.indexOf("</section>", start) + "</section>".length);
  }
  return out;
}


describe("the citywide page", () => {
  it("shows the mayor, then every council and trustee race, each linking to its own page", () => {
    const payload = golden("before-results-2026.json");
    const html = render(payload);
    expect(count(html, "<h1")).toBe(1);
    expect(html).toContain('<h1 id="results-h">Toronto election results</h1>');
    // The mayor folds before results as while counting: the forecast's two, then the rest (#115).
    expect(tallyNames(card(html, "mayor"))).toEqual(["Brad Bradford", "Olivia Chow", "51 other candidates"]);
    expect(html).toMatch(/href="\/etobicoke-north\/?"/);
    expect(html).toMatch(/href="\/scarborough-rouge-park\/?"/);
    expect(html).toMatch(/href="\/tdsb\/1\/?"/);
    // No ward picker (Alex, 2026-10-20).
    expect(html).not.toContain("Your ward");
  });
});

describe("the citywide page's order (results redesign, Alex, 2026-10-24)", () => {
  const NIGHT = JSON.parse(readFileSync(path.resolve(__dirname, "../../../fixtures/live/mock-night/payload.json"), "utf8")) as LivePayload;
  const ids = (html: string, wanted: string[]) =>
    wanted.filter((id) => html.includes(`id="${id}"`)).sort((a, b) => html.indexOf(`id="${a}"`) - html.indexOf(`id="${b}"`));

  it("runs mayor, council, the count over the night, the mayor by ward, every council race, trustees, sources", () => {
    const html = renderPage(NIGHT, "home");
    expect(ids(html, ["live-race-mayor", "council", "results-count", "map", "outstanding-h", "results-wards", "council-map", "boards", "about-h"])).toEqual([
      "live-race-mayor",
      "council",
      "results-count",
      "map",
      "outstanding-h",
      "results-wards",
      "council-map",
      "boards",
      "about-h",
    ]);
    // The disclosures stay the page's very last part.
    expect(html.lastIndexOf("How accurate is this estimate?")).toBeGreaterThan(html.indexOf('id="about-h"'));
  });

  it("fixes each map to its race, with no choice of race", () => {
    const html = renderPage(NIGHT, "home");
    expect(html).not.toMatch(/role="group" aria-label="Race"/);
    expect(html).toContain("Mayor by ward");
    expect(html).toContain("All 25 council races");
  });

  it("gives a race page its count over the night", () => {
    expect(card(render(NIGHT, { ward: "1" }), "councillor-1")).toMatch(/class="live-race-count"/);
  });
});

describe("a ward's page", () => {
  it("gives each race on a ward's ballot its own page, the French boards theirs", () => {
    const html = render(golden("before-results-2026.json"), { ward: "14" });
    const h1s = [...html.matchAll(/<h1[^>]*>([^<]*)<\/h1>/g)].map((m) => m[1]);
    expect(h1s).toEqual(["Toronto election results", "Toronto-Danforth", "TDSB Ward 5", "TCDSB Ward 11", "Conseils scolaires de langue française"]);
    expect(card(html, "councillor-14")).toContain("Maqsood Ahmad");
    expect(card(html, "tdsb-5")).toContain("Elina Feyginberg");
    expect(card(html, "tcdsb-11")).toContain("Angela Kennedy");
    expect(html).toContain('id="viamonde-3"');
    expect(html).toContain('id="monavenir-4"');
  });

  it("while counting, shows each race's tally, Reporting Progress and the City count time", () => {
    const html = render(golden("council-counting-2022.json"), { ward: "1" });
    // The older of the two seqs (both 9:46 p.m. here).
    expect(html).toContain("City count as of 9:46 p.m.");
    expect(html).toContain("51 of 55");
    expect(html).toContain("51 of 55 voting areas in");
    expect(html).toContain("Vincent Crisanti");
    expect(html).toContain("6,800");
    expect(html).toContain("41.2%");
    expect(html).toContain("0 of 1,535 voting areas in");
    expect(html).toContain("forecast-chart live-tally");
    expect(text(html)).toContain("Geneviève Oger");
    expect(text(html)).toContain("Aucun scrutin n’a lieu lorsqu’une seule personne se présente.");
    expect(html).not.toContain("Results from 8 p.m.");
    expect(html).not.toContain("Rehearsal: not real results");
    expect(html).not.toContain("may be out of date");
  });

  it("takes the City count time from the older seq", () => {
    // all_office 8:56 p.m., ward_by_ward 8:26 p.m.
    expect(render(golden("mayor-counting-2023.json"))).toContain("City count as of 8:26 p.m.");
  });

  it("shows fully reported and unreadable races in their own words", () => {
    expect(text(render(golden("all-units-in-2018.json"), { ward: "1" }))).toContain("Voting areas inAll in");
    expect(render(golden("no-figures-2026.json"), { ward: "14" })).toContain(
      "No figures from the City for this race right now",
    );
  });

  it("says Reporting Progress is not available when a counting race has none", () => {
    const payload = golden("council-counting-2022.json");
    payload.races.find((r) => r.id === "councillor-1")!.progress = null;
    const html = render(payload, { ward: "1" });
    expect(text(card(html, "councillor-1"))).toContain("Voting areas: not available");
    expect(html).toContain("Vincent Crisanti");
  });
});

describe("the citywide page's council table", () => {
  it("names each ward, links it to its race's page, and leaves the page's state to the status line", () => {
    const html = renderPage(golden("council-counting-2022.json"), "home");
    expect(html).toMatch(/<a href="\/etobicoke-north\/?">1 Etobicoke North<\/a>/);
    const before = renderPage(golden("before-results-2026.json"), "home");
    // The page says it once (#115); no row repeats it.
    expect(count(withoutMap(before), "Results from 8 p.m.")).toBe(1);
  });

  it("at 0%, shows each race's empty progress and says nothing of its own (#115)", () => {
    const html = renderPage(golden("no-units-in-2026.json"), "home");
    expect(html).toMatch(/14 Toronto-Danforth<\/a><\/th>(?:(?!<\/tr>)[^])*0\/48/);
    expect(count(withoutMap(html), "No voting areas have reported yet")).toBe(1);
  });
});

describe("page status", () => {
  it("shows the staleness banner only when the newest heartbeat is over 5 minutes old", () => {
    const payload = golden("council-counting-2022.json");
    expect(render(payload, { ward: "1", age: 5 * MINUTE })).not.toContain("may be out of date");
    const stale = render(payload, { ward: "1", age: 5 * MINUTE + 1 });
    expect(stale).toContain(
      "We haven&#x27;t been able to read the City&#x27;s results since 9:46 p.m. The count below may be out of date.",
    );
    expect(stale).toMatch(/<p class="callout" role="status">We haven/);
    // The count stays on the page.
    expect(stale).toContain("51 of 55");
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
    expect(html).toContain("51 of 55");
  });

  it("before the first good poll, shows a loading line, then the notice after three failures, and claims no count", () => {
    const pages: Page[] = ["home", setupOf("councillor-1"), "french"];
    const view = (page: Page, failures: number) =>
      renderToStaticMarkup(
        <LiveResultsFixture state={{ results: null, failures }} now={0}>
          {page === "home" ? (
            <ResultsHome homes={HOMES} wards={WARDS} forecast mapData={MAP} named={NAMED} notes={NOTES} />
          ) : page === "french" ? (
            <FrenchBoards setups={SETUPS.filter((s) => s.kind === "french")} map={{ view_box: MAP.view_box, boards: MAP.boards, wards: MAP.wards }} />
          ) : (
            <RacePage {...racePageProps(page, SETUPS, { view_box: MAP.view_box, wards: MAP.wards })} />
          )}
        </LiveResultsFixture>,
      );
    for (const page of pages) {
      expect(view(page, 0)).toContain("Loading live results");
      expect(view(page, 3)).toContain("Can&#x27;t reach live results; retrying");
      expect(text(view(page, 0))).not.toMatch(/No votes counted yet|No votes have been counted|Aucune voix/);
    }
  });
});

/** The mayor's notes at the very bottom of the page (Alex): the 2023 benchmark and the disclosures. */
function notes(html: string): string {
  const start = html.indexOf('class="mayor-notes"');
  expect(start, "mayor notes").toBeGreaterThan(-1);
  return html.slice(start);
}

/** One race's HTML: the mayor's result at the top of /results/, a council or trustee race's own
 *  page, or a French-language board's section of theirs. */
function card(html: string, raceId: string): string {
  if (raceId === "mayor") {
    const start = html.indexOf('id="live-race-mayor"');
    expect(start, raceId).toBeGreaterThan(-1);
    return html.slice(start, html.indexOf('id="council"', start));
  }
  if (/^(viamonde|monavenir)-/.test(raceId)) {
    const start = html.indexOf(`id="${raceId}"`);
    expect(start, raceId).toBeGreaterThan(-1);
    return html.slice(start, html.indexOf("</section>", start));
  }
  const marker = html.indexOf(`<!--page:${raceId}-->`);
  expect(marker, raceId).toBeGreaterThan(-1);
  const next = html.indexOf("<!--page:", marker + 1);
  return html.slice(html.indexOf("<main", marker), next === -1 ? html.length : next);
}

/** A race page's tally, or the whole card where it has no other parts. */
function tallyOf(cardHtml: string): string {
  const at = cardHtml.indexOf('id="race-candidates"');
  if (at === -1) return cardHtml;
  const next = cardHtml.slice(at).search(/id="race-(?!candidates)/);
  return cardHtml.slice(at, next === -1 ? cardHtml.length : at + next);
}

/** The citywide page's council parts: the races to watch and the rest, then every council race. */
function councilSection(html: string): string {
  return html.slice(html.indexOf('id="council"'), html.indexOf('id="results-count"')) + html.slice(html.indexOf('id="council-map"'), html.indexOf('id="boards"'));
}

/** A ward's row in the citywide page's table of every council race. */
function councilRow(html: string, ward: string): string {
  const rows = [...html.matchAll(new RegExp(`>${ward} [^<]+</a></th>`, "g"))];
  expect(rows.length, `council row ${ward}`).toBeGreaterThan(0);
  const at = rows.at(-1)!.index!;
  return html.slice(at, html.indexOf("</tr>", at));
}



/** Names in a tally, or in a race page's table of candidates, in row order. */
function tallyNames(cardHtml: string): string[] {
  const table = cardHtml.indexOf('class="live-table race-table"');
  const names =
    table === -1
      ? [...cardHtml.matchAll(/<span class="live-tally__name">([^<]*)<\/span>/g)]
      : [...cardHtml.slice(table).matchAll(/<th scope="row"><span class="live-table__swatch"[^>]*><\/span>([^<]*?) ?</g)];
  return names.map((m) => m[1].replaceAll("&#x27;", "'"));
}

/** A row of a race page's table of candidates. */
function tableRow(cardHtml: string, name: string): string {
  const at = cardHtml.indexOf(`</span>${name} <`, cardHtml.indexOf('class="live-table race-table"'));
  expect(at, name).toBeGreaterThan(-1);
  return cardHtml.slice(cardHtml.lastIndexOf("<tr", at), cardHtml.indexOf("</tr>", at));
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

describe("the tally", () => {
  it("lists a council race's every candidate: votes, then share, then the votes counted (Alex, the prototype)", () => {
    const payload = golden("council-counting-2022.json");
    const race = payload.races.find((r) => r.id === "councillor-1")!;
    const html = card(render(payload, { ward: "1" }), "councillor-1");
    expect(tallyNames(html)).toHaveLength(race.candidates.length);
    expect(tallyNames(html)[0]).toBe("Vincent Crisanti");
    expect(text(tableRow(html, "Vincent Crisanti"))).toMatch(/6,800\s*41\.2%/);
    const total = race.candidates.reduce((sum, c) => sum + (c.votes ?? 0), 0);
    expect(text(html)).toContain(`Total votes counted${total.toLocaleString("en-CA")}`);
  });

  it("shows the table once every voting area is in", () => {
    const html = card(render(golden("all-units-in-2018.json"), { ward: "1" }), "councillor-1");
    expect(text(html)).toContain("All voting areas in");
    expect(html).toContain('class="live-table race-table"');
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
    const before = renderPage(golden("before-results-2026.json"), "home");
    expect(count(withoutMap(before), "Results from 8 p.m.")).toBe(1);
    expect(text(before)).toContain("Results from 8 p.m. · City of Toronto unofficial results");
    const none = renderPage(golden("no-units-in-2026.json"), "home");
    expect(count(none, "No voting areas have reported yet")).toBe(1);
    expect(text(none)).toMatch(/City count as of \d{1,2}:\d{2} [ap]\.m\. · No voting areas have reported yet · City of Toronto unofficial results/);
    // Once a voting area is in, the line no longer says none are.
    expect(render(golden("council-counting-2022.json"), { ward: "1" })).not.toContain("No voting areas have reported yet");
  });
});

describe("the mayor card", () => {
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

  it("orders the card: the tally, its key, the toggle, turnout, then the disclosures (audit)", () => {
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
    at("The final pre-election forecast");
    // Chow's counted-wards benchmark is cut (Alex, 2026-10-21).
    expect(tail).not.toContain("in the wards counted so far");
    expect(tail).not.toContain("About this comparison");
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

describe("the French-language boards' page", () => {
  it("says once that the boards have no estimate, and gives each contested race its section (#116)", () => {
    for (const name of ["before-results-2026.json", "no-units-in-2026.json"]) {
      const html = renderPage(golden(name), "french");
      expect(count(html, "aucune estimation pour ces conseils"), name).toBe(1);
      for (const id of ["viamonde-3", "monavenir-3", "monavenir-4"]) expect(html, name).toContain(`id="${id}"`);
      // The acclaimed areas in one line, with the approved note.
      expect(text(html), name).toMatch(/Élus par acclamation : [^]*Viamonde, quartier 2[^]*Aucun scrutin/);
    }
  });

  it("are a tab of the citywide page's trustee races, linking to their page", () => {
    const html = render(golden("before-results-2026.json"));
    expect(html).toContain(">French boards</button>");
  });
});

describe("the citywide page's races to watch", () => {
  /** A race's card in the races to watch. */
  const watch = (html: string, id: string) => {
    const start = html.indexOf(`aria-labelledby="watch-${id}"`);
    expect(start, `watch card ${id}`).toBeGreaterThan(-1);
    return html.slice(start, html.indexOf("</article>", start));
  };

  it("show the leaders' votes and shares and how much is in, and never a projection", () => {
    const html = renderPage(golden("council-counting-2022.json"), "home");
    const cards = [...html.matchAll(/aria-labelledby="watch-(councillor-\d+)"/g)].map((m) => m[1]);
    expect(cards.length).toBeGreaterThan(0);
    for (const id of cards) {
      const one = watch(html, id);
      expect(one).toMatch(/\d+ of \d+ in|All voting areas in/);
      expect(text(one)).toMatch(/\d+(\.\d)?%/);
      expect(one).not.toContain("Projected finish");
      expect(one).not.toContain("Estimated final");
    }
  });

  it("show the editor's field alone before results", () => {
    const html = renderPage(golden("before-results-2026.json"), "home");
    const one = watch(html, html.match(/aria-labelledby="watch-(councillor-\d+)"/)![1]);
    expect(one).not.toContain("Results from 8 p.m.");
    expect(text(one)).toMatch(/On the ballot: /);
  });
});

describe("names and colours (#16)", () => {
  it("name a council race's leaders by their full Ballot Name", () => {
    const html = render(
      counting2026({
        "councillor-17": ["Hassan Mubarak Noor Mohamed"],
        "councillor-21": ["Nisha Kumari"],
        "councillor-25": ["Kannan S'ree Jr"],
      }),
    );
    // The council table carries each leader's full Ballot Name.
    expect(html).toMatch(/17 Don Valley North<\/a><\/th><td>Hassan Mubarak Noor Mohamed/);
    expect(html).toMatch(/21 Scarborough Centre<\/a><\/th><td>Nisha Kumari/);
    expect(html).toMatch(/25 Scarborough-Rouge Park<\/a><\/th><td>Kannan S&#x27;ree Jr/);
  });

  it("show full Ballot Names in the tally, and Di Francesco whole", () => {
    const payload = counting2026({ "tcdsb-1": ["Jennifer Di Francesco"] });
    const ward = WARDS.find((w) => wardBallotRaceIds(w.num, trustees).includes("tcdsb-1"))!;
    const html = card(render(payload, { ward: ward.num }), "tcdsb-1");
    expect(tallyNames(html)[0]).toBe("Jennifer Di Francesco");
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

describe("never shown (#7, #12)", () => {
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
    expect(lastRow).toMatch(/^[^·]*1&lt;0\.1%/);
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

describe("gated projections and the Possible Range (#45, ADR 0002)", () => {
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
    // The key says once what each share is of (Alex, 2026-10-21); no other mark in 2022.
    expect(count(mayor, 'class="live-tally__key')).toBe(1);
    expect(text(mayor)).toContain("Share of the votes counted so far");
    expect(text(mayor)).not.toContain("Out of reach");
    expect(mayor).not.toContain("live-tally__glyph--reach");
    expect(text(mayor)).not.toContain("Possible range");
    expect(text(mayor)).not.toMatch(/certain win/i);
  });

  it("explains both ranges once per card, and the mayor's 2023 record behind 'How accurate is this estimate?'", () => {
    const html = render(golden("gated-live-2022.json"), { ward: "1" });
    const mayor = text(card(html, "mayor"));
    // The projection panel names its band (Alex); the cards' key keeps the longer wording.
    expect(mayor).toContain("99% confidence interval");
    expect(count(mayor, "99 in 100")).toBe(0);
    expect(notes(html)).toMatch(
      /<details class="live-record"><summary>How accurate is this estimate\?<\/summary>[^]*worse than expected in the 2023 by-election/,
    );
    expect(text(card(html, "councillor-1"))).not.toContain("2023 by-election");
    expect(count(text(card(html, "councillor-1")), "99% confidence interval")).toBe(1);
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
    const at = (name: string) => html.indexOf(tableRow(html, name));
    expect(html.indexOf("race-table__break")).toBeLessThan(at(third));
    expect(html.indexOf("race-table__break")).toBeGreaterThan(at(names.at(-2)!));
    expect(tableRow(html, third)).toContain("race-table__out");
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
    // The Possible Range's figures are for screen readers; the estimate is the panel beside.
    expect(tableRow(html, leader.full_name)).toMatch(/<span class="visually-hidden">Possible 40–60%<\/span>/);
    // The Mathematically Eliminated break stays.
    expect(tableRow(html, third)).toBeTruthy();
    expect(html).toContain("race-table__break");
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

  it("leaves the ranges to each race's page: the citywide council section is the count at a glance (Alex, 2026-10-21)", () => {
    const html = councilSection(renderPage(golden("gated-live-2022.json"), "home"));
    expect(text(html)).not.toContain("Projected finish");
    expect(text(html)).toMatch(/Crisanti/);
  });

  it("says why a level shows the count: its gate failed, or the projection is paused", () => {
    const html = render(golden("gated-off-2022.json"), { ward: "1" });
    expect(text(card(html, "councillor-1"))).toContain(
      "No projection for council races tonight. In replays of past election nights it did not beat simply reading the count, so this page shows the count only.",
    );
    expect(text(card(html, "mayor"))).toContain("No projection for the mayor&#x27;s race tonight.");
    const trustee = card(html, wardBallotRaceIds("1", trustees).find((id) => id.startsWith("tdsb-"))!);
    expect(text(trustee)).toContain(
      "Projection paused for school board trustee races. The count below is as the City reports it.",
    );
    expect(text(card(html, "councillor-1"))).not.toContain("Estimated final");
    // The Possible Range is arithmetic on the count and stays.
    expect(text(card(html, "councillor-1"))).toContain("Possible 4–93%");
    expect(text(councilSection(renderPage(golden("gated-off-2022.json"), "home")))).not.toContain("Projected finish");
  });

  it("notes that the French-language boards are never projected", () => {
    expect(text(renderPage(golden("no-units-in-2026.json"), "french"))).toContain(
      "Dépouillement et fourchette possible seulement : aucune estimation pour ces conseils.",
    );
  });

  it("gives a counting French-language board's race its Possible Range, and no estimate (#97)", () => {
    const payload = golden("no-units-in-2026.json");
    const race = payload.races.find((r) => r.id === "monavenir-4")!;
    race.state = "counting";
    race.progress = { received: 100, total: 389 };
    race.candidates = race.candidates.map((c, i) => ({ ...c, votes: i === 0 ? 200 : 100 / (race.candidates.length - 1) }));
    race.possible = Object.fromEntries(race.candidates.map((c, i) => [c.key, i === race.candidates.length - 1 ? { low: 1, high: 20 } : { low: 30, high: 92 }]));
    const html = card(renderPage(payload, "french"), race.id);
    expect(html).toContain("forecast-chart__bar");
    expect(html).not.toContain("mayor-projection");
    expect(text(html)).not.toContain("confidence interval");
    expect(text(html)).toContain("fourchette possible 30 à 92 %");
    // A candidate the range rules out says so.
    expect(count(text(html), "Ne peut plus gagner")).toBe(1);
  });

  it("never shows a win probability on a gated night", () => {
    for (const name of ["gated-live-2022.json", "gated-off-2022.json"]) {
      const html = render(golden(name), { ward: "1" });
      expect(html, name).not.toMatch(/chance|favou?red|odds|likely to win|probabilit/i);
    }
  });
});

describe("per-race checks and Withdrawals (#43)", () => {
  const WITHDRAWN = "No projection for this race right now.";

  it("keeps a withdrawn race's tally and says only that there is no projection", () => {
    // councillor-5's count is above its expected total: the one fault that still withdraws.
    const html = render(golden("withdrawals-2022.json"), { ward: "5" });
    const ward5 = text(card(html, "councillor-5"));
    expect(ward5).toContain(WITHDRAWN);
    expect(ward5).toContain("28 of 65 voting areas in");
    expect(ward5).not.toContain("Estimated final");
    expect(ward5).toContain("Possible");
    expect(html).not.toContain("count_above_expected");
  });

  it("hides Reporting Progress that fails its check, and the range carries on (#97)", () => {
    const html = render(golden("withdrawals-2022.json"), { ward: "3" });
    const ward3 = text(card(html, "councillor-3"));
    expect(ward3).toContain("Voting areas: not available");
    expect(ward3).not.toContain(WITHDRAWN);
    expect(ward3).toContain("Projected finish");
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
    const monavenir = text(card(renderPage(golden("council-counting-2022.json"), "french"), "monavenir-4"));
    expect(monavenir).toContain("Sections de vote : non disponible");
    expect(monavenir).not.toMatch(/sur 0\b/);
    expect(monavenir).not.toContain(WITHDRAWN);
  });
});

describe("the switches (#49)", () => {
  /** A golden as the route serves it with the given switches off. */
  function switched(name: string, off: SwitchName[]) {
    const raw = readFileSync(path.resolve(__dirname, "../../../fixtures/live/payload", name), "utf8");
    const switches = switchesFrom(SWITCHES.map((s) => (off.includes(s) ? "off" : null)));
    return serveLive({ payload: raw, heartbeats: ["1", null], switches });
  }

  const PAUSED = "Projection paused for council races. The count below is as the City reports it.";

  it("says a switched-off level's projection is paused, and the citywide page shows its count only", () => {
    const { payload } = switched("gated-live-2022.json", ["council"]);
    const html = render(payload, { ward: "1" });
    expect(text(card(html, "councillor-1"))).toContain(PAUSED);
    expect(text(card(html, "councillor-1"))).not.toContain("Estimated final");
    expect(text(card(html, "councillor-1"))).toContain("Possible ");
    expect(text(councilSection(renderPage(payload, "home")))).not.toContain("Projected finish");
    expect(text(card(html, "mayor"))).not.toContain("Projection paused");
  });

  it("pauses every level with all projections off", () => {
    const html = render(switched("gated-live-2022.json", ["projections"]).payload, { ward: "1" });
    expect(text(card(html, "mayor"))).toContain("Projection paused for the mayor&#x27;s race.");
    expect(text(card(html, "councillor-1"))).toContain(PAUSED);
    const trustee = card(html, wardBallotRaceIds("1", trustees).find((id) => id.startsWith("tdsb-"))!);
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
    expect(html).not.toMatch(/Estimated final|Possible |City count as of|voting areas in|live-tally/);
    // Nothing from the count: not its names, and no claim that nothing is counted.
    expect(text(html)).not.toMatch(/Tory|No votes counted yet|No votes have been counted|Aucune voix/);
    // Each race page keeps its heading.
    expect(card(html, "councillor-1")).toContain("<h1>Etobicoke North</h1>");
    // A paused Rehearsal still says it is one.
    const rehearsal = render({ ...payload, rehearsal: true }, { paused: true });
    expect(rehearsal).toContain("Rehearsal: not real results");
  });
});

describe("Night Close (#51)", () => {
  const ELECTED = "Elected (unofficial)";

  it("labels each fully reported race's leader 'Elected (unofficial)' only at Night Close", () => {
    const payload = golden("all-units-in-2018.json");
    expect(render(payload, { ward: "1" })).not.toContain(ELECTED);
    const html = render(payload, { ward: "1", closed: true });
    for (const [race, leader, runnerUp] of [
      ["mayor", "John Tory", "Jennifer Keesmaat"],
      ["councillor-1", "Michael Ford", "Vincent Crisanti"],
    ]) {
      const rows = text(tallyOf(card(html, race)));
      expect(count(rows, ELECTED), race).toBe(1);
      expect(rows.indexOf(ELECTED)).toBeGreaterThan(rows.indexOf(leader));
      expect(rows.indexOf(ELECTED)).toBeLessThan(rows.indexOf(runnerUp));
    }
    expect(text(councilRow(renderPage(payload, "home", { closed: true }), "1"))).toMatch(/Michael Ford[^]*Elected \(unofficial\)/);
  });

  it("never labels a race still counting, or a tie at the top, even at Night Close", () => {
    const counting = render(golden("council-counting-2022.json"), { ward: "1", closed: true });
    expect(counting).not.toContain(ELECTED);
    const payload = golden("all-units-in-2018.json");
    const ward1 = payload.races.find((r) => r.id === "councillor-1")!;
    ward1.candidates[1].votes = ward1.candidates[0].votes;
    const tied = render(payload, { ward: "1", closed: true });
    expect(card(tied, "councillor-1")).not.toContain(ELECTED);
    expect(councilRow(renderPage(payload, "home", { closed: true }), "1")).not.toContain(ELECTED);
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

  it("keeps a council row's label when the leader's share is missing", () => {
    const payload = golden("all-units-in-2018.json");
    payload.races.find((r) => r.id === "councillor-1")!.candidates[0].share = null;
    expect(text(councilRow(renderPage(payload, "home", { closed: true }), "1"))).toMatch(/Michael Ford[^]*Elected \(unofficial\)/);
  });

  it("hides the final forecast at Night Close", () => {
    expect(render(golden("mayor-counting-2023.json"), { closed: true })).not.toContain("The final pre-election forecast");
  });
});

describe("acclaimed races (#117)", () => {
  const acclaimedTrustees = SETUPS.filter((s) => s.kind === "trustee" && s.acclaimed);

  it("show the candidate, the approved wording and no vote", () => {
    for (const name of ["before-results-2026.json", "no-units-in-2026.json"]) {
      const payload = golden(name);
      for (const setup of acclaimedTrustees) {
        const html = text(renderPage(payload, setup));
        expect(html, `${name} ${setup.id}`).toContain(WORDING.acclaimedNote);
        expect(html, `${name} ${setup.id}`).toContain(WORDING.acclaimed);
      }
      // The French boards' acclaimed areas, in one line.
      expect(text(renderPage(payload, "french")), name).toMatch(/Élus par acclamation : [^]*Geneviève Oger/);
    }
  });

  it("never carry Elected (unofficial), even after Night Close", () => {
    const payload = golden("no-units-in-2026.json");
    for (const setup of acclaimedTrustees) expect(renderPage(payload, setup, { closed: true })).not.toContain("Elected (unofficial)");
    const french = renderPage(payload, "french", { closed: true });
    expect(french).not.toContain("badge--status");
  });
});

describe("Brad Bradford in full (#121)", () => {
  it("names him in full on a ward page, as Olivia Chow is", () => {
    const html = card(render(counting2026({ mayor: ["Brad Bradford", "Olivia Chow"] }), { ward: "9" }), "mayor");
    expect(tallyNames(html).slice(0, 2)).toEqual(["Brad Bradford", "Olivia Chow"]);
  });
});

describe("a race page against the last election", () => {
  const counting = () => counting2026({});
  const prior = (html: string) => text(html.slice(html.indexOf('id="race-prior"'), html.indexOf("</section>", html.indexOf('id="race-prior"'))));

  it("sets the incumbent's last result beside tonight's", () => {
    const html = card(render(counting(), { ward: "1" }), "councillor-1");
    expect(prior(html)).toContain("Vincent Crisanti");
    expect(prior(html)).toContain("2022");
  });

  it("names a by-election as one", () => {
    expect(prior(card(render(counting(), { ward: "15" }), "councillor-15"))).toContain("2024 by-election");
  });
});

describe("the voters' list bar", () => {
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
  });

  it("while counting, splits the counted votes by candidate and hatches the rest as not yet known", () => {
    const payload = counting2026({ mayor: ["Brad Bradford", "Olivia Chow"] });
    const mayor = payload.races.find((r) => r.id === "mayor")!;
    const html = bar(card(render(payload), "mayor"));
    const bradford = mayor.candidates.find((c) => c.full_name === "Brad Bradford")!;
    expect(html).toContain(w((100 * bradford.votes!) / T.city.electors_2026));
    expect(html).toContain("live-turnout__seg--pending");
    expect(text(html)).toMatch(/[\d.]+% counted so far/);
    expect(text(html)).not.toMatch(/[\d.]+% voted/);
    // A council race has its ward's voters' list too, with its 2022 turnout marked (Alex).
    const council = card(render(payload, { ward: "9" }), "councillor-9");
    expect(council).toContain("live-turnout");
    expect(text(council)).toMatch(/Turnout in 2022: [\d.]+%/);
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

describe("the results audit (2026-10-20)", () => {
  it("heads the French-language boards' page with its own heading", () => {
    expect(renderPage(golden("no-units-in-2026.json"), "french")).toMatch(/<h1>Conseils scolaires de langue française<\/h1>/);
  });

  it("groups thousands in voting-area counts", () => {
    expect(text(render(golden("mayor-counting-2023.json")))).toContain("1,221 of 1,451");
    expect(text(render(golden("council-counting-2022.json"), { ward: "1" }))).toContain("1,535 voting areas in");
  });

  it("sets the mayor's turnout after its candidates", () => {
    const html = card(render(golden("gated-live-2022.json"), { ward: "1" }), "mayor");
    expect(html.indexOf('class="live-turnout"')).toBeGreaterThan(html.indexOf("live-tally__axis"));
  });
});

describe("the mayor leads the page", () => {
  /** The markup of the mayor lead section. */
  const lead = (html: string) => {
    const start = html.indexOf('class="mayor-lead"');
    return start < 0 ? "" : html.slice(start, html.indexOf("</section>", start));
  };

  it("opens with the mayor's two leaders, their estimated finals and the count lead, after the status line", () => {
    // 2022 mid-count golden: Tory 62.42% (55–67%), Penalosa 18.09% (16–26%), 767 of 1,535 voting areas.
    const html = render(golden("gated-live-2022.json"));
    const section = text(lead(html));
    expect(section).toMatch(/Tory John[^]*62\.4%/);
    expect(section).not.toContain("Estimated final 55–67%");
    expect(text(section)).toContain("55–67%");
    expect(section).toMatch(/Penalosa Gil[^]*18\.1%/);
    expect(text(section)).toContain("16–26%");
    expect(section).toContain("29 other candidates");
    expect(text(section)).not.toContain("In the count");
    expect(section).toContain("Voting areas in767 of 1,535");
    expect(html.indexOf('class="mayor-lead"')).toBeGreaterThan(html.indexOf('class="results-bar"'));
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

  it("with everything in and no estimate, shows the final count", () => {
    const section = text(lead(render(golden("all-units-in-2018.json"))));
    // The votes counted lead (2018: 479,659), the share beside them.
    expect(section).toMatch(/John Tory[^]*479,659[^]*63\.5%/);
    expect(section).not.toContain("Estimated final");
    expect(section).toContain("Voting areas inAll in");
  });

  it("before results, shows the mayor's card, with no lead", () => {
    const html = render(golden("before-results-2026.json"));
    expect(lead(html)).toBe("");
    expect(html).toContain('id="live-race-mayor"');
  });

  it("puts the status in one bar under one heading on every page", () => {
    const html = render(golden("gated-live-2022.json"), { ward: "1" });
    for (const page of html.split("<!--page:")) {
      expect(count(page, 'class="results-bar"')).toBe(1);
      expect(count(page, "<h1")).toBe(1);
    }
    expect(html).toMatch(/class="results-bar"[^]*City count as of/);
  });
});

describe("the projected finish beside the mayor's leaders", () => {
  const panel = (html: string) => {
    const at = html.indexOf('class="mayor-projection"');
    return at < 0 ? "" : html.slice(at, html.indexOf("</figure>", at));
  };

  it("gives the two leaders' central projections large, and their ranges on one axis", () => {
    // 2022 golden, the band shown: Tory mid 62.33 (58.84–65.48), Penalosa mid 17.93 (16.19–20.59).
    const p = panel(render(golden("gated-live-2022.json")));
    expect(text(p)).toContain("Projected finish");
    expect(text(p)).toMatch(/Tory John[^]*62\.3%[^]*Penalosa Gil[^]*17\.9%/);
    expect(text(p)).toContain("55–67%");
    expect(text(p)).toContain("16–26%");
    expect(count(p, 'class="mayor-projection__range"')).toBe(2);
  });

  it("is absent when no Estimated Range shows", () => {
    expect(panel(render(golden("all-units-in-2018.json")))).toBe("");
  });
});

describe("a result with missing figures", () => {
  it("shows a dash, never 0, for a candidate the City gives no votes", () => {
    const payload = golden("council-counting-2022.json");
    const race = payload.races.find((r) => r.id === "councillor-1")!;
    race.candidates = race.candidates.slice(0, 3).map((c, i) => (i === 2 ? { ...c, votes: null, share: null } : c));
    const html = card(render(payload, { ward: "1" }), "councillor-1");
    expect(count(tableRow(html, race.candidates[2].full_name), '<td class="live-num">–</td>')).toBe(2);
  });
});

describe("every page on every golden (results redesign, Phase 2)", () => {
  const DIR = path.resolve(__dirname, "../../../fixtures/live/payload");
  const RAW = [
    ...readdirSync(DIR).filter((f) => f.endsWith(".json")).map((f) => [f, readFileSync(path.join(DIR, f), "utf8")] as const),
    ["mock-night", readFileSync(path.resolve(__dirname, "../../../fixtures/live/mock-night/payload.json"), "utf8")] as const,
  ];
  const PAGES: Page[] = ["home", "french", ...SETUPS.filter((s) => s.kind !== "french")];
  const name = (page: Page) => (typeof page === "string" ? page : page.id);

  it.each(RAW)("renders %s as the route serves it, open and at Night Close, with nothing unformatted", (_, raw) => {
    const { payload } = serveLive({ payload: raw, heartbeats: ["1", null], switches: switchesFrom(SWITCHES.map(() => null)) });
    for (const closed of [false, true]) {
      for (const page of PAGES) {
        const html = text(renderPage(payload, page, { closed }));
        expect(html, `${name(page)} closed=${closed}`).not.toMatch(/(?<![\d.])0\.0%|NaN|undefined|Infinity|\[object Object\]/);
      }
    }
  });
});
