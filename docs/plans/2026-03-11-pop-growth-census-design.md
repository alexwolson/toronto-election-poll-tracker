# Design: Automated Ward Population Growth from Census Data

**Date:** 2026-03-11
**Scope:** Gap 1 of Part 2 (Incumbent Vulnerability) — replace the manually-entered `pop_growth_pct` column in `ward_defeatability.csv` with a value computed automatically from Statistics Canada census data.

---

## Problem

`pop_growth_pct` is currently 0.0 for all 25 wards in `ward_defeatability.csv`. This column is one of three inputs to the defeatability score (alongside vote share and electorate share) and is supposed to capture ward population growth since the reference election. The zero values mean the growth component of the defeatability score is effectively absent.

## Data Source

**Ward Profiles (25-Ward Model)** on Toronto Open Data:
- CKAN package ID: `6678e1a6-d25f-4dff-b2b7-aa8f042bc2eb`
- Contains 2011, 2016, and 2021 Statistics Canada Census of Population data for all 25 current wards
- Format: Excel workbook (XLSX), distributed via CKAN

Growth proxy: **(pop_2021 − pop_2016) / pop_2016** per ward. This uses the most recent two census intervals as a proxy for the growth trend that will affect the 2026 electorate composition. It does not directly measure growth since 2022 (no data exists for that period), but captures which wards have been growing rapidly versus stagnating.

## Design

### New script: `scripts/fetch_ward_profiles.py`

Fetches the Ward Profiles XLSX from the CKAN API and extracts total population per ward for 2016 and 2021. Writes:
- `data/raw/census/ward_population.csv` — columns: `ward` (int), `pop_2016` (int), `pop_2021` (int)
- `data/raw/census/ward_population.meta` — JSON sidecar with fetch timestamp and source URL

Follows the same pattern as `fetch_elections.py`: CKAN package lookup → resource download → parse → write CSV + sidecar.

The Ward Profiles workbook structure must be inspected at implementation time to identify which row/column holds total population per ward per census year.

### Changes to `process_all.py`

Add a `process_ward_population()` function that:
1. Reads `data/raw/census/ward_population.csv`
2. Computes `pop_growth_pct = (pop_2021 - pop_2016) / pop_2016` per ward
3. Returns a per-ward Series

In `process_defeatability()`, merge the computed `pop_growth_pct` into the defeatability DataFrame, replacing any value that may be present in the raw CSV.

### Changes to `ward_defeatability.csv`

Remove the `pop_growth_pct` column. It is now computed, not stored.

### Changes to `validate_defeatability()` in `validate.py`

Remove `pop_growth_pct` from the required columns list and from its validation check.

### New `data/raw/census/SCHEMA.md`

Document the `ward_population.csv` format and the growth computation.

## What does not change

- `defeatability_score` remains manually entered — the score is still a human judgment combining vote share, electorate share, and now the computed growth figure. The data maintainer uses the computed `pop_growth_pct` as an input when deciding on a score, but the code does not compute the score itself.
- All other columns in `ward_defeatability.csv` are unchanged.

## Limitations

The 2016→2021 interval predates the 2022 reference election. It captures the growth trend rather than the literal post-election growth. This is documented in the schema and accepted as the best available proxy until a post-2022 population source becomes available (e.g., 2026 Census or a municipal voters list).
