---
version: 1
slug: "frontend-chw"
primary_target: "src/app/layout.tsx"
related_targets: ["src/app", "src/components", "src/styles"]
---

## Scope

Rebuild the public election frontend in the supplied City Hall Watcher system.
Visitor mode: Read, with Operate behaviour for filtering, maps and chart controls.
The user's supplied CHW design guide and reference page pin the visual direction.
No replacement aesthetic, synthetic campaign imagery or marketing claims are needed.

## Direction contract

THESIS: Let Toronto voters read the forecast, inspect polls and find local races within City Hall Watcher’s publication identity.

OWN-WORLD: CHW blue masthead, white paper and pale-blue sections, Schibsted headings, Hanken prose, Plex metadata, warm rules, rounded border-only cards and the supplied PNG mark.

STORY: Read the mayoral outcome, inspect its margin and alternate views, follow the underlying polling, then explore candidates and local races.

FIRST VIEWPORT: Compact blue brand/navigation above a large left-aligned forecast claim and evidence date; the three named margin outcomes follow. Phone navigation collapses into a labelled Menu; chart tabs retain keyboard navigation.

FORM: User-pinned CHW reference composition. Impeccable seed c9d4f8b6 yields to the explicit supplied system. Source examples, rather than generated raster comps, are the fidelity reference.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Preserved product truth

All forecast calculations, evidence dates, poll denominators, candidate identities,
feed contracts, release inputs and local-race labels keep their existing meaning.
Candidate colours and semantic map/status palettes remain data encodings, not brand
accents. The hidden Kids Vote lesson retains its interactions and official character
art within the shared CHW shell.

## Source assets

CHW's supplied stylesheet and design guide are vendored under src/styles. The only
stylesheet adaptation removes its external Google Fonts import; next/font self-hosts
the same three families. Logo and favicon retain the supplied export’s pixels, with their source
origin embedded as PNG metadata. No generated raster assets ship with this rebuild.
