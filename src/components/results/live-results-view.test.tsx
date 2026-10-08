import { readFileSync } from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { LivePayload } from "@/types/live";
import { LiveResultsView } from "./live-results-view";

// Seam 7 (#17): the minimal /results/ page rendered from the golden payloads.
function golden(name: string): LivePayload {
  return JSON.parse(
    readFileSync(path.resolve(__dirname, "../../../fixtures/live/payload", name), "utf8"),
  ) as LivePayload;
}

const MINUTE = 60_000;

/** Render as a reader whose newest heartbeat is `age` ms old. */
function render(payload: LivePayload, { age = MINUTE, failures = 0 } = {}) {
  const heartbeat = Math.max(payload.seq.all_office, payload.seq.ward_by_ward);
  return renderToStaticMarkup(
    <LiveResultsView state={{ results: { heartbeat, payload }, failures }} now={heartbeat + age} />,
  );
}

function count(html: string, text: string): number {
  return html.split(text).length - 1;
}

describe("LiveResultsView", () => {
  it("before 8 p.m., shows every race in ballot order with no count", () => {
    const payload = golden("before-results-2026.json");
    const html = render(payload);
    expect(count(html, "Results from 8 p.m.")).toBe(payload.races.length);
    expect(html).not.toContain("City count as of");
    expect(html).not.toContain("voting areas in");
    expect(html).not.toContain("live-progress");
    // Ballot order: the payload's order, mayor first, then council by ward.
    const titles = [...html.matchAll(/<h3[^>]*>([^<]*)<\/h3>/g)].map((m) => m[1]);
    expect(titles.slice(0, 3)).toEqual(["Mayor", "Ward 1 Etobicoke North", "Ward 2 Etobicoke Centre"]);
    expect(titles).toContain("TDSB Ward 1");
    expect(titles).toContain("Viamonde Ward 2");
    expect(titles).toHaveLength(payload.races.length);
    const mayor = payload.races[0].candidates.map((c) => c.full_name);
    const shown = html.slice(0, html.indexOf("Ward 1 Etobicoke North"));
    let at = 0;
    for (const name of mayor) {
      const found = shown.indexOf(name, at);
      expect(found, name).toBeGreaterThan(at);
      at = found;
    }
  });

  it("while counting, shows each race's tally, Reporting Progress and the City count time", () => {
    const html = render(golden("council-counting-2022.json"));
    // The older of the two seqs (both 9:46 p.m. here).
    expect(html).toContain("City count as of 9:46 p.m.");
    expect(html).toContain("51 of 55 voting areas in");
    expect(html).toMatch(/class="live-progress__fill" style="width:92\.7\d*%"/);
    expect(html).toContain("Vincent Crisanti");
    expect(html).toContain("6,800");
    expect(html).toContain("41.2%");
    expect(html).toContain("No voting areas have reported yet");
    // CHW and repo components only: a Card per race, the ward-poll results table.
    expect(count(html, '<section class="card"')).toBe(65);
    expect(html).toContain('<table class="ward-poll-results">');
    expect(html).toContain("Benoit Fortin was acclaimed: the only candidate, so there is no vote.");
    expect(html).not.toContain("Results from 8 p.m.");
    expect(html).not.toContain("Rehearsal: not real results");
    expect(html).not.toContain("may be out of date");
  });

  it("takes the City count time from the older seq", () => {
    // all_office 8:56 p.m., ward_by_ward 8:26 p.m.
    expect(render(golden("mayor-counting-2023.json"), { age: MINUTE })).toContain("City count as of 8:26 p.m.");
  });

  it("shows fully reported and unreadable races in their own words", () => {
    expect(render(golden("all-units-in-2018.json"))).toContain("All voting areas in");
    expect(render(golden("no-figures-2026.json"))).toContain(
      "No figures from the City for this race right now",
    );
  });

  it("says Reporting Progress is not available when a counting race has none", () => {
    const payload = golden("council-counting-2022.json");
    const race = payload.races.find((r) => r.id === "councillor-1")!;
    race.progress = null;
    const html = render(payload);
    expect(html).toContain("Voting areas: not available");
    expect(html).toContain("Vincent Crisanti");
  });

  it("shows the staleness banner only when the newest heartbeat is over 5 minutes old", () => {
    const payload = golden("council-counting-2022.json");
    expect(render(payload, { age: 5 * MINUTE })).not.toContain("may be out of date");
    const stale = render(payload, { age: 5 * MINUTE + 1 });
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
    expect(render(payload, { failures: 2 })).not.toContain("Can&#x27;t reach live results");
    const html = render(payload, { failures: 3 });
    expect(html).toContain('<p class="callout" role="status">Can&#x27;t reach live results; retrying</p>');
    expect(html).toContain("51 of 55 voting areas in");
  });

  it("before the first good poll, shows a loading line, then the notice after three failures", () => {
    const loading = renderToStaticMarkup(<LiveResultsView state={{ results: null, failures: 0 }} now={0} />);
    expect(loading).toContain("Loading live results");
    const failed = renderToStaticMarkup(<LiveResultsView state={{ results: null, failures: 3 }} now={0} />);
    expect(failed).toContain("Can&#x27;t reach live results; retrying");
  });
});
