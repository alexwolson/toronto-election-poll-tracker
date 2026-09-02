---
version: alpha
name: "Toronto Election 2026"
description: "A civic broadsheet system for clear, evidence-led election reporting."
colors:
  paper: "#faf9f6"
  paper-raised: "#f5f2ed"
  paper-hover: "#f0ede8"
  inverse-paper: "#ffffff"
  body-ink: "oklch(0.24 0.03 248)"
  ink: "#1a1a1a"
  text-mid: "#555555"
  text-soft: "#666666"
  text-faint: "#707070"
  text-ghost: "#aaaaaa"
  rule-soft: "#cccccc"
  rule-inner: "#e0ddd8"
  track-paper: "#e8e5e0"
  focus-blue: "#1f5f99"
  chart-axis: "oklch(0.48 0.03 250)"
  chow-plum: "#854a90"
  chow-plum-mid: "#aa78ba"
  chow-plum-soft: "#c4a0cc"
  bradford-green: "#2e8b57"
  bradford-green-soft: "#b7d9c5"
  alexander-gold: "#f8c466"
  uncommitted-grey: "#c8c4be"
  high-attention-ink: "#9b1c1c"
  high-attention-red: "#ef4444"
  high-attention-wash: "#fee2e2"
  high-attention-map: "#fca5a5"
  elevated-ink: "#92400e"
  elevated-amber: "#f59e0b"
  elevated-wash: "#fef3c7"
  elevated-map: "#fde68a"
  quiet-ink: "#166534"
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
  feature-heading:
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
    fontWeight: 600
    lineHeight: 1.1
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
  body-small:
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
  control-data:
    fontFamily: "IBM Plex Mono, monospace"
    fontSize: "0.72rem"
    fontWeight: 700
    lineHeight: 1.55
    letterSpacing: "normal"
  label:
    fontFamily: "IBM Plex Mono, monospace"
    fontSize: "0.62rem"
    fontWeight: 600
    lineHeight: 1.45
    letterSpacing: "0.06em"
  control-label:
    fontFamily: "IBM Plex Mono, monospace"
    fontSize: "0.62rem"
    fontWeight: 700
    lineHeight: 1.45
    letterSpacing: "0.04em"
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
  touch-target-min: "44px"
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
  masthead-nav:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.text-mid}"
    typography: "{typography.label}"
    rounded: "{rounded.square}"
    padding: "0.62rem 1rem"
  masthead-nav-active:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.square}"
    padding: "0.62rem 1rem"
  route-tab:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.text-mid}"
    typography: "{typography.control-label}"
    rounded: "{rounded.square}"
    padding: "0.65rem 1rem"
  route-tab-active:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.control-label}"
    rounded: "{rounded.square}"
    padding: "0.65rem 1rem"
  segmented-control:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.text-mid}"
    typography: "{typography.control-label}"
    rounded: "{rounded.square}"
    padding: "0.4rem 0.7rem"
  segmented-control-active:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.inverse-paper}"
    typography: "{typography.control-label}"
    rounded: "{rounded.square}"
    padding: "0.4rem 0.7rem"
  search-field:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.control-data}"
    rounded: "{rounded.square}"
    padding: "0.4rem 0.6rem"
  attention-tag-high:
    backgroundColor: "{colors.high-attention-wash}"
    textColor: "{colors.high-attention-ink}"
    rounded: "{rounded.square}"
    padding: "0.15rem 0.4rem"
  attention-tag-elevated:
    backgroundColor: "{colors.elevated-wash}"
    textColor: "{colors.elevated-ink}"
    rounded: "{rounded.square}"
    padding: "0.15rem 0.4rem"
  attention-tag-quiet:
    backgroundColor: "{colors.quiet-wash}"
    textColor: "{colors.quiet-ink}"
    rounded: "{rounded.square}"
    padding: "0.15rem 0.4rem"
  attention-tag-open:
    backgroundColor: "{colors.open-wash}"
    textColor: "{colors.text-mid}"
    rounded: "{rounded.square}"
    padding: "0.15rem 0.4rem"
  ward-card:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.square}"
    padding: "0.85rem 0.95rem 1rem"
  trustee-card:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.square}"
    padding: "0.85rem"
  candidate-disclosure-open:
    backgroundColor: "{colors.paper-raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.square}"
    padding: "0.85rem 1rem 1rem"
  forecast-band-card:
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

Components are restrained editorial instruments: precise, square, compact, and evidence-led. Borders, paper tones, inset rules, hatching, and responsive layout changes express grouping and state. Decoration never competes with the evidence, and each material fact should be stated once at the point where it is most useful.

**Key Characteristics:**

- Warm off-white paper with a faint 44px evidence grid.
- High-contrast serif hierarchy over highly legible sans-serif body copy.
- Monospaced uppercase labels for metadata, controls, and methodological cues.
- Square, ruled containers with no ambient shadows.
- Candidate colour, shape, and hatching used together for data identity.
- Responsive grids that translate into a continuous reading order on narrow screens.
- Quiet information architecture that removes generic labels and repeated facts.

## Colors

The palette is a restrained civic neutral field punctuated by candidate and evidence colours whose scarcity preserves their meaning.

### Primary

- **Editorial Ink** (#1a1a1a): The near-black authority colour for headings, active controls, heavy rules, and selected states.
- **Warm Newsprint** (#faf9f6): The default canvas, panel, card, and input surface; most of every screen remains this colour.
- **Body Ink** (oklch(0.24 0.03 248)): A subtly cool near-black for sustained reading, distinct from the harder Editorial Ink used for hierarchy.

### Secondary

- **Chow Plum** (#854a90): Candidate identity for Olivia Chow in forecast bands, chart marks, dots, and explanatory figures.
- **Bradford Civic Green** (#2e8b57): Candidate identity for Brad Bradford in the same evidence contexts.
- **Alexander Ballot Gold** (#f8c466): Candidate identity for Chris Alexander, paired with diagonal hatching and a dark stroke so it never relies on hue alone.
- **Uncommitted Grey** (#c8c4be): Residual, unmeasured, or neutral data segments.

### Tertiary

- **Attention Red** (#ef4444): High-attention council status, used as a narrow rule, pale wash, or map region rather than a large alarm surface.
- **Evidence Amber** (#f59e0b): Elevated-attention or limited-evidence status.
- **Quiet Green** (#22c55e): Quiet-race and supported-positive status.
- **Open Grey** (#999999): Open-seat and structurally neutral status.
- **Trustee Clay** (#744838): Open trustee contests, carrying a warm archival character without borrowing the council attention-red meaning.
- **Trustee Harbour** (#36586d): Two-incumbent trustee contests, using a muted municipal blue rather than a saturated interface blue.
- **Trustee Olive** (#4f6548): One-incumbent trustee contests, calm and distinct from the brighter council quiet-race green.
- **Trustee Newsprint Grey** (#5f5a53): Acclamations, intentionally structural and neutral.
- **Trustee Ochre** (#76591f): Prior wins below a majority, a descriptive historical cue rather than a warning state.

### Neutral

- **Raised Paper** (#f5f2ed): A subtle tonal lift for explanatory notes, open disclosures, worked examples, and unavailable states.
- **Hover Paper** (#f0ede8): The only routine surface shift on hover.
- **Carbon Midtone** (#555555): Secondary labels and navigational text.
- **Soft Graphite** (#666666): Supporting prose, captions, and methodology copy.
- **Faint Graphite** (#707070): Timestamps, disabled hints, and low-priority metadata.
- **Ghost Graphite** (#aaaaaa): Placeholders and deliberately dim diagram hints only.
- **Weathered Rule** (#cccccc): Ordinary container borders and grid dividers.
- **Hairline Rule** (#e0ddd8): Between-row dividers inside dense lists.
- **Track Paper** (#e8e5e0): Neutral chart tracks and quiet horizontal separators.
- **Civic Focus Blue** (#1f5f99): A conspicuous keyboard focus outline independent of candidate or status meaning.
- **Chart Axis Slate** (oklch(0.48 0.03 250)): Muted chart ticks that remain subordinate to data marks.

**The Candidate Colour Is Evidence Rule.** Candidate hues belong to marks, swatches, lines, bands, and names that identify a candidate. Do not use them as general decoration or page chrome.

**The Council Attention Map Rule.** Council map regions use the medium wash from the same red, amber, green, and grey families as the list view. Meaningful status labels return to the pale tag wash with semantic foreground and rule colours; generic or already-stated labels are omitted. Ward numbers, white boundaries, and the black selected outline keep the map readable without relying on hue alone.

**The Trustee Context Is Archival Rule.** Trustee race-context colours use low-chroma clay, harbour, olive, grey, and ochre families. Pair every colour with a full text label, ruled tag, or card-edge position; never reuse the brighter council attention palette for these structural categories.

**The Paper Before Panels Rule.** Default to the shared newsprint surface. Use raised paper only when a note, disclosure, example, or state needs separation that borders alone cannot provide.

## Typography

**Display Font:** Newsreader (with Georgia and serif fallback)

**Body Font:** Source Sans 3 (with Arial and sans-serif fallback)

**Label/Mono Font:** IBM Plex Mono (with monospace fallback)

**Character:** The pairing combines an editorial voice, a practical reading face, and a documentary evidence register. Newsreader makes claims and section structure feel considered; Source Sans 3 keeps long explanations open; IBM Plex Mono signals that a label, date, source, control, or metric should be read precisely.

### Hierarchy

- **Display** (700, fluid 3rem–5.25rem, 0.93 line-height): Primary route and major race titles. At a 390px viewport it resolves to 3rem and remains intentionally commanding.
- **Feature heading** (700, fluid 2rem–3.45rem, 1.0 line-height): Question-led chapters on long reading pages.
- **Headline** (700, fluid 1.65rem–2.2rem, 1.05 line-height): Section openings, map-panel headings, and primary analytical takeaways.
- **Heading / metric / title** (700 at 1.3rem; 600 at 1.55rem; 600 at 1.05rem): Disclosure headings, published frequency phrases, candidate names, ward names, and compact panel titles.
- **Lead / body** (fluid 1.15rem–1.45rem Newsreader; 1rem Source Sans 3): Page introductions and ordinary explanations. Long passages use a 68ch measure and 1.55 body line-height.
- **Small body / compact** (0.9rem and 0.78rem): Supporting explanations and genuinely secondary copy.
- **Data / label** (0.72rem and 0.62rem IBM Plex Mono): Measured values, dates, sources, and short metadata. Strong control variants use 700 at the same sizes; status tags remain regular-weight so colour and wording carry the state.
- **Diagram** (0.58rem IBM Plex Mono): Embedded chart and map annotation. Never use this step for continuous prose; tiny annotation must be paired with visible structure or a fuller text equivalent.

**Root size:** Production uses one 18px root. Shared type, leading, and reading-measure tokens define the core scale; component-local exceptions are reserved for embedded charts, maps, and highly constrained labels.

**The Three-Register Rule.** Use serif for editorial hierarchy, sans-serif for explanation, and mono for evidence or interaction metadata. A component should not add a fourth typographic voice.

**The Mono Means Precision Rule.** Monospaced text should signal category, control, source, date, method, or measured value—not carry ordinary prose.

## Layout

Pages sit in a centred reading shell capped at 66rem, with 1.25rem horizontal padding and generous vertical section intervals. The background extends the analytical character beyond the content using a subtle 44px square grid that fades toward the bottom.

Primary route sections use a 3rem interval, reduced to 2rem for the first section immediately after route tabs. Inside a section, the heading and its supporting copy stay within the 68ch reading measure and sit 1.5rem above the evidence module. Search and ordering controls form a compact grid: the field gets the flexible column, actions retain their natural width, and counts remain visually secondary unless a filter is active.

The core spatial grammar is ruled grids. A strong 2–4px top rule introduces an analytical module, while 1px vertical and bottom rules join its cells into one composition. Independently actionable ward records use open card gaps; trustee records, candidate directories, forecast bands, and poll records use joined grids where their shared structure matters.

Responsive changes are content-driven rather than device-branded: methodology grids simplify at 850px; maps and high-frequency controls reflow at 760px; the masthead, long-form reading grids, and margin evidence translate at 680px; candidate and poll records adapt at 640px; trustee grids stack at 620px; ward controls stack at 520px; poll records simplify again at 480px; and the map panel compacts at 440px. Below 680px the shell uses 0.85rem horizontal gutters. The site navigation becomes a three-column wrapped grid, and route tabs remain horizontally scrollable. At 760px and below, and for coarse pointers at any width, listed high-frequency controls use a 44px minimum height.

**The Mobile Evidence Translation Rule.** On phones, preserve the claim and the evidence but change the presentation. Lead with a concise textual takeaway, place complex historical charts behind an explicit detail control, and reflow wide poll tables into complete vertical records. Dense geographic maps retain a list alternative, enlarge their invisible pointer geometry, and use one keyboard tab stop with spatial arrow-key navigation.

**The Joined Grid Rule.** When items form one analytical set, join them with shared rules and zero gap. Use open card gaps only for independently actionable records such as ward race cards.

## Elevation & Depth

The system is flat by default and uses no ambient box shadows. Depth comes from tonal paper shifts, strong-versus-soft rule weight, inset selection bars, coloured status edges, and occasional hatched fills. Hover states change the paper tone by one step; keyboard focus uses a separate 3px blue outline with a 3px offset.

Inset shadows are structural rather than atmospheric: a 3px bottom inset marks the active navigation or tab, and a 4px left inset encodes trustee-race context. The race map alone uses a tight 2px focus halo to keep a white focus stroke legible over neighbouring regions. The sticky methodology question index is the sole translucent surface, using a nearly opaque paper mix and 10px backdrop blur to preserve context over scrolling content.

### Structural Vocabulary

- **Active baseline** (`inset 0 -3px 0`): Marks the current route or selected route tab without lifting it.
- **Status edge** (`inset 4px 0 0`): Encodes trustee race context inside a joined grid.
- **Map focus halo** (`drop-shadow(0 0 2px)`): A functional keyboard-focus exception, never general card elevation.

**The No Ambient Shadow Rule.** Do not add ambient drop shadows or floating-card elevation. Use rules, inset state marks, a paper-tone change, or the documented map-focus exception.

## Shapes

Containers, controls, tags, inputs, and cards use square corners. The zero-radius geometry reinforces the document and table character, and adjoining edges should align cleanly.

Rounded geometry is reserved for data differentiation: Chow uses a circular marker, Bradford a square, and Alexander a diamond or hatched gold mark. Fully rounded values appear only for circular chart marks and legend dots. These silhouettes are semantic and must not become decorative motifs elsewhere.

**The Shape Carries Meaning Rule.** Preserve circle, square, diamond, and hatch distinctions wherever candidate data appears so colour is never the only identifier.

## Components

### Buttons and Segmented Controls

- **Shape:** Square, with adjacent buttons sharing a 1px outer rule and internal dividers.
- **Default:** Warm paper, midtone text, compact mono labels, and 0.4rem by 0.7rem padding.
- **Active:** Editorial Ink fill with inverse text for pressed choices; route-like variants use a 3px inset bottom rule.
- **State semantics:** Use `aria-pressed` for in-place choices and `aria-current` for route navigation. Hover shifts one paper tone; the global focus outline remains visible outside the control.

### Tags and Chips

- **Style:** Compact regular-weight mono uppercase text with either a 1px current-colour border or a pale semantic wash; standard padding is 0.15rem by 0.4rem.
- **Council state:** Red, amber, green, and grey families mean high attention, elevated attention, quiet race, and open seat.
- **Trustee state:** Clay, harbour, olive, ochre, and archival grey mean open race, two incumbents, one incumbent, prior win below a majority, and acclaimed.
- **Shape:** Always square; never convert status labels into soft pills.

### Cards and Containers

- **Ward cards:** Independent, open-gap records with a 4px semantic left edge, optional incumbent and evidence rows, and a one-step hover-paper shift.
- **Trustee cards:** Joined two-column records at wide viewports, with a structural 4px inset status edge, optional coverage, and compact facts; they stack at 620px.
- **Candidate directory:** Joined three-column disclosures, reduced to two columns at 640px. An open disclosure spans the grid and moves to Raised Paper.
- **Background:** Shared Newsprint at rest; Hover Paper for interactive feedback; Raised Paper for open disclosures and explanatory states.
- **Shadow strategy:** None beyond the documented structural insets.

### Inputs and Fields

- **Style:** Warm paper, 1px Editorial Ink border, 0.72rem mono input text, square corners, and 0.4rem by 0.6rem padding.
- **Label:** Strong uppercase mono text above the control; placeholders use Ghost Graphite without reducing entered-value contrast.
- **Focus:** The global 3px Civic Focus Blue outline with 3px offset.
- **Feedback:** Search counts remain programmatically live but become visually prominent only while filtering; no-match states name the query and suggest useful alternatives.

### Navigation

The centred masthead sets the publication name in Newsreader, followed by one concise uppercase mono descriptor and a five-link ruled navigation row. Mayor covers both candidates and polls; current route families use `aria-current`. At narrow widths the links wrap into a three-column grid.

Use the shared route-tab primitive for mayor and trustee route families. It owns full labels, equal distribution when space permits, current-page semantics, and narrow-screen horizontal scrolling. Use the list/map switcher only when a map exists; it defaults to List, persists the choice for the session, and uses grouped pressed-state buttons.

The sticky methodology question index is a separate reading aid: four linked questions on wide screens and a horizontally scrolling index on narrow screens.

### Editorial Headings

Use the page hero once at the start of a primary route when the page needs the standard ruled lead: one display title, optional editorial description, optional mono metadata, and an optional directly related coverage note. Do not add a kicker above shared primary-route titles.

Use the section heading for recurring analytical modules inside a route. It pairs one serif title with only directly supporting copy. Kicker-style mono text is reserved for true breadcrumbs and detail-page navigation, not as routine decoration above headings.

### Forecast Band Board

The signature forecast component is a joined ruled grid introduced by one heavy top rule on the board. Each neutral cell pairs a semantic candidate marker with a serif frequency phrase and may include one separated derived outcome. Candidate identity lives in the marker and data, while the card remains neutral. Exact raw probabilities do not belong in this presentation pattern.

### Charts and Maps

- **Polling chart:** Lazy-load the visual layer near the viewport, reserve its height to prevent layout shift, disable mark animation, and pair the `aria-hidden` graphic with an immediate text equivalent and complete poll archive. Preserve circle, square, diamond, and dashed-line distinctions.
- **Margin distribution:** Use ordinal bar height rather than numeric probability, candidate-colour stacking and hatching, a labelled SVG equivalent, and a concise mobile takeaway. At narrow widths place the detailed 42rem evidence canvas behind an explicit disclosure with a horizontal-scroll hint.
- **Race map:** Support council-attention, trustee-race-structure, and prior-winner-share palettes. Keep one roving tab stop, Arrow/Home/End movement, Enter/Space selection, 44px invisible hit geometry, a polite announcement, and a list alternative. In the side panel omit generic “Contested race,” geography already present in the heading, and open-seat incumbent restatements.
- **Poll archive:** Wide screens use a ruled table. At 640px it becomes complete labelled records; at 480px candidate and context cells simplify further without losing any field.

### Labels and State Copy

Use voter-facing terms consistently: say “candidates on the ballot” or “candidates in 2026,” use “attention” rather than “most watched,” distinguish “not available yet” from “no matches,” and name link destinations or outcomes. Keep legal election terms when they carry necessary meaning, then explain the consequence in plain language.

**The State Each Fact Once Rule.** A status tag, heading, fact row, and supporting sentence should not restate the same information. Keep the strongest scannable expression and retain secondary copy only when it adds a new fact or consequence.

## Do's and Don'ts

### Do:

- **Do** begin major analytical modules with a firm top rule and keep internal dividers lighter.
- **Do** use Newsreader for the claim, Source Sans 3 for the explanation, and IBM Plex Mono for the evidence label.
- **Do** keep candidate and status colours attached to explicit data meaning and pair colour with shape, hatch, text, or position.
- **Do** preserve the 68ch reading measure, responsive evidence translation, keyboard focus, reduced-motion behaviour, and non-colour cues.
- **Do** use warm paper, precise alignment, and one-statement-per-fact discipline to make dense civic information feel calm.

### Don't:

- **Don't** add rounded cards, pill-shaped general controls, ambient shadows, or floating dashboard surfaces.
- **Don't** introduce translucent effects beyond the documented sticky methodology index.
- **Don't** use candidate colours as decorative accents or to imply political endorsement.
- **Don't** replace ruled information structures with isolated generic cards when the items form one analytical set.
- **Don't** use monospaced type for long prose, serif type for dense metadata, or tiny diagram type without a fuller text equivalent.
- **Don't** animate charts, maps, or status changes merely to create activity.
- **Don't** repeat a status or fact in adjacent labels, headings, and explanatory copy.
