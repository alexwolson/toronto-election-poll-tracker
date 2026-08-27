# Margin-panel preview fixtures

A dev-only variant of `../fixtures/` used to preview the homepage
**winning-margin panel** (`src/components/margin-distribution.tsx`).

That panel renders only when the mayoral `close_result` quantity publishes, and
in the certified `../fixtures/` set it is **withheld** (the Band Stability Gate
fails on a leave-one-out variant), so the panel is correctly hidden there. These
fixtures flip `close_result` to `Forecast Available` and attach a representative
`margin_distribution` (a reflected-KDE block sampled through the real pipeline
from plausible current shares) so the panel is visible in dev.

Point the dev server at this directory to see it:

```bash
FEED_LOCAL_DIR=./fixtures-preview npm run dev
```

All other feeds are copied unchanged from `../fixtures/`. **These are a
preview of a publishing state, not production data.**
