import type { Ward } from "@/types/ward";

export type PollHistoryItem = { use: "current_average" | "head_to_head" | "different_candidate_field" | "other" };

export type PollBreakdown = {
  currentField: number;
  headToHead: number;
  differentField: number;
  other: number;
  total: number;
};

export function getPollBreakdown(
  polls: PollHistoryItem[],
  totalTracked = polls.length
): PollBreakdown {
  const result: PollBreakdown = {
    currentField: 0,
    headToHead: 0,
    differentField: 0,
    other: 0,
    total: 0,
  };

  for (const poll of polls) {
    if (poll.use === "current_average") {
      result.currentField += 1;
    } else if (poll.use === "head_to_head") {
      result.headToHead += 1;
    } else if (poll.use === "different_candidate_field") {
      result.differentField += 1;
    } else {
      result.other += 1;
    }
  }

  // If an older snapshot reports a larger tracked total than the history it
  // contains, keep the accounting honest by exposing the gap as Other.
  result.other += Math.max(0, totalTracked - polls.length);
  result.total =
    result.currentField +
    result.headToHead +
    result.differentField +
    result.other;

  return result;
}

export type RaceStatusCounts = Record<Ward["race_class"], number> & {
  total: number;
};

export function getRaceStatusCounts(
  wards: Pick<Ward, "race_class">[]
): RaceStatusCounts {
  const counts: RaceStatusCounts = {
    safe: 0,
    competitive: 0,
    open: 0,
    total: 0,
  };

  for (const ward of wards) {
    counts[ward.race_class] += 1;
    counts.total += 1;
  }

  return counts;
}

export type CandidateSummary = {
  id: string;
  name: string;
  summary: string;
};

export type CandidateStatus = Record<
  "declared" | "potential" | "declined",
  CandidateSummary[]
>;

export type CandidateRoster = {
  featured: CandidateSummary[];
  remainingDeclared: CandidateSummary[];
  potential: CandidateSummary[];
  declined: CandidateSummary[];
};

export function partitionCandidateRoster(
  status: Partial<CandidateStatus> | Record<string, CandidateSummary[]>,
  featuredIds: string[]
): CandidateRoster {
  const declared = status.declared ?? [];
  const declaredById = new Map(declared.map((candidate) => [candidate.id, candidate]));
  const featured = featuredIds.flatMap((id) => {
    const candidate = declaredById.get(id);
    return candidate ? [candidate] : [];
  });
  const featuredSet = new Set(featured.map((candidate) => candidate.id));

  return {
    featured,
    remainingDeclared: declared.filter(
      (candidate) => !featuredSet.has(candidate.id)
    ),
    potential: status.potential ?? [],
    declined: status.declined ?? [],
  };
}

export type RaceTakeaway = {
  leader: { id: string; share: number } | null;
  leadingChallenger: { id: string; share: number } | null;
  alexanderCombinedShare: number | null;
  latestPollDate: string | null;
  currentFieldPollCount: number;
};

export function getRaceTakeaway({
  candidates,
  currentFieldPollCount,
  latestPollDate,
}: {
  candidates: Record<string, number>;
  currentFieldPollCount: number;
  latestPollDate: string | null;
}): RaceTakeaway {
  const ranked = Object.entries(candidates)
    .filter(([, share]) => Number.isFinite(share))
    .sort(([, a], [, b]) => b - a);
  const challengers = ranked.filter(([id]) => id !== "chow");
  const bradford = candidates.bradford;
  const alexander = candidates.alexander;
  const combined = bradford + alexander;

  return {
    leader: ranked[0] ? { id: ranked[0][0], share: ranked[0][1] } : null,
    leadingChallenger: challengers[0]
      ? { id: challengers[0][0], share: challengers[0][1] }
      : null,
    alexanderCombinedShare:
      Number.isFinite(combined) && combined > 0 ? alexander / combined : null,
    latestPollDate,
    currentFieldPollCount,
  };
}

export function humanizePollReason(use: PollHistoryItem["use"]): string {
  if (use === "current_average") return "Used in current average";
  if (use === "head_to_head") return "Head-to-head only";
  if (use === "different_candidate_field") return "Different candidate field";
  return "Other";
}
