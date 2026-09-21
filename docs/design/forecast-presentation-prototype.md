# Forecast presentation prototype — September 14, 2026

**Throwaway branch:** `prototype/mayoral-presentation-2026-09-14`.
**Implementation brief:** backend repository
`docs/research/mayoral-public-presentation-design-2026-09-14.md`.
The user approved B plus A’s vote-share section as the presentation design.
Implementation will use the real model output contract; this synthetic prototype
is not a production forecast. This document records the design locally.

Question: which information hierarchy best explains a consistent polling lead and
the remaining possibility of an upset, without inheriting the old publication bands?

Run `npm run prototype:forecast`, then open:

- A: <http://127.0.0.1:8871/?variant=odds>
- B: <http://127.0.0.1:8871/?variant=margin>
- C: <http://127.0.0.1:8871/?variant=timeline>

Use the bottom arrows or left/right keyboard arrows to change presentation. The
example selector exercises a clear lead, a close race, a reversal, the same lead
with wider uncertainty, a very small upset probability and a failed update. URL
parameters preserve both the chosen variant and example. Arrow keys do not hijack
select/input editing. The existing masthead/navigation provides the site's context.

## Three different choices

**A — Probability first.** The leading candidate's win probability leads; all major
candidates and possible vote shares follow. Direct, but a large number can dominate
the explanation and encourage too much confidence in its precision.

**B — Margin first.** A distribution explains how a lead can reverse. The paired
Chow–Bradford comparison is distinguished from winning the full election. Strong
fit to this project's central explanatory question; requires clear graph labels.

**C — Now and election day.** Adjacent support and outcome distributions explain
what forecasting adds to polling. Makes the time horizon explicit; asks more of
the first screen and pushes win probabilities lower down.

Initial design judgment: B best exposes the question we want to answer; C supplies
useful explanation of the time horizon. A remains a useful alternative for readers
primarily seeking an immediate probability. This is a proposal for comparison,
not a selected winner or a requirement to use a particular chart.

## Data and boundaries

Every number is synthetic, prominently labelled. No research posterior or live
forecast supplies these views. All values come from a common repeatable collection
of joint draws, so candidate probabilities, marginal share intervals and the paired
margin represent the same example elections. The residual pool is divided among
50 unnamed example candidates for winner calculation; it is not treated as one
candidate. This allocation is a UI fixture, not a modelling recommendation.

The 80% intervals, whole-percent probabilities and <1%/>99% formatting are concrete
**provisional display choices**, not public qualification thresholds, calibration
claims, adopted precision policy or the old frequency bins. They need review with
qualified model outputs. Quantile medians need not sum to 100%; the underlying
joint vote shares do. Individual intervals cannot be subtracted to obtain a margin
interval or converted into win probabilities. All draw-derived calculations here
are throwaway and must be replaced by the real publication contract if adopted.

Example controls, synthetic-data notices, variant controls and implementation
explanations are design-review scaffolding, not planned public homepage content.
The failed-update example proposes retaining a dated successful forecast with an
explicit notice; production behavior and any maximum acceptable age remain design
decisions. No minimum poll/firm count or across-scenario band agreement controls
whether these example results appear.

## Isolation and validation

The prototype is gated to development on the existing home route. A client host
inside Suspense reads URL parameters, preserving the existing static-export site.
Normal `/` keeps the existing homepage; production always returns that homepage.
The floating switcher and prototype cannot be selected in a production build.

An initial server-side search-parameter approach was incompatible with the site's
static export; the client host fixes this without changing deployment configuration.
Local preview startup requires permission to bind a loopback port in this sandbox.

Visual/interaction checks cover the three variants, leader reversal, small-tail
formatting and failed-update notice. At 390px width, the page has no horizontal
overflow. The full existing test suite, ESLint, TypeScript and static production
build are checked separately; exact final outcomes are recorded at completion.

Do not merge the prototype as the production implementation. Capture the selected
hierarchy and behavior first, then implement and verify the chosen presentation
against the real forecast output contract. Keep rejected experiments on this branch.

## Completed verification

- ESLint and `tsc --noEmit` pass.
- All 276 existing tests pass across 28 files. No throwaway prototype unit tests
  were added; interactive states were checked directly in the browser.
- Static production export passes with `npm run build -- --webpack` (68 pages).
  An earlier default build passed; a later default-bundler run hit a sandbox
  internal-port error. The documented Webpack fallback succeeded with the existing
  font-download access. No bundler configuration or dependencies were changed.
- Generated production `out/index.html` contains the normal poll section and
  contains neither the prototype notice nor its synthetic-forecast disclaimer.
- Probability, timeline and margin variants render; changing the example to
  Bradford-leading changes the probability headline accordingly. The small-tail
  example uses <1%/>99% rather than exact 0%/100%. Failed-update notice appears.
- Phone-width inspection at 390px found no horizontal overflow. Temporary viewport
  override was reset; the preview is left on the margin variant with the clear-lead
  example. The margin chart covers the full possible margin support, including tails.

Verdict: ready for design comparison. No winner chosen and no statistical display
threshold adopted. The real-model current-versus-election denominator issue is
recorded in the backend public-output contract draft before any integration.

## User-selected direction: B plus A's vote-share section

The user prefers the margin-led B presentation combined with A's “What the vote
could look like” section. Variant B now follows this order:

1. The Chow–Bradford margin distribution and chance of Bradford finishing ahead.
2. Candidate election-day vote-share estimates and their ranges, using A's chart.
3. Each candidate's probability of winning the full race.

This is the preferred direction for further refinement, not final approval of
wording, interval levels, rounding, numerical qualification or production rollout.
The shared joint example draws and all calculations are unchanged. A and C remain
available for comparison; the original B is preserved in commit `5ceeb7d`.

## Design approved — September 14

The user approved the combined B layout after reviewing the revised prototype
(frontend commit `8c5262d`). Its margin-first hierarchy, candidate vote-share chart
and full-race probabilities are the selected design for implementation. Further
layout selection is not a prerequisite for connecting the real model.

The examples remain synthetic. The previously identified numerical display choices
need checking against the fitted distributions; design approval does not validate
the illustrative probabilities. The next delivery milestone is a complete research
fit and coherent backend summaries for this layout, followed by production
implementation and release verification.

## Implemented — September 21

The approved layout is implemented against the real contract (Backend feed
schema 4, `margin-first-joint-draws-v1`, ADR 0054) in `src/components/forecast/`
and `src/components/forecast-hero.tsx`, with selectors in
`src/lib/mayoral-forecast.ts`. Display choices adopted: central 80% intervals,
medians, whole-percent chances with "<1%" and ">99%" at the tails, the compared
pair named by the feed, bin geometry read from the feed. The prototype
scaffolding was removed from `main`; the throwaway branch keeps it.
