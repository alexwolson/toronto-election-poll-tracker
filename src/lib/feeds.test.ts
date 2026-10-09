import candidatesFixture from "../../fixtures/mayoral_candidates.json";
import { benchmark, poll } from "@/components/ward-poll-context.fixture";
import councilFixture from "../../fixtures/council_race_cards.json";
import forecastFixture from "../../fixtures/mayoral_forecast.json";
import pollingFixture from "../../fixtures/mayoral_polling.json";
import trusteeFixture from "../../fixtures/trustee_race_cards.json";
import { describe, expect, it } from "vitest";
import type { CouncilRaceCardsFeed, TrusteeRaceCardsFeed } from "@/types/feeds";
import {
  validateCouncil,
  validateForecast,
  validateManifest,
  validateMayoralCandidates,
  validatePolling,
  validateTrusteeRaceCards,
} from "./feeds";

describe("validateForecast", () => {
  const CHOW = "per_a4291ca7539b53e2acc1c4f108bc73e6";
  it("accepts the schema-5 margin-first feed", () => {
    const feed = validateForecast(forecastFixture);
    expect(feed?.schema_version).toBe(5);
    expect(feed?.publication_policy).toBe("margin-first-joint-draws-v1");
    expect(feed?.election_day?.pairwise_margin.bins).toHaveLength(40);
    const outcomes = feed?.election_day?.pairwise_margin.outcomes;
    expect(outcomes?.close_threshold_points).toBe(2);
    expect(
      (outcomes?.leader_ahead ?? 0) + (outcomes?.close ?? 0) + (outcomes?.challenger_ahead ?? 0),
    ).toBeCloseTo(1, 4);
    expect(feed?.election_day?.candidates.map((c) => c.candidate_id)).toEqual(
      Object.keys(forecastFixture.candidate_win),
    );
  });

  it("rejects earlier schemas and the retired band contract", () => {
    expect(validateForecast({ ...forecastFixture, schema_version: 4 })).toBeNull();
    expect(validateForecast({ ...forecastFixture, schema_version: 6 })).toBeNull();
    expect(validateForecast({ ...forecastFixture, schema_version: 3 })).toBeNull();
    expect(validateForecast({ ...forecastFixture, schema_version: 2 })).toBeNull();
    expect(validateForecast({ ...forecastFixture, schema_version: 999 })).toBeNull();
    expect(validateForecast({ ...forecastFixture, publication_policy: "central-band-with-sensitivity-v1" })).toBeNull();
  });

  it("fails closed on every incoherent election-day block", () => {
    const cases: Array<(feed: typeof forecastFixture) => void> = [
      (f) => { f.election_day.pairwise_margin.bins.pop(); },
      (f) => { f.election_day.pairwise_margin.bins[0].probability += 0.1; },
      (f) => { f.election_day.pairwise_margin.leader_candidate_id = "per_nobody"; },
      (f) => { f.election_day.pairwise_margin.challenger_candidate_id = f.election_day.pairwise_margin.leader_candidate_id; },
      (f) => { f.election_day.pairwise_margin.lower = f.election_day.pairwise_margin.upper + 1; },
      (f) => { f.election_day.candidates[0].lower = f.election_day.candidates[0].upper + 0.01; },
      (f) => { f.election_day.candidates[0].win_probability = 0.99; },
      (f) => { f.election_day.candidates.pop(); },
      (f) => { f.election_day.residual_pool.win_probability = 0.01; },
      (f) => { f.election_day.residual_pool.candidate_count = -1; },
      (f) => { f.election_day.interval_mass = 1.2; },
      (f) => { f.election_day.denominator = "named_only"; },
      (f) => { f.candidate_win[CHOW].probability = 2; },
      (f) => { f.forecast_favourite.candidate_id = "per_nobody"; },
      (f) => { f.model.qualification_passed = false; },
      (f) => { f.analysis_cutoff = "2026-09-21T12:00:00"; },
      (f) => { f.election_cycle_id = "toronto-2026"; },
      (f) => { f.election_date = "October 26, 2026"; },
      (f) => { f.election_day.pairwise_margin.outcomes.close += 0.2; },
      (f) => { f.election_day.pairwise_margin.outcomes.close_threshold_points = 0; },
      (f) => { delete (f.election_day.pairwise_margin as Record<string, unknown>).outcomes; },
    ];
    for (const mutate of cases) {
      const malformed = structuredClone(forecastFixture);
      mutate(malformed);
      expect(validateForecast(malformed), mutate.toString()).toBeNull();
    }
  });

  it("accepts the additive forecast history, tolerates its absence, and fails closed when malformed", () => {
    const feed = validateForecast(forecastFixture);
    const history = feed?.history ?? [];
    expect(history.length).toBe(7);
    // The last point is the published forecast itself.
    const last = history.at(-1)?.win_probability ?? {};
    for (const [id, card] of Object.entries(feed?.candidate_win ?? {})) expect(last[id]).toBe(card.probability);
    const without = structuredClone(forecastFixture) as Record<string, unknown>;
    delete without.history;
    expect(validateForecast(without)?.history).toBeUndefined();
    const cases: Array<(feed: typeof forecastFixture) => void> = [
      (f) => { f.history = []; },
      (f) => { f.history[1].date = f.history[0].date; },
      (f) => { f.history[1].date = "Aug 7"; },
      (f) => { f.history[2].polls = f.history[1].polls; },
      (f) => { f.history[0].poll_sample_ids = []; },
      (f) => { delete (f.history[0].win_probability as Record<string, number>)[Object.keys(f.history[0].win_probability)[0]]; },
      (f) => { const k = Object.keys(f.history[0].win_probability)[0]; (f.history[0].win_probability as Record<string, number>)[k] += 0.2; },
      (f) => { const k = Object.keys(f.history[6].win_probability)[0]; (f.history[6].win_probability as Record<string, number>)[k] -= 0.01; (f.history[6].win_probability as Record<string, number>)[Object.keys(f.history[6].win_probability)[1]] += 0.01; },
    ];
    for (const mutate of cases) {
      const malformed = structuredClone(forecastFixture);
      mutate(malformed);
      expect(validateForecast(malformed), mutate.toString()).toBeNull();
    }
  });

  it("accepts the additive uncertainty breakdown, tolerates its absence, and fails closed when malformed", () => {
    const feed = validateForecast(forecastFixture);
    const block = feed?.uncertainty;
    expect(block?.sources.map((s) => s.key)).toEqual(["polls_today", "campaign_movement", "election_day"]);
    // All three together is the published margin, so the view can never disagree with the headline.
    const combined = block?.combined;
    const margin = feed?.election_day?.pairwise_margin;
    expect(combined?.median).toBe(margin?.median);
    expect(combined?.lower).toBe(margin?.lower);
    expect(combined?.upper).toBe(margin?.upper);
    expect(combined?.probability_challenger_ahead).toBe(margin?.probability_challenger_ahead);
    // The shares are what the page adds up, and they add up.
    const shares = block?.sources.map((s) => s.share_of_uncertainty) ?? [];
    expect(shares.every((s) => s > 0 && s < 1)).toBe(true);
    expect(shares.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 4);
    expect(block?.variance_explained).toBeGreaterThan(0);
    // Releases before ADR 0056 carry no block; that still validates.
    const without = structuredClone(forecastFixture) as Record<string, unknown>;
    delete without.uncertainty;
    expect(validateForecast(without)?.schema_version).toBe(5);
    expect(validateForecast(without)?.uncertainty).toBeUndefined();
    const cases: Array<(feed: typeof forecastFixture) => void> = [
      (f) => { f.uncertainty.sources.pop(); },
      (f) => { f.uncertainty.sources[0].key = "election_day"; },
      (f) => { f.uncertainty.combined.median += 1; },
      (f) => { f.uncertainty.sources[1].lower = f.uncertainty.sources[1].upper + 1; },
      (f) => { f.uncertainty.leader_candidate_id = f.uncertainty.challenger_candidate_id; },
      (f) => { f.uncertainty.sources[0].probability_leader_ahead = 0.9; f.uncertainty.sources[0].probability_challenger_ahead = 0.9; },
      (f) => { f.uncertainty.unit = "percent"; },
      (f) => { delete (f.uncertainty as Record<string, unknown>).centre; },
      (f) => { delete (f.uncertainty as Record<string, unknown>).combined; },
      (f) => { f.uncertainty.sources[0].share_of_uncertainty += 0.1; },
      (f) => { f.uncertainty.variance_explained = 0; },
    ];
    for (const mutate of cases) {
      const malformed = structuredClone(forecastFixture);
      mutate(malformed);
      expect(validateForecast(malformed), mutate.toString()).toBeNull();
    }
  });
});

describe("validateForecast: Other candidates and Suspended Campaigns (schema 5)", () => {
  const CHOW = "per_a4291ca7539b53e2acc1c4f108bc73e6";
  const BRADFORD = "per_d8dfddfb642358e299f4b428292666bf";
  const ALEXANDER = "per_345dd6a9ee645c0bb5a8ade615f91579";
  type Fixture = typeof forecastFixture;
  type Loose = Record<string, unknown>;
  const loose = (value: unknown) => value as Loose;
  /** Set the suspension date in both places that must agree. */
  const suspendedOn = (f: Fixture, date: string) => {
    f.election_day.other_candidates.includes[0].campaign_suspended_on = date;
    f.model.suspended_campaigns[0].campaign_suspended_on = date;
  };

  it("accepts Other candidates that include Alexander, matched by the model's suspended campaigns", () => {
    const feed = validateForecast(forecastFixture);
    const other = feed?.election_day?.other_candidates;
    const pool = feed?.election_day?.residual_pool;
    expect(other?.label).toBe("Other candidates");
    expect(other?.includes).toEqual([
      { candidate_id: ALEXANDER, display_name: "Chris Alexander", campaign_suspended_on: "2026-10-06" },
    ]);
    expect(other!.lower).toBeGreaterThanOrEqual(pool!.lower);
    expect(other!.median).toBeGreaterThanOrEqual(pool!.median);
    expect(other!.upper).toBeGreaterThanOrEqual(pool!.upper);
    expect(
      feed?.model.suspended_campaigns.map((c) => [c.candidate_id, c.campaign_suspended_on]),
    ).toEqual([[ALEXANDER, "2026-10-06"]]);
    // He stays named in the model.
    expect(Object.keys(feed?.candidate_win ?? {})).toContain(ALEXANDER);
  });

  it("accepts an empty includes list whose range is exactly the pool's", () => {
    const f = structuredClone(forecastFixture);
    const pool = f.election_day.residual_pool;
    Object.assign(f.election_day.other_candidates, {
      includes: [], median: pool.median, lower: pool.lower, upper: pool.upper,
    });
    f.model.suspended_campaigns = [];
    expect(validateForecast(f)?.election_day?.other_candidates.includes).toEqual([]);
  });

  it("accepts a suspension dated on the analysis cutoff's own day, in the cutoff's offset", () => {
    const f = structuredClone(forecastFixture);
    f.analysis_cutoff = "2026-10-06T00:30:00-04:00";
    expect(validateForecast(f)).not.toBeNull();
    f.analysis_cutoff = "2026-10-05T23:59:00-04:00";
    expect(validateForecast(f)).toBeNull();
  });

  it("does not check the kept-fraction, allocation or case audit numbers", () => {
    const f = structuredClone(forecastFixture);
    loose(f.model.suspended_campaigns[0]).kept_fraction = "not checked";
    loose(f.model.suspended_campaigns[0]).allocation = null;
    loose(f.model).kept_fraction_cases = "not checked";
    expect(validateForecast(f)).not.toBeNull();
  });

  it("fails closed on every incoherent Other candidates or Suspended Campaign block", () => {
    const cases: Array<(f: Fixture) => void> = [
      (f) => { delete loose(f.election_day).other_candidates; },
      (f) => { f.election_day.other_candidates.label = ""; },
      (f) => { f.election_day.other_candidates.lower = f.election_day.other_candidates.median + 0.01; },
      (f) => { f.election_day.other_candidates.upper = 1.2; },
      // each bound at or above the pool's matching bound
      (f) => { f.election_day.other_candidates.lower = f.election_day.residual_pool.lower - 0.001; },
      (f) => { f.election_day.other_candidates.median = f.election_day.residual_pool.median - 0.001; },
      (f) => { f.election_day.other_candidates.upper = f.election_day.residual_pool.upper - 0.001; },
      // an empty includes list must equal the pool exactly
      (f) => { f.election_day.other_candidates.includes = []; f.model.suspended_campaigns = []; },
      (f) => { loose(f.election_day.other_candidates).includes = {}; },
      // includes entries: unique, a candidate_win key and election-day entry, matching name
      (f) => {
        const [entry] = f.election_day.other_candidates.includes;
        f.election_day.other_candidates.includes = [entry, { ...entry }];
        f.model.suspended_campaigns = [f.model.suspended_campaigns[0], { ...f.model.suspended_campaigns[0] }];
      },
      (f) => {
        f.election_day.other_candidates.includes[0].candidate_id = "per_nobody";
        f.model.suspended_campaigns[0].candidate_id = "per_nobody";
      },
      (f) => { f.election_day.other_candidates.includes[0].display_name = "C. Alexander"; },
      // the suspension date: an ISO calendar date no later than the analysis cutoff
      (f) => { suspendedOn(f, "Oct 6, 2026"); },
      (f) => { suspendedOn(f, "2026-02-30"); },
      (f) => { suspendedOn(f, "2026-10-08"); },
      (f) => {
        delete loose(f.election_day.other_candidates.includes[0]).campaign_suspended_on;
        delete loose(f.model.suspended_campaigns[0]).campaign_suspended_on;
      },
      // model.suspended_campaigns is required and equals includes in ids and dates
      (f) => { delete loose(f.model).suspended_campaigns; },
      (f) => { loose(f.model).suspended_campaigns = {}; },
      (f) => { f.model.suspended_campaigns[0].candidate_id = CHOW; },
      (f) => { f.model.suspended_campaigns[0].campaign_suspended_on = "2026-10-05"; },
      (f) => {
        f.model.suspended_campaigns.push({ ...f.model.suspended_campaigns[0], candidate_id: BRADFORD });
      },
      (f) => { f.model.suspended_campaigns = []; },
    ];
    for (const mutate of cases) {
      const malformed = structuredClone(forecastFixture);
      mutate(malformed);
      expect(validateForecast(malformed), mutate.toString()).toBeNull();
    }
  });
});

describe("validatePolling", () => {
  it("accepts the audited archive and rejects share drift", () => {
    expect(validatePolling(pollingFixture)?.polls.length).toBeGreaterThan(0);
    const malformed = structuredClone(pollingFixture);
    malformed.polls[0].shares.per_345dd6a9ee645c0bb5a8ade615f91579 = 1.1;

    expect(validatePolling(malformed)).toBeNull();
  });
  it("accepts an additive all-respondent reading and rejects duplicates, provenance and basis drift", () => {
    const poll = { ...structuredClone(pollingFixture.polls[0]),
      denominator: "All respondents", poll_reading_id: "source-reading",
      shares: { [pollingFixture.candidates[0]]: 0.36, "response:undecided": 0.64 },
      field_tested: [pollingFixture.candidates[0], "response:undecided"],
    };
    const feed = { ...structuredClone(pollingFixture), all_respondents: [poll] };
    if (!feed.candidates.includes("response:undecided")) {
      feed.candidates.push("response:undecided");
      Object.assign(feed.trend, { "response:undecided": [] });
    }
    expect(validatePolling(feed)?.all_respondents?.[0].shares).toEqual(poll.shares);
    expect(validatePolling({ ...feed, all_respondents: [poll, poll] })).toBeNull();
    for (const patch of [
      { denominator: "Decided voters" }, { poll_reading_id: "" }, { poll_id: "unknown" },
      { date_conducted: "2026-08-01" }, { field_tested: [] },
      { shares: { [pollingFixture.candidates[0]]: 0.36 } },
    ]) {
      expect(validatePolling({ ...feed, all_respondents: [{ ...poll, ...patch }] })).toBeNull();
    }
  });

  it("accepts a well-formed model exclusion and rejects a malformed one", () => {
    const exclusion = {
      decided_on: "2026-10-08",
      reasons: ["methodology_confidence", "not_cric_member"],
      explanation: "Listed for the record only.",
    };
    const withExclusion = (value: unknown) => {
      const feed = structuredClone(pollingFixture) as unknown as { polls: Record<string, unknown>[] };
      feed.polls[0].model_exclusion = value;
      return feed;
    };
    expect(validatePolling(withExclusion(exclusion))?.polls[0].model_exclusion).toEqual(exclusion);
    for (const bad of [
      "yes",
      { ...exclusion, decided_on: "Oct 8" },
      { ...exclusion, reasons: [] },
      { ...exclusion, reasons: ["methodology_confidence", "methodology_confidence"] },
      { ...exclusion, reasons: "methodology_confidence" },
      { ...exclusion, explanation: "" },
      { decided_on: exclusion.decided_on, reasons: exclusion.reasons },
    ]) {
      expect(validatePolling(withExclusion(bad))).toBeNull();
    }
  });

  describe("Head-to-Head Readings", () => {
    const CHOW = "per_a4291ca7539b53e2acc1c4f108bc73e6";
    const BRADFORD = "per_d8dfddfb642358e299f4b428292666bf";
    const ALEXANDER = "per_345dd6a9ee645c0bb5a8ade615f91579";
    type Loose = Record<string, unknown>;
    const entry = () => structuredClone(pollingFixture.head_to_head[0]) as unknown as Loose;
    const withEntries = (entries: unknown) => ({ ...structuredClone(pollingFixture), head_to_head: entries });

    it("accepts a head-to-head reading under its own poll, and a feed without the array", () => {
      const feed = validatePolling(pollingFixture);
      const reading = feed?.head_to_head?.[0];
      expect(reading?.poll_id).toBe("mainstreet-2026-09-29");
      expect(reading?.denominator).toBe("All respondents");
      expect(reading?.head_to_head).toBe(true);
      expect(reading?.shares).toEqual({ [CHOW]: 0.471, [BRADFORD]: 0.409, "response:undecided": 0.12 });
      const without = structuredClone(pollingFixture) as Loose;
      delete without.head_to_head;
      expect(validatePolling(without)?.head_to_head).toBeUndefined();
      // Any non-empty denominator label is accepted.
      expect(validatePolling(withEntries([{ ...entry(), denominator: "Decided voters" }]))).not.toBeNull();
      // "Neither" may sit beside undecided (Mainstreet, Oct. 6-7, 2026).
      const neither = { [CHOW]: 0.447, [BRADFORD]: 0.415, "response:none_of_the_above": 0.055,
        "response:undecided": 0.083 };
      const withNeither = withEntries([{ ...entry(), shares: neither, field_tested: Object.keys(neither) }]);
      withNeither.candidates.push("response:none_of_the_above");
      Object.assign(withNeither.trend, { "response:none_of_the_above": [] });
      expect(validatePolling(withNeither)?.head_to_head?.[0].shares).toEqual(neither);
    });

    it("rejects a reading that does not match its poll or is not a two-candidate question", () => {
      const parent = pollingFixture.polls.find((poll) => poll.poll_id === entry().poll_id)!;
      const other = pollingFixture.polls.find((poll) => poll.poll_id !== parent.poll_id)!;
      const cases: Loose[][] = [
        [{ ...entry(), poll_id: "unknown" }],
        [entry(), { ...entry(), poll_reading_id: "another-reading" }],
        [entry(), { ...entry(), poll_id: other.poll_id, firm: other.firm, date_conducted: other.date_conducted,
          date_published: other.date_published, sample_size: other.sample_size, methodology: other.methodology }],
        [{ ...entry(), firm: "Another firm" }],
        [{ ...entry(), date_conducted: "2026-09-28" }],
        [{ ...entry(), date_published: "2026-10-03" }],
        [{ ...entry(), sample_size: 999 }],
        [{ ...entry(), methodology: "online" }],
        [{ ...entry(), denominator: "" }],
        [{ ...entry(), denominator: undefined }],
        [{ ...entry(), poll_reading_id: "" }],
        [{ ...entry(), head_to_head: "yes" }],
        [{ ...entry(), shares: { [CHOW]: 0.88, "response:undecided": 0.12 }, field_tested: [CHOW, "response:undecided"] }],
        [{ ...entry(), shares: { [CHOW]: 0.4, [BRADFORD]: 0.4, [ALEXANDER]: 0.08, "response:undecided": 0.12 },
          field_tested: [CHOW, BRADFORD, ALEXANDER, "response:undecided"] }],
        [{ ...entry(), shares: { per_unknown: 0.471, [BRADFORD]: 0.409, "response:undecided": 0.12 },
          field_tested: ["per_unknown", BRADFORD, "response:undecided"] }],
        [{ ...entry(), shares: { [CHOW]: 0.471, [BRADFORD]: 0.409, "response:other": 0.12 },
          field_tested: [CHOW, BRADFORD, "response:other"] }],
        [{ ...entry(), shares: { [CHOW]: 0.471, [BRADFORD]: 0.309, "response:undecided": 0.12 } }],
        [{ ...entry(), field_tested: [CHOW, BRADFORD] }],
      ];
      for (const entries of cases) {
        expect(validatePolling(withEntries(entries)), JSON.stringify(entries)).toBeNull();
      }
      expect(validatePolling(withEntries({}))).toBeNull();
    });

    it("accepts an optional boolean head_to_head flag on poll records and rejects anything else", () => {
      const flagged = structuredClone(pollingFixture);
      (flagged.polls[1] as Loose).head_to_head = true;
      (flagged.polls[2] as Loose).head_to_head = false;
      expect(validatePolling(flagged)?.polls[1].head_to_head).toBe(true);
      const malformed = structuredClone(pollingFixture);
      (malformed.polls[1] as Loose).head_to_head = "true";
      expect(validatePolling(malformed)).toBeNull();
    });
  });
});

describe("validateManifest", () => {
  const manifest = {
    schema_version: 2,
    resolved_at: "2026-09-10T12:01:00Z",
    backend_generated_at: "2026-09-10T12:00:00Z",
    releases: Object.fromEntries(
      [
        ["backend", "alexwolson/toronto-election-poll-tracker-backend"],
        ["results", "alexwolson/toronto-election-results"],
        ["polling", "alexwolson/toronto-election-poll-tracker-data"],
      ].map(([producer, repository]) => [
        producer,
        {
          repository,
          release: `${producer}-2026-09-10.1`,
          source_commit: "a".repeat(40),
          manifest_schema_version: 1,
          manifest_sha256: "b".repeat(64),
        },
      ]),
    ),
    feeds: [
      ["mayoral_forecast", "backend"],
      ["council_race_cards", "backend"],
      ["trustee_race_cards", "backend"],
      ["mayoral_candidates", "results"],
      ["mayoral_polling", "polling"],
    ].map(([name, producer]) => ({
      name,
      filename: `${name}.json`,
      producer,
      schema_version: 1,
      sha256: "c".repeat(64),
    })),
  };

  it("accepts complete release provenance and rejects a missing producer", () => {
    expect(validateManifest(manifest)?.backend_generated_at).toBe(
      manifest.backend_generated_at,
    );
    const malformed = structuredClone(manifest);
    delete malformed.releases.polling;

    expect(validateManifest(malformed)).toBeNull();
  });

  it("rejects incomplete feed provenance", () => {
    const malformed = structuredClone(manifest);
    malformed.feeds[0].sha256 = "unknown";

    expect(validateManifest(malformed)).toBeNull();
  });
});

describe("validateMayoralCandidates", () => {
  it("accepts the complete certified fixture", () => {
    const feed = validateMayoralCandidates(candidatesFixture);
    expect(feed?.schema_version).toBe(6);
    expect(feed?.ballot_certified).toBe(true);
    expect(feed?.candidates).toHaveLength(53);
    expect(
      feed?.candidates.find((candidate) => candidate.display_name === "Olivia Chow"),
    ).toMatchObject({
      display_name: "Olivia Chow",
      is_incumbent: true,
      campaign_suspended_on: null,
    });
    expect(
      feed?.candidates.find((candidate) => candidate.display_name === "Chris Alexander")
        ?.campaign_suspended_on,
    ).toBe("2026-10-06");
  });

  it("accepts only schema 6", () => {
    expect(validateMayoralCandidates({ ...candidatesFixture, schema_version: 5 })).toBeNull();
    expect(validateMayoralCandidates({ ...candidatesFixture, schema_version: 7 })).toBeNull();
  });

  it("requires campaign_suspended_on on every candidate: null or an ISO date no later than election day", () => {
    const alexander = (feed: typeof candidatesFixture) =>
      feed.candidates.find((candidate) => candidate.display_name === "Chris Alexander")! as Record<string, unknown>;
    const onElectionDay = structuredClone(candidatesFixture);
    alexander(onElectionDay).campaign_suspended_on = "2026-10-26";
    expect(validateMayoralCandidates(onElectionDay)).not.toBeNull();
    for (const value of [undefined, "", "Oct. 6", "2026-02-30", "2026-10-27", 20261006, false]) {
      const malformed = structuredClone(candidatesFixture);
      if (value === undefined) delete alexander(malformed).campaign_suspended_on;
      else alexander(malformed).campaign_suspended_on = value;
      expect(validateMayoralCandidates(malformed), String(value)).toBeNull();
    }
  });

  it("rejects malformed candidate rows", () => {
    expect(
      validateMayoralCandidates({
        schema_version: 6,
        event_id: "toronto-2026",
        contest_id: "mayor-2026",
        election_date: "2026-10-26",
        ballot_certified: true,
        coverage: candidatesFixture.coverage,
        candidates: [{ display_name: "Missing fields" }],
      }),
    ).toBeNull();
  });

  it("rejects a provisional feed that exposes candidates", () => {
    expect(
      validateMayoralCandidates({
        schema_version: 6,
        event_id: "toronto-2026",
        contest_id: "mayor-2026",
        election_date: "2026-10-26",
        ballot_certified: false,
        coverage: candidatesFixture.coverage,
        candidates: candidatesFixture.candidates,
      }),
    ).toBeNull();
  });

  it("accepts an intentionally unavailable provisional field", () => {
    expect(
      validateMayoralCandidates({
        ...candidatesFixture,
        ballot_certified: false,
        candidates: [],
      }),
    ).not.toBeNull();
  });

  it("rejects a certified feed with no candidates", () => {
    expect(
      validateMayoralCandidates({
        ...candidatesFixture,
        candidates: [],
      }),
    ).toBeNull();
  });

  it("requires Results-owned labels on 2003+ ward histories", () => {
    const malformed = structuredClone(candidatesFixture);
    const election = malformed.candidates
      .flatMap((candidate) => candidate.past_elections)
      .find(
        (row) =>
          row.election_date >= "2003-01-01" &&
          (row.office_type === "councillor" || row.office_type === "trustee"),
      );
    if (!election) throw new Error("fixture must contain an in-scope ward history");
    election.district_display_name = null;

    expect(validateMayoralCandidates(malformed)).toBeNull();
  });
});

describe("validateTrusteeRaceCards", () => {
  it("accepts the complete enriched four-board feed", () => {
    const feed = validateTrusteeRaceCards(trusteeFixture);

    expect(feed?.boards.map((board) => board.board_id)).toEqual([
      "tdsb",
      "tcdsb",
      "viamonde",
      "monavenir",
    ]);
    expect(feed?.coverage.cohort_size).toBe(118);
    expect(feed?.boards.flatMap((board) => board.wards)).toHaveLength(29);
    const wards = feed?.boards.flatMap((board) => board.wards) ?? [];
    expect(wards.filter((ward) => ward.comparable_prior_result !== null)).toHaveLength(14);
    expect(feed?.boards[0].wards.every((ward) => ward.comparable_prior_result === null)).toBe(
      true,
    );
  });

  it("rejects an incomplete board or candidate cohort", () => {
    expect(
      validateTrusteeRaceCards({
        ...trusteeFixture,
        boards: trusteeFixture.boards.slice(0, 3),
      }),
    ).toBeNull();
    expect(
      validateTrusteeRaceCards({
        ...trusteeFixture,
        coverage: { ...trusteeFixture.coverage, cohort_size: 117 },
      }),
    ).toBeNull();
  });

  it("rejects a malformed acclamation", () => {
    const malformed = structuredClone(trusteeFixture) as unknown as TrusteeRaceCardsFeed;
    const acclaimed = malformed.boards
      .flatMap((board) => board.wards)
      .find((ward) => ward.acclaimed);
    if (!acclaimed) throw new Error("fixture must include an acclamation");
    acclaimed.result_status = "pending";

    expect(validateTrusteeRaceCards(malformed)).toBeNull();
  });

  it("rejects unsafe boundary and history claims", () => {
    const crossedBoundary = structuredClone(trusteeFixture) as unknown as TrusteeRaceCardsFeed;
    crossedBoundary.boards[0].wards[1].city_wards[0] =
      crossedBoundary.boards[0].wards[0].city_wards[0];
    expect(validateTrusteeRaceCards(crossedBoundary)).toBeNull();

    const inventedTdsbPrior = structuredClone(
      trusteeFixture,
    ) as unknown as TrusteeRaceCardsFeed;
    inventedTdsbPrior.boards[0].wards[0].comparable_prior_result =
      inventedTdsbPrior.boards[1].wards[0].comparable_prior_result;
    expect(validateTrusteeRaceCards(inventedTdsbPrior)).toBeNull();

    const outOfScopeHistory = structuredClone(
      trusteeFixture,
    ) as unknown as TrusteeRaceCardsFeed;
    const candidate = outOfScopeHistory.boards
      .flatMap((board) => board.wards)
      .flatMap((ward) => ward.candidates)
      .find((row) => row.past_elections.length > 0);
    if (!candidate) throw new Error("fixture must contain verified history");
    candidate.past_elections[0].year = 2002;
    candidate.past_elections[0].election_date = "2002-11-12";
    expect(validateTrusteeRaceCards(outOfScopeHistory)).toBeNull();
  });

  it("rejects inconsistent backend race context", () => {
    const wrongPriority = structuredClone(
      trusteeFixture,
    ) as unknown as TrusteeRaceCardsFeed;
    wrongPriority.boards[0].wards[0].race_context.sort_priority = 2;
    expect(validateTrusteeRaceCards(wrongPriority)).toBeNull();

    const thresholdViolation = structuredClone(
      trusteeFixture,
    ) as unknown as TrusteeRaceCardsFeed;
    const signalWard = thresholdViolation.boards
      .flatMap((board) => board.wards)
      .find((ward) => ward.race_context.category === "won_without_majority");
    if (!signalWard || !signalWard.race_context.signal) {
      throw new Error("fixture must contain a prior-win signal");
    }
    signalWard.race_context.signal.vote_share = 0.5;
    expect(validateTrusteeRaceCards(thresholdViolation)).toBeNull();

    const wrongOrder = structuredClone(trusteeFixture) as unknown as TrusteeRaceCardsFeed;
    wrongOrder.boards[1].wards.reverse();
    expect(validateTrusteeRaceCards(wrongOrder)).toBeNull();
  });

  it("drops one malformed optional map without losing its valid race list", () => {
    const malformed = structuredClone(trusteeFixture) as unknown as TrusteeRaceCardsFeed;
    malformed.boards[0].map!.features[0].path = "not an svg path";

    const validated = validateTrusteeRaceCards(malformed);

    expect(validated).not.toBeNull();
    expect(validated?.boards[0].map).toBeNull();
    expect(validated?.boards[1].map?.features).toHaveLength(12);
    expect(validated?.boards[0].wards).toHaveLength(12);
  });
});

describe("validateCouncil", () => {
  it("keeps a complete map and drops a malformed optional map", () => {
    const valid = validateCouncil(councilFixture);
    expect(valid?.map?.features).toHaveLength(25);

    const malformed = structuredClone(councilFixture) as unknown as CouncilRaceCardsFeed;
    malformed.map!.features.pop();
    const validated = validateCouncil(malformed);
    expect(validated?.map).toBeNull();
    expect(Object.keys(validated?.wards ?? {})).toHaveLength(25);
  });

  it("accepts schema 9 endorsements and still accepts a schema 8 feed without them", () => {
    const valid = validateCouncil(councilFixture);
    const endorsed = Object.values(valid?.wards ?? {})
      .flatMap((card) => card.candidates)
      .filter((candidate) => (candidate.endorsements ?? []).length > 0);
    expect(endorsed).toHaveLength(1);
    expect(endorsed[0].endorsements?.[0].endorser_name).toBe("Progress Toronto");

    const older = structuredClone(councilFixture) as unknown as Record<string, unknown> & CouncilRaceCardsFeed;
    older.schema_version = 8 as never;
    for (const card of Object.values(older.wards)) for (const c of card.candidates) delete c.endorsements;
    expect(validateCouncil(older)).not.toBeNull();
  });

  it("rejects schema 9 candidates without an endorsements list or with a nameless endorser", () => {
    const missing = structuredClone(councilFixture) as unknown as CouncilRaceCardsFeed;
    delete missing.wards["1"].candidates[0].endorsements;
    expect(validateCouncil(missing)).toBeNull();

    const nameless = structuredClone(councilFixture) as unknown as CouncilRaceCardsFeed;
    const target = Object.values(nameless.wards)
      .flatMap((card) => card.candidates)
      .find((candidate) => (candidate.endorsements ?? []).length > 0)!;
    target.endorsements![0].endorser_name = "";
    expect(validateCouncil(nameless)).toBeNull();
  });

  it("rejects a missing ward instead of publishing an incomplete city", () => {
    const malformed = structuredClone(councilFixture) as unknown as CouncilRaceCardsFeed;
    delete malformed.wards["25"];

    expect(validateCouncil(malformed)).toBeNull();
  });
});


describe("schema 10 historical ward comparisons", () => {
  function currentFeed() {
    const fixture = structuredClone(councilFixture);
    return { ...fixture, schema_version: 10, ward_poll_benchmark: benchmark,
      wards: Object.fromEntries(Object.entries(fixture.wards).map(([ward, card]) => [ward, {
        ...card, ward_polls: ward === "4" ? [structuredClone(poll)] : card.ward_polls.map((reading) => ({ ...reading, modelled_context: null })),
      }])),
    };
  }
  it("accepts a complete source-consistent comparison", () => {
    expect(validateCouncil(currentFeed())).not.toBeNull();
  });
  it("rejects invented shares, wrong bands, residual bands and missing evidence", () => {
    const wrongShare = currentFeed();
    wrongShare.wards["4"].ward_polls[0].candidates[0].share = 0.99;
    expect(validateCouncil(wrongShare)).toBeNull();
    const wrongBand = currentFeed();
    const reading = wrongBand.wards["4"].ward_polls[0];
    if ("modelled_context" in reading && reading.modelled_context) reading.modelled_context.rows[0].upper = 0.2;
    expect(validateCouncil(wrongBand)).toBeNull();
    const missingMass = currentFeed();
    const massReading = missingMass.wards["4"].ward_polls[0];
    if ("modelled_context" in massReading && massReading.modelled_context) massReading.modelled_context.leader.scenarios.bins[0].fraction = 0.5;
    expect(validateCouncil(missingMass)).toBeNull();
    const missing = currentFeed();
    expect(validateCouncil({ ...missing, ward_poll_benchmark: undefined })).toBeNull();
    expect(validateCouncil({ ...missing, schema_version: "10" })).toBeNull();
  });
});

describe("schema 11 council Suspended Campaigns", () => {
  function suspendedFeed() {
    const fixture = structuredClone(councilFixture);
    return { ...fixture, schema_version: 11, ward_poll_benchmark: benchmark,
      wards: Object.fromEntries(Object.entries(fixture.wards).map(([ward, card]) => {
        const suspended = ward === "5" ? "2026-10-09" : null;
        return [ward, {
          ...card,
          incumbent_campaign_suspended_on: suspended,
          attention: suspended ? { level: "suspended", score: 4000 } : card.attention,
          candidates: card.candidates.map((candidate) => ({
            ...candidate,
            campaign_suspended_on:
              suspended && candidate.display_name === card.incumbent.name ? suspended : null,
          })),
          ward_polls: card.ward_polls.map((reading) => ({
            ...reading, modelled_context: null, before_incumbent_suspension: suspended !== null,
          })),
        }];
      })),
      map: null,
    };
  }

  it("accepts an incumbent's Suspended Campaign as its own attention level", () => {
    const valid = validateCouncil(suspendedFeed());
    expect(valid?.wards["5"].attention.level).toBe("suspended");
    expect(valid?.wards["5"].incumbent_campaign_suspended_on).toBe("2026-10-09");
  });

  it("rejects a suspended level without a date, a bad date, or missing fields", () => {
    const undated = suspendedFeed();
    undated.wards["5"].incumbent_campaign_suspended_on = null;
    expect(validateCouncil(undated)).toBeNull();

    const badDate = suspendedFeed();
    badDate.wards["5"].candidates[0].campaign_suspended_on = "Oct 9";
    expect(validateCouncil(badDate)).toBeNull();

    const noCandidateField = suspendedFeed();
    delete (noCandidateField.wards["1"].candidates[0] as Record<string, unknown>).campaign_suspended_on;
    expect(validateCouncil(noCandidateField)).toBeNull();

    const noPollFlag = suspendedFeed();
    delete (noPollFlag.wards["5"].ward_polls[0] as Record<string, unknown>).before_incumbent_suspension;
    expect(validateCouncil(noPollFlag)).toBeNull();
  });

  it("does not accept the suspended level from an older schema", () => {
    expect(validateCouncil({ ...suspendedFeed(), schema_version: 10 })).toBeNull();
  });
});
