---
name: "Toronto Election 2026 · City Hall Watcher"
description: "CHW’s publication identity applied to an evidence-first municipal election guide."
colors:
  blue: "#274490"
  blue-dark: "#1e3574"
  deep: "#16264f"
  tint: "#eaeef9"
  paper: "#ffffff"
  card: "#ffffff"
  ink: "#16264f"
  body: "#38415a"
  muted: "#5c6478"
  faint: "#61697d"
  rule: "#e3e0d6"
  rule-soft: "#edeae0"
  nav-link: "#c9d4f0"
  drawer-link: "#dce3f5"
  on-deep: "#c9d2e8"
  on-deep-muted: "#8fa3cc"
  foot-text: "#93a2c4"
  foot-legal: "#8494bc"
  ghost-border: "#c7cee4"
  hover-border: "#cfd6e8"
  row-hover: "#fafaf6"
  field-bg: "#fcfcfa"
  field-border: "#cfd3d9"
  placeholder: "#6a7280"
  veil: "rgba(255,255,255,.10)"
  deep-rule: "rgba(255,255,255,.09)"
  chow: "#854A90"
  bradford: "#2E8B57"
  alexander: "#54C4CC"
  mcvie: "#D70404"
  parker: "#B2156E"
  vuln-high-fg: "#9b1c1c"
  vuln-high-line: "#ef4444"
  vuln-high-bg: "#fee2e2"
  vuln-med-fg: "#92400e"
  vuln-med-line: "#f59e0b"
  vuln-med-bg: "#fef3c7"
  vuln-low-fg: "#166534"
  vuln-low-line: "#22c55e"
  vuln-low-bg: "#dcfce7"
  vuln-open-line: "#999"
  vuln-open-bg: "#e5e5e5"
  trustee-open-fg: "#744838"
  trustee-open-line: "#8f604f"
  trustee-open-bg: "#efe4de"
  trustee-two-fg: "#36586d"
  trustee-two-line: "#58798d"
  trustee-two-bg: "#e4ecef"
  trustee-one-fg: "#4f6548"
  trustee-one-line: "#6c805f"
  trustee-one-bg: "#e6ece2"
  trustee-acclaimed-fg: "#5f5a53"
  trustee-acclaimed-line: "#7d7770"
  trustee-acclaimed-bg: "#ebe8e3"
  trustee-under-majority-fg: "#76591f"
  trustee-under-majority-line: "#94702e"
  trustee-under-majority-bg: "#f3ead5"
typography:
  display:
    fontFamily: "Schibsted Grotesk, sans-serif"
    fontSize: "clamp(2.1rem, 5.4vw, 3.4rem)"
    fontWeight: 800
    lineHeight: 1.12
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Schibsted Grotesk, sans-serif"
    fontSize: "clamp(1.6rem, 3.4vw, 2.3rem)"
    fontWeight: 800
    lineHeight: 1.12
    letterSpacing: "-0.02em"
  heading:
    fontFamily: "Schibsted Grotesk, sans-serif"
    fontSize: "1.2rem"
    fontWeight: 800
    lineHeight: 1.12
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Schibsted Grotesk, sans-serif"
    fontSize: "1.12rem"
    fontWeight: 700
    lineHeight: 1.2
  lead:
    fontFamily: "Hanken Grotesk, sans-serif"
    fontSize: "clamp(1.08rem, 2vw, 1.25rem)"
    fontWeight: 400
    lineHeight: 1.65
  body:
    fontFamily: "Hanken Grotesk, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.65
  body-small:
    fontFamily: "Hanken Grotesk, sans-serif"
    fontSize: "0.96rem"
    fontWeight: 400
    lineHeight: 1.65
  button:
    fontFamily: "Hanken Grotesk, sans-serif"
    fontSize: "1rem"
    fontWeight: 700
  nav:
    fontFamily: "Hanken Grotesk, sans-serif"
    fontSize: "0.94rem"
    fontWeight: 600
    letterSpacing: "normal"
  label:
    fontFamily: "IBM Plex Mono, monospace"
    fontSize: "0.68rem"
    fontWeight: 600
    letterSpacing: "0.1em"
  data:
    fontFamily: "IBM Plex Mono, monospace"
    fontSize: "0.76rem"
    lineHeight: 1.5
rounded:
  r-sm: "6px"
  r: "10px"
  r-lg: "16px"
  r-mark: "7px"
  r-pill: "999px"
spacing:
  gut: "20px"
  gut-wide: "32px"
  section-min: "48px"
  section-max: "84px"
  card-pad: "24px"
  grid-gap: "18px"
  stack: "14px"
  xs: "0.25rem"
  sm: "0.5rem"
  md: "0.75rem"
  lg: "1rem"
  xl: "1.5rem"
  2xl: "2rem"
  touch-target-min: "44px"
components:
  button-primary:
    backgroundColor: "{colors.blue}"
    textColor: "{colors.paper}"
    typography: "{typography.button}"
    rounded: "{rounded.r}"
    padding: "13px 24px"
  button-primary-hover:
    backgroundColor: "{colors.blue-dark}"
    textColor: "{colors.paper}"
  button-light:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.blue}"
    typography: "{typography.button}"
    rounded: "{rounded.r}"
    padding: "13px 24px"
  button-light-hover:
    backgroundColor: "{colors.tint}"
    textColor: "{colors.blue-dark}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.blue}"
    typography: "{typography.button}"
    rounded: "{rounded.r}"
    padding: "13px 24px"
  button-ghost-hover:
    backgroundColor: "{colors.tint}"
    textColor: "{colors.blue-dark}"
  masthead-nav:
    textColor: "{colors.nav-link}"
    typography: "{typography.nav}"
    rounded: "{rounded.r-sm}"
    padding: "10px 12px"
  masthead-nav-active:
    backgroundColor: "{colors.veil}"
    textColor: "{colors.paper}"
  route-tab:
    textColor: "{colors.muted}"
    rounded: "{rounded.r-sm}"
    padding: "10px 18px"
  route-tab-active:
    backgroundColor: "{colors.tint}"
    textColor: "{colors.blue}"
  forecast-tab:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.blue}"
    rounded: "{rounded.r}"
    padding: "12px 18px"
  forecast-tab-active:
    backgroundColor: "{colors.blue}"
    textColor: "{colors.paper}"
  segmented-control:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.blue}"
    rounded: "{rounded.r-sm}"
    padding: "9px 14px"
  segmented-control-active:
    backgroundColor: "{colors.blue}"
    textColor: "{colors.paper}"
  search-field:
    backgroundColor: "{colors.field-bg}"
    textColor: "{colors.ink}"
    rounded: "{rounded.r-sm}"
    padding: "10px 12px"
  race-card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.r-lg}"
    padding: "{spacing.card-pad}"
  race-status-tag:
    typography: "{typography.label}"
    rounded: "{rounded.r-pill}"
    padding: "4px 9px"
  methodology-disclosure:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.r-lg}"
    padding: "20px 24px"
---

# Design System: Toronto Election 2026 · City Hall Watcher

## Overview

**Creative North Star: "City Hall Watcher’s publication identity"**

Toronto Election 2026 uses the supplied City Hall Watcher world: a confident blue masthead, white reading surfaces, pale-blue section bands, warm hairlines and rounded cards. The publication identity is the organising idea. Election evidence remains the subject; the shell gives readers a recognisable place to inspect it.

Schibsted Grotesk supplies compact, heavy headlines; Hanken Grotesk carries generous running text; IBM Plex Mono identifies dates, sources and metadata. Sections begin directly with their headings, without kickers or eyebrows. Controls speak in words, while the supplied onward and external arrows retain CHW’s familiar reading cues.

The system is border-led and lightly responsive to interaction: linked cards lift on hover or keyboard focus, controls change colour, and mobile layouts preserve readable labels. Candidate and race-status palettes keep their established meanings inside charts, maps and badges. The scoped Kids Vote education experience sits within the same publication shell without turning its lesson styling into global rules.

**Key Characteristics:**

- CHW blue and deep navy around white paper and pale-blue sections.
- Heavy Schibsted headlines, open Hanken prose and small Plex metadata.
- Warm rule borders, rounded cards and restrained interaction lift.
- A supplied PNG mark paired with a live-text publication wordmark.
- Labelled navigation, visible keyboard focus and readable mobile controls.
- Election colours reserved for candidate identity and evidence meaning.

## Colors

The palette places cool publication blues against white surfaces and warm, quiet dividers. The frontmatter records the normative values; use the matching CSS variables from `src/styles/chw.css` and `src/app/globals.css`.

### Primary

- **CHW Blue** (`blue`): Masthead, links, primary controls, selected forecast views and focus outlines on light grounds.
- **Deep Navy** (`deep` / `ink`): Footer and dark bands; headings and strong text on paper.
- **Hover Blue** (`blue-dark`): Hovered primary buttons and links; mobile navigation drawer.
- **Pale Blue** (`tint`): Alternating sections, selected route links, callouts and chart tracks.

### Neutral

- **White Paper** (`paper` / `card`): The reading canvas, cards, inputs on focus and light buttons on dark grounds.
- **Reading Slate** (`body`), **Metadata Slate** (`muted`) and **Caption Slate** (`faint`): Running copy, secondary explanation and metadata.
- **Warm Rule** (`rule` / `rule-soft`): Card edges and internal dividers. These are decorative separators; text, fill and labels identify controls.
- **Navigation Light** (`nav-link` / `drawer-link`) and **Dark-Ground Text** (`on-deep`, `on-deep-muted`, `foot-text`, `foot-legal`): Distinct light roles for blue and navy grounds.
- **Control Neutrals** (`ghost-border`, `field-border`, `field-bg`, `placeholder`, `hover-border`, `row-hover`): Quiet field and secondary-control surfaces, borders and state cues.
- **Light Veil** (`veil`) and **Deep Rule** (`deep-rule`): Translucent white navigation state and navy-ground dividers.

### Election data

Candidate identities use `chow`, `bradford`, `alexander`, `mcvie` and `parker`; residual values use the existing muted neutral. Candidate soft variants remain the source `color-mix()` expressions in global CSS rather than independent brand colours. Shapes and explanatory text accompany candidate marks.

Council attention uses high, elevated, quiet and open families. Their foreground, line and background roles come from `vuln-*` variables; the internal variable name does not change public-facing attention terminology. Map hover colours remain owned by the map styles. Trustee colours describe open contests, two or one incumbents, acclamation and prior wins below a majority. They are separate descriptive categories, not win probabilities or council attention levels.

**The Data Meaning Rule.** Keep candidate and race-status colours inside their evidence contexts. They are data encodings, not additional CHW brand accents.

**The Ground-Aware Text Rule.** On blue or deep grounds, use the implemented light text and focus colours. Paper-ground muted text and blue links do not transfer to dark bands.

## Typography

**Display Font:** Schibsted Grotesk, with sans-serif fallback.
**Body Font:** Hanken Grotesk, with sans-serif fallback.
**Label/Mono Font:** IBM Plex Mono, with monospace fallback.

All three families are self-hosted with `next/font` in the root layout. The heavy, tightly tracked display ramp gives the publication its direct civic voice; relaxed body leading supports sustained explanation. Headings balance their wrapping and paragraphs use pretty wrapping.

### Hierarchy

- **Display:** Fluid page titles with heavy weight, tight tracking and compact leading; the frontmatter’s `display` role is also the page-title token.
- **Headline:** A smaller fluid ramp for section titles (`headline`).
- **Heading / Title:** Card headings use `heading`; candidate and disclosure names use the more moderate `title` role and weight.
- **Lead:** Fluid Hanken introductions, generally constrained to (62ch).
- **Body:** Default reading text is (17px), with leading (1.65); prose may use the reading measure (68ch). `body-small` supports cards, notes and tables.
- **Navigation / Buttons:** Hanken labels use sentence case and clear medium-to-bold weight. Mono class names on legacy markup do not override the implemented control styles.
- **Label / Data:** Plex differentiates status words and evidence dates. Status labels are uppercased by CSS; source text remains sentence case. Dense charts retain their own data geometry and label sizes rather than borrowing display type.

**The Family Roles Rule.** Use Schibsted for headings and figures, Hanken for reading and controls, and Plex for metadata. Existing newsreader and source-sans variable names are compatibility aliases to the new families.

## Layout

The standard content wrapper has a maximum outer width (1080px), including its side padding: gutters are (20px) below (768px) and (32px) from that breakpoint. This gives a desktop inner measure of (1016px), not 1080px plus gutters. A narrow wrapper is available at (760px). Sections use fluid vertical padding (`clamp(48px, 7vw, 84px)`), with white and tint providing the recurring reading rhythm. Card padding, grid gaps and stacked spacing use the frontmatter scale.

The sticky masthead is (80px) tall on desktop and (72px) below (860px). Mobile uses a labelled Menu / Close button and a full-width dark-blue drawer. Route navigation retains its complete labels in a horizontally scrolling row. Forecast view controls stack below (701px). Candidate directories move from three columns to two at (700px), then one at (440px); race directories have their own two-to-one change at (620px). Poll tables become labelled mobile records at (640px). These are component behaviours, not a requirement that every new screen use the same grid.

The methodology navigation uses five equal desktop columns for its five anchors and switches to a horizontal mobile strip at (700px). It sits below the masthead and its section anchors account for the stacked sticky region. Footer columns become (1.4fr 1fr 1fr) from (720px). Adapt shared spacing and reading order to the content; page-specific chart and map geometry stays with those components.

## Elevation & Depth

White cards and warm borders establish grouping at rest. Pale-blue bands supply tonal depth; the masthead and footer provide stronger publication boundaries. Linked race cards respond to hover and keyboard focus with a subtle blue-grey shadow and upward movement (2px). The exact lift and field-focus halo live in the sidecar because they are outside the frontmatter component schema.

**The Border at Rest Rule.** Cards separate with warm hairlines at rest. Use the subtle lift for linked-card interaction, never as the default shadow on every surface.

Interaction transitions are short (0.12–0.18s, ease): navigation and controls shift colour, linked cards shift border and lift, and buttons press down (1px). Reduced motion disables smooth scrolling and effectively removes animation and transitions; card movement is explicitly suppressed. Do not introduce ambient movement into evidence reading.

## Shapes

Use softly rounded forms by role: small controls, inputs and navigation use `r-sm`; buttons and callouts use `r`; cards, maps, table containers and disclosure groups use `r-lg`. Status badges use `r-pill`. The supplied mark uses `r-mark` at a displayed size (30px). Warm hairline borders are normally (1px). Candidate markers and chart marks retain the shapes required by their data semantics.

## Components

### Buttons

Confident Hanken labels sit in gently curved controls. The primary variant is white on CHW Blue; hover darkens the blue. Light buttons place blue labels on white within navy bands, changing to tint on hover. The source ghost variant uses a transparent ground and ghost border for secondary actions. Standard padding is (13px 24px); small source buttons use (9px 16px). A press moves the control down (1px). Focus is a (3px) outline offset (2px), with light outlines substituted on dark grounds.

### Chips

Race tags are compact rounded pills with Plex status words, padding (4px 9px), and the relevant foreground/background pair. They describe evidence or field context and are not buttons. Retain written status meaning; interactive filters belong to the control patterns below.

### Cards / Containers

Cards use white fill, `r-lg` corners, a warm rule border and `card-pad` inset. Linked race cards have the interaction lift described above; information-only candidate cards stay border-led. Candidate disclosures keep names and campaign links distinct. Maps and poll tables share the rounded container language while retaining their own internal geometry.

### Inputs / Fields

Directory search is a labelled Hanken field on the field background, with the field border, `r-sm` corners and padding (10px 12px). On focus the background becomes white, the border blue, and the blue halo replaces the generic outline. Placeholder text uses its dedicated token; it is not the accessible label. Named controls have a minimum touch height (44px).

### Navigation

Masthead links use light navigation text on blue, Hanken at medium weight, and `r-sm` corners. Hover and current-page state add the light veil and white text; `aria-current` supplies the semantic state. The mobile drawer preserves those words, closes on route selection or outside press, and supports Escape with focus returned to the toggle. Focus outlines are white in the masthead and navigation-light in the footer.

Route tabs use blue-on-tint selected state, warm rules around their strip and a minimum height (44px). They are links with `aria-current`, not view-switch buttons. Forecast tabs use bordered white controls, blue selected fill, and the existing tab/panel keyboard model. Segmented map/list and sort controls use blue selected fill with `aria-pressed`; evidence-lens controls use a blue underline instead. Preserve these differences in interaction semantics.

### Publication headings and disclosures

Page heroes begin with a left-aligned display heading, followed by a Hanken introduction and Plex evidence metadata. Section headings stand on their own. The user explicitly removed kickers and eyebrows throughout this frontend; omit them even where the supplied source system includes them. Ward numbers belong inline in directory card headings, and breadcrumbs remain functional navigation.

Methodology disclosures are native `details` / `summary` groups within a rounded bordered container. Their summary pairs a Schibsted title with smaller Hanken context, gives a visible open/closed indicator, and uses roomy insets (20px 24px). The expanded content uses (24px) padding; narrower layouts reduce horizontal padding to (18px). Preserve keyboard focus and written titles when adding disclosures.

The publication mark is the supplied PNG in `public/brand`, with its source origin embedded in image metadata. Pair it with the live-text name in masthead and footer; do not create a replacement mark. Source text glyphs →, ↗ and · retain onward, external and joined-fact meanings. CSS chevrons and disclosure indicators follow the implemented controls; a new icon library is unnecessary.

## Do's and Don'ts

### Do:

- **Do** use the supplied CHW colour and font variables when a matching token exists.
- **Do** keep the PNG mark beside the live-text City Hall Watcher wordmark, with the election edition as supporting text.
- **Do** retain sentence-case headings and → / ↗ cues where they explain link meaning.
- **Do** preserve named candidate and race-status meanings with text and non-colour cues.
- **Do** provide the ground-appropriate focus outline and respect reduced motion.
- **Do** adapt columns to content and viewport while keeping navigation labels readable.

### Don't:

- **Don’t** add kickers or eyebrows above page, section or card headings.

- **Don’t** reintroduce the superseded warm-paper, Newsreader and square-card broadsheet identity.
- **Don’t** redraw the supplied PNG mark as SVG or replace it with generated imagery.
- **Don’t** treat candidate, council-attention or trustee-context colours as interchangeable decorative accents.
- **Don’t** apply paper-ground text colours to the blue masthead or deep navy footer.
- **Don’t** truncate navigation labels or encode status by colour alone.
- **Don’t** make a particular page’s chart, directory or lesson composition a universal layout requirement.
