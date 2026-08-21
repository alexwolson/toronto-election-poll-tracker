import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Regression for confident-primary-page-copy/01. The homepage, Polls page,
 * council index, and ward-detail pages present their forecast/polling/candidate
 * information directly; the repeated methodological qualifications, defensive
 * "this is not a forecast" caveats, internal jargon, and duplicated attribution
 * belong to How It Works, not the primary routes.
 *
 * These pages are Next 16 async server components (the Polls page also mounts a
 * recharts client component that needs a DOM), and the repo has no render
 * harness, so this guard scans the route source: the retired copy must be gone,
 * and the retained facts/controls must remain. Orphaned-wrapper / awkward-gap
 * coverage comes from the static-export build, not this test.
 */

const root = process.cwd();
const read = (p: string) => readFileSync(path.join(root, p), "utf8");

const HOME = read("src/app/page.tsx");
const POLLS = read("src/app/polls/page.tsx");
const WARDS_INDEX = read("src/app/wards/page.tsx");
const WARD_DETAIL = read("src/app/wards/[ward_num]/page.tsx");
const HERO = read("src/components/forecast-hero.tsx");
const MASTHEAD = read("src/components/masthead-nav.tsx");

// Methodology qualifications / internal vocabulary retired from every primary
// route. Matched case-insensitively so "No win probabilities" and
// "no win probabilities" are both caught.
const RETIRED_PHRASES = [
  "confirmed field",
  "final-ballot",
  "fired exposure trigger",
  "fired trigger",
  "attention markers",
  "not a forecast",
  "not the forecast",
  "not a modelled average",
  "not a prediction",
  "no win probabilities",
  "not win probabilities",
  "most recent reading",
  "full polling record",
  "elevated exposure",
  "raw polls",
  "descriptive trend",
  "loess smoother",
  "base_rate_note",
  "historical context",
];

const LITERAL_COPY_PAGES: Record<string, string> = {
  "homepage": HOME,
  "Polls page": POLLS,
  "council index": WARDS_INDEX,
  "ward detail": WARD_DETAIL,
};

describe("primary pages drop retired methodology copy", () => {
  for (const [name, src] of Object.entries(LITERAL_COPY_PAGES)) {
    const lower = src.toLowerCase();
    for (const phrase of RETIRED_PHRASES) {
      it(`${name} contains no "${phrase}"`, () => {
        expect(lower).not.toContain(phrase);
      });
    }
  }

  it("forecast hero drops the evidence-basis line", () => {
    // The line's text is feed-derived, so guard the element + its source call.
    expect(HERO).not.toContain("evidence-basis");
    expect(HERO).not.toContain("evidenceBasisLine");
  });

  it("ward detail drops the standalone CDI attribution footer", () => {
    expect(WARD_DETAIL).not.toContain("Council Defeatability Index by Matt Elliott");
    expect(WARD_DETAIL).not.toContain("City Hall Watcher");
  });

  it("incumbent explanation keeps the simple, uncaveated heading", () => {
    expect(WARD_DETAIL).toContain("Why this race draws attention");
    expect(WARD_DETAIL).not.toContain("Why this race draws attention —");
  });
});

describe("primary pages keep their facts and controls", () => {
  it("forecast hero keeps the band board", () => {
    expect(HERO).toContain("band-board");
  });

  it("Polls page keeps the chart, archive, and actual poll metadata", () => {
    expect(POLLS).toContain("<PollingChart");
    expect(POLLS).toContain("<PollArchive");
    expect(POLLS).toContain("polls on file");
  });

  it("council index keeps the ward browser", () => {
    expect(WARDS_INDEX).toContain("<WardsBrowser");
  });

  it("ward detail keeps exposure facts and candidate-level history hints", () => {
    expect(WARD_DETAIL).toContain("incumbentExposureFacts");
    expect(WARD_DETAIL).toContain("ownHistorySignals");
    expect(WARD_DETAIL).not.toContain("notableChallengers");
  });
});

describe("How It Works stays reachable as the methodology destination", () => {
  // The How It Works page itself is owned by the parallel methodology redesign,
  // so this guard only asserts the primary routes still link to it — not its
  // content. The centralized attribution/methodology lives in that page.
  it("remains reachable from the masthead nav", () => {
    expect(MASTHEAD).toContain("/how-it-works");
  });
});
