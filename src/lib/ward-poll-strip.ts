import type { WardPoll } from "@/types/feeds";

export interface StripPoll {
  pollId: string;
  firm: string;
  dateConducted: string;
  sampleSize: number | null;
  isNewest: boolean;
  /** Polls between this one and the newest; 0 for the newest. */
  age: number;
}

export interface StripPoint {
  pollId: string;
  /** Plotted value: share of decided voters (or of everyone asked, for Undecided). */
  value: number;
  /** The share exactly as the pollster printed it. */
  printed: number;
}

export interface StripRow {
  kind: "candidate" | "other" | "undecided";
  key: string;
  name: string;
  isIncumbent: boolean;
  points: StripPoint[];
  /** The newest poll's model range on the decided-voter scale, if modelled. */
  band: { lower: number; upper: number } | null;
  latest: number | null;
  latestNote: string | null;
}

export interface WardPollStrip {
  polls: StripPoll[];
  rows: StripRow[];
  leadSentence: string | null;
  intervalMass: number | null;
}

// Pollsters that keep undecided respondents in the base (Mainstreet) are put on
// the decided-voter scale the other firms print, so the same race lines up.
function decidedShare(poll: WardPoll, share: number): number {
  if (poll.denominator === "all respondents" && poll.undecided_share) {
    return share / (1 - poll.undecided_share);
  }
  return share;
}

/** The existing two-error-model reading of the newest poll's lead. */
export function leadSentence(poll: WardPoll): string | null {
  const ranges = poll.modelled_context?.leader.ranges;
  if (!ranges?.length) return null;
  const crossZero = ranges.filter((r) => r.lower <= 0 && r.upper >= 0).length;
  if (crossZero === ranges.length) return "The reported lead could reverse.";
  if (crossZero) return "The models disagree about how secure the lead is.";
  return "Both error models favour the reported leader.";
}

export function buildWardPollStrip(polls: WardPoll[]): WardPollStrip | null {
  const final = polls
    .filter((p) => p.ballot_status === "final_ballot_candidates")
    .sort(
      (a, b) =>
        a.date_conducted.localeCompare(b.date_conducted) ||
        a.date_published.localeCompare(b.date_published),
    );
  if (final.length === 0) return null;
  const modelled = final.filter((p) => p.modelled_context);
  const newest = modelled[modelled.length - 1] ?? final[final.length - 1];
  const newestIndex = final.indexOf(newest);

  const named = new Map<string, { name: string; isIncumbent: boolean; points: StripPoint[] }>();
  for (const poll of final) {
    for (const c of poll.candidates) {
      if (c.is_residual) continue;
      const entry = named.get(c.candidate_id) ?? {
        name: c.candidate_name,
        isIncumbent: c.is_incumbent,
        points: [],
      };
      entry.points.push({
        pollId: poll.poll_id,
        value: decidedShare(poll, c.share),
        printed: c.share,
      });
      named.set(c.candidate_id, entry);
    }
  }

  const inNewest = (id: string) =>
    named.get(id)!.points.find((p) => p.pollId === newest.poll_id)?.value ?? null;
  const best = (id: string) => Math.max(...named.get(id)!.points.map((p) => p.value));
  const ids = [...named.keys()].sort((a, b) => {
    const na = inNewest(a);
    const nb = inNewest(b);
    if (na !== null && nb !== null) return nb - na;
    if (na !== null) return -1;
    if (nb !== null) return 1;
    return best(b) - best(a);
  });

  // The model's ranges are shares among named candidates; restate them on the
  // newest poll's decided-voter scale, holding the other-candidate share fixed.
  const scale = newest.candidates
    .filter((c) => !c.is_residual)
    .reduce((sum, c) => sum + decidedShare(newest, c.share), 0);
  const bands = new Map(
    (newest.modelled_context?.rows ?? []).map((r) => [
      r.candidate_id,
      { lower: r.lower * scale, upper: r.upper * scale },
    ]),
  );

  const rows: StripRow[] = ids.map((id) => {
    const entry = named.get(id)!;
    const latest = inNewest(id);
    return {
      kind: "candidate",
      key: id,
      name: entry.name,
      isIncumbent: entry.isIncumbent,
      points: entry.points,
      band: bands.get(id) ?? null,
      latest,
      latestNote: latest === null ? "not in newest" : null,
    };
  });

  const otherPoints: StripPoint[] = [];
  const undecidedPoints: StripPoint[] = [];
  for (const poll of final) {
    const residual = poll.candidates
      .filter((c) => c.is_residual)
      .reduce((sum, c) => sum + c.share, 0);
    if (poll.candidates.some((c) => c.is_residual)) {
      otherPoints.push({
        pollId: poll.poll_id,
        value: decidedShare(poll, residual),
        printed: residual,
      });
    }
    if (poll.denominator === "all respondents" && poll.undecided_share) {
      undecidedPoints.push({
        pollId: poll.poll_id,
        value: poll.undecided_share,
        printed: poll.undecided_share,
      });
    }
  }
  const latestOf = (points: StripPoint[]) =>
    points.find((p) => p.pollId === newest.poll_id)?.value ?? null;
  const otherLatest = latestOf(otherPoints);
  const undecidedLatest = latestOf(undecidedPoints);
  rows.push(
    {
      kind: "other",
      key: "other",
      name: "Other candidates",
      isIncumbent: false,
      points: otherPoints,
      band: null,
      latest: otherLatest,
      latestNote: otherLatest === null ? "none listed" : null,
    },
    {
      kind: "undecided",
      key: "undecided",
      name: "Undecided",
      isIncumbent: false,
      points: undecidedPoints,
      band: null,
      latest: undecidedLatest,
      latestNote: undecidedLatest === null ? "not published" : null,
    },
  );

  return {
    polls: final.map((p, i) => ({
      pollId: p.poll_id,
      firm: p.firm,
      dateConducted: p.date_conducted,
      sampleSize: p.sample_size,
      isNewest: p === newest,
      age: Math.abs(newestIndex - i),
    })),
    rows,
    leadSentence: leadSentence(newest),
    intervalMass: newest.modelled_context?.interval_mass ?? null,
  };
}
