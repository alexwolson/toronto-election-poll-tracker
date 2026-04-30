# Sources Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a static `/sources` page listing all data sources and giving Matt Elliott prominent attribution for his council model contributions, accessible via a "Sources" nav link.

**Architecture:** Two file changes — add a nav link to `masthead-nav.tsx` and create a new static Server Component at `src/app/sources/page.tsx`. No data fetching, no new dependencies. All content is hardcoded.

**Tech Stack:** Next.js App Router (Server Component), existing `np-*` CSS classes from `globals.css`, inline styles matching site conventions.

---

### Task 1: Add "Sources" to the nav

**Files:**
- Modify: `src/components/masthead-nav.tsx`

- [ ] **Step 1: Add the Sources link to NAV_LINKS**

Open `src/components/masthead-nav.tsx`. The current `NAV_LINKS` array is:

```ts
const NAV_LINKS = [
  { href: "/", label: "Mayor" },
  { href: "/wards", label: "Council" },
];
```

Change it to:

```ts
const NAV_LINKS = [
  { href: "/", label: "Mayor" },
  { href: "/wards", label: "Council" },
  { href: "/sources", label: "Sources" },
];
```

The `borderRight` logic (`i < NAV_LINKS.length - 1`) is already dynamic, so it handles the third item automatically — no other changes needed.

- [ ] **Step 2: Verify the nav renders correctly**

Run the dev server:

```bash
npm run dev
```

Open `http://localhost:3000`. Confirm:
- Three nav tabs appear: Mayor · Council · Sources
- "Mayor" tab is active (dark background) on the homepage
- "Sources" tab is inactive (transparent background) and clickable — it will 404 until Task 2 is done, which is expected

- [ ] **Step 3: Commit**

```bash
git add src/components/masthead-nav.tsx
git commit -m "feat: add Sources nav link"
```

---

### Task 2: Create the Sources page

**Files:**
- Create: `src/app/sources/page.tsx`

This is a pure static Server Component. No `"use client"` directive, no imports from `@/lib/api`, no props.

- [ ] **Step 1: Create the file with the page shell**

Create `src/app/sources/page.tsx` with this content:

```tsx
const SERIF: React.CSSProperties = {
  fontFamily: "var(--font-newsreader), serif",
};

const MONO: React.CSSProperties = {
  fontFamily: "var(--font-ibm-mono), monospace",
};

function SourceRow({
  name,
  url,
  description,
}: {
  name: string;
  url: string;
  description: string;
}) {
  return (
    <div
      style={{
        padding: "1rem 0",
        borderBottom: "1px solid #e8e5e0",
      }}
    >
      <div
        style={{
          ...SERIF,
          fontWeight: 700,
          fontSize: "1rem",
          marginBottom: "0.25rem",
        }}
      >
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "#1a1a1a" }}
        >
          {name}
        </a>
      </div>
      <div style={{ fontSize: "0.875rem", color: "#444", lineHeight: 1.5 }}>
        {description}
      </div>
    </div>
  );
}

const POLLING_FIRMS: { name: string; url: string }[] = [
  { name: "Mainstreet Research", url: "https://mainstreetresearch.ca" },
  { name: "Léger", url: "https://leger360.com" },
  { name: "Forum Research", url: "https://forumresearch.com" },
];

export default function SourcesPage() {
  return (
    <main className="np-shell">
      {/* Page header */}
      <div className="np-kicker" style={{ marginBottom: "0.3rem" }}>
        Data &amp; Attribution
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
        Sources
      </h1>
      <hr className="np-rule" style={{ marginBottom: "2rem" }} />

      {/* Section 1: Council projections */}
      <div style={{ marginBottom: "2.5rem" }}>
        <div className="np-kicker" style={{ marginBottom: "0.4rem" }}>
          Council projections
        </div>
        <hr className="np-rule" style={{ marginBottom: "1rem" }} />

        {/* Matt Elliott callout */}
        <div
          style={{
            background: "#f5f5f0",
            border: "1px solid #ccc",
            padding: "1rem 1.25rem",
            marginBottom: "0",
          }}
        >
          <div className="np-kicker" style={{ marginBottom: "0.4rem" }}>
            Primary contributor
          </div>
          <div
            style={{
              ...SERIF,
              fontWeight: 700,
              fontSize: "1.1rem",
              marginBottom: "0.6rem",
            }}
          >
            <a
              href="https://cityhallwatcher.com"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#1a1a1a" }}
            >
              Matt Elliott · City Hall Watcher
            </a>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
            {[
              {
                label: "Council Defeatability Index",
                desc: "Vulnerability scores and methodology for all 25 wards",
              },
              {
                label: "Council voting alignment scores",
                desc: "Councillor alignment scores under the Chow and Tory mayoralties",
              },
            ].map(({ label, desc }) => (
              <div
                key={label}
                style={{ ...MONO, fontSize: "0.72rem", color: "#444" }}
              >
                <span style={{ fontWeight: 600 }}>{label}</span> — {desc}
              </div>
            ))}
          </div>
        </div>

        {/* Toronto Open Data */}
        <SourceRow
          name="Toronto Open Data"
          url="https://open.toronto.ca"
          description="Ward election results (2018, 2022 municipal elections; 2023 mayoral by-election); candidate registrations and financial filings for 2026"
        />
      </div>

      {/* Section 2: Mayoral polling */}
      <div style={{ marginBottom: "2.5rem" }}>
        <div className="np-kicker" style={{ marginBottom: "0.4rem" }}>
          Mayoral polling
        </div>
        <hr className="np-rule" style={{ marginBottom: "1rem" }} />
        <div
          style={{
            ...MONO,
            fontSize: "0.72rem",
            color: "#555",
            marginBottom: "1rem",
          }}
        >
          Polls compiled manually from published firm releases.
        </div>
        <div style={{ border: "1px solid #ccc" }}>
          {POLLING_FIRMS.map((firm, i) => (
            <div
              key={firm.name}
              style={{
                padding: "0.75rem 1rem",
                borderBottom:
                  i < POLLING_FIRMS.length - 1 ? "1px solid #e8e5e0" : "none",
              }}
            >
              <a
                href={firm.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  ...SERIF,
                  fontWeight: 600,
                  fontSize: "0.95rem",
                  color: "#1a1a1a",
                }}
              >
                {firm.name}
              </a>
            </div>
          ))}
        </div>
      </div>

      {/* Section 3: Background data */}
      <div>
        <div className="np-kicker" style={{ marginBottom: "0.4rem" }}>
          Background data
        </div>
        <hr className="np-rule" style={{ marginBottom: "0" }} />
        <SourceRow
          name="Statistics Canada"
          url="https://statcan.gc.ca"
          description="Ward population estimates and growth since 2022"
        />
        <SourceRow
          name="338Canada"
          url="https://338canada.com"
          description="Methodological inspiration for polling aggregation; model by Philippe J. Fournier"
        />
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Verify the page builds and renders**

With the dev server still running (`npm run dev`), open `http://localhost:3000/sources`. Confirm:

- "Sources" tab in the nav is highlighted (active, dark background)
- Page header shows "Data & Attribution" kicker and "Sources" h1
- Section 1 "Council projections" shows the shaded Matt Elliott callout with both attribution lines, followed by a Toronto Open Data row
- Section 2 "Mayoral polling" shows the note line and three firm rows in a bordered box
- Section 3 "Background data" shows Statistics Canada and 338Canada rows
- All links open in a new tab (`target="_blank"`)
- No console errors

- [ ] **Step 3: Verify polling firm URLs** (manual)

Click each of the three polling firm links and confirm they resolve to the correct firm website. If any URL is wrong, update the `POLLING_FIRMS` array in `src/app/sources/page.tsx` before committing.

- [ ] **Step 4: Run the type-checker and tests**

```bash
npm run build
```

Expected: build completes with no TypeScript errors. (The sources page has no logic to unit test — `vitest` tests in `src/lib/` are unaffected.)

- [ ] **Step 5: Commit**

```bash
git add src/app/sources/page.tsx
git commit -m "feat: add Sources & Attribution page"
```
