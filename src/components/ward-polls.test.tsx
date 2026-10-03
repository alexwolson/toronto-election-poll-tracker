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
    expect(within(reports[0]).getAllByRole("img")).toHaveLength(1);
    expect(within(reports[1]).queryByRole("img")).toBeNull();
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
