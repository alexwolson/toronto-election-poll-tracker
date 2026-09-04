export type PollCounts = Record<string, number>;

export type PollSample = {
  indices: number[];
  counts: PollCounts;
  size: number;
};

const rankedGroupSizes = [30, 25, 20, 15, 10] as const;

function randomIndex(length: number, random: () => number) {
  const value = random();
  if (!Number.isFinite(value) || value < 0 || value >= 1) {
    throw new RangeError("random values must be at least 0 and less than 1");
  }
  return Math.floor(value * length);
}

export function emptyCounts(candidateIds: readonly string[]): PollCounts {
  return Object.fromEntries(candidateIds.map((candidateId) => [candidateId, 0]));
}

export function countChoices(
  group: readonly string[],
  candidateIds: readonly string[],
): PollCounts {
  const counts = emptyCounts(candidateIds);
  for (const candidateId of group) {
    if (!(candidateId in counts)) {
      throw new RangeError(`unknown candidate in practice group: ${candidateId}`);
    }
    counts[candidateId] += 1;
  }
  return counts;
}

export function buildPracticeGroup(
  candidateIds: readonly string[],
  random: () => number = Math.random,
) {
  if (
    candidateIds.length !== rankedGroupSizes.length
    || new Set(candidateIds).size !== candidateIds.length
  ) {
    throw new RangeError("the practice group needs five different candidates");
  }

  const remaining = [...candidateIds];
  const winner = remaining.splice(randomIndex(remaining.length, random), 1)[0];
  for (let index = remaining.length - 1; index > 0; index -= 1) {
    const swapIndex = randomIndex(index + 1, random);
    [remaining[index], remaining[swapIndex]] = [remaining[swapIndex], remaining[index]];
  }

  const rankedCandidates = [winner, ...remaining];
  const counts = Object.fromEntries(
    rankedCandidates.map((candidateId, index) => [candidateId, rankedGroupSizes[index]]),
  );

  // Keep each tree together so the full reveal becomes an instantly readable block chart.
  return candidateIds.flatMap((candidateId) =>
    Array.from({ length: counts[candidateId] }, () => candidateId),
  );
}

export function drawPoll(
  group: readonly string[],
  candidateIds: readonly string[],
  size: number,
  random: () => number = Math.random,
): PollSample {
  if (!Number.isInteger(size) || size < 1 || size > group.length) {
    throw new RangeError("sample size must fit inside the practice group");
  }

  const indices = Array.from({ length: group.length }, (_, index) => index);
  for (let index = indices.length - 1; index > 0; index -= 1) {
    const swapIndex = randomIndex(index + 1, random);
    [indices[index], indices[swapIndex]] = [indices[swapIndex], indices[index]];
  }

  const sampledIndices = indices.slice(0, size);
  const counts = sampledIndices.reduce((result, index) => {
    const candidateId = group[index];
    if (!(candidateId in result)) {
      throw new RangeError(`unknown candidate in practice group: ${candidateId}`);
    }
    result[candidateId] += 1;
    return result;
  }, emptyCounts(candidateIds));

  return { indices: sampledIndices, counts, size };
}
