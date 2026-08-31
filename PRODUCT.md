# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The primary users are Toronto voters following the 2026 municipal election. They need to understand what the available evidence says about the mayoral, council, and school-board races without needing specialist knowledge of polling or election modelling.

Journalists, campaigns, researchers, and highly engaged civic observers may also use the site, but decisions should preserve clarity and usefulness for the general voting public.

## Product Purpose

Toronto Election 2026 is an evidence-first public guide to Toronto's 2026 municipal election. It combines a cautious mayoral forecast, the underlying public polling record, and factual context for mayoral, council, and trustee candidates and races.

Success means helping voters distinguish what could happen, what pollsters reported, and what is factually known about candidates and local races. The product should make uncertainty and evidence limits understandable rather than conceal them behind false precision.

## Positioning

The product brings forecasting, polling, candidate history, and local-race context into one public guide while keeping their claims visibly separate. Its defining mechanism is publication discipline: model outputs appear only at precision that survives the project's checks, unstable quantities are withheld, and methodology and sourcing remain available in plain language.

## Operating Context

The site is used throughout the 2026 Toronto municipal campaign as candidate fields, polls, and race evidence change. Visitors may arrive for a quick answer about the mayoral race, to inspect the polling record, to learn who is running, or to understand which council and trustee contests merit closer attention.

The frontend presents coherent, versioned artifacts produced by the repositories that own election facts, polling observations, and modelling. Production builds resolve compatible releases together and embed a reproducible snapshot; local development may use validated fixtures.

## Capabilities and Constraints

- Presents the mayoral forecast as probability bands and plain-language frequency phrases rather than fragile exact percentages.
- Preserves the public polling record and descriptive trends separately from the election forecast.
- Covers the certified mayoral field and confirmed election histories where available.
- Covers Toronto's 25 council wards with attention signals and factual race context, not candidate win probabilities.
- Covers Toronto District School Board and Toronto Catholic District School Board trustee races and candidate histories.
- Explains methodology, uncertainty, evidence thresholds, terminology, sources, and attribution in public-facing language.
- Hides quantities that fail publication checks rather than implying that missing or unstable results are zero.
- Fails closed in production when required release data is missing, malformed, incompatible, or unverifiable. Development fallbacks must remain clearly non-production.
- Keeps the forecast, polling record, council attention signals, and factual candidate information distinct in both language and presentation.
- The frontend performs presentation, accessibility, responsive behaviour, defensive schema validation, and feed loading. It does not infer identities, join raw datasets, smooth polls, run models, or derive factual labels from raw election records.
- The incumbent application is a statically rendered Next.js web project deployed from coherent, immutable data releases.

## Brand Commitments

The product name is **Toronto Election 2026**. Its voice is plain-language, civic-minded, precise, and candid about uncertainty. It must distinguish reported facts, descriptive summaries, historical associations, and forecasts without overstating any of them.

## Evidence on Hand

- Validated preview feeds for the certified-state experience live in `fixtures/`. They are development fixtures, not production results.
- The frontend's feed contracts and defensive validation live in `src/lib/feeds.ts` and `src/types/feeds.ts`.
- Public methodology content and evidence-threshold explanations live in `src/app/how-it-works/page.tsx` and `src/lib/methodology.ts`.
- The release architecture and publication boundaries are recorded in `docs/superpowers/specs/2026-08-26-three-repo-data-architecture-design.md`.
- The forecast's band-based publication rules are recorded in `docs/superpowers/specs/2026-08-21-frontend-rebuild-design.md`.
- The site has no testimonials, customer claims, endorsements, or case studies on hand. Future work must not fabricate them.

## Product Principles

1. **Keep different kinds of evidence distinct.** A forecast, a poll, a historical association, and a confirmed candidacy answer different questions.
2. **Publish only defensible precision.** Prefer a stable band, a careful description, or a withheld result to an exact number the evidence cannot support.
3. **Let voters inspect the reasoning.** Explain methods, sources, limitations, and terminology in language a non-specialist can use.
4. **Protect data integrity at the product boundary.** Render coherent validated releases and fail visibly when production inputs are not trustworthy.
5. **Cover the whole civic choice.** Treat mayoral, council, and trustee contests as meaningful parts of the same municipal election while respecting the evidence available for each.

## Accessibility & Inclusion

The product must remain usable with keyboard navigation, assistive technology, and across mobile and desktop web layouts. Charts, maps, controls, and status changes require meaningful text or programmatic equivalents. Plain language and non-colour cues are part of making election evidence usable to the public.
