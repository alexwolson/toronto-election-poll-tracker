# Win Probability as Primary Metric — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Promote `win_probability` to the main identifier on ward cards and the ward detail page, moving vulnerability to a secondary signal.

**Architecture:** Four sequential changes — CSS variables first (consumed by the pill), then the pill component itself, then the two consumers (ward card, detail page). No new files are created; no types or data-layer files are touched.

**Tech Stack:** Next.js 16 (App Router), TypeScript, React 19, CSS custom properties, Vitest for the existing test suite.

---

## File Map

| File | Change |
|---|---|
| `src/app/globals.css` | Add `--win-high-*`, `--win-med-*`, `--win-low-*` CSS vars |
| `src/components/win-probability-pill.tsx` | Rewrite to `np-tag` + CSS vars; remove Tailwind + Lucide |
| `src/components/ward-card.tsx` | Swap `VulnerabilityPill` → `WinProbabilityPill`, update `TOP_BORDER` |
| `src/app/wards/[ward_num]/page.tsx` | Rename kicker block; swap pill; add vulnerability row to Signals & factors |

---

## Task 1: CSS Variables for Win Probability

**Context:** The `np-tag` component pattern uses CSS custom properties for colour rather than Tailwind utilities (see `--vuln-*` vars in the same file). Win probability needs a parallel set of vars. High win = green (incumbent safe), medium = amber, low = red — the inverse of vulnerability semantics.

**Files:**
- Modify: `src/app/globals.css` (around line 128, after `--vuln-open-line-hover`)

---

- [ ] **Step 1: Verify the existing `--vuln-*` block location**

Open `src/app/globals.css`. Find the block ending with:
```css
  --vuln-open-line-hover: #666;
```
The new vars go immediately after this line, before the `/* ── Candidate segment colours ── */` comment.

- [ ] **Step 2: Add the win probability CSS variables**

Insert the following block between `--vuln-open-line-hover: #666;` and the candidate-colours comment:

```css
  /* ── Win probability levels ── */
  --win-high-fg:   #166534;
  --win-high-line: #22c55e;
  --win-high-bg:   #dcfce7;

  --win-med-fg:    #92400e;
  --win-med-line:  #f59e0b;
  --win-med-bg:    #fef3c7;

  --win-low-fg:    #9b1c1c;
  --win-low-line:  #ef4444;
  --win-low-bg:    #fee2e2;
```

After insertion, the relevant section should read:
```css
  --vuln-open-fg:    #6b7280;
  --vuln-open-line:  #999;
  --vuln-open-bg:    #e5e5e5;
  --vuln-open-bg-hover: #d4d4d4;
  --vuln-open-line-hover: #666;

  /* ── Win probability levels ── */
  --win-high-fg:   #166534;
  --win-high-line: #22c55e;
  --win-high-bg:   #dcfce7;

  --win-med-fg:    #92400e;
  --win-med-line:  #f59e0b;
  --win-med-bg:    #fef3c7;

  --win-low-fg:    #9b1c1c;
  --win-low-line:  #ef4444;
  --win-low-bg:    #fee2e2;

  /* ── Candidate segment colours ── */
```

- [ ] **Step 3: Run the test suite and build check**

```bash
cd toronto-election-poll-tracker
npm test -- --run
npm run build
```

Expected: all tests pass, build succeeds with no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css
git commit -m "style: add win-probability CSS custom properties"
```

---

## Task 2: Rewrite `WinProbabilityPill`

**Context:** The current implementation uses Tailwind utility classes and Lucide icons — inconsistent with `VulnerabilityPill`, which uses the `np-tag` CSS class and CSS vars. The rewrite aligns the two components so they behave identically at a structural level.

`WinProbabilityBand` (`"low" | "medium" | "high"`) is already exported from `src/lib/vulnerability.ts`. `np-tag` is already defined in the global stylesheet. No new types or utilities needed.

**Files:**
- Modify: `src/components/win-probability-pill.tsx`

---

- [ ] **Step 1: Replace the entire file content**

Open `src/components/win-probability-pill.tsx` and replace everything with:

```tsx
import { WinProbabilityBand } from "@/lib/vulnerability";

interface WinProbabilityPillProps {
  band: WinProbabilityBand;
}

const BAND_STYLE: Record<WinProbabilityBand, { color: string }> = {
  high:   { color: "var(--win-high-fg)" },
  medium: { color: "var(--win-med-fg)" },
  low:    { color: "var(--win-low-fg)" },
};

const BAND_ARROW: Record<WinProbabilityBand, string> = {
  high:   "↑",
  medium: "—",
  low:    "↓",
};

export function WinProbabilityPill({ band }: WinProbabilityPillProps) {
  const { color } = BAND_STYLE[band];
  return (
    <span className="np-tag" style={{ color, borderColor: color }}>
      {BAND_ARROW[band]} {band} win prob.
    </span>
  );
}
```

- [ ] **Step 2: Run the test suite and build check**

```bash
npm test -- --run
npm run build
```

Expected: all tests pass, build succeeds. TypeScript will catch any import mismatches.

- [ ] **Step 3: Commit**

```bash
git add src/components/win-probability-pill.tsx
git commit -m "refactor: rewrite WinProbabilityPill to use np-tag + CSS vars"
```

---

## Task 3: Update `WardCard`

**Context:** Currently `WardCard` colours its top border and pill by `vulnerabilityBand`. After this task it will colour both by `winProbabilityBand`. Open seats keep the existing grey border and "Open seat" tag. The `vulnerabilityBand` variable is removed from this component entirely — vulnerability is no longer displayed on ward cards.

`getWinProbabilityBand` and `WinProbabilityBand` are already exported from `src/lib/vulnerability.ts`. `ward.win_probability` is a required (non-optional) `number` field on `Ward`.

**Files:**
- Modify: `src/components/ward-card.tsx`

---

- [ ] **Step 1: Replace the entire file content**

Open `src/components/ward-card.tsx` and replace everything with:

```tsx
import Link from "next/link";
import { Ward } from "@/types/ward";
import { getWinProbabilityBand } from "@/lib/vulnerability";
import { WinProbabilityPill } from "@/components/win-probability-pill";
import { getWardDisplayName } from "@/lib/ward-names";

interface WardCardProps {
  ward: Ward;
}

const TOP_BORDER: Record<string, string> = {
  high:   "2px solid var(--win-high-line)",
  medium: "2px solid var(--win-med-line)",
  low:    "1px solid var(--line-soft)",
};

export function WardCard({ ward }: WardCardProps) {
  const winProbabilityBand = getWinProbabilityBand(ward.win_probability);
  const titleName = ward.is_running ? ward.councillor_name : "Open seat";
  const wardLabel = getWardDisplayName(ward.ward);
  const wardNum = String(ward.ward).padStart(2, "0");
  const borderTop = ward.is_running
    ? (TOP_BORDER[winProbabilityBand] ?? "1px solid var(--line-soft)")
    : "2px solid var(--vuln-open-fg)";

  return (
    <Link href={`/wards/${ward.ward}`} style={{ display: "block", textDecoration: "none" }}>
      <div
        className="np-cell"
        style={{ borderTop }}
      >
        <div
          className="font-mono"
          style={{
            fontSize: "0.55rem",
            color: "var(--text-soft)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            marginBottom: "0.2rem",
          }}
        >
          Ward {wardNum}
        </div>
        <div
          className="font-heading"
          style={{
            fontSize: "0.88rem",
            fontWeight: 700,
            color: "var(--text-strong)",
            lineHeight: 1.2,
            marginBottom: "0.25rem",
          }}
        >
          {wardLabel}
        </div>
        <div
          className="font-mono"
          style={{
            fontSize: "0.6rem",
            color: "var(--text-mid)",
            marginBottom: "0.45rem",
          }}
        >
          {titleName}
          {ward.is_byelection_incumbent && (
            <span style={{ color: "var(--text-soft)" }}> · By-elec.</span>
          )}
        </div>
        <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
          {ward.is_running ? (
            <WinProbabilityPill band={winProbabilityBand} />
          ) : (
            <span className="np-tag" style={{ color: "var(--vuln-open-fg)", borderColor: "var(--vuln-open-fg)" }}>Open seat</span>
          )}
        </div>
      </div>
    </Link>
  );
}
```

- [ ] **Step 2: Run the test suite and build check**

```bash
npm test -- --run
npm run build
```

Expected: all tests pass, build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/ward-card.tsx
git commit -m "feat: promote win probability to primary metric on ward cards"
```

---

## Task 4: Update Ward Detail Page

**Context:** The ward detail page (`src/app/wards/[ward_num]/page.tsx`) currently shows a "Vulnerability" kicker block immediately after the narrative lede. This block is renamed to "Win probability" and displays `WinProbabilityPill`. Vulnerability doesn't disappear — it moves to the Signals & factors table as its first row, above the existing vulnerability signals.

Two existing variables remain in scope and are still used:
- `vulnerabilityBand` — computed from `getVulnerabilityBand(ward.defeatability_score)`, still used in the new Signals row
- `vulnerabilitySignals` — still rendered in the signals table

A new variable `winProbabilityBand` is derived from `getWinProbabilityBand(ward.win_probability)`.

**Files:**
- Modify: `src/app/wards/[ward_num]/page.tsx`

---

- [ ] **Step 1: Update imports**

The current import block at the top of the file reads:
```tsx
import {
  getVulnerabilityBand,
  getVulnerabilitySignals,
} from "@/lib/vulnerability";
import { VulnerabilityPill } from "@/components/vulnerability-pill";
```

Replace it with:
```tsx
import {
  getVulnerabilityBand,
  getVulnerabilitySignals,
  getWinProbabilityBand,
} from "@/lib/vulnerability";
import { VulnerabilityPill } from "@/components/vulnerability-pill";
import { WinProbabilityPill } from "@/components/win-probability-pill";
```

- [ ] **Step 2: Derive `winProbabilityBand`**

Immediately after the existing line (around line 65–66):
```tsx
const vulnerabilityBand = getVulnerabilityBand(ward.defeatability_score);
```

Add:
```tsx
const winProbabilityBand = getWinProbabilityBand(ward.win_probability);
```

- [ ] **Step 3: Rename the kicker block and swap the pill**

Find the `{/* Vulnerability */}` block (lines 167–184):
```tsx
      {/* Vulnerability */}
      <div
        style={{
          border: "1px solid var(--line-soft)",
          borderTop: "none",
          marginBottom: "2rem",
          padding: "0.75rem 1rem",
        }}
      >
        <div className="np-kicker" style={{ marginBottom: "0.4rem" }}>
          Vulnerability
        </div>
        {ward.is_running ? (
          <VulnerabilityPill band={vulnerabilityBand} />
        ) : (
          <span className="np-tag" style={{ color: "var(--vuln-open-fg)", borderColor: "var(--vuln-open-fg)" }}>Open seat</span>
        )}
      </div>
```

Replace it with:
```tsx
      {/* Win probability */}
      <div
        style={{
          border: "1px solid var(--line-soft)",
          borderTop: "none",
          marginBottom: "2rem",
          padding: "0.75rem 1rem",
        }}
      >
        <div className="np-kicker" style={{ marginBottom: "0.4rem" }}>
          Win probability
        </div>
        {ward.is_running ? (
          <WinProbabilityPill band={winProbabilityBand} />
        ) : (
          <span className="np-tag" style={{ color: "var(--vuln-open-fg)", borderColor: "var(--vuln-open-fg)" }}>Open seat</span>
        )}
      </div>
```

- [ ] **Step 4: Add vulnerability as the first row in Signals & factors**

Find the `{/* Vulnerability signals */}` comment inside the `<tbody>` (around line 195):
```tsx
              {/* Vulnerability signals */}
              {vulnerabilitySignals.map((signal) => (
```

Insert a new row immediately before it (between `<tbody>` and `{/* Vulnerability signals */}`):
```tsx
              {/* Vulnerability row */}
              <tr>
                <td>
                  <span className="font-heading" style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--text-strong)", display: "block" }}>
                    Vulnerability
                  </span>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-mid)", display: "block", marginTop: "0.25rem" }}>
                    Structural exposure based on past vote share, electorate size, and ward growth.
                  </span>
                </td>
                <td style={{ verticalAlign: "middle", paddingLeft: "1.5rem" }}>
                  <VulnerabilityPill band={vulnerabilityBand} />
                </td>
              </tr>
```

After this insertion the tbody opening should look like:
```tsx
            <tbody>
              {/* Vulnerability row */}
              <tr>
                <td>
                  <span className="font-heading" style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--text-strong)", display: "block" }}>
                    Vulnerability
                  </span>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-mid)", display: "block", marginTop: "0.25rem" }}>
                    Structural exposure based on past vote share, electorate size, and ward growth.
                  </span>
                </td>
                <td style={{ verticalAlign: "middle", paddingLeft: "1.5rem" }}>
                  <VulnerabilityPill band={vulnerabilityBand} />
                </td>
              </tr>

              {/* Vulnerability signals */}
              {vulnerabilitySignals.map((signal) => (
```

- [ ] **Step 5: Run the test suite and build check**

```bash
npm test -- --run
npm run build
```

Expected: all tests pass, build succeeds with no TypeScript errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/wards/[ward_num]/page.tsx
git commit -m "feat: win probability as primary metric on ward detail page"
```

---

## Final Verification

- [ ] Run the dev server: `npm run dev`
- [ ] Open http://localhost:3000/wards — ward cards should show coloured top borders and "↑/—/↓ {band} win prob." pills based on win probability, not vulnerability
- [ ] Open any competitive ward detail page (e.g. /wards/9) — the block immediately below the narrative should read "Win probability" with a `WinProbabilityPill`; the Signals & factors table should open with a "Vulnerability" row showing `VulnerabilityPill` above the three existing signal rows
- [ ] Open an open-seat ward detail page — kicker block shows "Open seat" grey tag; Signals & factors section is hidden (existing `{ward.is_running && ...}` guard)
