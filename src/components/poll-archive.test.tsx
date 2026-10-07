import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PollArchive } from "./poll-archive";
import type { Poll } from "@/types/feeds";

const POLL: Poll = {
  poll_id: "example-2026-08-21",
  firm: "Example Research",
  date_conducted: "2026-08-21",
  date_published: "2026-08-22",
  sample_size: 808,
  methodology: "IVR",
  field_tested: ["per_a4291ca7539b53e2acc1c4f108bc73e6"],
  shares: {
    per_a4291ca7539b53e2acc1c4f108bc73e6: 0.5,
    "response:other": 0.03,
  },
  notes: "",
};

describe("PollArchive", () => {
  it("labels every value for the mobile record layout", () => {
    const html = renderToStaticMarkup(
      <PollArchive
        polls={[POLL]}
        field={["per_a4291ca7539b53e2acc1c4f108bc73e6"]}
      />,
    );

    expect(html).toContain("Public mayoral polls, newest first");
    expect(html).toContain('data-label="Conducted"');
    expect(html).toContain('data-label="Pollster"');
    expect(html).toContain('data-label="Sample"');
    expect(html).toContain('data-label="Olivia Chow"');
    expect(html).toContain('data-label="Other reported choices"');
    expect(html).toContain('data-label="Survey method"');
    expect(html).toContain("3%");
    expect(html).toContain("Interactive voice response (IVR)");
  });
});

describe("PollArchive denominator and undecided", () => {
  const CHOW = "per_a4291ca7539b53e2acc1c4f108bc73e6";
  const BRADFORD = "per_d8dfddfb642358e299f4b428292666bf";
  const FIELD = [CHOW, BRADFORD];
  const poll = (overrides: Partial<Poll>): Poll => ({
    ...POLL,
    shares: { [CHOW]: 0.36, [BRADFORD]: 0.21, "response:other": 0.05, "response:undecided": 0.3 },
    ...overrides,
  });

  it("shows the denominator and keeps undecided in its own column", () => {
    const html = renderToStaticMarkup(
      <PollArchive
        polls={[
          poll({ denominator: "All respondents" }),
          poll({
            poll_id: "q",
            shares: { [CHOW]: 0.47, [BRADFORD]: 0.4, "response:other": 0.03 },
            denominator: "Decided and leaning voters",
          }),
        ]}
        field={FIELD}
      />,
    );
    expect(html).toContain("<th>Denominator</th>");
    expect(html).toContain(">Undecided</th>");
    expect(html).toContain('data-label="Undecided" class="poll-archive__candidate-value font-mono">30%<');
    expect(html).toContain('data-label="Other reported choices" class="poll-archive__candidate-value font-mono">5%<');
    expect(html).toContain('data-label="Undecided" class="poll-archive__candidate-value font-mono">—<');
    expect(html).toContain(">All respondents<");
    expect(html).toContain(">Decided and leaning voters<");
  });
});

describe("PollArchive Head-to-Head Readings", () => {
  const CHOW = "per_a4291ca7539b53e2acc1c4f108bc73e6";
  const BRADFORD = "per_d8dfddfb642358e299f4b428292666bf";
  const ALEXANDER = "per_345dd6a9ee645c0bb5a8ade615f91579";
  const FIELD = [CHOW, BRADFORD, ALEXANDER];
  const parent: Poll = {
    ...POLL,
    poll_id: "mainstreet-2026-09-29",
    denominator: "Decided and leaning voters",
    shares: { [CHOW]: 0.454, [BRADFORD]: 0.383, [ALEXANDER]: 0.085, "response:other": 0.078 },
  };
  const reading: Poll = {
    ...parent,
    poll_reading_id: "mainstreet_20260928_29_mayor_head_to_head_all",
    denominator: "All respondents",
    head_to_head: true,
    field_tested: [BRADFORD, CHOW, "response:undecided"],
    shares: { [CHOW]: 0.471, [BRADFORD]: 0.409, "response:undecided": 0.12 },
  };
  const rows = (html: string) => html.split("<tbody>")[1].split("</tr>").slice(0, -1);
  const text = (row: string) => row.replace(/<[^>]+>/g, "|").replace(/\|+/g, "|");

  it("shows a poll's head-to-head reading as an indented row beneath it, not counted separately", () => {
    const html = renderToStaticMarkup(
      <PollArchive polls={[parent, { ...POLL, poll_id: "older" }]} headToHead={[reading]} field={FIELD} />,
    );
    const [first, second, third] = rows(html);
    expect(rows(html)).toHaveLength(3);
    expect(first).not.toContain("poll-archive__row--head-to-head");
    expect(second).toContain("poll-archive__row--head-to-head");
    expect(text(second)).toContain("Not counted separately");
    expect(text(second)).toContain("|47%|41%|—|12%|—|All respondents (Chow or Bradford only)|");
    expect(third).toContain("Example Research");
  });

  it("labels a poll record that offered only Chow or Bradford, and drops a reading without its poll", () => {
    const html = renderToStaticMarkup(
      <PollArchive
        polls={[{ ...reading, poll_reading_id: undefined, poll_id: "forum-post-exit" }]}
        headToHead={[{ ...reading, poll_id: "missing" }]}
        field={FIELD}
      />,
    );
    expect(rows(html)).toHaveLength(1);
    expect(html).not.toContain("Not counted separately");
    expect(html).toContain(">All respondents (Chow or Bradford only)<");
  });
});
