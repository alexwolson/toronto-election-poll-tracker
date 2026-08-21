# Map: council-signal-explanations

The ward-detail presentation pass: turn generic statistical prose into concise,
race-specific explanations (candidate-history signals with direction icons;
incumbent CDI components as concrete ward facts), non-predictive throughout. See
[spec.md](spec.md).

| # | Ticket | Layer | Blocked by | Status |
|---|--------|-------|-----------|--------|
| 01 | [Umbrella: race-specific council signal explanations](issues/01-turn-generic-council-signals-into-race-specific-explanations.md) | — | — | decomposed |
| 02 | [Candidate-history signal provenance + direction rules](issues/02-candidate-history-signal-provenance-and-direction.md) | data/feed + docs | — | resolved |
| 03 | [Render race-specific candidate-history explanations + icons](issues/03-render-race-specific-candidate-history-explanations.md) | frontend | 02 | resolved |
| 04 | [Place opponent-history signals once, at race level](issues/04-place-opponent-history-signals-once-at-race-level.md) | data/feed + frontend | 02 | ready-for-agent |
| 05 | [Explain incumbent CDI components with ward facts](issues/05-explain-incumbent-cdi-components-with-ward-facts.md) | data + frontend | — | ready-for-agent |

**Frontier (open, unblocked, unclaimed):** 04 and 05.

**Suggested order:** 02 (keystone: feed provenance + direction) → 03 (render) and
04 (opponent placement) in parallel; 05 (incumbent CDI) independently, any time.
