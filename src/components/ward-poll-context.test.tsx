// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { benchmark, poll } from "./ward-poll-context.fixture";
import { WardPollContext } from "./ward-poll-context";

afterEach(cleanup);

describe("ward poll context", () => {
  it("distinguishes the published topline, modelled range, actual base and unallocated Other", () => {
    render(<WardPollContext poll={poll} benchmark={benchmark} />);
    expect(
      screen.getByRole("img", {
        name: "Simulated lead for Opponent over the strongest other named candidate; negative values mean another candidate ahead",
      }),
    ).not.toBeNull();
    expect(screen.getAllByRole("img")).toHaveLength(1);
    expect(screen.getByText("Share of simulated scenarios")).not.toBeNull();
    expect(screen.getByText("+100")).not.toBeNull();
    expect(screen.getByText("Tie")).not.toBeNull();
    expect(screen.getByText(/combining two error models equally/)).not.toBeNull();
    expect(screen.getByText(/307 decided\/leaning respondents/)).not.toBeNull();
    expect(screen.getByText(/16% — Other candidates/)).not.toBeNull();
    expect(screen.getByText(/The reported lead could reverse/)).not.toBeNull();
    expect(
      screen
        .getByRole("link", { name: "How to read these scenarios" })
        .getAttribute("href"),
    ).toBe("/how-it-works#ward-polls");
  });
  it("does not invent a comparison when the source is ineligible", () => {
    const { container } = render(
      <WardPollContext
        poll={{ ...poll, modelled_context: null }}
        benchmark={benchmark}
      />,
    );
    expect(container.innerHTML).toBe("");
  });
});
