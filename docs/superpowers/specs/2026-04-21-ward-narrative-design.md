# Ward Narrative Lede — Design Spec

**Date:** 2026-04-21

## Overview

Add a short editorial paragraph ("news lede") near the top of each ward detail page that algorithmically summarises the most salient factors for that ward. The paragraph reads as connected prose, not a bullet list. It appears only when a sitting councillor is running (`ward.is_running === true`).

## Placement

Between the ward header block (name, councillor, by-election badge, `<hr>`) and the existing vulnerability pill section. No new component is needed — rendered as a `<p>` block inline in the ward detail page.

## Visual Treatment

- Serif font (`var(--font-newsreader)`)
- Same body text size as other prose on the page (~0.9rem)
- No border, no callout box — plain paragraph, newspaper lede style

## Signal Inventory

Six signals are evaluated. Each is classified as **notable** or **unremarkable**:

| Signal | Source field(s) | Notable when… |
|---|---|---|
| Vote share | `ward.vote_share` | direction is `up` or `down` (reuses existing `getVulnerabilitySignals` thresholds) |
| Electorate share | `ward.electorate_share` | direction is `up` or `down` |
| Population growth | `ward.pop_growth_pct` | direction is `up` or `down` |
| Coattail alignment | `ward.coattail_detail.alignment` | clearly high (>0.7) or low (<0.4) |
| Ward lean | `ward.coattail_detail.ward_lean` | clearly positive (>0.03) or negative (<-0.03) vs city average |
| Challenger threat | challengers array | a well-known challenger is registered, or zero challengers registered |

Signals are ranked by salience using a fixed priority order: challenger threat → vote share → coattail alignment/lean (treated as one combined signal) → electorate share → population growth. This order reflects the factors most likely to be decisive and most legible to a general reader. The top 2–3 notable signals are selected for the paragraph. If fewer than 2 signals are notable, the narrative is omitted (`null` returned).

Note: coattail alignment and ward lean are always evaluated together as a single combined signal — both values are used to choose the sentence variant, and they occupy one slot in the ranking.

## Sentence Assembly

Each selected signal maps to a pre-written sentence variant chosen by direction/magnitude. The implementation must define variants for all six signals. Representative examples:

**Vote share:**
- `up`: "[Name]'s 2022 vote share was low — they won with a thin margin that leaves little buffer against a credible challenger."
- `down`: "[Name]'s 2022 vote share was strong, giving them a wide cushion against most challengers."

**Coattail (alignment × lean):**
- high alignment + positive lean: "They vote closely with Mayor Chow, and this ward has historically leaned toward Chow's coalition — a combination that could reinforce their support."
- high alignment + negative lean: "They vote closely with Mayor Chow, but this ward has historically been cool toward Chow's coalition — an alignment that may not play to their advantage."
- low alignment + positive lean: "They have kept distance from Mayor Chow's voting record, even though this ward has historically leaned toward Chow's coalition."
- low alignment + negative lean: "They have kept distance from Mayor Chow's voting record, which aligns with this ward's historically cool reception of Chow's coalition."

**Challenger:**
- well-known present: "A well-known challenger has entered the race, adding meaningful pressure."
- zero challengers: "No challengers have registered yet, which keeps the race pressure low for now."

## Connective Logic

Adjacent sentences are joined by a connective chosen by whether the signals **agree** or **contrast** in their risk implication:

- **Agree** (both raise or both reduce risk): "On top of that," / "Adding to this,"
- **Contrast** (one raises, one reduces): "However," / "That said,"
- **Neutral** (no strong directional relationship): no connective prefix — sentences flow directly

Each signal sentence carries a `riskDirection: "raises" | "reduces" | "neutral"` tag used to determine connectives.

## New File

`frontend/src/lib/ward-narrative.ts`

Exports one function:

```ts
generateWardNarrative(ward: Ward, challengers: Challenger[]): string | null
```

- Returns `null` if `!ward.is_running`, if `coattail_detail` is absent, or if fewer than 2 signals are notable
- Pure function — no side effects, no async
- All phrase chunks defined as string constants within the file
- No backend changes, no new API fields, no new components

## Out of Scope

- Open seats (no narrative rendered)
- LLM generation
- Internationalisation / phrase externalisation
- Any change to the backend or data model
