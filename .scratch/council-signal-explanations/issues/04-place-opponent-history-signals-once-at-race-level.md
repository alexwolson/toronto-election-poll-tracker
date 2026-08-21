# 04: Place opponent-history signals once, at race level

**What to build:** Present opponent-history information once, at an appropriate
race-level location, instead of attaching the same opponent-derived value beneath
each identity-matched candidate — and omit opponent signals that merely duplicate
first-class incumbent information.

**Blocked by:** 02

**Status:** resolved

- [ ] Opponent-history information is not arbitrarily gated by whether the subject
  candidate has linked history; a ward-wide opponent fact does not appear beneath
  only the identity-matched subset of candidates who face that opponent.
- [ ] Opponent-history signals that merely duplicate first-class incumbent
  information are either omitted from individual candidate cards or surfaced once in
  an appropriate race-level location. If an opponent signal adds distinct
  information and is shown, it identifies the opponent and the specific prior result
  behind it.
- [ ] In Ward 20, the UI does not attach the same unexplained Parthi
  Kandavel-derived value to Ahmad, Kaid, Lisciandro, and Rupasinghe while silently
  omitting it for Laikul Choudhury solely because Choudhury has no linked history.
- [ ] Regression covers the Ward 20 opponent-placement cases (Ahmad, Kaid,
  Kandavel, Choudhury) and the omit-when-duplicating-incumbent rule.

## Answer

Opponent-history is no longer rendered as per-candidate signals (ticket 03 already
filters candidate cards to own-history). Instead `notableChallengers(card)`
(`council-signals.ts`) surfaces, **once at race level**, the non-incumbent
candidates who have previously *won* elected office — each identified by name and
their most senior prior win ("Han Dong — former MP (2021)"). It is derived from
each candidate's own linked history, so it is not gated by which other candidates
are identity-matched; and the **sitting incumbent is excluded** because their
record is already first-class in the incumbent section (so a Kandavel-derived
opponent value never attaches to Ward 20's candidates). The ward page renders a
"Notable challengers" section only when the list is non-empty.

**Coverage** (`council-signals.test.ts`): Ward 23 surfaces Han Dong (former MP)
once, identified; Ward 20 excludes the incumbent Kandavel and the all-losses Kaid;
and across every ward the sitting incumbent is never listed. Verified in the built
pages: Ward 23 shows the note; Ward 20 shows none. Frontend suite: 56 passing.
