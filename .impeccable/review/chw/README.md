# CHW frontend rebuild verification

Branch: `redesign/chw-design-system`.

The user explicitly selected the supplied `chw-design-system`. Its design guide,
stylesheet and component examples govern this rebuild. The original guide is
retained in `src/styles/CHW-DESIGN.md`.

## Verification

- `npm test`: 35 files, 326 tests pass, including mobile-menu interaction tests.
- `npm run lint`: passes with zero warnings.
- `FEED_LOCAL_DIR=./fixtures npm run build`: compiles, typechecks and exports 68 pages.
- Browser checks at 320, 390, 916 and 1280px show no document overflow.
- Menu navigation, map switching and loaded forecast-history charts checked in the
  production static preview. Desktop and mobile screenshots cover all primary
  page types and the existing Kids Vote lesson.
- Brand PNGs retain the supplied pixels and embed source-origin metadata;
  Impeccable provenance scan reports two rasters, zero missing.

The preview uses existing repository fixtures. Its dates and numbers are fixture
inputs, and denominator-related unavailable states reflect those inputs. No feeds,
release pins, polling inputs or model assumptions were changed.

## Independent Impeccable finish review

The initial capture check requested new polls screenshots because a sticky
masthead was captured at the current scrolled position. Those captures were
replaced at document-top scroll position with charts loaded.

The full review found CHW type, material, grounds, shell and controls faithful to
the supplied system. It requested one fix: five methodology links occupied a
four-column desktop grid. The desktop grid now has five columns; the mobile strip
continues to scroll horizontally. The production build and same-viewpoint captures
were refreshed after that fix.

Final verdict: `ship`. The material fix is resolved, with no visible introduced
regressions. The verdict covers the scored correction following the full review.

`detector.json` records the single mechanical pass against the pre-rebuild design
sidecar. Palette/type advisories refer to the superseded system. Source CHW side
borders and the unchanged Kids Vote progression are source/lesson features;
election-specific side borders were removed. The map transition warning matches
SVG `stroke-width`, not layout width. No second detector pass ran.

## Capture guide

`desktop.jpg`, `mobile.jpg`, `user-916.jpg` and `small-mobile.jpg` show the homepage.
Route files use `-desktop` and `-mobile` suffixes. Long pages have `-top` crops for
legible first-viewport inspection. `forecast-history-mobile.jpg` shows the loaded
chart region; `menu-mobile.jpg` and `council-map-mobile.jpg` show interactive states.

Source data and generated releases remain outside the visual migration. The
existing working-tree change to `docs/v2-release.md` was left untouched.

## Subsequent preference: remove kickers

The user requested that kickers and eyebrows be removed everywhere. Shared page,
section and content components no longer expose or render them. Ward numbers now
appear inline in directory card headings; breadcrumbs and data labels remain.
The root design guide and sidecar record this exception to the supplied system.

All 326 tests, lint and the 68-page export pass after this change. A scan of every
exported HTML file finds zero kicker or eyebrow elements. Browser checks cover
the primary routes, detail pages and all four trustee boards without document
overflow at phone width. `kickers-removed-desktop.jpg` and
`kickers-removed-mobile.jpg` show the revised homepage; the desktop `-top` crop
and `kickers-removed-wards-mobile.jpg` provide closer views.
