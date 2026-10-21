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
