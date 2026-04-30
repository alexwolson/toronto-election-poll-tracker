# Sources & Attribution Page — Design Spec

**Date:** 2026-04-30  
**Status:** Approved

---

## Overview

A dedicated `/sources` page that serves as a data source bibliography and attribution record for the Toronto Election Modelling site. It is not a methodology explainer — it attributes data and credits contributors, links to primary sources, and gives Matt Elliott prominent recognition for his two core contributions to the council model.

---

## Route & Navigation

- **Route:** `/sources` → `src/app/sources/page.tsx`
- **Nav:** Add `{ href: "/sources", label: "Sources" }` to `NAV_LINKS` in `src/components/masthead-nav.tsx`, after the existing "Council" entry.
- **Active state:** Uses the same active/inactive logic as existing nav links.

---

## Page Layout

Follows the existing newspaper style used across the site: `np-shell` container, `np-kicker` section headers, `np-rule` dividers, Newsreader serif for headings, IBM Plex Mono for labels and data, Source Sans for body text.

### Page Header

- Kicker: `Data & Attribution`
- `h1`: `Sources`
- `np-rule` divider

---

## Section 1 — Council Projections

**Header:** `np-kicker` reading "Council projections"  
**`np-rule` divider**

### Matt Elliott callout (prominent)

A shaded block (`background: #f5f5f0`, `border: 1px solid #ccc`, padding) containing:

- A small `np-kicker`-style label: "Primary contributor"
- Name in Newsreader serif, bold: **Matt Elliott · City Hall Watcher**
- Link: `https://cityhallwatcher.com`
- Two attribution lines in IBM Plex Mono (small), each with a bold label and a plain-text description:
  - **Council Defeatability Index** — Vulnerability scores and methodology for all 25 wards
  - **Council voting alignment scores** — Councillor alignment scores under the Chow and Tory mayoralties

### Toronto Open Data (standard row)

Below the callout, a plain source row:

- **Name:** Toronto Open Data
- **Link:** `https://open.toronto.ca`
- **Description:** Ward election results (2018, 2022 municipal elections; 2023 mayoral by-election); candidate registrations and financial filings for 2026

---

## Section 2 — Mayoral Polling

**Header:** `np-kicker` reading "Mayoral polling"  
**`np-rule` divider**

A note line in small mono: *"Polls compiled manually from published firm releases."*

A simple bordered table listing each polling firm as a row: firm name (linked to their website) with no additional columns. Initial firms:

| Firm | URL |
|---|---|
| Mainstreet Research | `https://mainstreetresearch.ca` |
| Léger | `https://leger360.com` |
| Forum Research | `https://forumresearch.com` |

New firms are added as they publish Toronto mayoral polls. The table is static — it lives in the page component, not fetched from data.

> **Note:** Verify all firm URLs before shipping — the URLs above are best-guess and may need correction.

---

## Section 3 — Background Data

**Header:** `np-kicker` reading "Background data"  
**`np-rule` divider**

Two plain source rows:

- **Statistics Canada** (`https://statcan.gc.ca`) — Ward population estimates and growth since 2022
- **338Canada** (`https://338canada.com`) — Methodological inspiration for polling aggregation; model by Philippe J. Fournier

---

## Implementation Notes

- `page.tsx` is a simple static Server Component — no data fetching required.
- All source rows share a consistent layout: bold name (linked), description text beneath it in smaller type. The Matt Elliott callout is the only divergence from this pattern.
- Polling firm list is hardcoded in the component. When a new firm publishes a poll, the developer adds a row manually.
- No pagination, filtering, or dynamic behaviour.
