# CHW frontend styles

The supplied City Hall Watcher system is the visual authority. Its original guide
is retained in `CHW-DESIGN.md`; the root `DESIGN.md` records this frontend's use of it.

Styles load in this order from `src/app/globals.css`:

1. `chw.css`: the supplied `chw-design-system/css/chw.css`. The Google Fonts import
   is removed because `src/app/layout.tsx` self-hosts the same three font families
   through `next/font`.
2. `election-layout.css`: existing structural rules for charts, maps, candidate
   histories, directories and responsive tables. Superseded publication-shell
   rules were removed during the migration.
3. `election.css`: CHW treatments for the election components and mobile navigation.

`globals.css` maps the existing election token names onto CHW tokens so shared
components continue to render consistently. Candidate colours and race-status
palettes remain semantic data encodings. Use CHW tokens for new interface styling;
keep data encodings distinct from publication branding.

Use `ContentSection`, `PageHero`, `SectionHeading` and `RouteTabs` for shared page
structure. `ContentSection` owns the full-width section and its inner `.wrap`.
The Kids Vote lesson retains its scoped illustrations and teaching interactions
inside the shared publication masthead and footer.
