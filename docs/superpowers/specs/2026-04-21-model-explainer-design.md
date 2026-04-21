# Design: Homepage Model Explainer Section

**Date:** 2026-04-21  
**Status:** Approved

---

## Overview

A new section on the homepage, placed directly below the hero voter alignment bars and above the Zone 2 section teasers. Its purpose is to explain, step by step, how the pool model works and what it is actually telling the reader — using real, live data at each step.

The section is not a static methodology note. It renders computed values from the same `pool_model` API response already fetched by the homepage, and allows readers to expand each step to see the underlying poll data and full computed values.

---

## Placement

- Inserted between Zone 1 (hero bars + sidebar) and Zone 2 (section teasers) in `frontend/src/app/page.tsx`
- Full width — spans both columns of the Zone 1 grid, breaking the two-column layout to become a standalone section
- Top border: `2px solid #555` (dark grey, not full black) to read as a continuation of the hero zone rather than a new top-level section

---

## Layout

### Intro row

A single full-width row above the steps:

- Left: small-caps kicker — "How the model works" (`#555`)
- Right: italic serif dek — "The visualization above isn't a poll average — it's a structural picture of where the electorate sits right now. Here's how we build it from the raw polling data."
- Separated from the steps by a `1px solid #ccc` bottom border

### Steps grid

Four equal columns, each representing one model step. Uses CSS subgrid (`grid-template-rows: subgrid; grid-row: span 4`) so that the dividing line between the header row and the title row snaps to the same horizontal position across all four columns regardless of source text wrapping.

Each column is divided into four subgrid rows:

1. **Header** — step badge (e.g. "Step 1") + source tag (data type, count, half-life if applicable)
2. **Title** — serif bold heading naming the computation
3. **Body** — two to three paragraphs of prose explaining the what and why of the step
4. **Output** — coloured output pills showing computed values + an expand hint link

Columns are separated by `1px solid #ccc` vertical dividers. The entire step column is clickable.

### Output pills

Coloured to match the bar visualization above:
- Purple (`#854a90`) — Chow-side values
- Light purple (`#c8a0d0`, dark text) — soft Chow support
- Blue (`#00a2bf`) — Bradford / anti-Chow values
- Grey (`#666`) — not engaged
- Dark (`#1a1a1a`) — neutral computed values (e.g. consolidation trend)

---

## Step Content

### Step 1 — Set the size of each voter pool
- **Source:** Approval polls · 7 data points · 30-day half-life
- **Logic:** Approve % → Chow ceiling; Disapprove % → anti-Chow pool; Not sure % → not engaged. Weighted with 30-day half-life (approval moves slowly; older readings remain informative).
- **Output pills:** Chow ceiling · Anti-Chow pool · Not engaged

### Step 2 — Establish Chow's structural floor
- **Source:** Full-field polls with 4+ non-Chow named candidates and n ≥ 500
- **Logic:** In a crowded field, Chow's vote share is diluted to its natural minimum. Polls are weighted by candidate count (a 6-way field is a better floor signal than a 4-way field). Not recency-weighted — the floor is a structural property.
- **Output pills:** Chow floor · Available (ceiling minus floor)

### Step 3 — Where does Chow sit in the likely match-up?
- **Source:** Bradford vs Chow head-to-head polls only · 12-day recency half-life
- **Logic:** Tory H2H polls excluded (he has declined to run). Three-way polls excluded (depress both shares in misleading ways). Recent polls dominate via 12-day half-life.
- **Output pills:** Current Chow position (H2H weighted average)

### Step 4 — How much of the anti-Chow vote has Bradford captured?
- **Source:** Multi-candidate polls with 2+ non-Chow challengers · 12-day recency half-life
- **Logic:** Bradford's recency-weighted share in these polls divided by the anti-Chow pool gives his capture rate. Consolidation trend compares his mean capture rate in the past 90 days vs older polls (threshold: ±5pp = consolidating/reversing, else stalling).
- **Output pills:** Bradford capture rate · Consolidation trend label

---

## Expand Interaction

Clicking a step column opens a full-width drawer below the four-column grid. Only one drawer is open at a time; clicking an active step closes it.

### Active step state
- Column background shifts to `#f0ede8`
- Step badge shifts to `#555`
- A downward caret (`▼`) appears at the bottom centre of the column pointing into the drawer
- Expand hint text changes from `↓ See N polls` to `↑ See N polls`

### Drawer layout

Two-column grid: data table (left, `1fr`) + computed values panel (right, fixed width ~180px).

**Data table columns vary by step:**

| Step | Columns |
|------|---------|
| 1 (approval) | Date · Firm · Approve · Disapprove · Not sure · Weight |
| 2 (full-field) | Date · Firm · Field tested · Chow % · n · Candidate weight |
| 3 (H2H) | Date · Firm · Chow · Bradford · n · Recency weight |
| 4 (multi-candidate) | Date · Firm · Field tested · Bradford · Recency weight |

Most recent poll row is highlighted (`background: #e8e5df`). A total/weighted-average row appears at the bottom with a `2px solid #ccc` top border.

**Computed values panel:** Key output values rendered large (Georgia serif, ~1.5rem, coloured to match pills), each with a one-line sublabel explaining the derivation (e.g. "27% ÷ 40% anti-Chow pool → 33% of pool still uncaptured").

### Drawer background
`#f0ede8` — one step darker than the page background, visually grouping it with the active column.

---

## Data

The computed summary values (pool sizes, floor, capture rate, trend) come from the existing `pool_model` field in `getPollingAverages()`, already fetched on the homepage. No new API endpoints are needed.

However, the drawer tables require the underlying poll rows with their computed weights. The `GET /api/polls/latest` response must be extended: the `pool_model` object gains a new `poll_detail` key (alongside the existing `data_notes` key) containing:

```ts
pool_detail: {
  approval_polls:  { date: string; firm: string; approve: number; disapprove: number; not_sure: number; weight: number }[]
  floor_polls:     { date: string; firm: string; field_tested: string; chow: number; sample_size: number; candidate_weight: number }[]
  h2h_polls:       { date: string; firm: string; chow: number; bradford: number; sample_size: number; recency_weight: number }[]
  capture_polls:   { date: string; firm: string; field_tested: string; bradford: number; recency_weight: number }[]
}
```

All weights are normalised so the most recent poll in each set has weight 1.000. The `PoolModel` TypeScript type in `frontend/src/lib/api.ts` must be updated to include `poll_detail`.

---

## Component Structure

New component: `ModelExplainer` in `frontend/src/components/model-explainer.tsx`

- Must be a **Client Component** (`'use client'`) because it manages interactive expand state
- Receives `model: PoolModel` as prop (already available on the homepage)
- Manages its own `activeStep: 1 | 2 | 3 | 4 | null` state
- Renders intro row, steps grid, and conditionally the active drawer
- No external dependencies beyond existing types

The homepage (a Server Component) passes `pollsData.pool_model` directly to `<ModelExplainer>`. Because `ModelExplainer` is a Client Component receiving a serialisable prop, this is valid — Next.js serialises the prop at the server/client boundary.

---

## Visual Language

Consistent with existing site conventions:
- Background: `#faf9f6`
- Borders: `1px solid #ccc`, section tops `2px solid` (black for new sections, `#555` for this section)
- Typography: IBM Plex Mono for badges, kickers, labels, table data; Newsreader/Georgia serif for titles and body prose
- No border-radius (`--radius: 0rem`)
- Kicker colour: `#555` (this section), `#c53030` (red) reserved for top-level section kickers
