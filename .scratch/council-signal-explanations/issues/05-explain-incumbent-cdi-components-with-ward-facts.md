# 05: Explain incumbent CDI components with concrete ward facts

**What to build:** Translate the three Councillor Defeatability Index components,
and any separately fired exposure triggers, into concrete ward facts using the
ward's actual values — combining and deduplicating related information — instead of
the abstract "combined index" / "structurally exposed" prose. Carry the facts and
provenance needed through the feed; preserve the CDI's definitions, thresholds,
and non-predictive framing, and its attribution.

**Blocked by:** None (independent CDI/incumbency data path; may run parallel to 02).

**Status:** resolved

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

## Answer

The incumbent's CDI component values now flow through the feed: `WardIncumbent`
gains `electorate_share`, and `_incumbent_card` emits `vote_share`,
`electorate_share`, and `new_voter_margin` (parsed from the CDI notes). The
frontend `incumbentExposureFacts(card)` (`council-signals.ts`) composes concrete
ward facts, gated on the same fired triggers (thresholds unchanged): the growth
fact ("University-Rosedale has gained an estimated 8,869 more voters since 2022 —
far more than Dianne Saxe's 123-vote winning margin", where 8,869 = new-voter
margin 8,746 + the 123-vote margin) and the high-CDI fact covering the remaining
components ("won with 35% of votes cast and support from 11% of eligible voters —
both among the lowest for Toronto incumbents"), with a City-Hall-Watcher/CDI
attribution and a component-missing fallback. No "combined index" / "structurally
exposed" jargon. The ward-detail incumbent section and the council-index cards
both render these facts instead of the catalog copy.

**Coverage** (`council-signals.test.ts`): Ward 11 growth + high-index sentences
with exact values and no jargon; the attribution fallback when components are
missing; empty for an open seat. Verified in the built pages: Ward 11 renders all
sentences + attribution; a jargon scan of every council page (detail **and**
index) finds **zero** "combined index" / "structurally exposed". Data suite green;
frontend suite 59 passing.
