# 04: Place opponent-history signals once, at race level

**What to build:** Present opponent-history information once, at an appropriate
race-level location, instead of attaching the same opponent-derived value beneath
each identity-matched candidate — and omit opponent signals that merely duplicate
first-class incumbent information.

**Blocked by:** 02

**Status:** ready-for-agent

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
