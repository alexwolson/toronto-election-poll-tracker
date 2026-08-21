# 04: Turn How It Works into a navigable methodology reference

**What to build:** Integrate the completed forecast, council-attention, and candidate-history explainers into a coherent How It Works page that helps readers quickly find the method behind the part of the site they are using. Replace the current collection of design decisions with a layered reference: a short overview for casual readers, navigable detail and worked examples for interested readers, clear limitations, and source/provenance notes. Preserve the distinction between the mayoral forecast, descriptive polling trends, and council attention throughout.

**Blocked by:** 01, “Explain how polls become mayoral win chances”; 02, “Explain council attention with a real ward”; 03, “Show why candidate-history hints are published or withheld”; Polling LOESS trend 01, “Replace poll-to-poll connections with LOESS trend curves” (resolved prerequisite).

**Status:** resolved

- [ ] The opening gives readers a concise three-part map: the mayoral page contains a probabilistic forecast, the Polls page shows reported observations with descriptive LOESS smoothing, and council pages provide attention signals and historical context without ward-level forecasts.
- [ ] A compact in-page navigation links to the mayoral forecast, polling trends, council attention, candidate-history evidence, limitations, glossary, and sources. Links have meaningful labels, work with keyboard and assistive technology, and land below any sticky header.
- [ ] The three completed explainers and their figures are integrated without repeating definitions, contradicting one another, or forcing a casual reader through the detailed methodology before reaching the main distinctions.
- [ ] The polling-trend section explains that dots are individual polls and LOESS curves summarize local movement in those reported observations. It does not call the curve a polling average, interpolate a candidate into polls where they were absent, or imply that it predicts election day.
- [ ] A short “Why might no number appear?” example connects insufficient evidence and sensitivity disagreement to withheld or broader forecast bands without exposing internal-only exact probabilities.
- [ ] A limitations section covers polling coverage and systematic error, simulation assumptions, historical-era limits, sparse council defeats, candidate-identity coverage, associations versus causation, and the absence of ward-level forecast probabilities.
- [ ] A concise glossary defines only reader-facing terms that materially aid understanding, including poll, LOESS trend, win-chance band, sensitivity check, open seat, prior win, Councillor Defeatability Index, exposure trigger, and historical hint.
- [ ] Sources and attribution identify the official election and candidate records, polling sources, historical Toronto elections used by the forecast, City Hall Watcher's Councillor Defeatability Index methodology, and the reviewed candidate-history evidence. The page includes an understandable methodology update date or revision note.
- [ ] Reader-facing copy does not expose internal ADR numbers, feed names, implementation vocabulary, or obsolete modelling approaches as though they describe the live site.
- [ ] Every figure has an adjacent explanation or equivalent accessible description; headings form a logical hierarchy; focus states and contrast meet existing accessibility standards; and the full page remains scannable on narrow screens.
- [ ] Links from relevant mayoral, Polls, and council explanatory copy take readers directly to the matching How It Works section rather than only to the top of the page.
- [ ] End-to-end coverage verifies navigation targets, cross-page deep links, the three-method distinction, LOESS wording, limitations and source notes, figure accessibility, and representative desktop and mobile layouts.

## Answer

Replaced the former design-note collection with a layered methodology reference:
a three-part primer, seven-link contents navigation, detailed forecast/polling/
council/history sections, worked examples, limits, glossary, sources, and a visible
review date. All section links work with semantic headings, the figures have text
equivalents, and both desktop and 390px mobile layouts were checked in-browser
with no horizontal overflow. In keeping with the user's isolated-page scope, this
change does not edit the mayoral, Polls, or council pages to add new inbound deep
links; that integration can be folded into the separate primary-page copy cleanup.
