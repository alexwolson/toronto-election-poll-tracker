# Site Redesign: Newspaper Editorial Style — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild all frontend pages with a newspaper editorial visual language matching the existing `VoterAlignmentDots` component.

**Architecture:** Full page rebuild — all page JSX and affected components rewritten. The data/API layer (`lib/api.ts`, `types/ward.ts`, `lib/dot-counts.ts`, `lib/vulnerability.ts`, `lib/ward-names.ts`) is completely untouched. `PollingChart` internals are untouched. New newspaper CSS classes added to `globals.css`.

**Tech Stack:** Next.js (app router), React, Tailwind CSS v4, IBM Plex Mono / Newsreader / Source Sans 3 (already installed as Google Fonts)

> ⚠️ **IMPORTANT:** Before writing any code, read `frontend/node_modules/next/dist/docs/` — this project uses a Next.js version with breaking changes from common training data. Heed all deprecation warnings.

---

## File Map

**Modified:**
- `frontend/src/app/globals.css` — add np-* classes, remove old classes, update CSS variables
- `frontend/src/app/layout.tsx` — newspaper masthead replacing sticky header
- `frontend/src/app/page.tsx` — homepage: dot hero + sidebar + teasers
- `frontend/src/components/voter-alignment-dots.tsx` — scale dots 14px→20px, remove fixed width
- `frontend/src/components/vulnerability-pill.tsx` — flat rectangular tag instead of pill
- `frontend/src/components/ward-card.tsx` — np-cell style replacing shadcn Card
- `frontend/src/components/wards-browser.tsx` — restyle mode buttons and all 3 view modes
- `frontend/src/app/wards/page.tsx` — section header + np-shell
- `frontend/src/app/wards/[ward_num]/page.tsx` — full rebuild with ruled rows
- `frontend/src/app/polls/page.tsx` — full rebuild

**Created:**
- `frontend/src/components/masthead-nav.tsx` — client component (needs `usePathname` for active state)

**Deleted:**
- `frontend/src/components/phase-banner.tsx` — folded into masthead

**Untouched:**
- `frontend/src/lib/api.ts`, `src/types/ward.ts`, `src/lib/dot-counts.ts`, `src/lib/vulnerability.ts`, `src/lib/ward-names.ts`
- `frontend/src/components/polling-chart.tsx`
- `frontend/src/components/ui/*`

---

## Task 1: Read Next.js docs + establish dev workflow

**Files:** none modified

- [ ] **Step 1: Check available Next.js docs**

```bash
ls frontend/node_modules/next/dist/docs/
```

Read whichever guides cover: App Router page conventions, server vs client components, font loading, and `usePathname`.

- [ ] **Step 2: Start dev server (in a separate terminal — keep it running)**

```bash
cd frontend && npm run dev
```

Open `http://localhost:3000` in a browser. Confirm the current site loads.

- [ ] **Step 3: Confirm backend is running**

```bash
curl http://localhost:8000/api/wards | head -c 200
```

Expected: JSON with a `wards` array. If the backend isn't running, start it per project README before continuing.

---

## Task 2: Design system CSS

**Files:**
- Modify: `frontend/src/app/globals.css`

- [ ] **Step 1: Update CSS variables in `:root`**

Replace the `:root` block with:

```css
:root {
  --background: #faf9f6;
  --foreground: oklch(0.24 0.03 248);
  --card: #faf9f6;
  --card-foreground: oklch(0.22 0.03 248);
  --popover: #faf9f6;
  --popover-foreground: oklch(0.22 0.03 248);
  --primary: oklch(0.42 0.08 255);
  --primary-foreground: oklch(0.98 0.01 90);
  --secondary: oklch(0.96 0.02 90);
  --secondary-foreground: oklch(0.3 0.04 248);
  --muted: oklch(0.952 0.018 90);
  --muted-foreground: oklch(0.48 0.03 250);
  --accent: oklch(0.74 0.12 77);
  --accent-foreground: oklch(0.24 0.04 248);
  --destructive: oklch(0.58 0.2 28);
  --border: #ccc;
  --input: #ccc;
  --ring: oklch(0.63 0.1 255);
  --chart-1: oklch(0.66 0.11 77);
  --chart-2: oklch(0.52 0.1 247);
  --chart-3: oklch(0.62 0.12 150);
  --chart-4: oklch(0.56 0.11 20);
  --chart-5: oklch(0.47 0.09 312);
  --radius: 0rem;
  --sidebar: #faf9f6;
  --sidebar-foreground: oklch(0.24 0.03 248);
  --sidebar-primary: oklch(0.42 0.08 255);
  --sidebar-primary-foreground: oklch(0.98 0.01 90);
  --sidebar-accent: oklch(0.75 0.12 77);
  --sidebar-accent-foreground: oklch(0.24 0.03 248);
  --sidebar-border: #ccc;
  --sidebar-ring: oklch(0.63 0.1 255);
  --line-soft: #ccc;
  --line-strong: #1a1a1a;
  --panel: #faf9f6;
  --glass: #faf9f6;
}
```

- [ ] **Step 2: Update `@layer base` body styles**

Replace the body rule inside `@layer base`:

```css
@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    background: #faf9f6;
    color: oklch(0.24 0.03 248);
    min-height: 100vh;
  }
  html {
    @apply font-sans;
  }
  h1, h2, h3, .font-heading {
    font-family: var(--font-newsreader), serif;
    letter-spacing: -0.01em;
  }
}
```

- [ ] **Step 3: Remove old utility classes**

Delete the entire blocks for: `.brand-mark`, `.nav-pill`, `.civic-shell`, `.hero-kicker`, `.surface-panel`, `.stat-chip`. Keep `.site-bg` (the grid overlay stays).

- [ ] **Step 4: Add newspaper utility classes at end of file**

```css
/* ── Newspaper design system ─────────────────────────────── */

.np-shell {
  width: 100%;
  max-width: 72rem;
  margin: 0 auto;
  padding: 2rem 1.25rem 3rem;
}

@media (min-width: 768px) {
  .np-shell {
    padding: 2.5rem 2rem 4rem;
  }
}

.np-kicker {
  font-family: var(--font-ibm-mono), monospace;
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: #888;
}

.np-rule {
  border: none;
  border-top: 2px solid #1a1a1a;
  margin: 0;
}

.np-rule-thin {
  border: none;
  border-top: 1px solid #ccc;
  margin: 0;
}

.np-cell {
  border-right: 1px solid #ccc;
  border-bottom: 1px solid #ccc;
  padding: 0.55rem 0.65rem;
  background: #faf9f6;
  transition: background 0.1s;
}

.np-cell:hover {
  background: #f0ede8;
}

.np-tag {
  display: inline-block;
  font-family: var(--font-ibm-mono), monospace;
  font-size: 0.52rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 0.1rem 0.35rem;
  border: 1px solid currentColor;
  border-radius: 0;
  line-height: 1.4;
}

.np-ward-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  border-left: 1px solid #ccc;
  border-top: 1px solid #ccc;
}

@media (min-width: 640px) {
  .np-ward-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (min-width: 1024px) {
  .np-ward-grid {
    grid-template-columns: repeat(5, 1fr);
  }
}

.np-section-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  padding-bottom: 0.5rem;
  margin-bottom: 0;
}

.np-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8rem;
}

.np-table th {
  font-family: var(--font-ibm-mono), monospace;
  font-size: 0.58rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  background: #f0ede8;
  border-bottom: 1px solid #ccc;
  padding: 0.5rem 0.75rem;
  text-align: left;
  font-weight: 600;
}

.np-table td {
  padding: 0.45rem 0.75rem;
  border-bottom: 1px solid #ccc;
  vertical-align: top;
}

.np-table tr:hover td {
  background: #f0ede8;
}

.np-table tr:last-child td {
  border-bottom: none;
}
```

- [ ] **Step 5: Verify the site still loads without layout errors**

Check `http://localhost:3000` in the browser. Expect: the existing layout with updated variable values (slight color shifts, no visual breakage).

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/globals.css
git commit -m "style: add newspaper design system CSS, remove old utility classes"
```

---

## Task 3: Masthead nav

**Files:**
- Create: `frontend/src/components/masthead-nav.tsx`
- Modify: `frontend/src/app/layout.tsx`
- Delete: `frontend/src/components/phase-banner.tsx`

- [ ] **Step 1: Create `masthead-nav.tsx` (client component)**

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/wards", label: "Wards" },
  { href: "/polls", label: "Polls" },
];

export function MastheadNav() {
  const pathname = usePathname();

  return (
    <nav style={{ borderTop: "2px solid #1a1a1a", display: "flex" }}>
      {NAV_LINKS.map((link, i) => {
        const active =
          link.href === "/"
            ? pathname === "/"
            : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            style={{
              fontFamily: "var(--font-ibm-mono), monospace",
              fontSize: "0.68rem",
              fontWeight: 600,
              textTransform: "uppercase" as const,
              letterSpacing: "0.1em",
              padding: "0.55rem 1.5rem",
              borderRight:
                i < NAV_LINKS.length - 1 ? "1px solid #ccc" : "none",
              background: active ? "#1a1a1a" : "transparent",
              color: active ? "#fff" : "#333",
              textDecoration: "none",
              display: "block",
            }}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 2: Rewrite `layout.tsx`**

```tsx
import type { Metadata } from "next";
import { Newsreader, Source_Sans_3, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { MastheadNav } from "@/components/masthead-nav";
import { getWards } from "@/lib/api";

const sourceSans = Source_Sans_3({
  variable: "--font-source-sans",
  subsets: ["latin"],
});

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const ibmMono = IBM_Plex_Mono({
  variable: "--font-ibm-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Toronto 2026 Elections",
  description: "Ward-level council race projections and mayoral polling",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const data = await getWards();
  const phase = data.phase;

  const monthYear = new Date()
    .toLocaleDateString("en-CA", { month: "long", year: "numeric" })
    .toUpperCase();

  return (
    <html
      lang="en"
      className={`${sourceSans.variable} ${newsreader.variable} ${ibmMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <div className="site-bg" aria-hidden="true" />
        <header style={{ borderBottom: "1px solid #ccc" }}>
          <div
            style={{
              textAlign: "center",
              padding: "0.9rem 1rem 0.6rem",
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-newsreader), serif",
                fontSize: "clamp(1.1rem, 2.5vw, 1.9rem)",
                fontWeight: 700,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                color: "#1a1a1a",
                lineHeight: 1,
              }}
            >
              Toronto Civic Pulse
            </div>
            <div
              style={{
                fontFamily: "var(--font-ibm-mono), monospace",
                fontSize: "0.58rem",
                color: "#888",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                marginTop: "0.3rem",
              }}
            >
              Municipal Projection Desk · {monthYear} · {phase.label.toUpperCase()}
            </div>
          </div>
          <MastheadNav />
        </header>
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Delete `phase-banner.tsx`**

```bash
rm frontend/src/components/phase-banner.tsx
```

- [ ] **Step 4: Check for any remaining imports of PhaseBanner**

```bash
grep -r "PhaseBanner\|phase-banner" frontend/src/
```

Expected: no results. If any found, remove those imports.

- [ ] **Step 5: Check the site loads with the masthead**

Visit `http://localhost:3000`. Expect: centered "TORONTO CIVIC PULSE" brand name, mono sub-line with month/year/phase, nav bar with HOME | WARDS | POLLS, active page highlighted in black.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/masthead-nav.tsx frontend/src/app/layout.tsx
git rm frontend/src/components/phase-banner.tsx
git commit -m "feat: newspaper masthead replaces sticky header, fold phase info inline"
```

---

## Task 4: Scale VoterAlignmentDots

**Files:**
- Modify: `frontend/src/components/voter-alignment-dots.tsx`

The dot size changes from 14px → 20px, gap 3px → 4px throughout. The fixed `w-[378px]` constraints are removed. The divider column height updates from 82px (5×14 + 4×3) to 116px (5×20 + 4×4).

- [ ] **Step 1: Update dot size and grid styles**

Replace the `Dot` component and both grid style constants:

```tsx
function Dot({ variant }: { variant: DotVariant }) {
  const base = "block rounded-full box-border flex-shrink-0";
  const size = "w-[20px] h-[20px]";
  return <span className={`${base} ${size} ${VARIANT_CLASSES[variant]}`} />;
}

const GRID_STYLE: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(10, 20px)",
  gridTemplateRows: "repeat(5, 20px)",
  gap: "4px",
  gridAutoFlow: "column",
  flexShrink: 0,
};

const DISENGAGED_GRID_STYLE: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(10, 20px)",
  gridTemplateRows: "repeat(2, 20px)",
  gap: "4px",
  gridAutoFlow: "column",
};
```

- [ ] **Step 2: Update `LegendItem` dot size**

In `LegendItem`, change `w-[11px] h-[11px]` to `w-[14px] h-[14px]`:

```tsx
function LegendItem({ variant, label, count, description }: {
  variant: DotVariant;
  label: string;
  count: number;
  description: string;
}) {
  const size = "w-[14px] h-[14px]";
  const base = "inline-block rounded-full flex-shrink-0 mt-[1px] box-border";
  const approxK = count * 5;
  return (
    <div className="flex items-start gap-[8px]">
      <span className={`${base} ${size} ${VARIANT_CLASSES[variant]}`} />
      <span className="font-mono text-[7px] text-[#444] leading-[1.4]">
        <strong>{label}</strong> — ~{approxK}K
        <br />
        <em className="text-[#999] font-[family-name:var(--font-newsreader)]">{description}</em>
      </span>
    </div>
  );
}
```

- [ ] **Step 3: Update the main `VoterAlignmentDots` return — remove fixed widths, update divider height**

Replace the entire return statement inside `VoterAlignmentDots`:

```tsx
return (
  <div className="p-6 md:p-8">
    {/* Kicker */}
    <p className="font-mono text-[7px] uppercase tracking-[0.12em] text-[#c53030] font-semibold mb-[4px]">
      Mayoral Race · Voter Alignment · Pre-nomination
    </p>

    {/* Title row */}
    <div className="flex justify-between items-baseline border-b-2 border-[#1a1a1a] pb-[8px] mb-[20px]">
      <div className="font-heading text-[22px] font-bold text-[#1a1a1a]">
        Where Toronto voters sit
      </div>
      <div className="font-mono text-[7px] italic text-[#888]">
        Each dot ≈ 5,000 voters
      </div>
    </div>

    {/* Zone labels */}
    <div className="flex mb-[8px] items-end gap-0">
      <div style={{ flex: "0 0 calc(10 * 20px + 9 * 4px)" }}>
        <div className="font-mono text-[7px] font-bold text-[#2563eb] uppercase tracking-[0.08em] mb-[2px]">
          "Chow was better"
        </div>
        <div className="font-mono text-[6.5px] text-[#888]">~250K · pro-Chow bloc</div>
      </div>
      <div style={{ width: "52px" }} />
      <div style={{ flex: "0 0 calc(10 * 20px + 9 * 4px)" }}>
        <div className="font-mono text-[7px] font-bold text-[#c53030] uppercase tracking-[0.08em] mb-[2px]">
          "Tory was better"
        </div>
        <div className="font-mono text-[6.5px] text-[#888]">~150K active · Bradford base</div>
      </div>
    </div>

    {/* Main dot row */}
    <div className="flex items-start mb-[8px]">
      {/* Pro-Chow grid */}
      <div style={GRID_STYLE}>
        {makeDots(chowFloor, "chow-floor")}
        {makeDots(chowCeiling, "chow-ceiling")}
      </div>

      {/* 50% divider: h = 5 rows × 20px + 4 gaps × 4px = 116px */}
      <div className="flex-shrink-0 relative" style={{ width: "52px", height: "116px" }}>
        <div className="absolute left-1/2 top-0 bottom-0 w-[1.5px] bg-[#1a1a1a] -translate-x-1/2" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#faf9f6] px-[4px] py-[2px]">
          <div className="font-mono text-[7px] font-bold text-[#1a1a1a] whitespace-nowrap">
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
    <div className="mt-[18px]">
      <div className="border-t border-dashed border-[#bbb] pt-[12px] flex items-start gap-[20px]">
        <div>
          <div className="font-mono text-[7px] text-[#999] font-semibold uppercase tracking-[0.08em] mb-[8px] whitespace-nowrap">
            Not yet engaged · ~100K
          </div>
          <div style={DISENGAGED_GRID_STYLE}>
            {makeDots(notEngaged, "disengaged")}
          </div>
        </div>
        <div className="pt-[2px] font-[family-name:var(--font-newsreader)] text-[7px] text-[#999] leading-[1.55] italic max-w-[220px]">
          Hasn't formed a strong view on Chow. Not currently part of the active
          contest — how they break will depend on the campaign.
        </div>
      </div>
    </div>

    {/* Legend */}
    <div className="border-t border-[#ccc] pt-[12px] mt-[18px] grid grid-cols-2 gap-x-[24px] gap-y-[7px]">
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
        description="Behind Bradford"
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
```

- [ ] **Step 4: Remove the `null` guard wrapper's old padding**

The `null` fallback branch at the top of `VoterAlignmentDots` also has `p-6 md:p-8`. Remove that class — padding now comes from the wrapper above.

```tsx
if (!model) {
  return (
    <div>
      <p className="font-mono text-[0.72rem] uppercase tracking-[0.16em] text-muted-foreground">
        Mayoral Race
      </p>
      <p className="mt-4 text-sm text-muted-foreground">Loading…</p>
    </div>
  );
}
```

- [ ] **Step 5: Check homepage loads without layout issues**

Visit `http://localhost:3000`. The dots section will be off-layout until the homepage is rebuilt in Task 5, but the component itself should render without errors.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/voter-alignment-dots.tsx
git commit -m "style: scale voter alignment dots to 20px, remove fixed width constraints"
```

---

## Task 5: Rebuild homepage

**Files:**
- Modify: `frontend/src/app/page.tsx`

- [ ] **Step 1: Rewrite `app/page.tsx` with two zones**

```tsx
import Link from "next/link";
import { getWards, getPollingAverages } from "@/lib/api";
import { VoterAlignmentDots } from "@/components/voter-alignment-dots";

export default async function Home() {
  const [wardsData, pollsData] = await Promise.all([
    getWards(),
    getPollingAverages(),
  ]);

  const competitiveCount = wardsData.wards.filter(
    (w) => w.race_class === "competitive"
  ).length;
  const openCount = wardsData.wards.filter(
    (w) => w.race_class === "open"
  ).length;

  return (
    <main className="np-shell">
      {/* Zone 1: Hero — dots + sidebar */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 200px",
          border: "1px solid #ccc",
          borderTop: "2px solid #1a1a1a",
          marginBottom: "0",
        }}
      >
        {/* Main column: voter alignment dots */}
        <div style={{ borderRight: "1px solid #ccc" }}>
          <VoterAlignmentDots model={pollsData.pool_model} />
        </div>

        {/* Sidebar: stats */}
        <div style={{ padding: "1.5rem 1rem" }}>
          <div
            style={{
              fontFamily: "var(--font-ibm-mono), monospace",
              fontSize: "0.58rem",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "#888",
              marginBottom: "0.75rem",
            }}
          >
            At a glance
          </div>

          {[
            { label: "Total wards", value: 25 },
            { label: "Competitive", value: competitiveCount },
            { label: "Open seats", value: openCount },
            { label: "Polls tracked", value: pollsData.total_polls_available },
          ].map((stat, i, arr) => (
            <div
              key={stat.label}
              style={{
                paddingBottom: "0.65rem",
                marginBottom: "0.65rem",
                borderBottom: i < arr.length - 1 ? "1px solid #e0ddd8" : "none",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-ibm-mono), monospace",
                  fontSize: "0.55rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "#aaa",
                  marginBottom: "0.2rem",
                }}
              >
                {stat.label}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-newsreader), serif",
                  fontSize: "1.4rem",
                  fontWeight: 700,
                  color: "#1a1a1a",
                  lineHeight: 1,
                }}
              >
                {stat.value}
              </div>
            </div>
          ))}

          <p
            style={{
              fontFamily: "var(--font-newsreader), serif",
              fontSize: "0.7rem",
              color: "#999",
              fontStyle: "italic",
              lineHeight: 1.5,
              marginTop: "0.75rem",
            }}
          >
            Tracking the Toronto 2026 mayoral race and ward-level council
            dynamics. Nominations open May 1.
          </p>
        </div>
      </div>

      {/* Zone 2: Section teasers */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          borderLeft: "1px solid #ccc",
          borderBottom: "1px solid #ccc",
          marginTop: "2rem",
          borderTop: "2px solid #1a1a1a",
        }}
      >
        <Link
          href="/wards"
          style={{
            display: "block",
            padding: "1rem 1.25rem",
            borderRight: "1px solid #ccc",
            textDecoration: "none",
          }}
        >
          <div className="np-kicker" style={{ marginBottom: "0.4rem" }}>
            Council
          </div>
          <div
            style={{
              fontFamily: "var(--font-newsreader), serif",
              fontSize: "0.95rem",
              fontWeight: 600,
              color: "#1a1a1a",
              marginBottom: "0.5rem",
            }}
          >
            Ward-by-ward race projections
          </div>
          <div
            style={{
              fontFamily: "var(--font-ibm-mono), monospace",
              fontSize: "0.65rem",
              color: "#aaa",
            }}
          >
            →
          </div>
        </Link>

        <Link
          href="/polls"
          style={{
            display: "block",
            padding: "1rem 1.25rem",
            borderRight: "1px solid #ccc",
            textDecoration: "none",
          }}
        >
          <div className="np-kicker" style={{ marginBottom: "0.4rem" }}>
            Polling
          </div>
          <div
            style={{
              fontFamily: "var(--font-newsreader), serif",
              fontSize: "0.95rem",
              fontWeight: 600,
              color: "#1a1a1a",
              marginBottom: "0.5rem",
            }}
          >
            Mayoral poll tracker
          </div>
          <div
            style={{
              fontFamily: "var(--font-ibm-mono), monospace",
              fontSize: "0.65rem",
              color: "#aaa",
            }}
          >
            →
          </div>
        </Link>

        <div
          style={{
            padding: "1rem 1.25rem",
            borderRight: "1px solid #ccc",
          }}
        >
          <div className="np-kicker" style={{ marginBottom: "0.4rem" }}>
            Model
          </div>
          <div
            style={{
              fontFamily: "var(--font-newsreader), serif",
              fontSize: "0.95rem",
              fontWeight: 600,
              color: "#1a1a1a",
              marginBottom: "0.5rem",
            }}
          >
            Pre-nomination phase
          </div>
          <div
            style={{
              fontFamily: "var(--font-ibm-mono), monospace",
              fontSize: "0.65rem",
              color: "#999",
              fontStyle: "italic",
            }}
          >
            Structural factors only — field not yet set
          </div>
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Check homepage in browser**

Visit `http://localhost:3000`. Expect: voter alignment dots filling the left column at larger size, sidebar with stat blocks on the right, three teaser columns below.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/page.tsx
git commit -m "feat: rebuild homepage — voter alignment hero with sidebar and section teasers"
```

---

## Task 6: VulnerabilityTag component

**Files:**
- Modify: `frontend/src/components/vulnerability-pill.tsx`

The existing component is renamed conceptually but the file path stays the same to avoid changing all imports.

- [ ] **Step 1: Rewrite `vulnerability-pill.tsx`**

```tsx
import { VulnerabilityBand } from "@/lib/vulnerability";

interface VulnerabilityPillProps {
  band: VulnerabilityBand;
}

const BAND_STYLE: Record<VulnerabilityBand, { color: string }> = {
  low: { color: "#166534" },
  medium: { color: "#92400e" },
  high: { color: "#9b1c1c" },
};

const BAND_ARROW: Record<VulnerabilityBand, string> = {
  low: "↓",
  medium: "—",
  high: "↑",
};

export function VulnerabilityPill({ band }: VulnerabilityPillProps) {
  const { color } = BAND_STYLE[band];
  return (
    <span
      className="np-tag"
      style={{ color, borderColor: color }}
    >
      {BAND_ARROW[band]} {band} vulnerability
    </span>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/vulnerability-pill.tsx
git commit -m "style: replace vulnerability pill with flat rectangular np-tag"
```

---

## Task 7: WardCard newspaper cell

**Files:**
- Modify: `frontend/src/components/ward-card.tsx`

- [ ] **Step 1: Rewrite `ward-card.tsx`**

```tsx
import Link from "next/link";
import { Ward } from "@/types/ward";
import { getVulnerabilityBand } from "@/lib/vulnerability";
import { VulnerabilityPill } from "@/components/vulnerability-pill";
import { getWardDisplayName } from "@/lib/ward-names";

interface WardCardProps {
  ward: Ward;
}

const TOP_BORDER: Record<string, string> = {
  competitive: "2px solid #c53030",
  open: "2px solid #d97706",
  safe: "1px solid #ccc",
};

const TAG_STYLE: Record<string, { color: string }> = {
  competitive: { color: "#9b1c1c" },
  open: { color: "#92400e" },
};

export function WardCard({ ward }: WardCardProps) {
  const raceLabel =
    ward.race_class === "open"
      ? "Open seat"
      : ward.race_class === "competitive"
      ? "Competitive"
      : "";
  const vulnerabilityBand = getVulnerabilityBand(ward.defeatability_score);
  const titleName = ward.is_running ? ward.councillor_name : "Open seat";
  const wardLabel = getWardDisplayName(ward.ward);
  const wardNum = String(ward.ward).padStart(2, "0");

  return (
    <Link href={`/wards/${ward.ward}`} style={{ display: "block", textDecoration: "none" }}>
      <div
        className="np-cell"
        style={{ borderTop: TOP_BORDER[ward.race_class] ?? "1px solid #ccc" }}
      >
        <div
          style={{
            fontFamily: "var(--font-ibm-mono), monospace",
            fontSize: "0.55rem",
            color: "#aaa",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            marginBottom: "0.2rem",
          }}
        >
          Ward {wardNum}
        </div>
        <div
          style={{
            fontFamily: "var(--font-newsreader), serif",
            fontSize: "0.88rem",
            fontWeight: 700,
            color: "#1a1a1a",
            lineHeight: 1.2,
            marginBottom: "0.25rem",
          }}
        >
          {wardLabel}
        </div>
        <div
          style={{
            fontFamily: "var(--font-ibm-mono), monospace",
            fontSize: "0.6rem",
            color: "#555",
            marginBottom: "0.45rem",
          }}
        >
          {titleName}
          {ward.is_byelection_incumbent && (
            <span style={{ color: "#aaa" }}> · By-elec.</span>
          )}
        </div>
        <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
          {ward.race_class !== "safe" && (
            <span
              className="np-tag"
              style={TAG_STYLE[ward.race_class]}
            >
              {raceLabel}
            </span>
          )}
          <VulnerabilityPill band={vulnerabilityBand} />
        </div>
      </div>
    </Link>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/ward-card.tsx
git commit -m "style: replace WardCard shadcn Card with newspaper np-cell"
```

---

## Task 8: Wards page + WardsBrowser restyle

**Files:**
- Modify: `frontend/src/app/wards/page.tsx`
- Modify: `frontend/src/components/wards-browser.tsx`

- [ ] **Step 1: Rewrite `wards/page.tsx`**

```tsx
import { getWards } from "@/lib/api";
import { WardsBrowser } from "@/components/wards-browser";

export default async function WardsPage() {
  const data = await getWards();
  const wards = data.wards || [];
  const safeCount = wards.filter((w) => w.race_class === "safe").length;
  const competitiveCount = wards.filter(
    (w) => w.race_class === "competitive"
  ).length;
  const openCount = wards.filter((w) => w.race_class === "open").length;

  return (
    <main className="np-shell">
      {/* Section header */}
      <div style={{ marginBottom: "0" }}>
        <div className="np-kicker" style={{ marginBottom: "0.3rem" }}>
          Ward monitor
        </div>
        <div className="np-section-header">
          <h1
            style={{
              fontFamily: "var(--font-newsreader), serif",
              fontSize: "clamp(1.8rem, 4vw, 2.8rem)",
              fontWeight: 700,
              margin: 0,
              letterSpacing: "-0.01em",
              color: "#1a1a1a",
            }}
          >
            All Wards
          </h1>
          <div
            style={{
              display: "flex",
              gap: "1.5rem",
              fontFamily: "var(--font-ibm-mono), monospace",
              fontSize: "0.7rem",
              color: "#555",
              paddingBottom: "0.25rem",
            }}
          >
            <span>
              <span style={{ fontWeight: 700, color: "#1a1a1a" }}>
                {safeCount}
              </span>{" "}
              safe
            </span>
            <span>
              <span style={{ fontWeight: 700, color: "#9b1c1c" }}>
                {competitiveCount}
              </span>{" "}
              competitive
            </span>
            <span>
              <span style={{ fontWeight: 700, color: "#92400e" }}>
                {openCount}
              </span>{" "}
              open
            </span>
          </div>
        </div>
        <hr className="np-rule" style={{ marginBottom: "1.5rem" }} />
      </div>

      <WardsBrowser wards={wards} />
    </main>
  );
}
```

- [ ] **Step 2: Restyle mode buttons and grid view in `wards-browser.tsx`**

Replace the mode button bar and the grid mode `<div>`:

```tsx
{/* Mode button bar — replace existing <div className="flex flex-wrap..."> */}
<div style={{ display: "flex", borderBottom: "1px solid #ccc", marginBottom: "1rem" }}>
  {(["grid", "map", "columns"] as ViewMode[]).map((m) => (
    <button
      key={m}
      onClick={() => setMode(m)}
      style={{
        fontFamily: "var(--font-ibm-mono), monospace",
        fontSize: "0.62rem",
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        padding: "0.4rem 1rem",
        borderRight: "1px solid #ccc",
        background: mode === m ? "#1a1a1a" : "transparent",
        color: mode === m ? "#fff" : "#555",
        borderTop: "none",
        borderLeft: "none",
        borderBottom: "none",
        borderRight: "1px solid #ccc",
        cursor: "pointer",
      }}
    >
      {m === "grid" ? "Grid" : m === "map" ? "Map" : "Vulnerability"}
    </button>
  ))}
</div>
```

Replace the grid mode JSX:
```tsx
{mode === "grid" && (
  <div className="np-ward-grid">
    {wards.map((ward) => (
      <WardCard key={ward.ward} ward={ward} />
    ))}
  </div>
)}
```

- [ ] **Step 3: Restyle map mode container in `wards-browser.tsx`**

Replace `<div className="surface-panel p-3 md:p-4">` with:

```tsx
<div style={{ border: "1px solid #ccc", padding: "0.75rem" }}>
```

Replace the SVG class attribute `className="w-full h-auto rounded-lg border border-[var(--line-soft)] bg-[color:var(--secondary)]/40"` with:

```tsx
className="w-full h-auto"
style={{ border: "1px solid #ccc" }}
```

Replace the legend `<div className="mt-3 flex flex-wrap gap-3 text-xs font-mono uppercase tracking-wider text-muted-foreground">` with:

```tsx
<div style={{ marginTop: "0.75rem", display: "flex", flexWrap: "wrap", gap: "0.75rem", fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "#555" }}>
```

Replace the band legend swatch `<span className="size-3 rounded-sm border" ...>` with:

```tsx
<span style={{ display: "inline-block", width: "12px", height: "12px", backgroundColor: BAND_COLORS[band], border: `1px solid ${BAND_STROKES[band]}` }} />
```

- [ ] **Step 4: Restyle columns view in `wards-browser.tsx`**

Replace:
```tsx
{mode === "columns" && (
  <div className="grid gap-4 lg:grid-cols-3">
    {BAND_ORDER.map((band) => (
      <div key={band} className="surface-panel p-4">
        <div className="flex items-center justify-between border-b border-[var(--line-soft)] pb-2">
          <p className="font-heading text-2xl">{BAND_LABELS[band]}</p>
          <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            {wardsByBand[band].length}
          </span>
        </div>
        <div className="mt-3 space-y-2">
          {wardsByBand[band].map((ward) => (
            <Link
              key={ward.ward}
              href={`/wards/${ward.ward}`}
              className="block rounded-lg border border-[var(--line-soft)] bg-[color:var(--secondary)]/35 px-3 py-2 transition-colors hover:bg-[color:var(--secondary)]/70"
            >
              <div className="flex items-baseline justify-between gap-2">
                <p className="font-medium">{getWardDisplayName(ward.ward)}</p>
                <span className="font-mono text-xs text-muted-foreground">{ward.defeatability_score.toFixed(0)}</span>
              </div>
              <p className="text-sm text-muted-foreground leading-tight">
                {ward.is_running ? ward.councillor_name : "Open seat"}
              </p>
            </Link>
          ))}
        </div>
      </div>
    ))}
  </div>
)}
```

With:
```tsx
{mode === "columns" && (
  <div style={{ display: "grid", gap: "0", gridTemplateColumns: "repeat(3, 1fr)", border: "1px solid #ccc", borderRight: "none" }}>
    {BAND_ORDER.map((band) => (
      <div key={band} style={{ borderRight: "1px solid #ccc", padding: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", borderBottom: "1px solid #ccc", paddingBottom: "0.5rem", marginBottom: "0.75rem" }}>
          <span style={{ fontFamily: "var(--font-newsreader), serif", fontSize: "1.1rem", fontWeight: 700, color: "#1a1a1a" }}>
            {BAND_LABELS[band]}
          </span>
          <span style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.6rem", color: "#888", textTransform: "uppercase" }}>
            {wardsByBand[band].length}
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
          {wardsByBand[band].map((ward) => (
            <Link
              key={ward.ward}
              href={`/wards/${ward.ward}`}
              style={{ display: "block", padding: "0.4rem 0.5rem", borderBottom: "1px solid #e8e5e0", textDecoration: "none" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "0.5rem" }}>
                <span style={{ fontFamily: "var(--font-newsreader), serif", fontSize: "0.82rem", fontWeight: 600, color: "#1a1a1a" }}>
                  {getWardDisplayName(ward.ward)}
                </span>
              </div>
              <div style={{ fontFamily: "var(--font-ibm-mono), monospace", fontSize: "0.58rem", color: "#888", marginTop: "0.1rem" }}>
                {ward.is_running ? ward.councillor_name : "Open seat"}
              </div>
            </Link>
          ))}
        </div>
      </div>
    ))}
  </div>
)}
```

- [ ] **Step 5: Remove unused Button import from `wards-browser.tsx`**

Delete the line:
```tsx
import { Button } from "@/components/ui/button";
```

- [ ] **Step 6: Check wards page in browser**

Visit `http://localhost:3000/wards`. Expect: newspaper masthead, kicker + "All Wards" h1 + counts, flat 5-column ward grid with red/amber top rules on competitive/open wards.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/app/wards/page.tsx frontend/src/components/wards-browser.tsx
git commit -m "feat: rebuild wards page and browser with newspaper grid style"
```

---

## Task 9: Ward detail page

**Files:**
- Modify: `frontend/src/app/wards/[ward_num]/page.tsx`

- [ ] **Step 1: Rewrite `wards/[ward_num]/page.tsx`**

```tsx
import { getWard } from "@/lib/api";
import { Challenger } from "@/types/ward";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getVulnerabilityBand,
  getVulnerabilitySignals,
} from "@/lib/vulnerability";
import { VulnerabilityPill } from "@/components/vulnerability-pill";
import { getWardDisplayName } from "@/lib/ward-names";

interface Props {
  params: Promise<{ ward_num: string }>;
}

// All three factors: negative value = increases risk, non-negative = reduces risk.
// (vuln < 0, coat < 0, chal < 0 are all red in the existing colour logic.)
function factorDirection(value: number): { label: string; color: string } {
  return value < 0
    ? { label: "↑ increases risk", color: "#c53030" }
    : { label: "↓ reduces risk", color: "#15803d" };
}

const MONO: React.CSSProperties = {
  fontFamily: "var(--font-ibm-mono), monospace",
};

const SERIF: React.CSSProperties = {
  fontFamily: "var(--font-newsreader), serif",
};

export default async function WardDetailPage({ params }: Props) {
  const { ward_num } = await params;
  const wardNum = parseInt(ward_num, 10);

  if (isNaN(wardNum) || wardNum < 1 || wardNum > 25) {
    notFound();
  }

  const data = await getWard(wardNum);
  if (data.error === "not_found") {
    notFound();
  }

  if (!data.ward) {
    return (
      <main className="np-shell" style={{ maxWidth: "48rem" }}>
        <Link
          href="/wards"
          style={{ ...MONO, fontSize: "0.65rem", color: "#888", textTransform: "uppercase", letterSpacing: "0.08em", textDecoration: "none", display: "inline-block", marginBottom: "1.5rem" }}
        >
          ← All Wards
        </Link>
        <h1 style={{ ...SERIF, fontSize: "2rem", fontWeight: 700, color: "#1a1a1a", marginBottom: "1rem" }}>
          Ward {wardNum}
        </h1>
        <div style={{ border: "1px solid #ccc", padding: "1rem" }}>
          <p style={{ fontWeight: 600 }}>Ward data is temporarily unavailable.</p>
          <p style={{ ...MONO, fontSize: "0.65rem", color: "#888", marginTop: "0.5rem" }}>
            The backend API might be down. Please try again shortly.
          </p>
        </div>
      </main>
    );
  }

  const { ward, challengers } = data;
  const vulnerabilityBand = getVulnerabilityBand(ward.defeatability_score);
  const vulnerabilitySignals = getVulnerabilitySignals(ward);
  const displayName = ward.is_running ? ward.councillor_name : "Open seat";
  const wardLabel = getWardDisplayName(ward.ward);

  const signalArrow = (direction: "up" | "down" | "flat") =>
    direction === "up" ? "↑" : direction === "down" ? "↓" : "→";
  const signalColor = (direction: "up" | "down" | "flat") =>
    direction === "up"
      ? "#c53030"
      : direction === "down"
      ? "#15803d"
      : "#92400e";

  return (
    <main className="np-shell" style={{ maxWidth: "52rem" }}>
      {/* Breadcrumb */}
      <Link
        href="/wards"
        style={{
          ...MONO,
          fontSize: "0.62rem",
          color: "#888",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          textDecoration: "none",
          display: "inline-block",
          marginBottom: "1.5rem",
          padding: "0.2rem 0.4rem",
        }}
        onMouseEnter={(e) => {
          (e.target as HTMLElement).style.background = "#f0ede8";
        }}
        onMouseLeave={(e) => {
          (e.target as HTMLElement).style.background = "transparent";
        }}
      >
        ← All Wards
      </Link>

      {/* Header */}
      <div className="np-kicker" style={{ marginBottom: "0.3rem" }}>
        Ward profile
      </div>
      <h1
        style={{
          ...SERIF,
          fontSize: "clamp(1.6rem, 4vw, 2.5rem)",
          fontWeight: 700,
          color: "#1a1a1a",
          margin: "0 0 0.25rem 0",
          letterSpacing: "-0.01em",
        }}
      >
        {wardLabel}
      </h1>
      <p
        style={{
          ...MONO,
          fontSize: "0.72rem",
          color: "#555",
          marginBottom: "0.75rem",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
        }}
      >
        {displayName}
        {ward.is_running && ward.is_byelection_incumbent && (
          <span style={{ color: "#aaa" }}> · By-election incumbent</span>
        )}
      </p>
      <hr className="np-rule" />

      {/* Race class + vulnerability */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          border: "1px solid #ccc",
          borderTop: "none",
          marginBottom: "2rem",
        }}
      >
        <div
          style={{
            padding: "0.75rem 1rem",
            borderRight: "1px solid #ccc",
          }}
        >
          <div className="np-kicker" style={{ marginBottom: "0.4rem" }}>
            Race class
          </div>
          <span
            style={{
              ...MONO,
              fontSize: "0.75rem",
              fontWeight: 600,
              color: "#1a1a1a",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            {ward.race_class}
          </span>
        </div>
        <div style={{ padding: "0.75rem 1rem" }}>
          <div className="np-kicker" style={{ marginBottom: "0.4rem" }}>
            Vulnerability
          </div>
          <VulnerabilityPill band={vulnerabilityBand} />
        </div>
      </div>

      {/* Vulnerability signals */}
      {ward.ward !== 19 && (
        <section style={{ marginBottom: "2rem" }}>
          <div className="np-kicker" style={{ marginBottom: "0.4rem" }}>
            Vulnerability signals
          </div>
          <hr className="np-rule" />
          <table className="np-table">
            <tbody>
              {vulnerabilitySignals.map((signal) => (
                <tr key={signal.id}>
                  <td>
                    <span
                      style={{
                        ...SERIF,
                        fontSize: "0.88rem",
                        fontWeight: 600,
                        color: "#1a1a1a",
                        display: "block",
                      }}
                    >
                      {signal.label}
                    </span>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        color: "#888",
                        display: "block",
                        marginTop: "0.1rem",
                      }}
                    >
                      {signal.summary}
                    </span>
                  </td>
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    <span style={{ ...MONO, fontSize: "0.72rem", color: "#333", marginRight: "0.5rem" }}>
                      {signal.valueLabel}
                    </span>
                    <span
                      style={{
                        ...MONO,
                        fontSize: "0.85rem",
                        color: signalColor(signal.direction),
                      }}
                    >
                      {signalArrow(signal.direction)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* Model factors */}
      {ward.is_running && (
        <section style={{ marginBottom: "2rem" }}>
          <div className="np-kicker" style={{ marginBottom: "0.4rem" }}>
            Model factors
          </div>
          <hr className="np-rule" />
          <table className="np-table">
            <tbody>
              {[
                { label: "Vulnerability effect", dir: factorDirection(ward.factors.vuln) },
                { label: "Coattail effect", dir: factorDirection(ward.factors.coat) },
                { label: "Challenger effect", dir: factorDirection(ward.factors.chal) },
              ].map(({ label, dir }) => (
                <tr key={label}>
                  <td>
                    <span style={{ ...SERIF, fontSize: "0.88rem", fontWeight: 600, color: "#1a1a1a" }}>
                      {label}
                    </span>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <span style={{ ...MONO, fontSize: "0.72rem", color: dir.color }}>
                      {dir.label}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* Challengers */}
      <section>
        <div className="np-kicker" style={{ marginBottom: "0.4rem" }}>
          Challengers{" "}
          <span style={{ color: "#bbb" }}>({challengers.length})</span>
        </div>
        <hr className="np-rule" />
        {challengers.length === 0 ? (
          <p style={{ ...MONO, fontSize: "0.65rem", color: "#999", padding: "0.75rem 0", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            No challenger data entered yet.
          </p>
        ) : (
          <table className="np-table">
            <tbody>
              {challengers.map((c: Challenger) => (
                <tr key={c.candidate_name}>
                  <td>
                    <span style={{ ...SERIF, fontSize: "0.88rem", fontWeight: 600, color: "#1a1a1a", display: "block" }}>
                      {c.candidate_name}
                      {c.is_endorsed_by_departing && (
                        <span style={{ color: "#15803d", marginLeft: "0.4rem" }}>★</span>
                      )}
                    </span>
                    <span style={{ ...MONO, fontSize: "0.6rem", color: "#888" }}>
                      Aligned: {c.mayoral_alignment}
                      {c.fundraising_tier && ` · Fundraising: ${c.fundraising_tier}`}
                    </span>
                  </td>
                  <td style={{ textAlign: "right", verticalAlign: "top" }}>
                    <span className="np-tag" style={{ color: "#555" }}>
                      {c.name_recognition_tier}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
```

- [ ] **Step 2: Check a ward detail page**

Visit `http://localhost:3000/wards/4`. Expect: breadcrumb, serif heading, ruled table sections for signals/factors/challengers. Model factors show directional labels only (no numbers).

- [ ] **Step 3: Check ward 19 specifically (no vulnerability signals section)**

Visit `http://localhost:3000/wards/19`. Expect: no "Vulnerability signals" section rendered.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/wards/[ward_num]/page.tsx
git commit -m "feat: rebuild ward detail page with newspaper ruled-row layout"
```

---

## Task 10: Polls page

**Files:**
- Modify: `frontend/src/app/polls/page.tsx`

- [ ] **Step 1: Rewrite `polls/page.tsx`**

```tsx
import { PollingChart } from "@/components/polling-chart";
import { getPollingAverages } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface CandidateResult {
  [key: string]: number;
}

interface Poll {
  poll_date: string;
  firm: string;
  sample_size: number;
  candidates: CandidateResult;
}

async function getPolls(): Promise<{ polls: Poll[] }> {
  try {
    const res = await fetch(`${API_URL}/api/polls`, { next: { revalidate: 60 } });
    if (!res.ok) return { polls: [] };
    return res.json();
  } catch {
    return { polls: [] };
  }
}

const MONO: React.CSSProperties = {
  fontFamily: "var(--font-ibm-mono), monospace",
};

const SERIF: React.CSSProperties = {
  fontFamily: "var(--font-newsreader), serif",
};

export default async function PollsPage() {
  const [pollsResponse, pollingAverages] = await Promise.all([
    getPolls(),
    getPollingAverages(),
  ]);
  const polls = pollsResponse.polls || [];
  const chartData = pollingAverages.trend;
  const chartCandidates = pollingAverages.candidates;
  const candidateStatus = pollingAverages.candidate_status;
  const candidateRanges = pollingAverages.candidate_ranges;
  const pollHistory = pollingAverages.poll_history;

  return (
    <main className="np-shell">
      {/* Section header */}
      <div className="np-kicker" style={{ marginBottom: "0.3rem" }}>
        Mayoral tracker
      </div>
      <h1
        style={{
          ...SERIF,
          fontSize: "clamp(1.8rem, 4vw, 2.8rem)",
          fontWeight: 700,
          margin: "0 0 0.5rem 0",
          letterSpacing: "-0.01em",
          color: "#1a1a1a",
        }}
      >
        Mayoral Polling
      </h1>
      <hr className="np-rule" style={{ marginBottom: "0" }} />

      {/* Stats row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          border: "1px solid #ccc",
          borderTop: "none",
          marginBottom: "2rem",
        }}
      >
        {[
          { label: "Used in model", value: pollingAverages.polls_used },
          { label: "Total polls", value: pollingAverages.total_polls_available },
          { label: "Excluded declined", value: pollingAverages.excluded_declined_polls },
        ].map((stat, i) => (
          <div
            key={stat.label}
            style={{
              padding: "0.75rem 1rem",
              borderRight: i < 2 ? "1px solid #ccc" : "none",
            }}
          >
            <div className="np-kicker" style={{ marginBottom: "0.3rem" }}>
              {stat.label}
            </div>
            <div
              style={{
                ...SERIF,
                fontSize: "1.6rem",
                fontWeight: 700,
                color: "#1a1a1a",
                lineHeight: 1,
              }}
            >
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Polling chart */}
      <div
        style={{
          border: "1px solid #ccc",
          padding: "1rem",
          marginBottom: "2rem",
        }}
      >
        {chartData.length > 0 ? (
          <PollingChart data={chartData} candidates={chartCandidates} />
        ) : (
          <p style={{ ...MONO, fontSize: "0.65rem", color: "#999" }}>
            No polling data available yet.
          </p>
        )}
      </div>

      {/* Candidate status */}
      <div style={{ marginBottom: "2rem" }}>
        <div className="np-kicker" style={{ marginBottom: "0.4rem" }}>
          Candidate status &amp; polling ranges
        </div>
        <hr className="np-rule" />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            border: "1px solid #ccc",
            borderTop: "none",
          }}
        >
          {(["declared", "potential", "declined"] as const).map(
            (status, i) => (
              <div
                key={status}
                style={{
                  borderRight: i < 2 ? "1px solid #ccc" : "none",
                  padding: "0.75rem 1rem",
                }}
              >
                <div
                  className="np-kicker"
                  style={{ marginBottom: "0.75rem", textTransform: "capitalize" }}
                >
                  {status}
                </div>
                {(candidateStatus[status] ?? []).map((candidate, j, arr) => {
                  const range = candidateRanges[status]?.[candidate.id];
                  return (
                    <div
                      key={candidate.id}
                      style={{
                        paddingBottom: "0.65rem",
                        marginBottom: "0.65rem",
                        borderBottom:
                          j < arr.length - 1 ? "1px solid #e8e5e0" : "none",
                      }}
                    >
                      <div
                        style={{
                          ...SERIF,
                          fontSize: "0.9rem",
                          fontWeight: 600,
                          color: "#1a1a1a",
                          marginBottom: "0.2rem",
                        }}
                      >
                        {candidate.name}
                      </div>
                      <div
                        style={{
                          fontSize: "0.75rem",
                          color: "#888",
                          marginBottom: "0.25rem",
                          lineHeight: 1.4,
                        }}
                      >
                        {candidate.summary}
                      </div>
                      <div style={{ ...MONO, fontSize: "0.62rem", color: "#555" }}>
                        {range
                          ? `${range.min}% – ${range.max}%`
                          : "No comparable data"}
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>
      </div>

      {/* Poll history */}
      <div>
        <div className="np-kicker" style={{ marginBottom: "0.4rem" }}>
          Poll history
        </div>
        <hr className="np-rule" />
        <div style={{ border: "1px solid #ccc", borderTop: "none", overflowX: "auto" }}>
          <table className="np-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Firm</th>
                <th style={{ textAlign: "right" }}>Sample</th>
                <th style={{ textAlign: "right" }}>Leading candidate</th>
                <th style={{ textAlign: "right" }}>Model use</th>
              </tr>
            </thead>
            <tbody>
              {(pollHistory.length > 0 ? pollHistory : polls).map(
                (poll, i) => {
                  const candidatesMap = (
                    "candidates" in poll ? poll.candidates : {}
                  ) as Record<string, number>;
                  const results = Object.entries(candidatesMap);
                  const topCandidate: [string, number] =
                    results.length > 0
                      ? results.reduce((a, b) => (a[1] > b[1] ? a : b))
                      : ["None", 0];
                  const excluded =
                    "excluded_from_model" in poll
                      ? poll.excluded_from_model
                      : false;
                  const reason =
                    "excluded_reason" in poll ? poll.excluded_reason : null;

                  return (
                    <tr key={i}>
                      <td style={MONO}>
                        {"date_published" in poll
                          ? poll.date_published
                          : poll.poll_date}
                      </td>
                      <td>{poll.firm}</td>
                      <td style={{ ...MONO, textAlign: "right" }}>
                        {poll.sample_size}
                      </td>
                      <td style={{ textAlign: "right", fontWeight: 600 }}>
                        {topCandidate[0].charAt(0).toUpperCase() +
                          topCandidate[0].slice(1)}{" "}
                        ({(topCandidate[1] * 100).toFixed(0)}%)
                      </td>
                      <td style={{ ...MONO, textAlign: "right", fontSize: "0.65rem", color: excluded ? "#c53030" : "#15803d" }}>
                        {excluded
                          ? `Excluded${reason ? ` (${reason})` : ""}`
                          : "Included"}
                      </td>
                    </tr>
                  );
                }
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Check polls page in browser**

Visit `http://localhost:3000/polls`. Expect: kicker + "Mayoral Polling" heading, 3-col stat row, chart in ruled container, candidate columns with ruled separators, poll history table.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/polls/page.tsx
git commit -m "feat: rebuild polls page with newspaper editorial layout"
```

---

## Final check

- [ ] **Step 1: Full site walkthrough**

Visit each page and confirm:
- `http://localhost:3000` — hero dots + sidebar + teasers
- `http://localhost:3000/wards` — masthead, 5-col grid, red/amber top rules on competitive/open
- `http://localhost:3000/wards/4` — ruled sections, no raw factor numbers, directional labels
- `http://localhost:3000/wards/19` — no vulnerability signals section
- `http://localhost:3000/polls` — ruled stat row, chart, candidate columns, table

- [ ] **Step 2: Check for any remaining old class references**

```bash
grep -r "surface-panel\|stat-chip\|hero-kicker\|civic-shell" frontend/src/
```

Expected: no results.

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "style: site-wide newspaper editorial redesign complete"
```
