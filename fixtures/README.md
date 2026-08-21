# Certified dev fixtures

These four feeds are the **certified-state** publication package — the same
feeds the data pipeline emits, but built with `field_certified: true` so the
mayoral forecast publishes (4 of 5 quantities). We develop and preview against
them because the site launches in the certified state (spec §Q8b), while the
committed `data/processed` feeds stay dark until the maintainer flips the real
flag.

Used only when `FEED_LOCAL_DIR` points here (see `.env.local`). Production builds
read the live GitHub-raw feeds instead.

Regenerate with the dev-only script `gen_certified_fixtures.py` (in the data
project's scratch, not committed there): it copies the certification-independent
council feed and rebuilds polling/forecast/manifest with the flag on.

**These are a preview of the certified state, not production data.**
