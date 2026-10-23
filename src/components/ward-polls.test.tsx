// @vitest-environment jsdom

import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { benchmark, poll } from "./ward-poll-context.fixture";
import { WardPolls } from "./ward-polls";

afterEach(cleanup);

describe("ward polls", () => {
  it("puts the latest poll and its chart before consistent, newest-first earlier reports", () => {
    const june = {
      ...poll,
      poll_id: "june",
      date_conducted: "2026-06-23",
      modelled_context: null,
    };
    const august = { ...june, poll_id: "august", date_conducted: "2026-08-12" };
    const polls = [june, poll, august];
    render(<WardPolls polls={polls} benchmark={benchmark} />);
    const reports = screen.getAllByRole("article");
    expect(reports.map((report) => report.getAttribute("aria-label"))).toEqual([
      "Forum Research, Sep 27, 2026",
      "Forum Research, Aug 12, 2026",
      "Forum Research, Jun 23, 2026",
    ]);
    expect(screen.queryByRole("img")).toBeNull(); // the lead histogram is retired
    expect(
      screen.getByRole("figure", { name: "Every poll for this ward, by candidate" }),
    ).not.toBeNull();
    expect(screen.getByText("The reported lead could reverse.")).not.toBeNull();
    expect(
      screen.getByText("Numbers as printed").closest("details")?.contains(reports[0]),
    ).toBe(true);
    expect(
      screen.getByRole("heading", { name: "Earlier polls" }),
    ).not.toBeNull();
    expect(polls.map((p) => p.poll_id)).toEqual([
      "june",
      poll.poll_id,
      "august",
    ]);
  });

  it("pairs source-exact results and actual question base with the uncertainty, preserving Other", () => {
    render(<WardPolls polls={[poll]} benchmark={benchmark} />);
    const results = screen.getByRole("table", {
      name: "Published results · Sep 27, 2026",
    });
    expect(
      within(results).getByRole("row", { name: "Debbie King 37%" }),
    ).not.toBeNull();
    expect(
      within(results).getByRole("row", { name: "Other candidates 16%" }),
    ).not.toBeNull();
    expect(screen.getByText(/307 decided\/leaning respondents/)).not.toBeNull();
    expect(screen.queryByText(/sample size 464/)).toBeNull();
    expect(
      screen.getByRole("link", { name: "Source" }).getAttribute("href"),
    ).toBe(poll.source_url);
    expect(screen.queryByRole("heading", { name: "Earlier polls" })).toBeNull();
  });

  it("labels an all-respondent base without calling it decided/leaning", () => {
    const mainstreet = {
      ...poll,
      firm: "Mainstreet Research",
      denominator: "all respondents",
      undecided_share: 0.095,
      modelled_context: { ...poll.modelled_context!, unweighted_base: 262 },
    };
    render(<WardPolls polls={[mainstreet]} benchmark={benchmark} />);
    expect(screen.getByText(/262 respondents/)).not.toBeNull();
    expect(screen.queryByText(/decided\/leaning respondents/)).toBeNull();
    expect(
      screen.getByText(/Undecided, included in the shares above: 9.5%/),
    ).not.toBeNull();
    expect(
      screen.getByText(/Mainstreet Research counts undecided voters/),
    ).not.toBeNull();
  });

  it("keeps the tables open and draws no chart when no poll uses the final ballot", () => {
    const hypothetical = {
      ...poll,
      ballot_status: "different_candidate_field",
      modelled_context: null,
    };
    render(<WardPolls polls={[hypothetical]} benchmark={benchmark} />);
    expect(screen.queryByRole("figure")).toBeNull();
    expect(screen.queryByText("Numbers as printed")).toBeNull();
    expect(screen.getAllByRole("article")).toHaveLength(1);
  });

  it("uses the same report structure for wards without modelled polls and omits an empty section", () => {
    const earlier = { ...poll, modelled_context: null, undecided_share: 0.45 };
    const { unmount } = render(<WardPolls polls={[earlier]} />);
    expect(
      screen.getByRole("table", { name: "Published results · Sep 27, 2026" }),
    ).not.toBeNull();
    expect(
      screen.getByText(/Undecided, reported separately: 45%/),
    ).not.toBeNull();
    expect(screen.queryByRole("img")).toBeNull();
    unmount();
    const { container } = render(
      <WardPolls polls={[]} benchmark={benchmark} />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("groups alternate fields from the same dated source without counting them as earlier polls", () => {
    const current = { ...poll, modelled_context: null };
    const alternative = {
      ...current,
      poll_id: "with-layton",
      candidates: [
        ...current.candidates,
        {
          ...current.candidates[0],
          candidate_id: "layton",
          candidate_name: "Mike Layton",
          share: 0.2,
        },
      ],
    };
    render(<WardPolls polls={[alternative, current]} />);
    expect(screen.getAllByRole("article")).toHaveLength(1);
    expect(screen.getAllByRole("table")).toHaveLength(2);
    expect(
      screen.getByRole("heading", { name: "With Mike Layton" }),
    ).not.toBeNull();
    expect(screen.queryByRole("heading", { name: "Earlier polls" })).toBeNull();
    expect(screen.getAllByRole("link", { name: "Source" })).toHaveLength(1);
  });
});
