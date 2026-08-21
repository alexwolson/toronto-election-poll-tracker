# 03: Render race-specific candidate-history explanations + direction icons

**What to build:** Replace the generic statistical sentences beneath council
candidates with concise, specific explanations built from the structured
provenance (ticket 02), each paired with an up/down zigzag/trend icon for
historical direction. Deduplicate against the visible past-races list and the
incumbent summary.

**Blocked by:** 02

**Status:** resolved

- [ ] Every displayed candidate-history signal names the relevant candidate or
  opponent and states the actual fact that caused it to appear; none repeats the
  generic catalog sentences about "qualifying elected-office," "Returning
  councillors," or historical candidates in the abstract.
- [ ] Each displayed signal has an upward/downward zigzag/trend icon for a
  historically positive/negative direction. The icon implies no magnitude,
  probability, causality, or forecast, and has an accessible text equivalent such
  as "positive historical signal" / "negative historical signal."
- [ ] Naser Kaid's Ward 20 explanations treat his two trustee losses as qualifying
  non-council history: most recent qualifying result a 7th-place finish in 2022,
  ~26 pts behind the winner, with zero elected-office victories — both presented as
  negative signals. The page never shows positive-sounding boilerplate about
  "stronger results" or "each additional victory" without saying where Kaid falls.
- [ ] Malik Ahmad's three unsuccessful council races do not become qualifying
  own-history signals (unsuccessful council counts only for a Returning
  councillor); the presentation makes no unsupported claim about Ahmad and does not
  require readers to understand internal vocabulary.
- [ ] Candidate history distinguishes a measured zero from missing coverage: Kaid's
  zero victories can produce a specific negative explanation; a candidate with no
  resolved qualifying history does not receive the same claim.
- [ ] Explanations are deduplicated against the visible past-races list and
  incumbent summary — a signal may concisely interpret those facts but not restate
  them in longer or more technical language.
- [ ] Multiple candidate hints compose into a short, scannable group with a brief
  "historical context, not a forecast" note; existing thresholds/gates unchanged.
- [ ] Regression: the retired generic phrases are absent from rendered council
  pages; Kaid and Ahmad cases; accessible icon labels; measured-zero vs missing.

## Answer

New `src/lib/council-signals.ts` composes a specific explanation + signed
direction from each own-history hint's provenance (ticket 02): a most-recent loss
reads "Most recent race: 7th of 8 — 2022 school-board trustee, ~26 points behind";
a measured-zero victory count reads "No wins in 2 prior elected races"; wins read
positively. The redundant "has held office" hint is deduped (the "Former X"
headline + past-races list already show it). The ward-detail page renders them in
a "Historical context — not a forecast" group, each with an up/down zigzag
`DirectionIcon` (SVG, `role="img"` + "positive/negative historical signal" label).
Opponent signals are filtered out here (placed at race level by ticket 04). The
static `hint.copy` is no longer rendered.

**Coverage:** `src/lib/council-signals.test.ts` — Kaid margin (7th of 8, 26 pts,
negative), measured-zero victory count, a win + positive count, trustee, the
`own_any` dedup + opponent filter, and the empty (Ahmad) case; each asserts the
generic catalog phrases are absent. Verified in the built pages: Ward 20 Kaid
renders both negative signals with a11y labels; Ahmad shows none; and a scan of
every `/wards` page finds **zero** retired catalog phrases. Frontend suite: 53
passing.
