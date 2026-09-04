import { describe, expect, it } from "vitest";
import { treeCandidates } from "./kids-vote-data";
import { buildPracticeGroup, countChoices, drawPoll } from "./kids-vote-poll";

const candidateIds = treeCandidates.map((candidate) => candidate.id);

describe("Kids Vote practice group", () => {
  it("gives every tree the same chance to be the hidden winner", () => {
    candidateIds.forEach((candidateId, index) => {
      let call = 0;
      const group = buildPracticeGroup(candidateIds, () => {
        call += 1;
        return call === 1 ? (index + 0.5) / candidateIds.length : 0.5;
      });
      const counts = countChoices(group, candidateIds);

      expect(group).toHaveLength(100);
      expect(counts[candidateId]).toBe(30);
      expect(Object.values(counts).sort((a, b) => b - a)).toEqual([30, 25, 20, 15, 10]);
    });
  });

  it("draws a sample without asking the same pretend voter twice", () => {
    const group = buildPracticeGroup(candidateIds, () => 0.25);
    const sample = drawPoll(group, candidateIds, 50, () => 0.75);

    expect(sample.indices).toHaveLength(50);
    expect(new Set(sample.indices)).toHaveLength(50);
    expect(Object.values(sample.counts).reduce((sum, count) => sum + count, 0)).toBe(50);
  });
});
