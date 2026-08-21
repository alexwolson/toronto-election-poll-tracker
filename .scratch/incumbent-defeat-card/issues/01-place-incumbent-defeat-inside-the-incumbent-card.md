# 01: Place Incumbent-Defeat inside the incumbent's candidate card

**What to build:** Associate a published Incumbent-Defeat quantity with the incumbent identified by the forecast feed and present it inside that candidate's forecast card. For the current field, Olivia Chow's card should pair her win chance with the clearer complementary wording "Chance Olivia Chow loses to any candidate." Candidate-agnostic quantities remain outside every candidate card.

**Blocked by:** None (can start immediately).

**Status:** resolved

- [ ] Olivia Chow's candidate card includes the label "Chance Olivia Chow loses to any candidate" and the published Incumbent-Defeat frequency phrase.
- [ ] The incumbent's displayed name is resolved from the feed's incumbent identity rather than hardcoded into the association logic.
- [ ] Incumbent-Defeat is omitted everywhere when it does not pass its publication gates.
- [ ] Close-Result remains outside the individual candidate cards when published and remains hidden when withheld.
- [ ] The candidate-agnostic quantities section is not rendered when no candidate-agnostic quantity is published.
- [ ] Every displayed forecast quantity continues to use only its published band or frequency phrase, never a raw probability.
- [ ] Regression coverage proves both placement and gating for published and withheld Incumbent-Defeat and Close-Result states.

## Answer

`mayoral-forecast.ts` split the old `derivedQuantities` into two:
- `incumbentDefeat(feed)` — the incumbent's published defeat chance, tied to
  `feed.incumbent_candidate_id`, with a `label` built from the resolved name
  (`Chance ${name} loses to any candidate`, never hardcoded). Null when the race
  is open or the quantity is withheld.
- `agnosticQuantities(feed)` — candidate-agnostic quantities only (Close-Result),
  omitted when withheld.

`forecast-hero.tsx` renders the incumbent-defeat line **inside the incumbent's
band card** (under a hairline), and renders the agnostic section only when
`agnosticQuantities` is non-empty. All values are bands/frequency phrases; no raw
probability. On the certified feed Chow's card shows "about 4 in 5" + "Chance
Olivia Chow loses to any candidate · about 1 in 5", and the agnostic section is
absent (Close-Result withheld).

**Coverage** (`src/lib/mayoral-forecast.test.ts`):
- `incumbentDefeat` returns Chow + label + "about 1 in 5"; returns null when the defeat gate fails and when the race is open (no `incumbent_candidate_id`).
- `agnosticQuantities` excludes incumbent-defeat and is `[]` when Close-Result is withheld; returns only `close_result` when it publishes.
- Verified in the built home page: the label + phrase appear, the old "Chance the incumbent loses" row is gone, and "Chance of a close result" is absent.
