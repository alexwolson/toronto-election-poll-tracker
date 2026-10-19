// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import path from "node:path";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { LivePayload, LiveRace } from "@/types/live";
import { RaceCard } from "./race-cards";

afterEach(cleanup);

function mayor(): { race: LiveRace; levels: LivePayload["levels"] } {
  const payload = JSON.parse(
    readFileSync(path.resolve(__dirname, "../../../fixtures/live/payload/gated-live-2022.json"), "utf8"),
  ) as LivePayload;
  return { race: payload.races.find((r) => r.id === "mayor")!, levels: payload.levels };
}

const names = () => [...document.querySelectorAll(".live-tally__name")].map((el) => el.textContent);

describe("RaceCard: the mayor's folded field", () => {
  it("expands to every candidate and folds back", () => {
    const { race, levels } = mayor();
    const n = race.candidates.length;
    render(<RaceCard race={race} levels={levels} />);
    expect(names()).toHaveLength(3);
    const button = screen.getByRole("button", { name: `Show all ${n} candidates` });
    expect(button.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(button);
    expect(names()).toEqual(race.candidates.map((c) => c.full_name));
    expect(names()).not.toContain(`${n - 2} other candidates`);
    const fewer = screen.getByRole("button", { name: "Show fewer" });
    expect(fewer.getAttribute("aria-expanded")).toBe("true");
    fireEvent.click(fewer);
    expect(names()).toHaveLength(3);
  });

  it("puts each expanded candidate on the right side of the eliminated break", () => {
    const { race, levels } = mayor();
    const [a, b, c, ...rest] = race.candidates;
    // The third candidate is still in it; everyone after is out.
    race.possible = {
      [a.key]: { low: 30, high: 50 },
      [b.key]: { low: 28, high: 48 },
      [c.key]: { low: 10, high: 31 },
      ...Object.fromEntries(rest.map((r) => [r.key, { low: 0, high: 20 }])),
    };
    render(<RaceCard race={race} levels={levels} />);
    fireEvent.click(screen.getByRole("button", { name: /^Show all/ }));
    const breakEl = document.querySelector(".live-tally__break")!;
    const third = [...document.querySelectorAll(".live-tally__name")].find((el) => el.textContent === c.full_name)!;
    const fourth = [...document.querySelectorAll(".live-tally__name")].find((el) => el.textContent === rest[0].full_name)!;
    expect(third.compareDocumentPosition(breakEl) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(fourth.compareDocumentPosition(breakEl) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy();
    expect(third.closest(".forecast-chart__row")!.querySelector(".live-tally__win")).toBeNull();
  });
});

describe("RaceCard: Chow's counted-wards benchmark (#109)", () => {
  const night = JSON.parse(
    readFileSync(path.resolve(__dirname, "../../../fixtures/live/mock-night/payload.json"), "utf8"),
  ) as LivePayload;
  /** The night's mayor race with only Etobicoke's wards 1–3 counted. */
  const etobicokeFirst = (): LiveRace => {
    const race = structuredClone(night.races.find((r) => r.id === "mayor")!);
    race.wards = race.wards!.map((w) => (["1", "2", "3"].includes(w.num) ? w : { ...w, votes_counted: 0, votes: null }));
    return race;
  };
  const line = () => document.querySelector(".live-benchmark");

  it("sets Chow's 2023 share in the wards counted so far against her 2023 citywide share", () => {
    render(<RaceCard race={etobicokeFirst()} levels={night.levels} />);
    // Wards 1–3 weighted by their counted votes: well under her 37.2% citywide.
    // A sentence that reads right wherever it wraps (Alex, phone): never "Wards counted so far: Olivia Chow".
    expect(line()!.textContent).toMatch(/^In 2023, Olivia Chow won 2\d\.\d% in the wards counted so far, and 37\.2% citywide\.$/);
  });

  it("explains itself, and its limit, behind a disclosure", () => {
    render(<RaceCard race={etobicokeFirst()} levels={night.levels} />);
    const summary = screen.getByText("About this comparison");
    expect(summary.tagName).toBe("SUMMARY");
    const answer = summary.closest("details")!.textContent!;
    expect(answer).toContain("not which voting areas within them");
    expect(answer).toContain("not an estimate of tonight’s result");
  });

  it("names her as the count does, by candidacy", () => {
    const race = etobicokeFirst();
    race.candidates = race.candidates.map((c) => (c.key === "Olivia Chow" ? { ...c, short_label: "O. Chow" } : c));
    render(<RaceCard race={race} levels={night.levels} />);
    expect(line()!.textContent).toMatch(/^In 2023, O\. Chow won /);
  });

  it("is not shown after Night Close, even while the race still reads counting", () => {
    render(<RaceCard race={etobicokeFirst()} levels={night.levels} closed />);
    expect(line()).toBeNull();
    expect(screen.queryByText("About this comparison")).toBeNull();
  });

  it("is not shown once every voting area is in, nor on other races", () => {
    render(<RaceCard race={{ ...etobicokeFirst(), state: "all_units_in" }} levels={night.levels} />);
    expect(line()).toBeNull();
    cleanup();
    render(<RaceCard race={night.races.find((r) => r.id === "councillor-1")!} levels={night.levels} />);
    expect(line()).toBeNull();
  });
});
