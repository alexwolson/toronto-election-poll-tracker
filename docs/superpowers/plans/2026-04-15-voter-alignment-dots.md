# Voter Alignment Dots Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `MayoralPoolDisplay` component on the homepage with a broadsheet-styled dot-grid that shows the structural voter alignment in the 2026 Toronto mayoral race — Chow's floor/ceiling on the left, the anti-Chow pool on the right, not-yet-engaged voters below — driven by the existing `pool_model` API data.

**Architecture:** A new pure presentational component `VoterAlignmentDots` reads `PoolModel` (already fetched by the homepage Server Component) and renders two 10×5 CSS grids flanking a centred "50%" divider, plus a below-the-fold section for disengaged voters. Dot counts are computed by a small pure utility function. The old `MayoralPoolDisplay` is kept in place and simply no longer imported from `page.tsx`.

**Tech Stack:** Next.js 16.2.2, React 19, Tailwind v4 (arbitrary-value classes), TypeScript. No new dependencies.

---

## File Structure

| Action | Path | Responsibility |
|--------|------|----------------|
| **Create** | `frontend/src/lib/dot-counts.ts` | Pure function: `PoolModel` → dot segment counts |
| **Create** | `frontend/src/components/voter-alignment-dots.tsx` | Presentational component: renders the dot grid |
| **Modify** | `frontend/src/app/page.tsx` lines 2–3, 45 | Swap `MayoralPoolDisplay` import/usage for `VoterAlignmentDots` |

`mayoral-pool-display.tsx` is **left untouched** — it is simply no longer referenced from `page.tsx`.

---

## Reference: Approved Design (`dot-pools-v6.html`)

The design to implement (reproduced here for reference):

```
┌─────────────────────────────────────────────────────────────────────────┐
│  MAYORAL RACE · VOTER ALIGNMENT · PRE-NOMINATION        [red 7px mono]  │
│  Where Toronto voters sit              Each dot ≈ 5,000 voters          │
├─────────────────────────────────────────────────────────────────────────┤
│  "Chow was better" ~250K │    │  "Tory was better" ~150K active         │
│  pro-Chow bloc           │    │  Bradford / Furey base                  │
│                          │    │                                         │
│  [40 solid blue] [10     │50% │  [10 hollow dashed red] [20 solid red]  │
│   hollow dashed blue]    │line│   [20 empty slots]                      │
│  (10 cols × 5 rows)      │    │  (10 cols × 5 rows)                     │
├─────────────────────────────────────────────────────────────────────────┤
│  - - - Not yet engaged · ~100K - - - - - - - - - - - - - - - - - - - - │
│  [20 grey dots: 10 cols × 2 rows]   │ "Hasn't formed a strong view…"    │
├─────────────────────────────────────────────────────────────────────────┤
│  Legend (2-col grid):                                                   │
│  ● Chow floor ~200K          ● Anti-Chow, committed ~100K               │
│  ○ Chow ceiling ~50K         ○ Anti-Chow, available ~50K                │
└─────────────────────────────────────────────────────────────────────────┘
```

**Dot visual styles:**
- `chow-floor`: `background: #2563eb` (solid blue)
- `chow-ceiling`: `border: 1.5px dashed #6898c4; background: transparent` (hollow dashed blue)
- `anti-available`: `border: 1.5px dashed #c53030; background: transparent` (hollow dashed red)
- `anti-committed`: `background: #c53030` (solid red)
- `disengaged`: `background: #c8c4be` (grey)

Each dot: `width: 14px; height: 14px; border-radius: 50%; display: block; box-sizing: border-box`

Grid for both left and right zones: `display: grid; grid-template-columns: repeat(10, 14px); grid-template-rows: repeat(5, 14px); gap: 3px; grid-auto-flow: column`

Disengaged grid: same but `grid-template-rows: repeat(2, 14px)`

The divider gap between zones: `width: 44px` with a centred `1.5px` vertical `#1a1a1a` line and a "50%" label in the middle.

---

## Data Mapping: `PoolModel` → Dot Counts

```
ESTIMATED_ELECTORATE = 500_000
DOT_SIZE = 5_000
toDots(fraction) = clamp(Math.round(fraction * 100), 0, 50)

chow_floor_dots    = toDots(pool.chow_floor)
chow_ceiling_dots  = clamp(toDots(pool.chow_ceiling - pool.chow_floor), 0, 50 - chow_floor_dots)

// anti_chow_pool = disapprove rate; uncaptured_anti_chow = fraction with no named pick
// committed = named-captured (pool - uncaptured)
anti_available_dots  = toDots(uncaptured_anti_chow)
anti_committed_dots  = clamp(toDots(pool.anti_chow_pool - uncaptured_anti_chow), 0, 50 - anti_available_dots)

not_engaged_dots   = clamp(toDots(approval.not_sure), 0, 20)
```

Legend dot counts (for display in legend text only — multiply dots × 5,000 to get voter count):
- `chow_floor_dots × 5K` → display as `~${chow_floor_dots * 5}K`
- etc.

---

## Task 1: `computeDotCounts` utility

**Files:**
- Create: `frontend/src/lib/dot-counts.ts`

- [ ] **Step 1: Create the file**

```ts
// frontend/src/lib/dot-counts.ts
import type { PoolModel } from "@/lib/api";

const DOTS_PER_ZONE = 50;

function toDots(fraction: number, cap = DOTS_PER_ZONE): number {
  return Math.min(Math.max(Math.round(fraction * 100), 0), cap);
}

export type DotCounts = {
  chowFloor: number;       // solid blue, fills left side of pro-Chow zone
  chowCeiling: number;     // hollow dashed blue, fills right side of pro-Chow zone (toward centre)
  antiAvailable: number;   // hollow dashed red, fills left side of anti-Chow zone (nearest centre)
  antiCommitted: number;   // solid red, fills right of available in anti-Chow zone
  notEngaged: number;      // grey dots below the rule
};

export function computeDotCounts(model: PoolModel): DotCounts {
  const chowFloor = toDots(model.pool.chow_floor);
  const chowCeiling = toDots(
    model.pool.chow_ceiling - model.pool.chow_floor,
    DOTS_PER_ZONE - chowFloor,
  );

  const antiAvailable = toDots(model.uncaptured_anti_chow);
  const antiCommitted = toDots(
    model.pool.anti_chow_pool - model.uncaptured_anti_chow,
    DOTS_PER_ZONE - antiAvailable,
  );

  const notEngaged = toDots(model.approval.not_sure, 20);

  return { chowFloor, chowCeiling, antiAvailable, antiCommitted, notEngaged };
}
```

- [ ] **Step 2: Verify the function manually**

No test runner is set up for this project. Verify by adding a temporary `console.log` in `page.tsx` (or just reading the output in the browser console after wiring up):

Expected with approximate real-world data (chow_floor≈0.40, chow_ceiling≈0.50, anti_chow_pool≈0.30, uncaptured≈0.10, not_sure≈0.20):
```
{ chowFloor: 40, chowCeiling: 10, antiAvailable: 10, antiCommitted: 20, notEngaged: 20 }
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/lib/dot-counts.ts
git commit -m "feat: add computeDotCounts utility for voter alignment dot grid"
```

---

## Task 2: `VoterAlignmentDots` component

**Files:**
- Create: `frontend/src/components/voter-alignment-dots.tsx`

- [ ] **Step 1: Create the component file**

```tsx
// frontend/src/components/voter-alignment-dots.tsx
import type { PoolModel } from "@/lib/api";
import { computeDotCounts } from "@/lib/dot-counts";

type DotVariant =
  | "chow-floor"
  | "chow-ceiling"
  | "anti-available"
  | "anti-committed"
  | "disengaged";

function Dot({ variant }: { variant: DotVariant }) {
  const base = "block rounded-full box-border flex-shrink-0";
  const size = "w-[14px] h-[14px]";
  const styles: Record<DotVariant, string> = {
    "chow-floor":     "bg-[#2563eb]",
    "chow-ceiling":   "bg-transparent border-[1.5px] border-dashed border-[#6898c4]",
    "anti-available": "bg-transparent border-[1.5px] border-dashed border-[#c53030]",
    "anti-committed": "bg-[#c53030]",
    "disengaged":     "bg-[#c8c4be]",
  };
  return <span className={`${base} ${size} ${styles[variant]}`} />;
}

function makeDots(count: number, variant: DotVariant) {
  return Array.from({ length: count }, (_, i) => (
    <Dot key={i} variant={variant} />
  ));
}

const GRID_STYLE: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(10, 14px)",
  gridTemplateRows: "repeat(5, 14px)",
  gap: "3px",
  gridAutoFlow: "column",
  flexShrink: 0,
};

const DISENGAGED_GRID_STYLE: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(10, 14px)",
  gridTemplateRows: "repeat(2, 14px)",
  gap: "3px",
  gridAutoFlow: "column",
};

function LegendItem({
  variant,
  label,
  count,
  description,
}: {
  variant: DotVariant;
  label: string;
  count: number;
  description: string;
}) {
  const size = "w-[11px] h-[11px]";
  const base = "inline-block rounded-full flex-shrink-0 mt-[1px] box-border";
  const styles: Record<DotVariant, string> = {
    "chow-floor":     "bg-[#2563eb]",
    "chow-ceiling":   "bg-transparent border-[1.5px] border-dashed border-[#6898c4]",
    "anti-available": "bg-transparent border-[1.5px] border-dashed border-[#c53030]",
    "anti-committed": "bg-[#c53030]",
    "disengaged":     "bg-[#c8c4be]",
  };
  const approxK = count * 5;
  return (
    <div className="flex items-start gap-[6px]">
      <span className={`${base} ${size} ${styles[variant]}`} />
      <span className="font-mono text-[6.5px] text-[#444] leading-[1.4]">
        <strong>{label}</strong> — ~{approxK}K
        <br />
        <em className="text-[#999] font-[family-name:var(--font-newsreader)]">{description}</em>
      </span>
    </div>
  );
}

export function VoterAlignmentDots({ model }: { model: PoolModel | null }) {
  if (!model) {
    return (
      <div className="surface-panel p-6 md:p-8">
        <p className="font-mono text-[0.72rem] uppercase tracking-[0.16em] text-muted-foreground">
          Mayoral Race
        </p>
        <p className="mt-4 text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  const { chowFloor, chowCeiling, antiAvailable, antiCommitted, notEngaged } =
    computeDotCounts(model);

  return (
    <div className="surface-panel p-6 md:p-8 inline-block">
      {/* Kicker */}
      <p className="font-mono text-[7px] uppercase tracking-[0.12em] text-[#c53030] font-semibold mb-[3px]">
        Mayoral Race · Voter Alignment · Pre-nomination
      </p>

      {/* Title row */}
      <div className="flex justify-between items-baseline border-b-2 border-[#1a1a1a] pb-[6px] mb-[18px] w-[378px]">
        <div className="font-heading text-[18px] font-bold text-[#1a1a1a]">
          Where Toronto voters sit
        </div>
        <div className="font-mono text-[6.5px] italic text-[#888]">
          Each dot ≈ 5,000 voters
        </div>
      </div>

      {/* Zone labels */}
      <div className="flex w-[378px] mb-[6px] items-end gap-0">
        <div className="w-[167px]">
          <div className="font-mono text-[6.5px] font-bold text-[#2563eb] uppercase tracking-[0.08em] mb-[1px]">
            "Chow was better"
          </div>
          <div className="font-mono text-[6px] text-[#888]">~250K · pro-Chow bloc</div>
        </div>
        <div className="w-[44px]" />
        <div className="w-[167px]">
          <div className="font-mono text-[6.5px] font-bold text-[#c53030] uppercase tracking-[0.08em] mb-[1px]">
            "Tory was better"
          </div>
          <div className="font-mono text-[6px] text-[#888]">~150K active · Bradford / Furey base</div>
        </div>
      </div>

      {/* Main dot row */}
      <div className="flex items-start w-[378px] mb-[6px]">
        {/* Pro-Chow grid */}
        <div style={GRID_STYLE}>
          {makeDots(chowFloor, "chow-floor")}
          {makeDots(chowCeiling, "chow-ceiling")}
        </div>

        {/* 50% divider */}
        <div className="w-[44px] flex-shrink-0 relative h-[82px]">
          <div className="absolute left-1/2 top-0 bottom-0 w-[1.5px] bg-[#1a1a1a] -translate-x-1/2" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[color:var(--card)] px-[3px] py-[2px]">
            <div className="font-mono text-[6px] font-bold text-[#1a1a1a] whitespace-nowrap">
              50%
            </div>
          </div>
        </div>

        {/* Anti-Chow grid */}
        <div style={GRID_STYLE}>
          {makeDots(antiAvailable, "anti-available")}
          {makeDots(antiCommitted, "anti-committed")}
        </div>
      </div>

      {/* Not yet engaged section */}
      <div className="w-[378px] mt-[14px]">
        <div className="border-t border-dashed border-[#bbb] pt-[10px] flex items-start gap-[16px]">
          <div>
            <div className="font-mono text-[6.5px] text-[#999] font-semibold uppercase tracking-[0.08em] mb-[6px] whitespace-nowrap">
              Not yet engaged · ~100K
            </div>
            <div style={DISENGAGED_GRID_STYLE}>
              {makeDots(notEngaged, "disengaged")}
            </div>
          </div>
          <div className="pt-[2px] font-[family-name:var(--font-newsreader)] text-[6.5px] text-[#999] leading-[1.55] italic max-w-[200px]">
            Hasn't formed a strong view on Chow. Not currently part of the active
            contest — how they break will depend on the campaign.
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="border-t border-[#ccc] pt-[10px] mt-[14px] w-[378px] grid grid-cols-2 gap-x-[20px] gap-y-[5px]">
        <LegendItem
          variant="chow-floor"
          label="Chow floor"
          count={chowFloor}
          description="Votes Chow regardless of field"
        />
        <LegendItem
          variant="anti-committed"
          label="Anti-Chow, committed"
          count={antiCommitted}
          description="Behind Bradford or Furey"
        />
        <LegendItem
          variant="chow-ceiling"
          label="Chow ceiling"
          count={chowCeiling}
          description="Leans Chow; H2H behaviour unknown"
        />
        <LegendItem
          variant="anti-available"
          label="Anti-Chow, available"
          count={antiAvailable}
          description="Opposes Chow; no challenger picked"
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Start dev server and verify it builds without errors**

```bash
cd frontend && npm run dev
```

Open `http://localhost:3000` — the page should load. The component won't be visible yet (not wired to page.tsx).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/voter-alignment-dots.tsx
git commit -m "feat: add VoterAlignmentDots broadsheet dot-grid component"
```

---

## Task 3: Wire into `page.tsx`

**Files:**
- Modify: `frontend/src/app/page.tsx` (lines 2–3, 45)

- [ ] **Step 1: Update imports and component usage in `page.tsx`**

Replace the `MayoralPoolDisplay` import and usage. The full diff:

```diff
-import { MayoralPoolDisplay } from "@/components/mayoral-pool-display";
+import { VoterAlignmentDots } from "@/components/voter-alignment-dots";
```

And in JSX (line 45):
```diff
-          <MayoralPoolDisplay model={pollsData.pool_model} />
+          <VoterAlignmentDots model={pollsData.pool_model} />
```

- [ ] **Step 2: Verify in browser**

With dev server running, open `http://localhost:3000`.

**Check:**
1. The dot grid renders in the right-hand column next to the hero text
2. Pro-Chow zone (left): solid blue dots fill columns 1–8, hollow dashed blue fill columns 9–10
3. Anti-Chow zone (right): hollow dashed red dots appear nearest centre, solid red fill outward, right portion is empty
4. "50%" divider line is visually centred between the two zones
5. Not-yet-engaged grey dots appear below a dashed rule
6. Legend shows all 4 items with approximate voter counts
7. Zone labels say "Chow was better" (blue) and "Tory was better" (red)
8. Loading state renders gracefully if API is not running (shows "Loading…" panel)

- [ ] **Step 3: Check layout on mobile (320px) and tablet (768px)**

Open browser dev tools, toggle responsive mode. The component uses a fixed `378px` internal width — confirm it doesn't overflow on small screens. If it does, note it for a follow-up responsive pass (out of scope for this plan).

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/page.tsx
git commit -m "feat: swap MayoralPoolDisplay for VoterAlignmentDots on homepage"
```

---

## Self-Review

**Spec coverage:**
- [x] Dot grid: two 10×5 CSS grids with `grid-auto-flow: column`
- [x] Equal-width zones flanking centred "50%" line
- [x] Pro-Chow: floor (solid blue) + ceiling (hollow dashed blue), ceiling dots toward centre
- [x] Anti-Chow: available (hollow dashed red, nearest centre) + committed (solid red)
- [x] Anti-Chow right zone has empty trailing slots to show smaller pool visually
- [x] Not-yet-engaged grey dots below dashed rule with explanatory italic text
- [x] Zone labels: "Chow was better" (blue) and "Tory was better" (red)
- [x] 4-item legend with approximate voter counts (dots × 5K)
- [x] Broadsheet typography: Newsreader title, monospace labels, warm background
- [x] Data-driven from `pool_model.pool`, `pool_model.uncaptured_anti_chow`, `pool_model.approval.not_sure`
- [x] Graceful loading state when `model` is null

**Type consistency:**
- `computeDotCounts` returns `DotCounts` type imported from `@/lib/dot-counts`
- `VoterAlignmentDots` receives `model: PoolModel | null` — same prop shape as `MayoralPoolDisplay`
- `makeDots` uses `DotVariant` type defined in `voter-alignment-dots.tsx`
