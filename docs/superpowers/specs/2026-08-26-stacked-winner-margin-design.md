# Stacked Mayoral Winner-Margin Chart

**Date:** 2026-08-26

## Purpose

Break the homepage winning-margin distribution into candidate-coloured stacked
sections. The chart retains its four existing margin columns — `Close`, `Clear
win`, `Comfortable`, and `Landslide` — and its existing aggregate scale. Within
each column, the sections show which candidate wins those simulation draws.

Only candidates with non-zero winning draw weight appear. Chow and Bradford are
present in the current forecast. Alexander or the aggregate `Other candidate`
section will appear automatically if either receives winning weight in a future
forecast. There are no controls or alternate views.

## Repository ownership

`toronto-election-poll-tracker-backend` owns the simulation reduction and the
published winner decomposition. It calculates joint winner-and-margin densities
from the canonical Dirichlet draws and publishes them with the aggregate margin
distribution.

`toronto-election-poll-tracker` owns presentation. It validates the feed,
integrates densities into the editorial bands, applies candidate metadata, and
stacks the non-zero winner components. It does not reconstruct or estimate
winner-conditioned distributions.

## Feed contract

Extend `margin_distribution` with a `by_winner` record:

```json
{
  "unit": "share_gap",
  "x": [0.0, 0.01],
  "density": [4.2, 4.1],
  "close_threshold": 0.05,
  "by_winner": {
    "per_candidate_id": {
      "density": [3.4, 3.2],
      "draw_weight": 54668.0
    },
    "other": {
      "density": [0.1, 0.1],
      "draw_weight": 1.0
    }
  }
}
```

The existing top-level `density` remains a normalized aggregate density whose
integral is approximately one. Each `by_winner` density is a joint density on
the same `x` grid: its integral approximates that winner's probability, not one.
At every grid point, winner densities sum to the aggregate density within
floating-point tolerance.

Each entry carries `draw_weight`, the sum of its per-draw winner weights. A
normal draw contributes one to its sole winner. An exact top-share tie splits
one draw equally among tied winners, matching the existing candidate-win rule.
Entries with zero draw weight are omitted.

The backend publishes named entries for candidates in the public viable field.
Winning weight belonging to modeled candidates outside that field is summed
into the reserved `other` entry, which is omitted when its weight is zero.

This is an additive schema-version-2 change. A missing or wholly malformed
`by_winner` record falls back to the existing aggregate-colour chart.

## Backend calculation

The aggregate and winner densities use one shared x grid, one bandwidth selected
from all margin draws, the same reflected-boundary Gaussian kernel, and the total
number of draws as the denominator. For winner `w`, each draw's kernel
contribution is multiplied by that draw's winner weight for `w`. This makes the
decomposition additive. `other` is calculated by summing relevant winner weights
before kernel reduction.

The implementation does not change the production draw count or retain
additional draw-sized copies beyond the existing draw and winner arrays.

## Frontend view model

The aggregate density is integrated across the existing four boundaries: the
model-owned close threshold, then the editorial 15-, 30-, and 50-point cuts.
Every winner density is integrated across the same boundaries. All masses divide
by the largest aggregate band mass, so the complete stacked height of each
column matches the current aggregate chart and the tallest aggregate column has
weight one.

Named winners are ordered by published win probability, descending, with
`Other candidate` last. Each segment uses the shared candidate palette; Other
uses the neutral disengaged colour, and hatch-enabled candidates such as Chris
Alexander retain their hatch treatment.

A winner entry must have a positive finite draw weight and a density matching
the aggregate grid with only finite non-negative values. Invalid entries are not
rendered.

## Presentation and accessibility

The chart remains a server-rendered SVG. A compact legend above it names every
non-zero winner colour. Each bar section has an accessible title naming its
winner and margin band, and the chart's accessible name explains that the bars
are stacked by forecast winner.

Bar height remains the ordinal likelihood cue; colour identifies the winner.
No raw draw counts or exact unpublished probabilities are exposed. The axis,
grid, and historical markers remain unchanged.

## Testing and release

Backend tests cover the shared grid and bandwidth, pointwise additivity,
probability integrals, zero omission, Other grouping, and tie splitting.
Frontend tests cover shared-scale band weights, dynamic Alexander and Other
discovery, malformed/legacy fallback, candidate fills and hatching, accessible
labels, and one segment per winner per band.

The release sequence is backend feed extension, regenerated forecast artifacts
and frontend fixtures, frontend chart rendering, then full tests, production
build, and browser inspection.
