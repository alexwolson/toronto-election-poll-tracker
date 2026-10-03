# City Hall Watcher design system

Read this file before building or changing any UI in this project. It is the source of truth for colour, type, spacing and components. Values come from cityhallwatcher.com's own stylesheet.

## How to use it

1. Load `css/chw.css` once, globally. It contains the Google Fonts import, every token as a CSS variable, base element styles and all component classes.
2. Build with the components:
   - **Plain HTML or any framework:** use the class names shown in `examples/index.html` (`.masthead`, `.btn btn--primary`, `.card`, `.kicker`, `.section section--tint`, `.wrap`). That file is the reference page; copy its markup patterns.
   - **React:** `import { Masthead, Button, AppCard } from './chw-design-system/react/chw.jsx'`. Props are typed in `react/chw.d.ts`; usage rules per component are in `components/<Name>.md`.
   - **Tailwind:** add `tokens/tailwind.preset.js` to `presets`. It maps to the same CSS variables (`bg-chw-blue`, `text-chw-ink`, `font-display`, `rounded-r-lg`), so `chw.css` or `tokens/tokens.css` must still be loaded.
3. For one-off styling, use the variables (`var(--blue)`, `var(--r-lg)`) or the `.t-*` type classes. Never hard-code a hex value or font size that a token already covers.

## Rules

- Every section is `<section class="section">` (or `section--tint`, alternating) with a `.wrap` inside, opening with a `.kicker` then an `h2`.
- Page order: Banner (optional), Masthead, hero, ProofBar, alternating sections, CTABand, Footer.
- One primary button per view. `btn--light` only on blue or deep grounds. Ghost for secondary links.
- Cards separate with a `--rule` border, not shadows. `--shadow-lift` only for hover and the hero photo.
- Accents are rationed: `--amber` only in the Banner, `--archive-ink` only for feature eyebrows, `--archive` only for the quote rule, `--live` only for LIVE and form errors.
- On `--deep` grounds use `--on-deep`, `--on-deep-muted`, `--nav-link`; never the paper-ground text colours.
- Access is always a Badge with words (SUBSCRIBERS, FREE), never colour alone.
- No icon library and no emoji. Use → for onward links, ↗ for external links, · to join facts.
- Focus: 3px solid `--blue` outline, 2px offset (already in `chw.css`). Respect `prefers-reduced-motion` (already in `chw.css`).
- Logo: `assets/logos/chw-mark-64.png` at 30px with `--r-mark` corners, always beside the live-text wordmark. PNG only; do not redraw it as SVG.
- Copy: sentence case, Canadian spelling, curly quotes, exact prices with tax.

## Brand guide

### Content fundamentals

**Voice.** First person, from Matt, plain and a little wry. The tagline sets the register: "Toronto City Hall, in nerdy detail." Asides are allowed ("The newsletter is the centre of City Hall Watcher, but wait, there's more.") as long as the sentence still carries a fact.

**Who's addressed.** "You" for the reader, "I" for Matt, "we" for the apps ("We've got apps to help you understand what's going on").

**Specifics over adjectives.** Name the thing: agenda items, staff reports, voting records, the Lobbyist Registry. Figures are exact and include tax: "$6.78/month or $67.80/year, HST included. Cancel anytime."

**Casing.** Headlines and titles in sentence case ("The stuff other outlets don't have room for"). Proper names keep their caps: Council, City Hall, Mayor. Kickers, badges and mono labels are written in sentence case and uppercased by CSS.

**Spelling and punctuation.** Canadian spelling (centre, colour). Curly quotes and apostrophes. A middle dot joins two facts in a kicker ("A newsletter by Matt Elliott · Since 2019"). → marks an onward link on this site ("Full archive →"); ↗ marks a link out to another domain ("live.cityhallwatcher.com ↗").

**Access labels.** Paid items say SUBSCRIBERS, open items say FREE or FREE FOR EVERYONE. Always as a Badge, never only as colour.

No emoji anywhere.

### Visual foundations

**Colour.** `paper` is the page. `blue` is the brand: masthead, primary buttons, links, proof figures. `deep` navy carries the dark bands (banner, CTABand, Footer). `tint` alternates with paper between sections and fills callouts and the checked state. Headlines are `ink`, running text is `body`, small print is `muted` or `faint`. Hairlines are the warm `rule` and `rule-soft`, a deliberate off-white grey-beige against the cool blues.

Accents are rationed. `amber` appears only in the announcement banner. `archive-ink` gold is only the feature-card eyebrow, and `archive` gold only the quote's left rule. `live` red means happening now (LIVE badge) or a form problem (required mark, invalid border). Status badges use `free-bg`/`free-ink`, `tint`/`blue`, `soon-bg`/`soon-ink`.

On deep grounds every colour is restated: text `on-deep`, kickers and notes `on-deep-muted`, links `nav-link`, footer text `foot-text`, legal `foot-legal`. Paper-ground colours drop to about 1.6:1 there.

**Type.** Three Google families. Schibsted Grotesk (`--font-display`) at 800 with -0.02em tracking and 1.12 leading for `h1`, `h2`, `h3`, the wordmark and figures; 600 to 700 for post titles, FAQ questions and form labels. Hanken Grotesk (`--font-body`) at 17px / 1.65 for running text (`body`), with `lede` for intros. IBM Plex Mono (`--font-mono`) for `kicker`, `label`, `meta` and `note`: uppercase, tracked 0.1 to 0.16em, small. Headlines use balanced wrapping; paragraphs use pretty wrapping. Headline sizes are fluid (`clamp()`); the styles here record the desktop cap.

**Layout.** Content sits in a `wrap` of 1080px with a `gut` of 20px on phones and `gut-wide` 32px from 768px. Prose pages narrow to `wrap-narrow` 760px. Sections pad `section-min` to `section-max` (48 to 84px) and alternate paper and tint. Every section opens with a Kicker then an h2. Grids collapse to one column on phones; features go three-up at 700px, apps and quotes two-up at 780 to 820px. The hero splits 1.15fr / 0.85fr from 900px with the photo right; on phones the copy and signup come first and the photo becomes a band capped at 340px.

**Surfaces.** Cards are `card` white with a 1px `rule` border and `r-lg` (16px) corners. Borders do the separating; shadows are rare. `shadow-lift` is for the hero photo and for a hovered linked AppCard, which also rises 2px. `shadow-panel` puts the white signup panel on the deep CTA band.

**Radii.** `r-sm` 6px for inputs, nav links and choices; `r` 10px for buttons and callouts; `r-lg` 16px for cards and the hero photo; `r-pill` for badges and pills; `r-mark` 7px for the 30px logo.

**Motion.** Short and functional: 0.12 to 0.18s ease on colour, border and shadow; buttons press down 1px; the FAQ chevron rotates. Smooth scrolling and all transitions turn off under `prefers-reduced-motion`.

**Focus.** Every interactive element shows a 3px solid `blue` outline offset 2px (9.1:1 on paper, 7.8:1 on tint). Text fields swap the outline for a blue border plus `shadow-focus`.

**Imagery.** Real photographs of Matt at events (podium, panel), saturated and unfiltered, in a 16px-cornered frame with `shadow-lift`. App screenshots at 16:10 on a tint ground. No illustration, no stock.

**Contrast notes.** These source pairs miss a floor and are kept exact: `live` with white text is 4.48:1 (the LIVE badge); `field-border` (1.5:1) and `ghost-border` (1.6:1) are under 3:1 for control borders, so the label, fill and text carry those controls; `archive` is 3.1:1 and is never text.

### Iconography

There is no icon set. The site uses text glyphs (→, ↗, ·), a CSS-drawn chevron on the FAQ, a two-stroke × on the banner close, and the binoculars mark (`assets/logos`). Keep it that way: if an icon seems necessary, prefer a word. The mark exists only as PNG (largest 180px); don't redraw it as SVG.



## Tokens

### Colour

| Variable | Value | Use |
|---|---|---|
| `--blue` | `#274490` | Brand blue. Masthead ground, primary buttons, links, proof numbers, focus outline. White text on it is 9.1:1. |
| `--blue-dark` | `#1e3574` | Hover state for blue buttons and links; mobile nav drawer ground. |
| `--deep` | `#16264f` | Navy. Announcement banner, CTA band and footer grounds. |
| `--tint` | `#eaeef9` | Pale blue. Alternating section grounds, callouts, paid badge, pill, checked choice. Blue text on it is 7.8:1. |
| `--paper` | `#ffffff` | Page background. |
| `--live` | `#d8402a` | Live red. LIVE badge ground, required-field asterisk, invalid field border. White text on it is 4.48:1, a hair under AA at the badge size: kept exact from the source. |
| `--archive` | `#b98a2e` | Archive gold. Quote left rule only. 3.1:1 on paper, so never use it for text; use archive-ink. |
| `--archive-ink` | `#8f6a1e` | Gold text: feature-card eyebrows (EVERY ISSUE, MONTHLY). 4.9:1 on paper. |
| `--card` | `#ffffff` | Card, app card, post list and form panel fill. |
| `--ink` | `#16264f` | Headings, post titles, labels, strong text on paper and tint. 14.7:1 on paper. |
| `--body` | `#38415a` | Running text on paper and tint. 10.1:1 on paper. |
| `--muted` | `#5c6478` | Kickers, mono labels, help text, captions on paper (5.9:1) and tint (5.1:1). |
| `--faint` | `#61697d` | Post dates and photo captions on paper (5.5:1) and the post-row hover (5.3:1). |
| `--rule` | `#e3e0d6` | Warm hairline: card borders, section dividers, FAQ rules. Decorative only (1.3:1). |
| `--rule-soft` | `#edeae0` | Softer hairline between rows inside a card (post list, app screenshot base). |
| `--amber` | `#f0c560` | Banner NEW flag ground and banner CTA text, on deep only (9:1). The one warm accent on dark bands. |
| `--nav-link` | `#c9d4f0` | Masthead nav links on blue (6.1:1); links on deep in the CTA band and footer (9.9:1). |
| `--drawer-link` | `#dce3f5` | Links in the mobile nav drawer on blue-dark. |
| `--banner-close` | `#b9c4e0` | Banner close icon on deep. |
| `--on-deep` | `#c9d2e8` | Running text in the CTA band on deep (9.7:1). |
| `--on-deep-muted` | `#8fa3cc` | Kickers, signup notes and footer column heads on deep (5.8:1). |
| `--foot-text` | `#93a2c4` | Footer body text on deep (5.8:1). |
| `--foot-legal` | `#8494bc` | Footer legal line on deep (4.9:1). |
| `--ghost-border` | `#c7cee4` | Ghost button border. 1.6:1 on paper: below the 3:1 control-border floor, kept exact from the source; the label carries the button. |
| `--hover-border` | `#cfd6e8` | Linked app card border on hover. |
| `--link-rule` | `#c0c9e2` | Underline rule under quote citation links; choice border on hover. |
| `--row-hover` | `#fafaf6` | Post row hover and post-list footer ground. |
| `--choice-hover` | `#fbfbf8` | Form choice hover ground. |
| `--field-bg` | `#fcfcfa` | Text input and textarea fill at rest (white on focus). |
| `--field-border` | `#cfd3d9` | Text input border at rest. 1.5:1 on paper: below the 3:1 floor, kept exact from the source; focus turns it blue with a halo. |
| `--placeholder` | `#6a7280` | Input placeholder text on field-bg (4.7:1). |
| `--free-bg` | `#e3efe6` | FREE badge ground and success tick ground. |
| `--free-ink` | `#2a6b3d` | FREE badge text (5.4:1 on free-bg); success panel left rule. |
| `--soon-bg` | `#f6eedc` | SOON badge ground. |
| `--soon-ink` | `#8a6516` | SOON badge text (4.6:1 on soon-bg). |
| `--error-bg` | `#fbeae7` | Form error message ground. |
| `--error-ink` | `#8c2718` | Form error message text (7.5:1 on error-bg). |
| `--focus-halo` | `rgba(39,68,144,.16)` | 3px halo around a focused text field. |
| `--veil` | `rgba(255,255,255,.10)` | Hover and current-page wash behind nav links on blue; banner close hover. |
| `--deep-rule` | `rgba(255,255,255,.09)` | Hairlines on deep (footer top and legal divider). |

### Spacing, radius, shadow

| Variable | Value | Use |
|---|---|---|
| `--gut` | `20px` | Page side gutter on phones. |
| `--gut-wide` | `32px` | Page side gutter from 768px. |
| `--wrap` | `1080px` | Max content width. |
| `--wrap-narrow` | `760px` | Max width for prose pages (Write for CHW, FAQ). |
| `--section-min` | `48px` | Section vertical padding on phones; scales clamp(48px, 7vw, 84px). |
| `--section-max` | `84px` | Section vertical padding on desktop. |
| `--card-pad` | `24px` | Card padding. |
| `--grid-gap` | `18px` | Gap in feature and quote grids. |
| `--stack` | `14px` | Default gap between stacked blocks. |
| `--r-sm` | `6px` | Inputs, nav links, choices, error message, small controls. |
| `--r` | `10px` | Buttons, callouts, signup panel, quote right corners. |
| `--r-lg` | `16px` | Cards, app cards, post list, hero photo, forms. |
| `--r-mark` | `7px` | Corners of the 30px binoculars mark in masthead and footer. |
| `--r-pill` | `999px` | Badges, pills, banner flag, success tick. |
| `--shadow` | `0 1px 2px rgba(22,38,79,.05), 0 4px 14px rgba(22,38,79,.05)` | Resting lift. Used sparingly; most surfaces rely on a rule border instead. |
| `--shadow-lift` | `0 2px 4px rgba(22,38,79,.06), 0 12px 32px rgba(22,38,79,.10)` | Hero photo, hovered or focused app card. |
| `--shadow-focus` | `0 0 0 3px rgba(39,68,144,.16)` | Focused text field halo, with a blue border. |
| `--shadow-panel` | `0 1px 2px rgba(0,0,0,.16), 0 10px 28px rgba(0,0,0,.22)` | White signup panel sitting on the deep CTA band. |

### Type

Families: `--font-display` Schibsted Grotesk, `--font-body` Hanken Grotesk, `--font-mono` IBM Plex Mono (also available as `--f-display`, `--f-body`, `--f-mono`).

| Class | Family | Size / leading / weight / tracking | Use |
|---|---|---|---|
| `.t-h1` | display | 54.4px / 1.12 / 800 / -0.02em | Page headline. Fluid: clamp(2.1rem, 5.4vw, 3.4rem); 54.4px is the desktop cap. Ink, balanced wrap. |
| `.t-h2` | display | 36.8px / 1.12 / 800 / -0.02em | Section headline. Fluid: clamp(1.6rem, 3.4vw, 2.3rem). |
| `.t-h3` | display | 19.2px / 1.12 / 800 / -0.01em | Card and feature titles (1.2rem). |
| `.t-proof-number` | display | 24px / 1.1 / 800 | Big figures in the proof bar, in blue. |
| `.t-brand-name` | display | 18.4px / 1 / 800 / -0.01em | Wordmark beside the binoculars mark, white on blue (16.8px under 480px). |
| `.t-app-name` | display | 17.92px / 1.12 / 800 / -0.01em | App card titles. |
| `.t-faq-question` | display | 16.48px / 1.12 / 700 / -0.01em | FAQ summary lines. |
| `.t-post-title` | display | 16px / 1.35 / 600 / -0.005em | Rows in the recent-issues list. |
| `.t-field-label` | display | 15.68px / 1.4 / 700 | Form labels and legends. |
| `.t-lede` | body | 20px / 1.65 / 400 | Hero lede, clamp(1.08rem, 2vw, 1.25rem); section ledes cap at 1.2rem, max 62ch. |
| `.t-body` | body | 17px / 1.65 / 400 | Default running text, colour body. |
| `.t-body-small` | body | 15.36px / 1.65 / 400 | Card copy, callouts, FAQ answers (.95–.97rem). |
| `.t-button` | body | 16px / 1.2 / 700 | Button labels; 14.4px on small buttons. |
| `.t-nav` | body | 15.04px / 1.2 / 600 | Masthead nav links. |
| `.t-kicker` | mono | 11.52px / 1.4 / 500 / 0.16em | Uppercase eyebrow above every section headline, muted. |
| `.t-label` | mono | 10.88px / 1.4 / 600 / 0.1em | Uppercase badges, proof-bar labels, feature eyebrows, footer heads. |
| `.t-meta` | mono | 12.16px / 1.5 / 400 / 0.02em | App URLs, post dates, citations, list footers. |
| `.t-note` | mono | 11.84px / 1.7 / 400 | Pricing and signup fine print; strong parts in ink. |

## Files

- `css/chw.css`: everything in one stylesheet (fonts, tokens, base, components)
- `tokens/tokens.css`, `tokens/tokens.json`, `tokens/tailwind.preset.js`: tokens alone
- `react/chw.jsx`, `react/chw.d.ts`: React 18 components
- `components/*.md`: when and how to use each component
- `examples/index.html`: a complete reference page in plain HTML
- `assets/logos`, `assets/screenshots`: the mark and app screenshots
