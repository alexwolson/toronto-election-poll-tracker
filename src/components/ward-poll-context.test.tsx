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
        name: "Opponent's lead over the strongest other named candidate: model, central 80% range -20.0 to 40.0 percentage points",
      }),
    ).not.toBeNull();
    expect(screen.getAllByRole("img")).toHaveLength(2);
    expect(screen.getByText(/307 decided\/leaning respondents/)).not.toBeNull();
    expect(screen.getByText(/16% — Other candidates/)).not.toBeNull();
    expect(
      screen.getByText(/The reported lead could reverse/),
    ).not.toBeNull();
    expect(
      screen
        .getByRole("link", { name: "How to read these ranges" })
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
