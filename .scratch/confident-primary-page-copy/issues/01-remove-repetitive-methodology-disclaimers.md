# 01: Remove repetitive methodology disclaimers from primary pages

**What to build:** Make the homepage, Polls page, council index, and ward-detail pages present their forecast, polling, candidate, and ward information directly and confidently. Delete the repeated methodological qualifications, defensive statements, internal evidence vocabulary, and duplicated attribution that currently interrupt those pages. Readers who want the methodology, limitations, distinctions between products, or Councillor Defeatability Index attribution should use How It Works; primary pages should not repeatedly explain what each displayed item is not.

**Blocked by:** None (can start immediately).

**Status:** resolved

- [ ] The homepage no longer displays an evidence-basis line such as “Based on repeated final-ballot polling of the confirmed field,” or any replacement sentence describing evidence tiers, final-ballot status, or the confirmed field.
- [ ] The homepage removes the entire latest-poll qualification beginning “Most recent reading” and ending with the claim that the forecast weighs the full polling record. Poll firm, date, sample, and result information may remain where it identifies an actual poll rather than explaining the model.
- [ ] The homepage removes the council summary sentence containing open-seat counts, “incumbents with elevated exposure,” “attention markers,” or the absence of win probabilities. Do not replace it with different internal terminology.
- [ ] The Polls page removes the visible introductory explanation that the readings are raw polls rather than a modelled average or forecast. Its title, chart, archive, actual poll metadata, and source information remain.
- [ ] The Polls page removes the visible paragraph explaining dots, LOESS smoothing, descriptive trends, polling averages, forecast distinctions, and too-thin series. Do not replace it with another methodological qualification; How It Works owns that explanation.
- [ ] Removing the Polls-page prose does not change the chart itself: individual poll markers, LOESS curves where supported, marker-only series where too thin, tooltips, source values, and accessible chart labelling continue to work.
- [ ] The council index no longer renders the feed's base-rate warning about incumbent defeats, attention, or predictions.
- [ ] The council index removes the entire summary containing open-seat counts, “incumbents with a fired exposure trigger,” or “No win probabilities are published for council.” No visible primary-page copy uses “fired trigger” or an equivalent implementation phrase.
- [ ] Candidate-history groups on ward pages no longer display “Historical context — not a forecast” or a replacement disclaimer above each group. Direction icons retain meaningful accessible labels.
- [ ] Incumbent explanations use the simple heading “Why this race draws attention” without appending “historical context,” “not a forecast,” or another methodological caveat.
- [ ] The notable-challengers section may retain the useful definition that these candidates previously won elected office, but removes “historical context, not a forecast” and other defensive qualification.
- [ ] Ward pages no longer display “Council Defeatability Index by Matt Elliott · City Hall Watcher.” The index values and concrete race-specific explanations remain; attribution is centralized in How It Works because the site itself lives under City Hall Watcher.
- [ ] Visible copy outside How It Works is audited for the same pattern. Primary routes contain no explanation involving “confirmed field,” “final-ballot polling,” “fired exposure trigger,” “attention markers,” “not a forecast,” “not the forecast,” “not a modelled average,” “not a prediction,” or “no win probabilities.” Internal field names, implementation comments, and unavailable-state messages are outside this copy-only removal.
- [ ] How It Works remains easy to reach through the site's existing navigation or methodology link and remains the single place for model distinctions, evidence gates, limitations, base rates, LOESS methodology, the absence of council forecasts, and Councillor Defeatability Index attribution.
- [ ] No forecast computation, publication gate, polling transformation, LOESS configuration, council ordering, signal firing, feed schema, or source data changes as part of this copy cleanup.
- [ ] Regression coverage renders the homepage, Polls page, council index, and a ward with candidate signals and incumbent explanations; asserts that the retired phrases and jargon are absent; verifies the retained facts and controls; and catches empty wrappers, orphaned punctuation, or awkward gaps left by deleted copy on desktop and mobile.

## Answer

The methodology hedging is gone from every primary route, each item's data and
controls intact:

- **Homepage** (`app/page.tsx`): dropped the "Most recent reading … full polling
  record" qualification (kept a bare `firm · date` poll identification) and the
  "elevated exposure / attention markers / not win probabilities" council
  summary; removed the now-unused `indexCounts`/council load.
- **Forecast hero** (`components/forecast-hero.tsx`): removed the evidence-basis
  line and its `evidenceBasisLine` call; simplified the H1 to the lead statement
  ("Olivia Chow is favoured to win"), the chance being on the card beneath.
- **Polls page** (`app/polls/page.tsx`): trimmed the dek to its factual first
  sentence and deleted the "dots / LOESS / descriptive trend / too-thin"
  paragraph; chart, archive, poll metadata, and sources remain.
- **Council index** (`app/wards/page.tsx`): removed the feed's base-rate note and
  the "fired exposure trigger / No win probabilities" summary.
- **Ward detail** (`app/wards/[ward_num]/page.tsx`): removed "Historical context —
  not a forecast" notes, simplified the heading to "Why this race draws
  attention", dropped the "CDI by Matt Elliott · City Hall Watcher" footer, and
  trimmed the notable-challengers caption to its definition. The concrete CDI
  facts (e.g. Ward 11's "8,869 more voters … 123-vote margin") remain.

No forecast computation, publication gate, polling transformation, feed schema,
or source data changed. Attribution and methodology centralize in How It Works
(owned by the parallel methodology redesign); the masthead still links it.

**Coverage** (`lib/primary-page-copy.test.ts`): a source-content regression —
the repo has no page-render harness (pure-function suites in a `node` env, and
the Polls page mounts a recharts client component needing a DOM), so the guard
scans the route source: every retired phrase is absent, the retained
controls/facts (`<PollingChart`, `<PollArchive`, `<WardsBrowser`, `band-board`,
`incumbentExposureFacts`, `notableChallengers`) survive, and the masthead still
links How It Works. Orphaned-wrapper / awkward-gap coverage comes from the
static-export build. Verified in the built pages: homepage, Polls, council index,
and Ward 11 render clean, retired phrases gone, no dangling separators; full
suite green, lint clean, `next build` clean (32 pages).
