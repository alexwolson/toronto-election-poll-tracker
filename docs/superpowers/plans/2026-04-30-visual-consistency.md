# Visual Consistency Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate hardcoded hex colors and font-family inline styles across the codebase by centralising all values as named CSS variables in globals.css and using the existing Tailwind font utilities and `.np-*` CSS class system.

**Architecture:** A single source of truth in `globals.css` — all semantic colors live as CSS custom properties in `:root`, all font families are referenced via Tailwind's `font-mono` / `font-heading` / `font-sans` utility classes (already wired up through `@theme inline`). No new dependencies required.

**Tech Stack:** Next.js App Router, Tailwind CSS v4 (via `@import "tailwindcss"` with `@theme inline`), custom `.np-*` / `.va-*` / `.me-*` CSS class system in `globals.css`.

---

## Key insight before starting

`@theme inline` already registers:
- `--font-sans` → Tailwind class `font-sans`
- `--font-mono` → Tailwind class `font-mono`
- `--font-heading` → Tailwind class `font-heading`

So `style={{ fontFamily: "var(--font-ibm-mono), monospace" }}` → `className="font-mono"` is always a safe mechanical swap.

---

## File Map

| File | Change type |
|------|-------------|
| `src/app/globals.css` | Add semantic CSS vars; consolidate scattered values |
| `src/app/layout.tsx` | inline styles → CSS vars / font classes |
| `src/app/page.tsx` | inline styles → CSS vars / font classes |
| `src/app/wards/page.tsx` | inline styles → CSS vars |
| `src/app/wards/[ward_num]/page.tsx` | 50+ inline styles → CSS vars / font classes |
| `src/components/ward-card.tsx` | TOP_BORDER map → CSS vars; inline → `.np-*` classes |
| `src/components/vulnerability-pill.tsx` | colors → CSS vars |
| `src/components/wards-browser.tsx` | BAND_COLORS / BAND_STROKES maps → CSS vars |
| `src/components/masthead-nav.tsx` | single inline border → CSS var |
| `src/components/voter-alignment-bars.tsx` | inline styles → CSS vars / font classes |
| `src/components/signal-range-bar.tsx` | inline styles → CSS vars / font classes |
| `src/components/coattail-bars.tsx` | inline styles → CSS vars / font classes |

---

## Task 1: Add semantic tokens to globals.css

**Files:**
- Modify: `src/app/globals.css` — `:root` block (currently lines 51–88)

The goal is to name every value that appears more than once across the codebase. No new values — only aliases for hex codes already scattered in components.

- [ ] **Step 1: Add text-hierarchy vars, vulnerability vars, and candidate-colour vars to `:root`**

Insert the following block immediately after the existing `:root` closing `}` on line 88 (or append to the end of the `:root` block before the closing brace):

```css
:root {
  /* existing vars ... */

  /* ── Text hierarchy ── */
  --text-strong: #1a1a1a;   /* headings, primary values */
  --text-mid: #555;          /* secondary labels */
  --text-soft: #666;         /* tertiary text */
  --text-faint: #888;        /* captions, disabled */
  --text-ghost: #aaa;        /* placeholder, dim hints */

  /* ── Surface backgrounds ── */
  --bg-base: #faf9f6;
  --bg-hover: #f0ede8;
  --bg-raised: #f5f2ed;

  /* ── Borders ── */
  --line-soft: #ccc;         /* already exists — keep */
  --line-strong: #1a1a1a;    /* already exists — keep */
  --line-inner: #e0ddd8;     /* between-row dividers */

  /* ── Vulnerability levels ── */
  --vuln-high-fg:    #9b1c1c;
  --vuln-high-line:  #ef4444;
  --vuln-high-bg:    #fee2e2;
  --vuln-high-bg-hover: #fca5a5;
  --vuln-high-line-hover: #b91c1c;

  --vuln-med-fg:     #92400e;
  --vuln-med-line:   #f59e0b;
  --vuln-med-bg:     #fef3c7;
  --vuln-med-bg-hover: #fde68a;
  --vuln-med-line-hover: #b45309;

  --vuln-low-fg:     #166534;
  --vuln-low-line:   #22c55e;
  --vuln-low-bg:     #dcfce7;
  --vuln-low-bg-hover: #86efac;
  --vuln-low-line-hover: #15803d;

  --vuln-open-fg:    #6b7280;
  --vuln-open-line:  #999;
  --vuln-open-bg:    #e5e5e5;
  --vuln-open-bg-hover: #d4d4d4;
  --vuln-open-line-hover: #666;

  /* ── Candidate segment colours ── */
  --color-chow:        #854a90;
  --color-chow-mid:    #aa78ba;
  --color-chow-soft:   #c4a0cc;
  --color-bradford:    #00a2bf;
  --color-bradford-soft: #aadde8;
  --color-disengaged:  #c8c4be;

  /* ── Signal-range / coattail neutral ── */
  --track-bg: #e8e5e0;
  --track-fill: #555;
}
```

- [ ] **Step 2: Update the existing hardcoded values in globals.css itself to use the new vars**

Replace the hardcoded hex values *inside* globals.css to validate the vars work end-to-end. Key replacements:

```css
/* .np-kicker */
color: var(--text-mid);          /* was #555 */

/* .np-rule */
border-top: 2px solid var(--line-strong);  /* was #1a1a1a */

/* .np-rule-thin, .np-cell borders, .np-ward-grid borders, etc. */
border: 1px solid var(--line-soft);        /* was #ccc */

/* .np-cell:hover, .me-step:hover */
background: var(--bg-hover);               /* was #f0ede8 */

/* .me-step:hover */
background: var(--bg-raised);             /* was #f5f2ed */

/* .me-step--active */
background: var(--bg-hover);

/* .me-step-header border-bottom */
border-bottom: 1px solid var(--line-inner);  /* was #e0ddd8 */

/* .me-step-output border-top */
border-top: 1px solid var(--line-inner);

/* .va-segment colour classes */
.va-seg-chow-floor      { background: var(--color-chow); }
.va-seg-chow-activated  { background: var(--color-chow-mid); }
.va-seg-chow-ceiling    { background: var(--color-chow-soft); }
.va-seg-anti-committed  { background: var(--color-bradford); }
.va-seg-anti-available  { background: var(--color-bradford-soft); }
.va-seg-disengaged      { background: var(--color-disengaged); }

/* .me-pill colours */
.me-pill--purple      { background: var(--color-chow); }
.me-pill--blue        { background: var(--color-bradford); }
.me-pill--grey        { background: var(--text-soft); }
.me-pill--dark        { background: var(--text-strong); }

/* .va-zone-share */
color: var(--text-mid);  /* was #555 */

/* .va-bar-sublabel */
color: var(--text-soft);  /* was #666 */

/* .me-step--active::after (caret) */
border-top: 8px solid var(--text-mid);  /* was #555 */

/* .me-step-badge */
background: var(--text-strong);  /* was #1a1a1a */

/* .me-step--active .me-step-badge */
background: var(--text-mid);  /* was #555 */

/* .me-step-source, .me-computed-kicker, .me-computed-label, .me-data-table th */
color: var(--text-faint);  /* was #888 */

/* .me-step-body */
color: #444;  /* leave; this is a distinct design choice */

/* .me-step-body em, .me-step-title, .me-row--total td, .me-computed-val */
color: var(--text-strong);  /* was #1a1a1a */

/* .me-step--active .me-expand-hint */
color: var(--text-mid);

/* .me-expand-hint, .me-computed-sublabel, .me-dim */
color: var(--text-ghost);  /* was #aaa */

/* .me-data-table td */
color: #444;  /* leave */

/* .me-data-table td border-bottom */
border-bottom: 1px solid var(--track-bg);  /* was #e8e5e0 */

/* .me-row--highlight td */
background: #e8e5df;  /* leave — minor; very close to --track-bg */

/* .me-row--total td border-top */
border-top: 2px solid var(--line-soft);  /* was #ccc */

/* .me-shell border-top */
border-top: 2px solid var(--text-mid);  /* was #555 */

/* .me-kicker, .me-drawer-title */
color: var(--text-mid);

/* .me-dek */
color: var(--text-mid);

/* .me-step-badge color (text) */
color: #fff;  /* keep white */

/* .va-legend-item */
color: #333;  /* leave — intentionally slightly darker than --text-strong */

/* .np-kicker */
color: var(--text-mid);

/* .np-table th background */
background: var(--bg-hover);

/* .np-table th, td borders */
border-bottom: 1px solid var(--line-soft);

/* .np-table tr:hover td */
background: var(--bg-hover);
```

- [ ] **Step 3: Verify the site still renders correctly**

Run the dev server and check: home page, /wards, /wards/01, /polls, /sources. Confirm no visual regressions. Everything should look identical to before since we're only renaming values.

```bash
npm run dev
```

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css
git commit -m "style: centralise design tokens as CSS vars in globals.css"
```

---

## Task 2: Migrate layout.tsx and masthead-nav.tsx

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/components/masthead-nav.tsx`

- [ ] **Step 1: Update layout.tsx inline styles**

Current inline styles (lines ~44–68):
```tsx
// BEFORE
borderBottom: "1px solid #ccc"
color: "#1a1a1a"
color: "#555"
fontFamily: "var(--font-newsreader), serif"
fontFamily: "var(--font-ibm-mono), monospace"
```

Replace with:
```tsx
// AFTER — borderBottom
borderBottom: "1px solid var(--line-soft)"

// AFTER — color values
color: "var(--text-strong)"   // was #1a1a1a
color: "var(--text-mid)"      // was #555

// AFTER — font families: remove style prop entirely, add className
className="font-heading"   // replaces fontFamily: "var(--font-newsreader), serif"
className="font-mono"      // replaces fontFamily: "var(--font-ibm-mono), monospace"
```

- [ ] **Step 2: Update masthead-nav.tsx**

Line ~16:
```tsx
// BEFORE
borderTop: "2px solid #1a1a1a"

// AFTER
borderTop: "2px solid var(--line-strong)"
```

- [ ] **Step 3: Commit**

```bash
git add src/app/layout.tsx src/components/masthead-nav.tsx
git commit -m "style: use CSS vars and font utilities in layout and masthead"
```

---

## Task 3: Migrate page.tsx (home page)

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Replace all inline style props**

```tsx
// BEFORE → AFTER

// Borders
border: "1px solid #ccc"          → border: "1px solid var(--line-soft)"
borderTop: "2px solid #1a1a1a"    → borderTop: "2px solid var(--line-strong)"
borderRight: "1px solid #ccc"     → borderRight: "1px solid var(--line-soft)"
borderBottom: i < arr.length - 1 ? "1px solid #e0ddd8" : "none"
  → borderBottom: i < arr.length - 1 ? "1px solid var(--line-inner)" : "none"

// Colors
color: "#555"   → color: "var(--text-mid)"
color: "#666"   → color: "var(--text-soft)"
color: "#1a1a1a" → color: "var(--text-strong)"

// Font families: remove style prop, add className
fontFamily: "var(--font-ibm-mono), monospace"  → className="font-mono"
fontFamily: "var(--font-newsreader), serif"    → className="font-heading"
```

When an element has *both* a font family and other style props, split into `className` for font and keep remaining styles inline.

- [ ] **Step 2: Commit**

```bash
git add src/app/page.tsx
git commit -m "style: use CSS vars and font utilities in home page"
```

---

## Task 4: Migrate wards/page.tsx

**Files:**
- Modify: `src/app/wards/page.tsx`

- [ ] **Step 1: Replace inline styles**

```tsx
// BEFORE → AFTER
color: "#1a1a1a"  → color: "var(--text-strong)"
color: "#555"     → color: "var(--text-mid)"
color: "#9b1c1c"  → color: "var(--vuln-high-fg)"   // competitive count
color: "#92400e"  → color: "var(--vuln-med-fg)"    // open count

// Font families
fontFamily: "var(--font-ibm-mono), monospace"  → className="font-mono"
fontFamily: "var(--font-newsreader), serif"    → className="font-heading"
```

- [ ] **Step 2: Commit**

```bash
git add src/app/wards/page.tsx
git commit -m "style: use CSS vars in wards list page"
```

---

## Task 5: Migrate ward-card.tsx and vulnerability-pill.tsx

**Files:**
- Modify: `src/components/ward-card.tsx`
- Modify: `src/components/vulnerability-pill.tsx`

These two files are the canonical source of vulnerability-level colours for the ward grid. Getting them right first prevents further divergence.

- [ ] **Step 1: Rewrite TOP_BORDER map in ward-card.tsx**

```tsx
// BEFORE
const TOP_BORDER: Record<string, string> = {
  high: "2px solid #ef4444",
  medium: "2px solid #f59e0b",
  low: "1px solid #ccc",
};
// open-seat: "2px solid #6b7280"

// AFTER
const TOP_BORDER: Record<string, string> = {
  high:   "2px solid var(--vuln-high-line)",
  medium: "2px solid var(--vuln-med-line)",
  low:    "1px solid var(--line-soft)",
};
// open-seat line:
const borderTop = ward.is_running
  ? (TOP_BORDER[vulnerabilityBand] ?? "1px solid var(--line-soft)")
  : "2px solid var(--vuln-open-fg)";
```

- [ ] **Step 2: Replace inline typography styles in ward-card.tsx**

The three label divs (Ward XX / ward name / councillor name) are each reinventing patterns that `.np-kicker` and `.np-tag` already define. Replace them:

```tsx
// Ward XX label — was a fully inline div
// BEFORE:
<div style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.55rem",
  color: "#666", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.2rem" }}>
  Ward {wardNum}
</div>

// AFTER (np-kicker is 0.65rem; this is smaller so add a modifier or keep size inline):
<div className="font-mono" style={{ fontSize: "0.55rem", color: "var(--text-soft)",
  textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.2rem" }}>
  Ward {wardNum}
</div>

// Ward name — was inline serif
// BEFORE:
<div style={{ fontFamily: "var(--font-newsreader), serif", fontSize: "0.88rem",
  fontWeight: 700, color: "#1a1a1a", lineHeight: 1.2, marginBottom: "0.25rem" }}>

// AFTER:
<div className="font-heading" style={{ fontSize: "0.88rem",
  fontWeight: 700, color: "var(--text-strong)", lineHeight: 1.2, marginBottom: "0.25rem" }}>

// Councillor name — was inline mono
// BEFORE:
<div style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.6rem",
  color: "#555", marginBottom: "0.45rem" }}>

// AFTER:
<div className="font-mono" style={{ fontSize: "0.6rem",
  color: "var(--text-mid)", marginBottom: "0.45rem" }}>

// By-elec span
// BEFORE: color: "#666"
// AFTER:  color: "var(--text-soft)"

// Open seat tag
// BEFORE: style={{ color: "#6b7280", borderColor: "#6b7280" }}
// AFTER:  style={{ color: "var(--vuln-open-fg)", borderColor: "var(--vuln-open-fg)" }}
```

- [ ] **Step 3: Update vulnerability-pill.tsx**

```tsx
// BEFORE
const COLOR: Record<string, string> = {
  low:    "#166534",
  medium: "#92400e",
  high:   "#9b1c1c",
};

// AFTER
const COLOR: Record<string, string> = {
  low:    "var(--vuln-low-fg)",
  medium: "var(--vuln-med-fg)",
  high:   "var(--vuln-high-fg)",
};
```

- [ ] **Step 4: Commit**

```bash
git add src/components/ward-card.tsx src/components/vulnerability-pill.tsx
git commit -m "style: use CSS vars for vulnerability colours in ward card and pill"
```

---

## Task 6: Migrate wards-browser.tsx

**Files:**
- Modify: `src/components/wards-browser.tsx`

This file has the most extensive hardcoded colour maps: `BAND_COLORS`, `BAND_STROKES`, `BAND_COLORS_HOVER`, `BAND_STROKES_HOVER` (lines 31–56).

- [ ] **Step 1: Replace the four band colour maps**

```tsx
// BEFORE (lines 31–56) — four separate Record<string, string> maps with hex values

// AFTER — single consolidated map pointing to CSS vars:
const BAND: Record<string, {
  bg: string; stroke: string; bgHover: string; strokeHover: string;
}> = {
  high:   { bg: "var(--vuln-high-bg)",   stroke: "var(--vuln-high-line)",   bgHover: "var(--vuln-high-bg-hover)",   strokeHover: "var(--vuln-high-line-hover)" },
  medium: { bg: "var(--vuln-med-bg)",    stroke: "var(--vuln-med-line)",    bgHover: "var(--vuln-med-bg-hover)",    strokeHover: "var(--vuln-med-line-hover)" },
  low:    { bg: "var(--vuln-low-bg)",    stroke: "var(--vuln-low-line)",    bgHover: "var(--vuln-low-bg-hover)",    strokeHover: "var(--vuln-low-line-hover)" },
  open:   { bg: "var(--vuln-open-bg)",   stroke: "var(--vuln-open-line)",   bgHover: "var(--vuln-open-bg-hover)",   strokeHover: "var(--vuln-open-line-hover)" },
};
```

Update all usages of `BAND_COLORS[band]` → `BAND[band].bg`, `BAND_STROKES[band]` → `BAND[band].stroke`, etc.

- [ ] **Step 2: Replace remaining inline styles**

```tsx
borderBottom: "1px solid #ccc"  → borderBottom: "1px solid var(--line-soft)"
color: "#888"                   → color: "var(--text-faint)"
color: "#aaa"                   → color: "var(--text-ghost)"

// font families
fontFamily: "var(--font-ibm-mono), monospace"  → className="font-mono" (or add to existing className)
```

- [ ] **Step 3: Commit**

```bash
git add src/components/wards-browser.tsx
git commit -m "style: consolidate band colour maps and use CSS vars in wards browser"
```

---

## Task 7: Migrate wards/[ward_num]/page.tsx

**Files:**
- Modify: `src/app/wards/[ward_num]/page.tsx`

This is the largest file with 50+ inline style instances. Work section by section.

- [ ] **Step 1: Replace all colour inline styles**

Do a global find-and-replace within this file:

| Find | Replace |
|------|---------|
| `"#1a1a1a"` | `"var(--text-strong)"` |
| `"#555"` | `"var(--text-mid)"` |
| `"#666"` | `"var(--text-soft)"` |
| `"#888"` | `"var(--text-faint)"` |
| `"#777"` | `"var(--text-soft)"` (close enough; unify) |
| `"#ccc"` (borders) | `"var(--line-soft)"` |
| `"#c53030"` | `"var(--vuln-high-fg)"` |
| `"#15803d"` | `"var(--vuln-low-line-hover)"` |
| `"#92400e"` | `"var(--vuln-med-fg)"` |

- [ ] **Step 2: Replace font-family inline styles with className**

Find every occurrence of `fontFamily: "var(--font-ibm-mono), monospace"` → remove the fontFamily prop, add `font-mono` to className.

Find every occurrence of `fontFamily: "var(--font-newsreader), serif"` → remove prop, add `font-heading` to className.

When an element has only `fontFamily` in its `style` prop, the entire `style` prop can often be removed and replaced with just `className`.

- [ ] **Step 3: Verify factorDirection() colour output**

The `factorDirection()` function (around line 23–24) returns `color: "#c53030"` or `color: "#15803d"`. Update:

```tsx
// BEFORE
function factorDirection(direction: string) {
  if (direction === "increases") return { color: "#c53030" };
  if (direction === "reduces")   return { color: "#15803d" };
  return {};
}

// AFTER
function factorDirection(direction: string) {
  if (direction === "increases") return { color: "var(--vuln-high-fg)" };
  if (direction === "reduces")   return { color: "var(--vuln-low-fg)" };
  return {};
}
```

- [ ] **Step 4: Commit**

```bash
git add "src/app/wards/[ward_num]/page.tsx"
git commit -m "style: use CSS vars and font utilities in ward detail page"
```

---

## Task 8: Migrate voter-alignment-bars.tsx

**Files:**
- Modify: `src/components/voter-alignment-bars.tsx`

- [ ] **Step 1: Replace segment colour inline styles with CSS var references**

The component renders bars with inline `background` colours. Replace with CSS vars:

```tsx
// BEFORE
background: "#854a90"   → background: "var(--color-chow)"
background: "#b89ec4"   → background: "var(--color-chow-soft)"   // bonus segment
background: "#00a2bf"   → background: "var(--color-bradford)"
background: "#7ecfde"   → background: "var(--color-bradford-soft)" // bonus segment
color: "#854a90"        → color: "var(--color-chow)"
color: "#00a2bf"        → color: "var(--color-bradford)"
color: "#666"           → color: "var(--text-soft)"
```

- [ ] **Step 2: Replace font families and grey inline styles**

```tsx
fontFamily: "var(--font-ibm-mono), monospace" → className="font-mono"
color: "#1a1a1a"  → color: "var(--text-strong)"
color: "#555"     → color: "var(--text-mid)"
border: "1px solid #ccc"  → border: "1px solid var(--line-soft)"
background: scenario === s ? "#1a1a1a" : "transparent"
  → background: scenario === s ? "var(--text-strong)" : "transparent"
color: scenario === s ? "#fff" : "#555"
  → color: scenario === s ? "#fff" : "var(--text-mid)"
```

The triangle indicator (line 36):
```tsx
// BEFORE
borderBottom: "6px solid #1a1a1a"
// AFTER
borderBottom: "6px solid var(--text-strong)"
```

- [ ] **Step 3: Commit**

```bash
git add src/components/voter-alignment-bars.tsx
git commit -m "style: use CSS vars in voter alignment bars"
```

---

## Task 9: Migrate signal-range-bar.tsx and coattail-bars.tsx

**Files:**
- Modify: `src/components/signal-range-bar.tsx`
- Modify: `src/components/coattail-bars.tsx`

Both are SVG-based components that hardcode fill colours and font families inline.

- [ ] **Step 1: Update signal-range-bar.tsx**

```tsx
// BEFORE
color = "#555"    (neutral)
color = "#c53030" (high risk)
color = "#15803d" (low risk)
color = "#92400e" (medium risk)
fill="#e8e5e0"    (track background)
fontFamily="var(--font-ibm-mono), monospace"

// AFTER
color = "var(--text-mid)"         (neutral)
color = "var(--vuln-high-fg)"     (high risk)
color = "var(--vuln-low-fg)"      (low risk)
color = "var(--vuln-med-fg)"      (medium risk)
fill="var(--track-bg)"            (track background)
fontFamily="var(--font-ibm-mono)" (drop the fallback — Tailwind already handles it,
                                   or use a CSS class on the SVG text element)
```

Note: SVG `fill` and `fontFamily` attributes cannot use Tailwind classNames directly. Use `var(--...)` in the attribute value instead.

- [ ] **Step 2: Update coattail-bars.tsx**

```tsx
// BEFORE
color: "#999"   → color: "var(--vuln-open-line)"  (or --text-faint — pick one)
color: "#777"   → color: "var(--text-soft)"
fill="#e8e5e0"  → fill="var(--track-bg)"
fill="#555"     → fill="var(--track-fill)"
```

- [ ] **Step 3: Commit**

```bash
git add src/components/signal-range-bar.tsx src/components/coattail-bars.tsx
git commit -m "style: use CSS vars in SVG chart components"
```

---

## Task 10: Sources page and remaining files

**Files:**
- Modify: `src/app/sources/page.tsx`

- [ ] **Step 1: Replace inline styles**

```tsx
// Callout box background
background: "#f5f5f0"  → background: "var(--bg-raised)"

// Font families
fontFamily: "var(--font-newsreader), serif"    → className="font-heading"
fontFamily: "var(--font-ibm-mono), monospace"  → className="font-mono"

// Colors
color: "#1a1a1a"  → color: "var(--text-strong)"
color: "#555"     → color: "var(--text-mid)"
```

- [ ] **Step 2: Commit**

```bash
git add src/app/sources/page.tsx
git commit -m "style: use CSS vars in sources page"
```

---

## Verification

After all tasks, do a final sweep:

- [ ] **grep for remaining hardcoded hex values**

```bash
grep -rn '#[0-9a-fA-F]\{3,6\}' src/app src/components \
  --include="*.tsx" \
  --exclude-dir=node_modules \
  | grep -v "globals.css" \
  | grep 'style='
```

Expected: only SVG chart colours that can't be replaced with Tailwind classes (acceptable), and any intentional one-off values. Zero results from JSX `style` props on non-SVG elements.

- [ ] **grep for remaining hardcoded font-family inline styles**

```bash
grep -rn 'fontFamily.*var(--font' src/app src/components --include="*.tsx"
```

Expected: zero results (all replaced with `className="font-mono"` etc.)

- [ ] **Visual check:** Open each route and confirm no regressions:
  - `/` (home) — hero, voter alignment bars, stats sidebar
  - `/wards` — ward grid, vulnerability colouring, sort controls
  - `/wards/01` — ward detail, signal bars, coattail chart, model explainer
  - `/polls` — polling chart, candidate table
  - `/sources` — callout boxes, links
