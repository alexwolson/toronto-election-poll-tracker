# Site Redesign: Newspaper Editorial Style

**Date:** 2026-04-20
**Scope:** Full visual rebuild of all frontend pages to match the aesthetic of the existing `VoterAlignmentDots` component.

---

## Design System

### Visual Language

- **Background:** `#faf9f6` warm off-white throughout
- **Rules:** `2px solid #1a1a1a` for major section breaks; `1px solid #ccc` for cell/row borders
- **No shadows, no `border-radius`** — all elements use `border-radius: 0`
- **Tags/badges:** thin rectangular borders (`border: 1px solid`), no fill, no pill shape
- **Color accents (used sparingly — top rules and tag borders only):**
  - `#c53030` — competitive wards, mayoral risk
  - `#d97706` — open seats
  - `#2563eb` — Chow-aligned (dots only)

### Typography

Fonts unchanged (Newsreader, IBM Plex Mono, Source Sans 3) but applied more aggressively:

- **Newsreader serif:** all headings, ward names, large display text
- **IBM Plex Mono:** kickers, labels, numbers, tags, nav items, breadcrumbs
- **Source Sans 3:** body/description text only

### Removed Classes

All of the following are eliminated from every page and component:
- `surface-panel`
- `stat-chip`
- `hero-kicker`
- `civic-shell` (replaced with a new `np-shell` max-width container)
- Shadcn `Card`, `CardHeader`, `CardContent` usage in pages

---

## Global Layout (`layout.tsx`)

### Masthead (replaces current sticky header)

Full-width, **not sticky** — scrolls with the page.

```
┌─────────────────────────────────────────────────────┐
│           TORONTO CIVIC PULSE                       │  Newsreader, uppercase, centered
│  MUNICIPAL PROJECTION DESK · [MONTH YEAR] · [PHASE]│  IBM Mono, tiny, centered
├═════════════════════════════════════════════════════╡  2px solid #1a1a1a
│  HOME  │  WARDS  │  POLLS                          │  mono uppercase, pipe-separated cells
├─────────────────────────────────────────────────────┤  1px solid #ccc
```

- Phase info (currently `PhaseBanner`) is folded into the masthead sub-line — no separate component
- Active nav item: `background: #1a1a1a; color: #fff`
- Nav links separated by `1px solid #ccc` vertical rules
- Masthead spans full viewport width with internal horizontal padding only

---

## Homepage (`app/page.tsx` + `VoterAlignmentDots`)

### Zone 1: Hero

Two-column layout: main visualization column + narrow sidebar.

**Main column — voter alignment dots:**
- `VoterAlignmentDots` expanded to fill the column (remove fixed `w-[378px]`)
- Dots scaled up: 14px → **20px**, gap 3px → 4px
- Same 10×5 grid structure per side, same dot variants and colors
- Title row, zone labels, divider, disengaged section, legend — all preserved, proportionally scaled

**Sidebar (~200px fixed width):**
- Stat blocks separated by thin ruled lines (no cards):
  - Total wards: 25
  - Competitive: N
  - Open seats: N
  - Polls tracked: N
- Brief italic narrative about the tracker below the stats

### Zone 2: Section teasers

Three-column strip below the hero, separated by vertical `1px solid #ccc` rules:

```
  COUNCIL                  │  POLLING                │  MODEL
  Ward-by-ward projections  │  Mayoral poll tracker   │  Pre-nomination phase
  →                         │  →                      │  →
```

Council teaser links to `/wards`. Polling teaser links to `/polls`. Model teaser is informational only — no link, just displays the current phase text.

---

## Wards Page (`app/wards/page.tsx` + ward grid)

### Page Header

```
WARD MONITOR                    ← IBM Mono kicker
All Wards        13 · 8 · 4    ← Newsreader h1, counts right-aligned
════════════════════════════
```

### Ward Grid

- **5 columns** desktop, 3 tablet, 2 mobile
- Hard ruled cells: `border: 1px solid #ccc` on all sides, `border-collapse`
- Top border accent: `2px solid #c53030` competitive, `2px solid #d97706` open, `1px solid #ccc` safe
- Cell contents:
  - Ward number: IBM Mono, tiny, muted (`WARD 01`)
  - Ward name: Newsreader, bold (`Etobicoke North`)
  - Councillor name: IBM Mono, small
  - Tags: thin rectangular borders in accent color, uppercase mono
- Hover: `background: #f0ede8`
- `WardCard` component replaced — no shadcn Card

### Filter Bar (`WardsBrowser`)

- Mono uppercase filter labels
- Flat `<select>` elements with `border: 1px solid #ccc`, no border-radius
- No rounded inputs or pill styling

---

## Ward Detail Page (`app/wards/[ward_num]/page.tsx`)

### Structure

```
← ALL WARDS                                 IBM Mono breadcrumb

WARD PROFILE                                mono kicker
Ward 4 · Parkdale–High Park                 Newsreader h1
Gord Perks · BY-ELECTION INCUMBENT          mono subhead
═══════════════════════════════════════════ 2px rule

RACE CLASS              VULNERABILITY
Competitive             Elevated risk       two flat ruled columns

═══════════════════════════════════════════
VULNERABILITY SIGNALS
───────────────────────────────────────────
Prior vote share         48.3%    ↑
Population growth        High     ↑
Electorate depth         Shallow  ↓
───────────────────────────────────────────

MODEL FACTORS
───────────────────────────────────────────
Vulnerability effect     ↑ increases risk
Coattail effect          ↓ reduces risk
Challenger effect        ↑ increases risk
───────────────────────────────────────────

CHALLENGERS (2)
───────────────────────────────────────────
Jane Smith               HIGH RECOGNITION
  Aligned: pro-Chow · Fundraising: strong
───────────────────────────────────────────
```

### Model Factors Display

Raw factor numbers are **not shown**. Direction only, derived from sign of factor value:

- Vulnerability factor: negative → `↑ increases risk` (red), positive → `↓ reduces risk` (green)
- Coattail factor: positive → `↓ reduces risk` (green), negative → `↑ increases risk` (red)
- Challenger factor: negative → `↑ increases risk` (red), positive → `↓ reduces risk` (green)

All arrows in plain text (not Lucide icons). Colors: `#c53030` for risk-increasing, `#15803d` for risk-reducing.

### Other Details

- "← All Wards" link: mono, hover shows `background: #f0ede8` (no underline)
- All sections use ruled rows — no `surface-panel` wrappers
- Section headers in IBM Mono uppercase, separated by `1px solid #ccc` rules

---

## Polls Page (`app/polls/page.tsx`)

### Page Header

```
MAYORAL TRACKER                 mono kicker
Mayoral Polling                 Newsreader h1
═══════════════════════════════
```

### Stats Row

Three stat blocks in a single ruled row (no chips):

```
USED IN MODEL    TOTAL POLLS    EXCLUDED DECLINED
6                8              2
```

Separated by vertical `1px solid #ccc` rules.

### Polling Chart

`PollingChart` component internals unchanged. Container: thin ruled border (`1px solid #ccc`), no `surface-panel`.

### Candidate Status & Ranges

Three columns (Declared / Potential / Declined) separated by vertical rules. Each candidate entry:
- Name in Newsreader medium
- Summary in Source Sans 3, muted
- Poll range in IBM Mono
- Ruled separator between candidates within a column

### Poll History Table

Plain `<table>` with `border-collapse`:
- Header row: IBM Mono uppercase, `background: #f0ede8`
- Data rows: ruled bottom border, hover `background: #f0ede8`
- Date, firm columns: IBM Mono
- Model use: "Included" / "Excluded (reason)" in IBM Mono

---

## Implementation Approach

Full page rebuild (option C): all page JSX files and affected components are rewritten to use the new newspaper style system. The data/API layer (`lib/api.ts`, `types/ward.ts`) is untouched. `VoterAlignmentDots` is modified in-place (dot size, remove fixed width). `PollingChart` internals are untouched.

New CSS classes added to `globals.css`:
- `.np-shell` — max-width container replacing `.civic-shell`
- `.np-masthead` — masthead wrapper
- `.np-rule` / `.np-rule-thin` — horizontal rules
- `.np-kicker` — mono uppercase section label
- `.np-cell` — ruled grid cell
- `.np-tag` — rectangular border tag

Shadcn `Card` components are removed from page files only; the shadcn library itself stays installed (used by `PollingChart`).
