# Spec: council-signal-explanations

Replace the generic statistical prose beneath council candidates and incumbents
with concise, race-specific explanations of what each fired signal means for that
person and race — candidate-history signals paired with a direction icon, and
incumbent CDI components translated into concrete ward facts — while preserving
the existing statistical definitions, gates, and non-predictive framing. (This is
the "ward-detail presentation pass.")

Original umbrella ticket: [issues/01](issues/01-turn-generic-council-signals-into-race-specific-explanations.md)
(status: decomposed). Its ~17 acceptance criteria are split into the sub-tickets
below.

## Sub-tickets

| # | Ticket | Layer | Blocked by |
|---|--------|-------|-----------|
| 02 | Candidate-history signal provenance + direction rules | data/feed + docs | — |
| 03 | Render race-specific candidate-history explanations + direction icons | frontend | 02 |
| 04 | Place opponent-history signals once, at race level | data/feed + frontend | 02 |
| 05 | Explain incumbent CDI components with concrete ward facts | data + frontend | — |

02 is the keystone: it turns each hint into structured, candidate-specific
provenance + a signed direction, replacing the static catalog `frontend_copy` the
frontend currently prints verbatim. 03 and 04 consume it. 05 is an independent
data path (the CDI / incumbency numbers) and can proceed in parallel.

## Cross-cutting constraints (hold for every sub-ticket)

- Existing trigger thresholds, study associations, evidence gates, and council
  attention logic are **unchanged**. This is presentation, not new modelling.
- Everything stays **descriptive and non-predictive** (ADR 0043): a direction is
  "historically positive/negative," never a probability, effect size, or forecast.
- **No guessing / no generic fallback.** If the facts for an honest explanation
  can't be resolved, omit the explanation rather than printing boilerplate.
- Explanations are **deduplicated** against the visible past-races list and the
  incumbent summary — they interpret those facts, never restate them at length.
- Distinguish a **measured zero** (a confirmed qualifying candidacy with zero
  victories) from **missing coverage** (no resolved qualifying history).

## Data anchors (verified for the acceptance cases)

- Ward 20 Naser Kaid: two TDSB trustee losses are qualifying non-council history;
  most recent qualifying result a 7th-place finish in 2022 ~26 pts behind; elected
  victory count 0. Ward 20 Malik Ahmad: three unsuccessful council races are NOT
  qualifying own-history (unsuccessful council counts only for a Returning
  councillor). Ward 20 opponent value derives from incumbent Parthi Kandavel.
- Ward 11 Dianne Saxe: growth ≈ 8,869 more voters than 2022 vs a 123-vote margin;
  won with 35% of votes cast and support from 11% of eligible voters.
