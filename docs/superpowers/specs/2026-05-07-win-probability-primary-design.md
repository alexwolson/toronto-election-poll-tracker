# Win Probability as Primary Metric — Design Spec

## Goal

Promote computed win probability to the main identifier on ward cards and the ward detail page, demoting vulnerability to a secondary signal. This reflects the shift from the structural phase (where vulnerability was the only meaningful signal) into the registration phase (where win probabilities are computed).

---

## Approach

Approach A — Swap pill. Minimal change: the top border and pill on each ward card switch from vulnerability to win probability. Vulnerability is not removed from the site; it moves to the Signals & factors table on the detail page.

---

## Section 1 — CSS Variables (`globals.css`)

Add win-probability CSS variables alongside the existing `--vuln-*` block. Color semantics are the inverse of vulnerability: green = high win probability (good for incumbent), amber = medium, red = low.

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

These are inserted immediately after the `--vuln-open-*` block in the `:root` selector.

---

## Section 2 — `WinProbabilityPill` Component

Rewrite `src/components/win-probability-pill.tsx` to use the `np-tag` CSS class and CSS variables, matching `vulnerability-pill.tsx` exactly in structure. Remove Tailwind classes and Lucide icons.

**Current (Tailwind, inconsistent):**
```tsx
const BAND_STYLE: Record<WinProbabilityBand, string> = {
  low: "bg-rose-100 text-rose-900 border-rose-300/80",
  medium: "bg-amber-100 text-amber-900 border-amber-300/80",
  high: "bg-emerald-100 text-emerald-900 border-emerald-300/80",
};

<span className={`inline-flex items-center gap-1 rounded-full border ... ${BAND_STYLE[band]}`}>
  <Icon ... />
  {band} win probability
</span>
```

**New (np-tag + CSS vars):**
```tsx
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

---

## Section 3 — `WardCard` Component

Change `src/components/ward-card.tsx` so the top border and pill both reflect win probability.

**`TOP_BORDER` map** — switch from `--vuln-*-line` to `--win-*-line`:
```ts
const TOP_BORDER: Record<string, string> = {
  high:   "2px solid var(--win-high-line)",
  medium: "2px solid var(--win-med-line)",
  low:    "1px solid var(--line-soft)",
};
```

**Pill swap** — import `WinProbabilityPill` and `getWinProbabilityBand` (from `@/lib/vulnerability`); use `winProbabilityBand` instead of `vulnerabilityBand` for the pill and the border:
```tsx
const winProbabilityBand = getWinProbabilityBand(ward.win_probability ?? 0);
const borderTop = ward.is_running
  ? (TOP_BORDER[winProbabilityBand] ?? "1px solid var(--line-soft)")
  : "2px solid var(--vuln-open-fg)";

// pill:
{ward.is_running ? (
  <WinProbabilityPill band={winProbabilityBand} />
) : (
  <span className="np-tag" style={{ color: "var(--vuln-open-fg)", borderColor: "var(--vuln-open-fg)" }}>Open seat</span>
)}
```

Open seat cards keep the gray border; `VulnerabilityPill` import is removed from this file.

---

## Section 4 — Ward Detail Page

Change `src/app/wards/[ward_num]/page.tsx` in two places:

**1. Rename the kicker block and swap the pill (lines 167–184):**

```tsx
{/* Win probability */}
<div style={{ border: "1px solid var(--line-soft)", borderTop: "none", marginBottom: "2rem", padding: "0.75rem 1rem" }}>
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

`winProbabilityBand` is derived the same way as in the ward card: `getWinProbabilityBand(ward.win_probability ?? 0)`.

**2. Add vulnerability as the first row in Signals & factors (before the vulnerability signals map):**

```tsx
{/* Vulnerability row */}
<tr>
  <td>
    <span className="font-heading" style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--text-strong)", display: "block" }}>
      Vulnerability
    </span>
    <span style={{ fontSize: "0.75rem", color: "var(--text-mid)", display: "block", marginTop: "0.25rem" }}>
      Structural exposure based on past vote share, electorate growth, and ward lean.
    </span>
  </td>
  <td style={{ verticalAlign: "middle", paddingLeft: "1.5rem" }}>
    <VulnerabilityPill band={vulnerabilityBand} />
  </td>
</tr>
```

`VulnerabilityPill` and `vulnerabilityBand` remain imported/computed as today; only their display location changes.

---

## Files Changed

| File | Change |
|---|---|
| `src/app/globals.css` | Add `--win-high-*`, `--win-med-*`, `--win-low-*` CSS vars |
| `src/components/win-probability-pill.tsx` | Rewrite to `np-tag` + CSS vars; remove Tailwind + Lucide |
| `src/components/ward-card.tsx` | Swap pill and border to win probability; remove `VulnerabilityPill` import |
| `src/app/wards/[ward_num]/page.tsx` | Rename kicker block; swap pill; add vulnerability row to Signals & factors |

No new files. No changes to types, `vulnerability.ts`, or any other component.
