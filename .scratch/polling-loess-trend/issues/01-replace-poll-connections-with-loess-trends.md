# 01: Replace poll-to-poll connections with LOESS trend curves

**What to build:** The polling trend chart should retain every reported poll as a raw marker while replacing the direct lines between observations with a descriptive LOESS curve for each current-field candidate. The presentation must make clear that the curve is a smoother over raw polls, not a polling average and not the election forecast.

**Blocked by:** None (can start immediately).

**Status:** resolved

- [ ] Each candidate's LOESS curve is fitted independently from that candidate's reported shares using actual fieldwork dates as the horizontal coordinate.
- [ ] Raw poll markers remain at their reported values, and the chart no longer draws direct connecting lines between those markers.
- [ ] A candidate not tested in a poll contributes no observation to that candidate's curve; missing values are never treated as zero or inferred from another candidate.
- [ ] Each curve begins at its candidate's first observation and ends at its last observation, with no extrapolation beyond the observed date range.
- [ ] Series with too few distinct observations for a defensible LOESS fit remain visible as raw markers without a trend curve.
- [ ] One fixed LOESS configuration is documented, applied identically to every candidate, and covered by deterministic pure-logic tests; it is not tuned against the current chart output.
- [ ] Candidate colours, marker shapes, hatch treatment, raw-value tooltips, and the poll archive continue to represent the individual reported polls.
- [ ] Polling-page copy explains that dots are individual polls and curves are LOESS smoothers, while preserving the distinction from both a polling average and the forecast.

## Answer

New pure `src/lib/loess.ts` — deterministic local-linear LOESS with tricube
weights and one fixed, documented `LOESS_CONFIG` (span 0.6, min 5 distinct
points, 40-point grid), returning null for a too-thin series and never
extrapolating past the observed range. `candidateTrends` (`src/lib/polling.ts`)
builds each candidate's raw markers and LOESS curve from *only that candidate's*
polls (fieldwork date as x via `isoDayNumber`, no zero-fill). The chart
(`polling-chart.tsx`) moved to a numeric time axis: raw markers keep their
candidate colour/shape/hatch with no connecting line (strokeWidth 0), the LOESS
curve is a separate dot-less line, and a custom tooltip shows only the raw poll
values. Polls-page copy explains dots = polls, curve = LOESS smoother, not an
average and not the forecast. The archive table is unchanged.

**Coverage (deterministic pure-logic tests):**
- `src/lib/loess.test.ts` — null below min points, endpoints at the observed
  range (no extrapolation), recovers a noisy trend, deterministic, fixed grid size.
- `src/lib/polling.test.ts` — Chow (>5 polls) gets a curve bounded to its range;
  Alexander (3 polls) is markers-only, null curve; Bradford is never zero-filled
  and has fewer markers than total polls.
- Verified in the built `/polls`: dots with no connecting lines, Chow/Bradford
  curves, Alexander markers-only, time-scaled x-axis, explanatory copy.
