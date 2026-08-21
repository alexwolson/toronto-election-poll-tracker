# 01: Explain how polls become mayoral win chances

**What to build:** Expand How It Works with a plain-language, end-to-end explanation of how eligible mayoral polls become public win-chance bands. A reader should be able to follow which polls enter the forecast, how omitted candidates and historical polling uncertainty are handled, how simulated full-ballot outcomes produce all published race metrics, and why some results are shown only as broad bands or withheld. Pair the explanation with one light, accessible flow figure and a worked example expressed in public bands rather than invented exact probabilities.

**Blocked by:** None (can start immediately).

**Status:** resolved

- [ ] The explanation clearly distinguishes the mayoral forecast from both an individual poll and the descriptive LOESS trend on the Polls page.
- [ ] Poll eligibility is explained accurately: the forecast uses polls of the certified candidate field, keeps the newest eligible reading from each pollster, and gives each represented pollster equal weight rather than allowing firms with more releases to dominate.
- [ ] The explanation says what happens when a poll does not report every certified candidate: reported candidates are compared within that reading, while historical Toronto elections inform a reserved share for unmeasured final-ballot candidates. It does not imply that missing candidates have zero support.
- [ ] Historical Toronto polling is described as the source for both omitted-candidate share and poll-to-election uncertainty. The copy does not imply that historical elections mechanically determine the current result.
- [ ] The simulation step explains that many plausible full-ballot election outcomes are generated from the same evidence. Candidate win chance, the chance Olivia Chow loses to any candidate, and the chance of a close race are all summaries of those same outcomes rather than separate models.
- [ ] The page explains that alternative reasonable assumptions are rerun as sensitivity checks, including newer-poll emphasis, lower and higher unmeasured-candidate shares, leaving out one sample or pollster, and an incumbency-prior sensitivity. It makes clear that the incumbency prior is not part of the main forecast.
- [ ] Publication gates are explained in reader-facing terms: the site publishes only when the evidence is sufficient and the conclusion remains stable across the required checks, and it uses the narrowest out-of-ten or out-of-five band that remains defensible.
- [ ] A worked example shows how a hypothetical set of simulated outcomes becomes a public band without presenting fabricated current-candidate figures or exposing an exact probability the product intentionally withholds.
- [ ] A compact flow figure conveys the sequence “eligible polls → account for the full ballot and historical uncertainty → simulate outcomes → test stability → publish a band or withhold.” It has a complete text equivalent, does not rely on colour alone, remains legible on mobile, and uses existing visual conventions.
- [ ] The section states its limits: it is a probabilistic forecast, not a poll average, endorsement, or claim that an outcome is certain; late campaign changes and systematic polling error remain possible.
- [ ] Content and rendering tests protect the model-defining claims, the forecast-versus-trend distinction, the public-band worked example, accessible figure labelling, and responsive presentation.

## Answer

Rebuilt the mayoral methodology as an end-to-end reader journey: eligible polls,
equal pollster weighting, full-ballot treatment, historical uncertainty,
simulation, sensitivity checks, and stable public bands. The page includes a
six-step accessible flow and a hypothetical banding example, and explicitly
connects candidate win chances, Olivia Chow losing, and a close-race result to the
same simulated outcomes. Structured content and rendering tests protect the key
claims and figure labels; desktop and mobile layouts were reviewed in-browser.
