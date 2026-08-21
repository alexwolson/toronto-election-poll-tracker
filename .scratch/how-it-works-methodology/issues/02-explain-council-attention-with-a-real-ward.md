# 02: Explain council attention with a real ward

**What to build:** Expand How It Works with a concrete explanation of how the site decides which council races deserve attention without pretending to forecast ward winners. Use Ward 11 as the worked example: connect Dianne Saxe's prior result, eligible-elector support, narrow winning margin, and subsequent electorate growth to the three Councillor Defeatability Index measurements and the site's separate exposure triggers. A light figure should let readers see how the raw facts become attention context while keeping candidate-history hints and raw ward polls conceptually separate.

**Blocked by:** Council signal explanations 01, “Turn generic council signals into race-specific directional explanations.”

**Status:** resolved

- [ ] The section starts with the central distinction: council pages rank and explain attention signals but do not publish ward-level win probabilities because the historical evidence does not support that precision.
- [ ] Open seats, the Councillor Defeatability Index, separately fired exposure triggers, candidate-history hints, and raw ward polls are described as different sources of context. The page does not blend them into one unnamed score.
- [ ] The Councillor Defeatability Index is attributed to City Hall Watcher and explained through its three measurements: the incumbent's vote share in their prior win, their votes as a share of eligible electors, and added electors relative to their winning margin.
- [ ] The page explains that each component is ranked against other scoreable Toronto incumbents and combined into an attention index. A high result means the incumbent looks comparatively exposed on those measurements; it is not a probability of defeat or a causal claim.
- [ ] Ward 11 is the worked example using the reviewed facts: Dianne Saxe won in 2022 with about 35% of votes cast, support from about 11% of eligible electors, and a 123-vote margin; the ward is estimated to have added about 8,869 electors since that win.
- [ ] The Ward 11 narrative explains what those values mean for this race in ordinary language and matches the candidate-specific copy established by the blocking council-signal ticket. It does not fall back to phrases such as “structurally exposed” or “combined index” without explaining them.
- [ ] The explanation distinguishes an index component from a separately fired exposure trigger and shows how overlapping facts are combined rather than counted or narrated twice.
- [ ] The section explains why open seats rise toward the top of the council index as inherently high-attention races even though they have no incumbent to score.
- [ ] Candidate-history hints are introduced only as candidate-specific historical context with their own evidence gates; they are not represented as part of the Councillor Defeatability Index.
- [ ] Raw ward polls are presented as reported snapshots where available, not as inputs to a ward forecast or proof that an attention marker is correct.
- [ ] A compact, accessible figure traces “ward facts → index measurements and separate triggers → reader-facing attention context,” includes a complete text equivalent, and remains legible on mobile without relying on colour alone.
- [ ] Regression coverage protects the Ward 11 values and explanations, City Hall Watcher attribution, open-seat treatment, separation of council context from probabilities, accessible figure labelling, and responsive presentation.

## Answer

Added a council-attention explainer that keeps open seats, the Councillor
Defeatability Index, candidate history, and ward polls visibly separate. A Ward 11
figure now translates Dianne Saxe's 35% vote share, 11% eligible-elector support,
123-vote margin, and estimated 8,869 additional electors into ordinary-language
attention context. The section explains the three equally ranked CDI components,
credits Matt Elliott and City Hall Watcher, and links through to Ward 11. Rendering
tests protect the worked values and accessible figure label; the mobile layout was
verified at 390px without overflow.
