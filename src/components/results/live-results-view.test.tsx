import { readFileSync } from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import councilFixture from "../../../fixtures/council_race_cards.json";
import forecastFixture from "../../../fixtures/mayoral_forecast.json";
import trusteeFixture from "../../../fixtures/trustee_race_cards.json";
import { marginOutcomes, type MarginOutcomesView } from "@/lib/mayoral-forecast";
import { resultsWards, type ResultsWard } from "@/lib/results-wards";
import { RESULTS_WARDS, wardBallotRaceIds } from "@/lib/ward-ballot";
import type { CouncilRaceCardsFeed, MayoralForecastFeed, TrusteeRaceCardsFeed } from "@/types/feeds";
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
const FORECAST: MarginOutcomesView = marginOutcomes(forecastFixture as unknown as MayoralForecastFeed)!;

const MINUTE = 60_000;

/** Render `/results/` (no ward) or `/results/<ward>/` as a reader whose newest
 *  heartbeat is `age` ms old. */
function render(
  payload: LivePayload,
  {
    ward = null as string | null,
    age = MINUTE,
    failures = 0,
    forecast = FORECAST as MarginOutcomesView | null,
  } = {},
) {
  const heartbeat = Math.max(payload.seq.all_office, payload.seq.ward_by_ward);
  return renderToStaticMarkup(
    <LiveResultsView
      state={{ results: { heartbeat, payload }, failures }}
      now={heartbeat + age}
      wards={WARDS}
      ward={WARDS.find((w) => w.num === ward) ?? null}
      ballot={ward === null ? [] : wardBallotRaceIds(ward, trustees)}
      forecast={forecast}
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
    expect(html).toContain('class="forecast-chart live-tally"');
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
    expect(html).toMatch(/href="\/results\/1"><h3[^>]*>Ward 1 · <span>Etobicoke North<\/span><\/h3>/);
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

  it("before the first good poll, shows the picker, a loading line and the tiles, then the notice after three failures", () => {
    const view = (failures: number) =>
      renderToStaticMarkup(
        <LiveResultsView
          state={{ results: null, failures }}
          now={0}
          wards={WARDS}
          ward={null}
          ballot={[]}
          forecast={FORECAST}
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
  it("draws each candidate's counted share as a bar, with the share and votes beside it", () => {
    const html = card(render(golden("council-counting-2022.json"), { ward: "1" }), "councillor-1");
    expect(html).toMatch(/<span class="live-tally__name">Vincent Crisanti<\/span>/);
    expect(html).toMatch(/class="forecast-chart__bar" style="width:41\.2%;background:var\(--color-disengaged\)"/);
    expect(html).toContain("41.2%");
    expect(html).toContain("6,800 votes");
    // Every candidate, none folded, in the payload's order.
    expect(tallyNames(html)).toHaveLength(16);
    expect(html).not.toContain("other candidates");
  });

  it("shows the tally once every voting area is in", () => {
    const html = card(render(golden("all-units-in-2018.json"), { ward: "1" }), "councillor-1");
    expect(html).toContain("All voting areas in");
    expect(html).toContain('class="forecast-chart live-tally"');
  });

  it("before 8 p.m. and before the first voting area, lists the names in ballot order with no bars", () => {
    const before = render(golden("before-results-2026.json"), { ward: "14" });
    const none = render(golden("no-units-in-2026.json"), { ward: "14" });
    for (const html of [before, none]) {
      const council = card(html, "councillor-14");
      expect(council).not.toContain("live-tally");
      expect(council).toContain("Maqsood Ahmad");
    }
    expect(card(none, "councillor-14")).toContain("No voting areas have reported yet");
    expect(card(before, "councillor-14")).toContain("Results from 8 p.m.");
  });
});

describe("LiveResultsView: the mayor card", () => {
  it("folds the counted field to the top four and 'N other candidates'", () => {
    const payload = golden("mayor-counting-2023.json");
    const mayor = payload.races[0];
    const html = card(render(payload), "mayor");
    expect(tallyNames(html)).toEqual([...mayor.candidates.slice(0, 4).map((c) => c.full_name), "98 other candidates"]);
    expect(html).not.toContain(mayor.candidates[4].full_name);
    const rest = mayor.candidates.slice(4);
    const restVotes = rest.reduce((sum, c) => sum + c.votes!, 0);
    expect(html).toContain(`${restVotes.toLocaleString("en-CA")} votes`);
  });

  it("shows a field of five whole, and folds six to four and '2 other candidates'", () => {
    const five = golden("mayor-counting-2023.json");
    five.races[0].candidates = five.races[0].candidates.slice(0, 5);
    expect(tallyNames(card(render(five), "mayor"))).toHaveLength(5);
    const six = golden("mayor-counting-2023.json");
    six.races[0].candidates = six.races[0].candidates.slice(0, 6);
    expect(tallyNames(card(render(six), "mayor")).at(-1)).toBe("2 other candidates");
  });

  it("never folds before results", () => {
    const html = card(render(golden("before-results-2026.json")), "mayor");
    expect(html).not.toContain("other candidates");
    expect(html).toContain("Braeden Chow");
  });

  it("on a ward's page, adds that ward's mayoral vote with its Reporting Progress", () => {
    const payload = golden("mayor-counting-2023.json");
    const html = card(render(payload, { ward: "1" }), "mayor");
    expect(html).toContain("Mayoral vote in Ward 1");
    expect(html).toContain("49 of 52 voting areas in");
    // Ward 1's top three by votes, as shares of its 16,744 counted.
    expect(text(html)).toContain("Ana Bailão 32.8% · Olivia Chow 27.5% · Mark Saunders 15.3%");
    expect(card(render(payload), "mayor")).not.toContain("Mayoral vote in Ward");
    expect(card(render(golden("before-results-2026.json"), { ward: "1" }), "mayor")).not.toContain(
      "Mayoral vote in Ward",
    );
  });

  it("keeps the final forecast collapsed, labelled as neither the count nor the projection", () => {
    for (const name of ["before-results-2026.json", "mayor-counting-2023.json"]) {
      const html = card(render(golden(name)), "mayor");
      expect(html).toMatch(/<div class="faq"><details class="live-forecast"><summary>The final pre-election forecast<\/summary>/);
      expect(html).toContain("It is not the count and not the projection.");
      expect(html).toContain("Chow ahead by 2 or more");
    }
  });

  it("hides the final forecast once the count is complete, or when there is none", () => {
    expect(render(golden("all-units-in-2018.json"))).not.toContain("The final pre-election forecast");
    expect(render(golden("mayor-counting-2023.json"), { forecast: null })).not.toContain(
      "The final pre-election forecast",
    );
  });
});

describe("LiveResultsView: the French-language boards", () => {
  it("sit behind 'Voting for a French-language board?', after TDSB and TCDSB", () => {
    const html = render(golden("before-results-2026.json"), { ward: "14" });
    const summary = html.indexOf("<summary>Voting for a French-language board?</summary>");
    expect(summary).toBeGreaterThan(html.indexOf('id="live-race-tcdsb-'));
    expect(html.indexOf('id="live-race-viamonde-')).toBeGreaterThan(summary);
    expect(html.indexOf('id="live-race-monavenir-')).toBeGreaterThan(summary);
    expect(html.slice(0, summary)).toMatch(/<div class="faq"><details class="live-french">$/);
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
    expect(html).toContain('<p class="t-meta live-tile__ranges" data-ranges=""></p>');
  });

  it("show the state alone before results", () => {
    const html = tile(render(golden("before-results-2026.json")), "1");
    expect(html).toContain("Results from 8 p.m.");
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
    const payload = counting2026({ mayor: ["Braeden Chow", "Olivia Chow", "Brad Bradford"] });
    const html = card(render(payload, { ward: "1" }), "mayor");
    expect(text(html)).toMatch(/Braeden Chow [\d.]+% · Olivia Chow [\d.]+% · Bradford [\d.]+%/);
    // The ward line marks the forecast-named candidates too.
    const line = html.slice(html.indexOf("Mayoral vote in Ward 1"));
    expect(line).toMatch(/candidate-marker--chow[^]*Olivia Chow/);
    expect(line).toMatch(/candidate-marker--bradford[^]*Bradford/);
    expect(line.slice(0, line.indexOf("Braeden Chow"))).not.toContain("candidate-marker");
    const row = (name: string) => {
      const at = html.indexOf(`<span class="live-tally__name">${name}</span>`);
      return html.slice(html.lastIndexOf('<div class="forecast-chart__row"', at), html.indexOf("</strong>", at));
    };
    expect(row("Olivia Chow")).toContain("candidate-marker--chow");
    expect(row("Olivia Chow")).toContain("background:var(--color-chow)");
    expect(row("Brad Bradford")).toContain("background:var(--color-bradford)");
    expect(row("Braeden Chow")).not.toContain("candidate-marker");
    expect(row("Braeden Chow")).toContain("background:var(--color-disengaged)");
  });
});

describe("LiveResultsView: never shown (#7, #12)", () => {
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
    return cardHtml.slice(cardHtml.lastIndexOf('<div class="forecast-chart__row"', at), cardHtml.indexOf("</strong>", at));
  }

  it("draws each candidate's Estimated and Possible Ranges over their counted-share bar", () => {
    const mayor = card(render(golden("gated-live-2022.json"), { ward: "1" }), "mayor");
    expect(text(mayor)).toContain("Estimated final 59–65% · possible 9–94%");
    const tory = row(mayor, "Tory John");
    expect(tory).toContain('class="forecast-chart__band forecast-chart__band--hatched" style="left:9.4%;width:84.94');
    expect(tory).toMatch(/class="forecast-chart__band" style="left:58.84%;width:6.6/);
    expect(tory).toContain('class="forecast-chart__tick" style="left:62.33%');
    // The folded row stands for many candidates and carries no range.
    expect(row(mayor, "27 other candidates")).not.toContain("forecast-chart__band");
  });

  it("explains both ranges once per card, and the mayor's 2023 record while it is live on approval", () => {
    const html = render(golden("gated-live-2022.json"), { ward: "1" });
    const mayor = text(card(html, "mayor"));
    expect(mayor).toContain("Estimated: where the final share lands in 9 of 10 simulated finishes.");
    expect(mayor).toContain("Possible: from none to all of the votes still to be counted.");
    expect(mayor).toContain("worse than expected in the 2023 by-election");
    expect(text(card(html, "councillor-1"))).not.toContain("2023 by-election");
    expect(count(text(card(html, "councillor-1")), "Estimated: where")).toBe(1);
  });

  it("shows only the Possible Range when the approved mayor has no Estimated Range at a refresh", () => {
    const payload = golden("gated-live-2022.json");
    const mayor = payload.races.find((r) => r.id === "mayor")!;
    mayor.projection = { ...mayor.projection!, shown: null, bands: {} };
    const html = card(render(payload, { ward: "1" }), "mayor");
    expect(text(html)).toContain("Possible 9–94%");
    expect(text(html)).not.toContain("Estimated final");
    expect(row(html, "Tory John")).not.toMatch(/class="forecast-chart__band" /);
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
    expect(text(html)).toContain(
      "No projection for the French-language boards: there are no past results by voting area to test one against.",
    );
  });

  it("never shows a win probability on a gated night", () => {
    for (const name of ["gated-live-2022.json", "gated-off-2022.json"]) {
      const html = render(golden(name), { ward: "1" });
      expect(html, name).not.toMatch(/chance|favou?red|odds|likely to win|probabilit/i);
    }
  });
});
