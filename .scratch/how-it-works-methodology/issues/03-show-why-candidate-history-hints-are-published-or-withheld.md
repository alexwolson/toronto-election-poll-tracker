# 03: Show why candidate-history hints are published or withheld

**What to build:** Add an evidence-literacy section to How It Works showing how candidate-history ideas move from plausible hypotheses to published historical hints or withheld findings. Draw representative accepted and rejected examples from the upstream Council Defeatability Index candidate-history audit. Explain the coverage, sample-size, uncertainty, identity-quality, and cross-election checks in plain language, while preserving the core distinction that a supported historical association is neither a prediction nor a causal explanation.

**Blocked by:** Council signal explanations 01, “Turn generic council signals into race-specific directional explanations.”

**Status:** resolved

- [ ] The section accurately states that the upstream study tested 34 candidate-facing flag definitions and currently publishes two hints, with the full audit retaining withheld and diagnostic-only definitions.
- [ ] Readers are shown the common evidence basis: confirmed candidate identities in the 2010, 2014, and 2022 stable-boundary general elections; comparisons adjusted for election, candidate regime, and field size; and uncertainty grouped at the contest level.
- [ ] The minimum coverage gate is explained without making sample size sound sufficient by itself. Categorical flags require at least five triggered candidacies in five contests and two elections; continuous flags require at least 20 observations in ten contests and all three studied elections, with adequate comparison coverage where applicable.
- [ ] The decision path explains that an association's plausible range must stay on one side of no relationship after adjustment. Election-to-election direction is reported as a stronger-versus-weaker evidence tier, not treated as an automatic veto when the pooled evidence clears the defined gate.
- [ ] One consistently supported example uses prior trustee victories: 17 qualifying candidacies across 16 contests and three elections were associated with higher council vote share, with the estimated direction positive in 2010, 2014, and 2022.
- [ ] The second published example uses the schema-2 binary prior-win definition: among non-incumbent, non-returning candidates with prior races, 13 candidacies across 12 contests and three elections had at least one prior win, with the association in the same direction in all three elections.
- [ ] One sparse withheld example demonstrates why an impressive-looking result is not enough: the prior-MP-win flag had only one qualifying person, contest, and election, so it was withheld for insufficient data despite a large estimated association.
- [ ] One uncertain withheld example explains why “each additional prior victory” was rejected: the all-candidate interval included no relationship, and candidates who had already won showed no clear dose response. The supported public definition is any win versus no win in the eligible candidate regimes.
- [ ] One rejected example shows that two or more unsuccessful council runs did not have a clear association and did not repeat in the same direction across all elections.
- [ ] The section distinguishes “withheld” from “disproven”: insufficient coverage, unresolved identities, or an inconclusive estimate mean the evidence does not justify a public candidate-specific statement, not that the relationship cannot exist.
- [ ] The section explains that a narrower supported definition may be superseded by a broader supported trigger to avoid publishing redundant versions of the same idea.
- [ ] Published hints are framed exactly as historical context. They do not enter the Councillor Defeatability Index or a winner model, do not assign candidate probabilities or scores, and do not claim that holding office caused later vote share.
- [ ] A compact “tested → check coverage and identities → estimate the association → compare elections → publish, supersede, or withhold” figure and the example presentation have full text equivalents, do not rely on colour alone, and remain readable on mobile.
- [ ] The reviewed narrative records the upstream evidence artifact version or source revision used, without creating a runtime dependency on a sibling repository. Tests or structured content checks prevent the counts, example statuses, and reasons from silently drifting apart.

## Answer

Added a five-step evidence gate and updated it to the final schema-2 analysis:
34 definitions tested, two public hints, and an explicit rule that aggregate
history must match every confirmed prior race visible to the reader. The examples
now include both published definitions—the trustee-specific hint and the binary
all-past-races prior-win hint—plus sparse, uncertain, and inconsistent withheld
definitions. The rejected per-additional-victory example records why a zero-wins
or dosage hint is not defensible. The page also distinguishes the 18-test
diagnostic screen (seven standalone clears) from the deliberately reviewed public
catalog. Structured content records contract 2.0.0 and the review date without a
runtime sibling-repo dependency; tests keep the counts, statuses, reasons, and
flow together.
