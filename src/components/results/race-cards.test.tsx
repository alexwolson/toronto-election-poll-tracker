// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import path from "node:path";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { LivePayload, LiveRace } from "@/types/live";
import { RaceCard, estimated } from "./race-cards";
import { RaceResult } from "./mayor-lead";

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
    // The folded row's name is the toggle (Alex): "51 other candidates" with a down arrow.
    const button = screen.getByRole("button", { name: `${n - 2} other candidates` });
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
    fireEvent.click(screen.getByRole("button", { name: /other candidates$/ }));
    const breakEl = document.querySelector(".live-tally__break")!;
    const third = [...document.querySelectorAll(".live-tally__name")].find((el) => el.textContent === c.full_name)!;
    const fourth = [...document.querySelectorAll(".live-tally__name")].find((el) => el.textContent === rest[0].full_name)!;
    expect(third.compareDocumentPosition(breakEl) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(fourth.compareDocumentPosition(breakEl) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy();
    expect(third.closest(".forecast-chart__row")!.querySelector(".live-tally__win")).toBeNull();
  });
});

describe("RaceResult: the projected finish (Alex, 2026-10-21)", () => {
  const night = JSON.parse(
    readFileSync(path.resolve(__dirname, "../../../fixtures/live/mock-night/payload.json"), "utf8"),
  ) as LivePayload;
  const race = night.races.find((r) => r.id === "councillor-12")!;
  const panel = () => document.querySelector<HTMLElement>(".mayor-projection")!;
  const rows = () => panel().querySelectorAll(".mayor-projection__row").length;

  it("labels its axis sparsely enough to read: at most six ticks", () => {
    render(<RaceResult race={race} levels={night.levels} closed={false} />);
    expect(panel().querySelectorAll(".mayor-projection__ticks > span").length).toBeLessThanOrEqual(6);
  });

  it("shows the two leaders on the axis, the next three in a table and everyone else in one row (the prototype)", () => {
    render(<RaceResult race={race} levels={night.levels} closed={false} />);
    expect(rows()).toBe(2);
    const ranged = Object.keys(estimated(race)!).length;
    const rest = panel().querySelectorAll(".mayor-projection__rest tbody tr");
    expect(rest.length).toBe(Math.min(3, ranged - 2) + (ranged - 2 > 3 ? 1 : 0));
    expect(panel().querySelectorAll(".mayor-projection__ticks > span").length).toBeLessThanOrEqual(6);
  });
});

describe("Large coloured figures stay readable (Alex, 2026-10-21)", () => {
  const night = JSON.parse(
    readFileSync(path.resolve(__dirname, "../../../fixtures/live/mock-night/payload.json"), "utf8"),
  ) as LivePayload;
  const race = night.races.find((r) => r.id === "councillor-12")!;

  it("darkens each candidate's colour towards the ink for the big vote and projected figures; bars keep it pure", () => {
    render(<RaceResult race={race} levels={night.levels} closed={false} />);
    const figures = [...document.querySelectorAll<HTMLElement>(".live-tally__value, .mayor-projection__figures strong")].filter((el) => el.style.color);
    expect(figures.length).toBeGreaterThan(0);
    for (const el of figures) expect(el.style.color).toMatch(/^color-mix\(in srgb, .+ 70%, var\(--ink\)\)$/);
    const bar = document.querySelector<HTMLElement>(".live-bar > span")!;
    expect(bar.style.background).not.toContain("color-mix");
  });
});
