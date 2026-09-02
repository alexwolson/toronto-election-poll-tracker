// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import candidatesFixture from "../../fixtures/mayoral_candidates.json";
import { CandidateBrowser } from "@/components/candidate-browser";
import type { MayoralCandidate } from "@/types/feeds";

const wantedNames = new Set([
  "Chris Alexander",
  "Jamie Atkinson",
  "Brad Bradford",
  "Olivia Chow",
]);
const candidates = structuredClone(candidatesFixture.candidates).filter((candidate) =>
  wantedNames.has(candidate.display_name),
) as unknown as MayoralCandidate[];

afterEach(cleanup);

describe("CandidateBrowser", () => {
  it("keeps every candidate visible in the preserved surname order", () => {
    const { container } = render(<CandidateBrowser candidates={candidates} />);

    expect(screen.getByText("4 candidates · alphabetical by surname")).toBeTruthy();
    expect(screen.queryByRole("searchbox")).toBeNull();
    expect(container.querySelectorAll(".candidate-wall > .candidate-row")).toHaveLength(4);

    const renderedNames = Array.from(container.querySelectorAll(".candidate-row__name")).map(
      (element) => element.textContent,
    );
    expect(renderedNames).toEqual([
      "Chris Alexander",
      "Jamie Atkinson",
      "Brad Bradford",
      "Olivia Chow",
    ]);
  });

  it("opens history from a compact name row", () => {
    render(<CandidateBrowser candidates={candidates} />);

    const name = screen.getByText("Chris Alexander");
    const summary = name.closest("summary");
    const details = name.closest("details");
    expect(summary).toBeTruthy();
    expect(details?.open).toBe(false);

    fireEvent.click(summary!);
    expect(details?.open).toBe(true);
    expect(screen.getByText("Former MP · 2 past races")).toBeTruthy();
  });

  it("shows at most one prioritized hint per candidate", () => {
    const { container } = render(<CandidateBrowser candidates={candidates} />);

    const hintFor = (name: string) =>
      screen.getByText(name).closest(".candidate-row")?.querySelectorAll(".candidate-row__hint");

    expect(hintFor("Chris Alexander")?.length).toBe(1);
    expect(hintFor("Chris Alexander")?.[0].textContent).toBe("Former MP");
    expect(hintFor("Brad Bradford")?.[0].textContent).toBe("Former Councillor");
    expect(hintFor("Olivia Chow")?.[0].textContent).toBe("Incumbent mayor");
    expect(
      Array.from(container.querySelectorAll(".candidate-row")).every(
        (row) => row.querySelectorAll(".candidate-row__hint").length <= 1,
      ),
    ).toBe(true);
  });

  it("uses a direct link instead of an empty disclosure for website-only candidates", () => {
    render(<CandidateBrowser candidates={candidates} />);

    const name = screen.getByText("Jamie Atkinson");
    const row = name.closest(".candidate-row");
    const link = name.closest("a");

    expect(row?.querySelector("details")).toBeNull();
    expect(link?.classList.contains("candidate-row__direct-link")).toBe(true);
    expect(link?.getAttribute("href")).toBe(
      candidates.find((candidate) => candidate.display_name === "Jamie Atkinson")
        ?.campaign_url,
    );
    expect(link?.getAttribute("aria-label")).toBe(
      "Jamie Atkinson campaign website (opens in a new tab)",
    );
    expect(row?.querySelector(".candidate-row__hint")?.textContent).toContain("Website");
  });

  it("gives repeated campaign links candidate-specific accessible names", () => {
    render(<CandidateBrowser candidates={candidates} />);

    const row = screen.getByText("Brad Bradford").closest(".candidate-row");
    const link = row?.querySelector(".candidate-row__campaign-link");

    expect(link?.textContent).toContain("Website");
    expect(link?.getAttribute("aria-label")).toBe(
      "Brad Bradford campaign website (opens in a new tab)",
    );
    expect(row?.querySelector(".candidate-row__return-detail")).toBeNull();
    expect(row?.querySelectorAll(".past-election")).toHaveLength(3);
  });

  it("does not repeat an identical history hint inside its disclosure", () => {
    const candidate = structuredClone(candidatesFixture.candidates).find(
      (item) => item.display_name === "Darrell Brown",
    ) as unknown as MayoralCandidate;

    render(<CandidateBrowser candidates={[candidate]} />);

    expect(screen.getAllByText("1 past race")).toHaveLength(1);
  });
});
