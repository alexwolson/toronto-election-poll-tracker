# 05: Explain incumbent CDI components with concrete ward facts

**What to build:** Translate the three Councillor Defeatability Index components,
and any separately fired exposure triggers, into concrete ward facts using the
ward's actual values — combining and deduplicating related information — instead of
the abstract "combined index" / "structurally exposed" prose. Carry the facts and
provenance needed through the feed; preserve the CDI's definitions, thresholds,
and non-predictive framing, and its attribution.

**Blocked by:** None (independent CDI/incumbency data path; may run parallel to 02).

**Status:** ready-for-agent

- [ ] Incumbent exposure explanations use the ward's actual values. For Ward 11 the
  growth explanation reads equivalently to: "University–Rosedale has an estimated
  8,869 more voters than in 2022 — far more than Dianne Saxe's 123-vote winning
  margin."
- [ ] A high CDI result is explained through what its three measurements mean for
  this race: prior vote share, the incumbent's votes as a share of eligible
  electors, and electorate growth relative to the winning margin. Where a separately
  fired trigger already explains one component, the index explanation covers the
  remaining meaning instead of repeating it.
- [ ] Ward 11's combined presentation reads equivalently to the approved growth
  sentence plus: "Dianne Saxe won with 35% of votes cast and support from 11% of
  eligible voters — both among the lowest for Toronto incumbents." It does not use
  unexplained phrases such as "combined index" or "structurally exposed."
- [ ] City Hall Watcher and the Councillor Defeatability Index remain properly
  attributed. A concise fallback such as "Dianne Saxe has received a high
  Councillor Defeatability Index rating from City Hall Watcher" is used only when a
  component-based explanation genuinely cannot be produced, not when the component
  facts are available.
- [ ] Incumbent triggers and CDI explanation compose into a short, scannable group
  with a brief "historical context, not a forecast" note; existing trigger
  thresholds and attention logic are unchanged.
- [ ] Regression covers Ward 11's growth sentence and high-index combination, every
  incumbent exposure-trigger type, and the attribution fallback.
