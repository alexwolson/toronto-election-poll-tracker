# 02: Candidate-history signal provenance + direction rules

**What to build:** Carry, through the council-card feed, the structured facts and
provenance needed to explain every candidate-history signal for a specific person
and race, plus a signed historical direction — replacing the static catalog
`frontend_copy` the frontend prints verbatim. Preserve the existing statistical
definitions, gates, and non-predictive framing.

**Blocked by:** None.

**Status:** resolved

- [ ] Each fired candidate-history signal carries structured provenance: subject
  (own/opponent), the source candidate where applicable, and the source race —
  office type, date, district, result, and margin or victory count — plus a
  coverage state (resolved / measured-zero / missing).
- [ ] A signed **direction** (positive / negative) is derived from the candidate's
  actual value **and** the measured association, not merely the association's
  coefficient sign. Decision rules are documented and deterministically tested for
  all six supported hint types, including missing values, zero victories, positive
  and negative prior margins, and own- vs opponent-history signals.
- [ ] A **measured zero** (a confirmed qualifying candidacy with zero victories) is
  distinguished in the feed from **missing coverage** (no resolved qualifying
  history), so downstream can explain the former but not claim the latter.
- [ ] Opponent-history facts are computed ward-wide, **not** gated by whether the
  subject candidate has linked history (so a ward-wide opponent fact is available
  to attach at race level, not only under identity-matched candidates).
- [ ] When the facts required for an honest explanation cannot be resolved, the
  signal is omitted rather than emitted with generic prose.
- [ ] The historical-hint display contract and related decision documentation are
  updated wherever they currently require exact static `frontend_copy`, so the new
  structured presentation cannot silently drift back to generic prose.
- [ ] Regression covers every supported candidate-history hint type, the
  measured-zero vs missing distinction, own- and opponent-history, and the
  missing-provenance omission path.

## Answer

`council_hints.py`: `signal_direction(hint_id, value)` returns positive/negative
from the candidate's actual value *and* the association (own-presence → positive;
opponent → negative; margin by value sign; victory-count negative at a measured
zero) — documented, tested for all six hints. `CandidateFeatures` now carries the
candidate name + qualifying source records; `FiredHint` gains `direction` and a
structured `SignalSource` (opponent name, source race office/year/district/result/
rank/field-size/margin, victory + qualifying counts, `coverage` = resolved /
measured_zero). `fire_candidate_hints` attaches the source per hint (own most-
recent-qualifying race; the source opponent for opponent signals). Both are
additive within schema v3; `council_snapshot._hint_card` emits them. Hints fire
only for resolved candidates, so an unresolvable signal is simply absent (no
generic fallback). ADR 0047 amended: `frontend_copy` is no longer the display
contract.

**Coverage:** `test_council_hints.py` — `signal_direction` across all six hints
(missing value, zero victories, ±margin, own/opponent); `fire_...provenance`
(measured-zero coverage + opponent name). `test_council_snapshot.py` — Ward 20
Naser Kaid on real data: margin signal negative (7th of 8, 2022 trustee loss,
−26 pts); victory-count measured_zero (0 of 2); opponent signal names Parthi
Kandavel. Full data suite: 307 passing. Frontend still builds (fields ignored
until ticket 03).
