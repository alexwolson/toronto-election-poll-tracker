---
name: "Toronto Election 2026"
description: "A civic broadsheet system for clear, evidence-led election reporting."
colors:
  paper: "#faf9f6"
  paper-raised: "#f5f2ed"
  paper-hover: "#f0ede8"
  ink: "#1a1a1a"
  text-mid: "#555555"
  text-soft: "#666666"
  text-faint: "#707070"
  rule-soft: "#cccccc"
  rule-inner: "#e0ddd8"
  focus-blue: "#1f5f99"
  chow-plum: "#854a90"
  chow-plum-mid: "#aa78ba"
  chow-plum-soft: "#c4a0cc"
  bradford-green: "#2e8b57"
  bradford-green-soft: "#b7d9c5"
  alexander-gold: "#f8c466"
  uncommitted-grey: "#c8c4be"
  high-attention-red: "#ef4444"
  high-attention-wash: "#fee2e2"
  high-attention-map: "#fca5a5"
  elevated-amber: "#f59e0b"
  elevated-wash: "#fef3c7"
  elevated-map: "#fde68a"
  quiet-green: "#22c55e"
  quiet-wash: "#dcfce7"
  quiet-map: "#86efac"
  open-grey: "#999999"
  open-wash: "#e5e5e5"
  open-map: "#d4d4d4"
  trustee-open-clay: "#744838"
  trustee-open-clay-rule: "#8f604f"
  trustee-open-clay-wash: "#efe4de"
  trustee-two-harbour: "#36586d"
  trustee-two-harbour-rule: "#58798d"
  trustee-two-harbour-wash: "#e4ecef"
  trustee-one-olive: "#4f6548"
  trustee-one-olive-rule: "#6c805f"
  trustee-one-olive-wash: "#e6ece2"
  trustee-acclaimed-grey: "#5f5a53"
  trustee-acclaimed-grey-rule: "#7d7770"
  trustee-acclaimed-grey-wash: "#ebe8e3"
  trustee-prior-ochre: "#76591f"
  trustee-prior-ochre-rule: "#94702e"
  trustee-prior-ochre-wash: "#f3ead5"
typography:
  display:
    fontFamily: "Newsreader, Georgia, serif"
    fontSize: "clamp(3rem, 7vw, 5.25rem)"
    fontWeight: 700
    lineHeight: 0.93
    letterSpacing: "-0.01em"
  pageTitle:
    fontFamily: "Newsreader, Georgia, serif"
    fontSize: "clamp(2.35rem, 6vw, 4.4rem)"
    fontWeight: 700
    lineHeight: 0.98
    letterSpacing: "-0.01em"
  featureHeading:
    fontFamily: "Newsreader, Georgia, serif"
    fontSize: "clamp(2rem, 4.5vw, 3.45rem)"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "Newsreader, Georgia, serif"
    fontSize: "clamp(1.65rem, 3vw, 2.2rem)"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "-0.01em"
  heading:
    fontFamily: "Newsreader, Georgia, serif"
    fontSize: "1.3rem"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.01em"
  metric:
    fontFamily: "Newsreader, Georgia, serif"
    fontSize: "1.55rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Newsreader, Georgia, serif"
    fontSize: "1.05rem"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.01em"
  lead:
    fontFamily: "Newsreader, Georgia, serif"
    fontSize: "clamp(1.15rem, 2.2vw, 1.45rem)"
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: "normal"
  body:
    fontFamily: "Source Sans 3, Arial, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "normal"
  bodySmall:
    fontFamily: "Source Sans 3, Arial, sans-serif"
    fontSize: "0.9rem"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "normal"
  compact:
    fontFamily: "Source Sans 3, Arial, sans-serif"
    fontSize: "0.78rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  data:
    fontFamily: "IBM Plex Mono, monospace"
    fontSize: "0.72rem"
    fontWeight: 500
    lineHeight: 1.45
    letterSpacing: "0.02em"
  label:
    fontFamily: "IBM Plex Mono, monospace"
    fontSize: "0.62rem"
    fontWeight: 600
    lineHeight: 1.45
    letterSpacing: "0.06em"
  diagram:
    fontFamily: "IBM Plex Mono, monospace"
    fontSize: "0.58rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.02em"
rounded:
  square: "0"
  marker-round: "999px"
spacing:
  xs: "0.25rem"
  sm: "0.5rem"
  md: "0.75rem"
  lg: "1rem"
  xl: "1.5rem"
  2xl: "2rem"
  section: "3rem"
components:
  page-hero:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.display}"
    rounded: "{rounded.square}"
    padding: "2.4rem 0 2.5rem"
  section-heading:
    textColor: "{colors.ink}"
    typography: "{typography.headline}"
    rounded: "{rounded.square}"
    padding: "0"
  route-tabs:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.text-mid}"
    typography: "{typography.label}"
    rounded: "{rounded.square}"
    padding: "0.65rem 1rem"
  segmented-control:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.text-mid}"
    typography: "{typography.label}"
    rounded: "{rounded.square}"
    padding: "0.4rem 0.7rem"
  segmented-control-active:
    backgroundColor: "{colors.ink}"
    textColor: "#ffffff"
    typography: "{typography.label}"
    rounded: "{rounded.square}"
    padding: "0.4rem 0.7rem"
  search-field:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.square}"
    padding: "0.4rem 0.6rem"
  evidence-tag:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.text-mid}"
    typography: "{typography.label}"
    rounded: "{rounded.square}"
    padding: "0.1rem 0.35rem"
  ward-card:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.square}"
    padding: "0.85rem 0.95rem 1rem"
  forecast-card:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.square}"
    padding: "1rem 1.1rem 1.15rem"
---

# Design System: Toronto Election 2026

## Overview

**Creative North Star: "The Civic Data Desk"**

The system feels like a public-service election desk working in full view: measured, editorial, and evidence-led. Warm paper, firm rules, disciplined typography, and dense but legible information create the authority of a municipal broadsheet without imitating print ornament. The interface should help a voter scan quickly, then reward closer reading.

Its visual confidence comes from structure rather than spectacle. Large Newsreader headlines establish editorial hierarchy; Source Sans 3 carries explanation; IBM Plex Mono identifies metadata, controls, sources, and evidence categories. Candidate and status colours communicate identity or meaning inside data, while the surrounding interface remains quiet enough for those colours to stay useful.

Components are flat, square, and precise. Borders, paper tones, inset rules, hatching, and layout changes express grouping and state. Decoration never competes with the evidence, but the system should still feel authored rather than generic.

**Key Characteristics:**

- Warm off-white paper with a faint 44px evidence grid.
- High-contrast serif hierarchy over highly legible sans-serif body copy.
- Monospaced uppercase labels for metadata, controls, and methodological cues.
- Square, ruled containers with no ambient shadows.
- Candidate colour, shape, and hatching used together for data identity.
- Responsive grids that collapse into a continuous reading order on narrow screens.

## Colors

The palette is a restrained civic neutral field punctuated by candidate and evidence colours whose scarcity preserves their meaning.

### Primary

- **Editorial Ink:** The near-black authority colour for headings, active controls, heavy rules, and selected states.
- **Warm Newsprint:** The default canvas, panel, card, and input surface; most of every screen remains this colour.

### Secondary

- **Chow Plum:** Candidate identity for Olivia Chow in forecast bands, chart marks, dots, and explanatory figures.
- **Bradford Civic Green:** Candidate identity for Brad Bradford in the same evidence contexts.
- **Alexander Ballot Gold:** Candidate identity for Chris Alexander, paired with diagonal hatching and a dark stroke so it never relies on hue alone.
- **Uncommitted Grey:** Residual, unmeasured, or neutral data segments.

### Tertiary

- **Attention Red:** High-attention council status, used as a narrow rule and pale tag wash rather than a large alarm surface.
- **Evidence Amber:** Elevated-attention or limited-evidence status.
- **Quiet Green:** Quiet-race and supported-positive status.
- **Open Grey:** Open-seat and structurally neutral status, pairing Editorial Grey text (`#555`) with a pale grey wash (`#e5e5e5`) and a stronger grey rule (`#999`).
- **Trustee Clay:** Open trustee contests, carrying a warm archival character without borrowing the council attention-red meaning.
- **Trustee Harbour:** Two-incumbent trustee contests, using a muted municipal blue rather than a saturated interface blue.
- **Trustee Olive:** One-incumbent trustee contests, calm and distinct from the brighter council quiet-race green.
- **Trustee Newsprint Grey:** Acclamations, intentionally structural and neutral.
- **Trustee Ochre:** Prior wins below a majority, a descriptive historical cue rather than a warning state.

### Neutral

- **Raised Paper:** A subtle tonal lift for explanatory notes, worked examples, and unavailable states.
- **Hover Paper:** The only routine surface shift on hover.
- **Carbon Midtone:** Secondary labels and navigational text.
- **Soft Graphite:** Supporting prose, captions, and methodology copy.
- **Faint Graphite:** Timestamps, disabled hints, and low-priority metadata.
- **Weathered Rule:** Ordinary container borders and grid dividers.
- **Hairline Rule:** Between-row dividers inside dense lists.
- **Civic Focus Blue:** A conspicuous keyboard focus outline independent of candidate or status meaning.

**The Candidate Colour Is Evidence Rule.** Candidate hues belong to marks, swatches, lines, bands, and names that identify a candidate. Do not use them as general decoration or page chrome.

**The Council Attention Map Rule.** Council map regions use the medium wash from the same red, amber, green, and grey families as the list view. The legend and selected-race status return to the pale tag wash with semantic foreground and rule colours. Ward numbers, full status labels, white boundaries, and the black selected outline keep the map readable without relying on hue alone.

**The Trustee Context Is Archival Rule.** Trustee race-context colours use low-chroma clay, harbour, olive, grey, and ochre families. Pair every colour with its full text label, ruled tag, and card-edge position; never reuse the brighter council attention palette for these structural categories.

**The Paper Before Panels Rule.** Default to the shared newsprint surface. Use raised paper only when a note, example, or state needs separation that borders alone cannot provide.

## Typography

**Display Font:** Newsreader (with Georgia and serif fallback)
**Body Font:** Source Sans 3 (with Arial and sans-serif fallback)
**Label/Mono Font:** IBM Plex Mono (with monospace fallback)

**Character:** The pairing combines an editorial voice, a practical reading face, and a documentary evidence register. Newsreader makes claims and section structure feel considered; Source Sans 3 keeps long explanations open; IBM Plex Mono signals that a label, date, source, control, or metric should be read precisely.

### Hierarchy

- **Display** (700, fluid 3rem–5.25rem, 0.93 line-height): Major race titles. On narrow screens it remains intentionally commanding.
- **Page title** (700, fluid 2.35rem–4.4rem, 0.98 line-height): Index, candidate, and methodology page titles.
- **Feature heading** (700, fluid 2rem–3.45rem, 1.0 line-height): Major question-led sections within a long reading page.
- **Headline** (700, fluid 1.65rem–2.2rem, 1.05 line-height): Section openings and primary analytical takeaways.
- **Heading / metric / title** (700 at 1.3rem; 700 at 1.55rem; 600 at 1.05rem): Disclosure headings, prominent measured values, candidate names, ward names, panel titles, and compact summaries.
- **Lead / body** (fluid 1.15rem–1.45rem Newsreader; 1rem Source Sans 3): Page introductions and ordinary explanations. Long passages use a 65–70ch measure and 1.55 line-height.
- **Small body / compact** (0.9rem and 0.78rem): Supporting explanations and genuinely secondary copy. Compact text is the 14px floor at the 18px root.
- **Data / label** (0.72rem and 0.62rem IBM Plex Mono): Measured values and short metadata or controls. Labels use restrained uppercase tracking; data may preserve sentence case.
- **Diagram** (0.58rem IBM Plex Mono): Embedded chart and map annotations only. Never use this step for voter-facing prose or essential metadata.

**Root size:** Production uses one 18px root. Shared `--type-*`, `--leading-*`, and `--measure-reading` tokens are the source of truth; components should not redefine the root or substitute nearby literal sizes.

**The Three-Register Rule.** Use serif for editorial hierarchy, sans-serif for explanation, and mono for evidence or interaction metadata. A component should not add a fourth typographic voice.

**The Mono Means Precision Rule.** Monospaced text should signal category, control, source, date, method, or measured value—not carry ordinary prose.

## Interface Language

Public routes use voter-facing terms consistently:

- Say **candidates on the ballot** or **candidates in 2026**, not “field,” unless the methodology is explaining a statistical field.
- Say a poll was **conducted** on a date; reserve “fieldwork” for methodology detail.
- Use **attention** for the council ordering. Do not call it “most watched,” which implies audience popularity rather than an evidence-based assessment.
- Name empty states precisely: distinguish information that is **not available yet** from a search that returned **no matches**.
- Link text names the destination or outcome, such as **View race details** or **Read the methodology**.

Keep election terms when they carry necessary legal or factual meaning, then explain the consequence in plain language. For example, pair **acclaimed** with **no vote**.

## Layout

Pages sit in a centred reading shell capped at 66rem for the current system, with 1.25rem horizontal padding and generous vertical section intervals. The background extends the analytical character beyond the content using a subtle 44px square grid that fades toward the bottom.

Primary route sections use a 3rem interval, reduced to 2rem for the first section immediately after route tabs. Inside a section, the heading and its supporting copy stay within 48rem and sit 1.5rem above the evidence module. Search and ordering controls form a compact grid: the field gets the flexible column, actions retain their natural width, and the result count stays visually secondary. At narrower widths the search field takes a full row before the actions, then all controls stack into one reading order on phones.

The core spatial grammar is ruled grids: a strong 2–4px top rule introduces a data module, while 1px vertical and bottom rules join its cells into one composition. Major cards commonly use `repeat(auto-fit|auto-fill, minmax(...))` so density adapts before the layout collapses. Long-form methodology alternates broad reading columns with narrower notes, examples, or figures.

At 850px, complex three-column explanatory systems usually become two columns. At 760–680px, maps, methodology grids, source rows, and content/aside pairs become one column. The site navigation becomes a three-column wrapped grid at 680px; data tabs remain horizontally scrollable; mobile page padding tightens to 0.85rem and to 0.75rem below 420px. The mobile result must preserve editorial sequence and full labels rather than shrink desktop grids beyond legibility.

**The Mobile Evidence Translation Rule.** On phones, preserve the claim and the evidence but change the presentation. Lead with a concise textual takeaway, place complex historical charts behind an explicit detail control, and reflow wide poll tables into complete vertical records. Touch controls use a 44px minimum target. Dense geographic maps retain a list alternative, enlarge their invisible pointer geometry, and use one keyboard tab stop with spatial arrow-key navigation.

**The Joined Grid Rule.** When items form one analytical set, join them with shared rules and zero gap. Use open card gaps only for independently actionable records such as ward race cards.

## Elevation & Depth

The system is flat by default and uses no ambient box shadows. Depth comes from tonal paper shifts, strong-versus-soft rule weight, inset selection bars, coloured left-edge status rules, and occasional hatched fills. Hover states change the paper tone by one step; focus uses a separate 3px blue outline with a 3px offset.

Inset shadows are structural rather than atmospheric: a 3px bottom inset marks the active navigation or tab, and a 4px left inset can encode a trustee-race context. Nothing should appear to float above the civic document.

**The No Ambient Shadow Rule.** Do not add drop shadows, glass blur, or floating-card elevation. Use rules, inset state marks, or a paper-tone change.

## Shapes

Containers, controls, tags, inputs, and cards use square corners. The zero-radius geometry reinforces the document and table character, and adjoining edges should align cleanly.

Rounded geometry is reserved for data differentiation: Chow uses a circular marker, Bradford a square, and Alexander a diamond or hatched gold square. Fully rounded values appear only for circular chart marks and legend dots. These silhouettes are semantic and must not become decorative motifs elsewhere.

**The Shape Carries Meaning Rule.** Preserve circle, square, diamond, and hatch distinctions wherever candidate data appears so colour is never the only identifier.

## Components

### Buttons and Segmented Controls

- **Shape:** Square, with adjacent buttons sharing a 1px outer rule and internal dividers.
- **Default:** Warm paper, midtone text, IBM Plex Mono uppercase labels, and compact 0.4rem by 0.7rem padding.
- **Active:** Editorial Ink fill with white text, or a 3px inset bottom rule for tab and navigation variants.
- **Hover / Focus:** One-step hover-paper shift; the global blue focus outline remains visible outside the control.

### Tags and Chips

- **Style:** Compact mono uppercase text with either a 1px current-colour border or a pale semantic wash.
- **State:** Use candidate tags only for candidate identity and red/amber/green/grey status families only for their defined evidence meaning.
- **Shape:** Always square; never convert these labels into soft pills.

### Cards and Containers

- **Corner Style:** Square.
- **Background:** Shared newsprint at rest; hover paper for clickable cards; raised paper for explanatory notes.
- **Shadow Strategy:** None. A strong top rule, soft perimeter rules, or a coloured left rule establishes the card's role.
- **Internal Padding:** Typically 0.75rem–1.15rem, scaled to information density.

### Inputs and Fields

- **Style:** Warm paper, 1px Editorial Ink border, IBM Plex Mono input text, square corners, and compact padding.
- **Focus:** The global 3px Civic Focus Blue outline with 3px offset.
- **Placeholder:** Low-priority graphite, without reducing the entered value's contrast.

### Navigation

The centred masthead sets the publication name in Newsreader, followed by an uppercase mono descriptor and a ruled navigation row. Links use compact uppercase labels, 1px internal dividers, and an inset black baseline for the active route. At narrow widths navigation becomes a multi-row grid; mayor and trustee sub-navigation stays horizontally scrollable rather than truncating labels.

Use the shared `RouteTabs` primitive for page-level route families. Supply a concise accessible label, the complete ordered set of routes, and the active route id; the component owns current-page semantics, full-width distribution, active styling, and narrow-screen scrolling. Keep the small mayor and trustee wrappers when their route data comes from product-specific modules.

### Editorial Headings

Use `PageHero` once at the start of a primary route when the page needs the standard ruled lead: an optional evidence kicker, one display title, optional editorial description, and optional mono metadata. Supporting coverage notes can follow through its children slot, but page-specific controls stay outside the hero.

Use `SectionHeading` for recurring analytical modules inside a route. It pairs one precision kicker with a serif section title and provides a children slot only for directly supporting copy. Methodology chapter headings and detail-section headings have different reading roles and remain separate patterns.

### Forecast Band Board

The signature forecast component is a joined ruled grid introduced by a heavy top rule. Each candidate cell pairs a semantic marker with a serif frequency phrase. Candidate identity lives in the marker and data, while the card itself stays neutral. Derived or defeat information is separated by an internal hairline rule. Exact raw probabilities do not belong in this presentation pattern.

### Race Cards

Ward and trustee cards combine an editorial title, mono location label, supporting sans-serif copy, and a narrow semantic edge or inset rule. Cards remain flat and allow their status tag and evidence text to carry urgency. Hover changes only the paper tone.

### Charts and Maps

Charts use soft dashed grids, mono axes and legends, candidate-specific shapes, and unanimated data marks. Maps pair a ruled geographic stage with a factual side panel and support hover, focus, keyboard selection, pressed state, and a polite live-region announcement. Motion is minimal and disabled under `prefers-reduced-motion`.

## Do's and Don'ts

### Do:

- **Do** begin major analytical modules with a firm top rule and keep internal dividers lighter.
- **Do** use Newsreader for the claim, Source Sans 3 for the explanation, and IBM Plex Mono for the evidence label.
- **Do** keep candidate and status colours attached to explicit data meaning and pair colour with shape, hatch, text, or position.
- **Do** preserve wide reading measures, responsive collapse, keyboard focus, reduced-motion behaviour, and non-colour cues.
- **Do** use warm paper and precise alignment to make dense civic information feel calm.

### Don't:

- **Don't** add rounded cards, pill-shaped general controls, ambient shadows, glass effects, or floating dashboard surfaces.
- **Don't** use candidate colours as decorative accents or to imply political endorsement.
- **Don't** replace ruled information structures with isolated generic cards when the items form one analytical set.
- **Don't** use monospaced type for long prose or serif type for dense metadata.
- **Don't** animate charts, maps, or status changes merely to create activity.
