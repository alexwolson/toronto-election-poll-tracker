// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { benchmark, poll } from "./ward-poll-context.fixture";
import { WardPollContext } from "./ward-poll-context";

afterEach(cleanup);

describe("ward poll context", () => {
  it("distinguishes the source point, historical span, actual base and unallocated Other", () => {
    render(<WardPollContext poll={poll} benchmark={benchmark} />);
    expect(screen.getByRole("img", { name: "Debbie King: published share 37.0%, historical comparison 21.0% to 63.0%" })).not.toBeNull();
    expect(screen.getAllByRole("img")).toHaveLength(1);
    expect(screen.getByText(/307 decided\/leaning respondents/)).not.toBeNull();
    expect(screen.getByText(/Other candidates: 16%/)).not.toBeNull();
    expect(screen.getByText(/not a confidence interval/)).not.toBeNull();
    expect(screen.getByRole("link", { name: "How to read these bands" }).getAttribute("href")).toBe("/how-it-works#ward-polls");
  });
  it("does not invent a comparison when the source is ineligible", () => {
    const { container } = render(<WardPollContext poll={{ ...poll, historical_context: null }} benchmark={benchmark} />);
    expect(container.innerHTML).toBe("");
  });
});
