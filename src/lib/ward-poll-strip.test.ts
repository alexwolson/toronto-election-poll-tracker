import { describe, expect, it } from "vitest";
import { poll as fixture } from "@/components/ward-poll-context.fixture";
import type { WardPoll } from "@/types/feeds";
import { buildWardPollStrip } from "./ward-poll-strip";

function wardPoll(
  id: string,
  firm: string,
  date: string,
  shares: Record<string, number>,
  extra: Partial<WardPoll> = {},
): WardPoll {
  return {
    ...fixture,
    poll_id: id,
    firm,
    date_conducted: date,
    modelled_context: null,
    candidates: Object.entries(shares).map(([name, share]) => ({
      candidate_id: name === "Other candidates" ? "residual" : name,
      candidate_name: name,
      share,
      is_incumbent: name === "Shan",
      is_residual: name === "Other candidates",
      registration_status: name === "Other candidates" ? "residual" : "registered",
    })),
    ...extra,
  };
}

const forumSep = wardPoll("f-sep", "Forum Research", "2026-09-27", {
  King: 0.37,
  Guerrera: 0.23,
  "Chan McNally": 0.18,
  Raponi: 0.06,
  "Other candidates": 0.16,
});
const mainstreet = wardPoll(
  "m-oct",
  "Mainstreet Research",
  "2026-10-16",
  { Guerrera: 0.352, "Chan McNally": 0.292, Pham: 0.155, King: 0.033 },
  { denominator: "all respondents", undecided_share: 0.095, sample_size: 262 },
);
const forumOct = wardPoll(
  "f-oct",
  "Forum Research",
  "2026-10-18",
  {
    Guerrera: 0.32,
    "Chan McNally": 0.29,
    Raponi: 0.17,
    King: 0.16,
    "Other candidates": 0.06,
  },
  {
    sample_size: 594,
    modelled_context: {
      ...fixture.modelled_context!,
      rows: [
        ["Guerrera", 0.1585, 0.5348],
        ["Chan McNally", 0.1348, 0.4979],
        ["Raponi", 0.0474, 0.3397],
        ["King", 0.0411, 0.3248],
      ].map(([name, lower, upper]) => ({
        candidate_id: name as string,
        candidate_name: name as string,
        reported_share: 0,
        named_share: 0,
        median: 0,
        lower: lower as number,
        upper: upper as number,
      })),
      leader: {
        ...fixture.modelled_context!.leader,
        ranges: [
          { model: "dirichlet", lower: -0.33, upper: 0.29 },
          { model: "logistic_normal", lower: -0.58, upper: 0.45 },
        ],
      },
    },
  },
);
const hypothetical = wardPoll(
  "with-layton",
  "Forum Research",
  "2026-08-12",
  { Layton: 0.5, King: 0.2 },
  { ballot_status: "different_candidate_field" },
);

describe("ward poll strip", () => {
  const strip = buildWardPollStrip([forumOct, hypothetical, mainstreet, forumSep])!;

  it("plots only final-ballot polls, oldest first, and marks the modelled poll newest", () => {
    expect(strip.polls.map((p) => [p.pollId, p.isNewest, p.age])).toEqual([
      ["f-sep", false, 2],
      ["m-oct", false, 1],
      ["f-oct", true, 0],
    ]);
    expect(strip.polls.map((p) => p.sampleSize)).toEqual([464, 262, 594]);
    expect(strip.rows.some((r) => r.name === "Layton")).toBe(false);
  });

  it("puts all-respondent polls on the decided-voter scale and keeps the printed share", () => {
    const guerrera = strip.rows.find((r) => r.name === "Guerrera")!;
    const ms = guerrera.points.find((p) => p.pollId === "m-oct")!;
    expect(ms.value).toBeCloseTo(0.352 / 0.905, 6);
    expect(ms.printed).toBe(0.352);
    const forum = guerrera.points.find((p) => p.pollId === "f-oct")!;
    expect(forum.value).toBe(0.32);
  });

  it("orders rows by the newest poll, then candidates it omitted by best share", () => {
    expect(strip.rows.filter((r) => r.kind === "candidate").map((r) => r.name)).toEqual(
      ["Guerrera", "Chan McNally", "Raponi", "King", "Pham"],
    );
    const pham = strip.rows.find((r) => r.name === "Pham")!;
    expect(pham.latest).toBeNull();
    expect(pham.latestNote).toBe("not in newest poll");
    expect(pham.band).toBeNull();
  });

  it("scales the named-candidate band to the newest poll's decided-voter total", () => {
    const guerrera = strip.rows.find((r) => r.name === "Guerrera")!;
    expect(guerrera.band!.lower).toBeCloseTo(0.1585 * 0.94, 6);
    expect(guerrera.band!.upper).toBeCloseTo(0.5348 * 0.94, 6);
  });

  it("adds Other and Undecided rows on their own scales, without bands", () => {
    const [other, undecided] = strip.rows.slice(-2);
    expect(other.kind).toBe("other");
    expect(other.points.map((p) => [p.pollId, p.value])).toEqual([
      ["f-sep", 0.16],
      ["f-oct", 0.06],
    ]);
    expect(other.latest).toBe(0.06);
    expect(undecided.kind).toBe("undecided");
    expect(undecided.points.map((p) => [p.pollId, p.value])).toEqual([
      ["m-oct", 0.095],
    ]);
    expect(undecided.latest).toBeNull();
    expect(undecided.latestNote).toBe("not published");
    expect(other.band).toBeNull();
    expect(undecided.band).toBeNull();
  });

  it("summarises the lead with the existing two-model rule", () => {
    expect(strip.leadSentence).toBe("The reported lead could reverse.");
    const safe = buildWardPollStrip([
      {
        ...forumOct,
        modelled_context: {
          ...forumOct.modelled_context!,
          leader: {
            ...forumOct.modelled_context!.leader,
            ranges: [
              { model: "dirichlet", lower: 0.02, upper: 0.3 },
              { model: "logistic_normal", lower: -0.05, upper: 0.4 },
            ],
          },
        },
      },
    ])!;
    expect(safe.leadSentence).toBe(
      "The models disagree about how secure the lead is.",
    );
  });

  it("returns null when no final-ballot poll exists", () => {
    expect(buildWardPollStrip([hypothetical])).toBeNull();
    expect(buildWardPollStrip([])).toBeNull();
  });
});
