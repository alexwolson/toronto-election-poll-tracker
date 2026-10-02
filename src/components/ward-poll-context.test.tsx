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
        name: "Debbie King: modelled median 44.0%, central 80% modelled range 21.0% to 63.0%",
      }),
    ).not.toBeNull();
    expect(screen.getAllByRole("img")).toHaveLength(2);
    expect(screen.getByText(/307 decided\/leaning respondents/)).not.toBeNull();
    expect(screen.getByText(/16% — Other candidates/)).not.toBeNull();
    expect(
      screen.getByText(/Shares among the candidates named in this poll/),
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
