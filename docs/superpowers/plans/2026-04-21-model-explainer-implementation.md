# Model Explainer Section Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a four-step model explainer section to the homepage, placed directly below the voter alignment bars, that explains how the pool model is built and lets readers expand each step to see the underlying poll data with computed weights.

**Architecture:** The backend adds a `poll_detail` key to the existing `compute_pool_model` return value, exposing per-step poll rows with normalised weights. The frontend consumes this via the existing `getPollingAverages()` fetch, renders a new `ModelExplainer` Client Component, and wires it into the homepage Server Component between Zone 1 and Zone 2.

**Tech Stack:** Python / pandas (backend), Next.js 15 App Router, TypeScript, React `useState` (frontend). No new packages required.

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `backend/model/pool.py` | Modify | Add `_safe_float`, 4 `_get_*_poll_detail` helpers, `poll_detail` key in `compute_pool_model` |
| `tests/model/test_pool.py` | Modify | Tests for `poll_detail` shape, normalisation, sort order, API endpoint inclusion |
| `frontend/src/lib/api.ts` | Modify | Add `PollDetail` types, extend `PoolModel`, add defensive fallback in `getPollingAverages` |
| `frontend/src/app/globals.css` | Modify | Append `.me-*` CSS classes for layout, subgrid, table, drawer, pills |
| `frontend/src/components/model-explainer.tsx` | Create | Client Component: intro row, subgrid steps, per-step drawers with tables and computed panels |
| `frontend/src/app/page.tsx` | Modify | Import `ModelExplainer`, render between Zone 1 and Zone 2 |

---

## Task 1: Backend — add `poll_detail` helpers to `pool.py`

**Files:**
- Modify: `backend/model/pool.py`

- [ ] **Step 1: Add `_safe_float` helper and four `_get_*_poll_detail` functions**

Add the following immediately before the `compute_pool_model` function (after `compute_consolidation_trend`):

```python
def _safe_float(val: object) -> float:
    """Convert value to float, returning 0.0 for NaN/None/unparseable."""
    v = pd.to_numeric(val, errors="coerce")
    return float(v) if pd.notna(v) else 0.0


def _get_approval_poll_detail(
    approval_df: pd.DataFrame,
    reference_date: datetime | None = None,
) -> list[dict]:
    """Per-row approval data with weights normalised so max weight = 1.0.

    Sorted by date descending (most recent first).
    Uses 'source' column as firm name (approval_ratings.csv convention).
    """
    required = {"date", "approve", "disapprove", "not_sure"}
    if approval_df.empty or not required.issubset(approval_df.columns):
        return []
    weights = approval_df["date"].apply(
        lambda d: _decay_weight(str(d), APPROVAL_HALF_LIFE_DAYS, reference_date)
    )
    max_w = float(weights.max()) if weights.max() > 0 else 1.0
    has_source = "source" in approval_df.columns
    rows = []
    for idx, row in approval_df.iterrows():
        rows.append({
            "date": str(row["date"]),
            "firm": str(row["source"]) if has_source else "",
            "approve": round(_safe_float(row["approve"]), 4),
            "disapprove": round(_safe_float(row["disapprove"]), 4),
            "not_sure": round(_safe_float(row["not_sure"]), 4),
            "weight": round(float(weights[idx]) / max_w, 4),
        })
    rows.sort(key=lambda r: r["date"], reverse=True)
    return rows


def _get_floor_poll_detail(polls_df: pd.DataFrame) -> list[dict]:
    """Full-field qualifying polls (4+ non-Chow candidates, n≥500) with candidate weights.

    No recency weighting — the floor is a structural property.
    Sorted by date descending.
    """
    if "chow" not in polls_df.columns:
        return []
    df = polls_df.copy()
    df["_non_chow_count"] = df["field_tested"].apply(_count_non_chow_candidates)
    df["_n"] = pd.to_numeric(
        df.get("sample_size", pd.Series(dtype=float)), errors="coerce"
    ).fillna(0)
    qualifying = df[
        (df["_non_chow_count"] >= FULL_FIELD_THRESHOLD) & (df["_n"] >= MIN_FLOOR_SAMPLE_SIZE)
    ]
    if qualifying.empty:
        return []
    rows = []
    for _, row in qualifying.iterrows():
        rows.append({
            "date": str(row.get("date_published", "")),
            "firm": str(row.get("firm", "")),
            "field_tested": str(row.get("field_tested", "")),
            "chow": round(_safe_float(row["chow"]), 4),
            "sample_size": int(row["_n"]),
            "candidate_weight": int(row["_non_chow_count"]),
        })
    rows.sort(key=lambda r: r["date"], reverse=True)
    return rows


def _get_h2h_poll_detail(
    polls_df: pd.DataFrame,
    reference_date: datetime | None = None,
) -> list[dict]:
    """Bradford vs Chow H2H polls with recency weights normalised so max weight = 1.0.

    Applies the same filter as compute_current_h2h_chow: Bradford+Chow only,
    exactly 1 non-Chow named candidate. Sorted by date descending.
    """
    if "chow" not in polls_df.columns:
        return []
    h2h = polls_df[
        polls_df["field_tested"].apply(
            lambda f: (
                "bradford" in str(f).lower()
                and "chow" in str(f).lower()
                and _count_non_chow_candidates(f) == 1
            )
        )
    ].copy()
    if h2h.empty:
        return []
    weights = h2h["date_published"].apply(
        lambda d: _decay_weight(d, CURRENT_HALF_LIFE_DAYS, reference_date)
    )
    max_w = float(weights.max()) if weights.max() > 0 else 1.0
    rows = []
    for idx, row in h2h.iterrows():
        rows.append({
            "date": str(row.get("date_published", "")),
            "firm": str(row.get("firm", "")),
            "chow": round(_safe_float(row["chow"]), 4),
            "bradford": round(_safe_float(row.get("bradford", 0.0)), 4),
            "sample_size": int(_safe_float(row.get("sample_size", 0))),
            "recency_weight": round(float(weights[idx]) / max_w, 4),
        })
    rows.sort(key=lambda r: r["date"], reverse=True)
    return rows


def _get_capture_poll_detail(
    polls_df: pd.DataFrame,
    reference_date: datetime | None = None,
) -> list[dict]:
    """Multi-candidate polls (2+ non-Chow challengers) with recency weights normalised to max=1.0.

    Used to show Bradford's anti-Chow pool capture rate per poll.
    Sorted by date descending.
    """
    multi = polls_df[
        polls_df["field_tested"].apply(_count_non_chow_candidates) >= 2
    ].copy()
    if multi.empty or "bradford" not in multi.columns:
        return []
    weights = multi["date_published"].apply(
        lambda d: _decay_weight(d, CURRENT_HALF_LIFE_DAYS, reference_date)
    )
    max_w = float(weights.max()) if weights.max() > 0 else 1.0
    rows = []
    for idx, row in multi.iterrows():
        rows.append({
            "date": str(row.get("date_published", "")),
            "firm": str(row.get("firm", "")),
            "field_tested": str(row.get("field_tested", "")),
            "bradford": round(_safe_float(row.get("bradford", 0.0)), 4),
            "recency_weight": round(float(weights[idx]) / max_w, 4),
        })
    rows.sort(key=lambda r: r["date"], reverse=True)
    return rows
```

- [ ] **Step 2: Add `poll_detail` to `compute_pool_model` return dict**

In `compute_pool_model`, add `"poll_detail"` as the last key in the return dict (after `"data_notes"`):

```python
        "data_notes": {
            "full_field_poll_count": full_field_count,
            "total_polls": len(polls_df),
            "approval_data_points": len(approval_df),
            "h2h_available": chow_h2h is not None,
        },
        "poll_detail": {
            "approval_polls": _get_approval_poll_detail(approval_df, reference_date),
            "floor_polls": _get_floor_poll_detail(polls_df),
            "h2h_polls": _get_h2h_poll_detail(polls_df, reference_date),
            "capture_polls": _get_capture_poll_detail(polls_df, reference_date),
        },
    }
```

- [ ] **Step 3: Verify the module imports fine**

```bash
cd /Users/alex/code/personal/toronto-election-poll-tracker
uv run python -c "from backend.model.pool import compute_pool_model; print('OK')"
```

Expected output: `OK`

---

## Task 2: Backend tests for `poll_detail`

**Files:**
- Modify: `tests/model/test_pool.py`

- [ ] **Step 1: Write the failing tests**

Append to `tests/model/test_pool.py`:

```python
# ── poll_detail ────────────────────────────────────────────────


def test_poll_detail_keys_present():
    from backend.model.pool import compute_pool_model
    result = compute_pool_model(_load_polls(), _load_approval())
    assert "poll_detail" in result
    pd_keys = {"approval_polls", "floor_polls", "h2h_polls", "capture_polls"}
    assert pd_keys == set(result["poll_detail"].keys())


def test_poll_detail_approval_polls_shape():
    from backend.model.pool import compute_pool_model
    detail = compute_pool_model(_load_polls(), _load_approval())["poll_detail"]
    polls = detail["approval_polls"]
    assert len(polls) > 0
    for row in polls:
        assert set(row.keys()) == {"date", "firm", "approve", "disapprove", "not_sure", "weight"}
        assert 0.0 <= row["approve"] <= 1.0
        assert 0.0 <= row["disapprove"] <= 1.0
        assert 0.0 <= row["not_sure"] <= 1.0
        assert 0.0 <= row["weight"] <= 1.0


def test_poll_detail_approval_polls_weight_normalised():
    """Most recent approval poll must have weight 1.0."""
    from backend.model.pool import compute_pool_model
    polls = compute_pool_model(_load_polls(), _load_approval())["poll_detail"]["approval_polls"]
    assert polls[0]["weight"] == 1.0, "First row (most recent) should have weight 1.0"


def test_poll_detail_approval_polls_sorted_descending():
    from backend.model.pool import compute_pool_model
    polls = compute_pool_model(_load_polls(), _load_approval())["poll_detail"]["approval_polls"]
    dates = [r["date"] for r in polls]
    assert dates == sorted(dates, reverse=True), "approval_polls should be sorted date desc"


def test_poll_detail_floor_polls_shape():
    from backend.model.pool import compute_pool_model
    detail = compute_pool_model(_load_polls(), _load_approval())["poll_detail"]
    polls = detail["floor_polls"]
    assert len(polls) > 0
    for row in polls:
        assert set(row.keys()) == {"date", "firm", "field_tested", "chow", "sample_size", "candidate_weight"}
        assert 0.0 <= row["chow"] <= 1.0
        assert row["sample_size"] >= 500
        assert row["candidate_weight"] >= 4  # FULL_FIELD_THRESHOLD non-Chow candidates


def test_poll_detail_h2h_polls_shape():
    from backend.model.pool import compute_pool_model
    detail = compute_pool_model(_load_polls(), _load_approval())["poll_detail"]
    polls = detail["h2h_polls"]
    assert len(polls) > 0
    for row in polls:
        assert set(row.keys()) == {"date", "firm", "chow", "bradford", "sample_size", "recency_weight"}
        assert 0.0 <= row["chow"] <= 1.0
        assert 0.0 <= row["recency_weight"] <= 1.0


def test_poll_detail_h2h_polls_weight_normalised():
    from backend.model.pool import compute_pool_model
    polls = compute_pool_model(_load_polls(), _load_approval())["poll_detail"]["h2h_polls"]
    assert polls[0]["recency_weight"] == 1.0


def test_poll_detail_capture_polls_shape():
    from backend.model.pool import compute_pool_model
    detail = compute_pool_model(_load_polls(), _load_approval())["poll_detail"]
    polls = detail["capture_polls"]
    assert len(polls) > 0
    for row in polls:
        assert set(row.keys()) == {"date", "firm", "field_tested", "bradford", "recency_weight"}
        assert 0.0 <= row["bradford"] <= 1.0
        assert 0.0 <= row["recency_weight"] <= 1.0


def test_poll_detail_capture_polls_weight_normalised():
    from backend.model.pool import compute_pool_model
    polls = compute_pool_model(_load_polls(), _load_approval())["poll_detail"]["capture_polls"]
    assert polls[0]["recency_weight"] == 1.0


def test_polls_latest_includes_poll_detail():
    """GET /api/polls/latest returns pool_model.poll_detail with all four lists."""
    import sys
    sys.path.insert(0, str(_REPO_ROOT / "backend"))
    from fastapi.testclient import TestClient
    from main import app
    client = TestClient(app)
    response = client.get("/api/polls/latest")
    assert response.status_code == 200
    pm = response.json()["pool_model"]
    assert "poll_detail" in pm
    for key in ("approval_polls", "floor_polls", "h2h_polls", "capture_polls"):
        assert key in pm["poll_detail"], f"Missing poll_detail.{key}"
        assert isinstance(pm["poll_detail"][key], list)
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /Users/alex/code/personal/toronto-election-poll-tracker
uv run pytest tests/model/test_pool.py::test_poll_detail_keys_present -v
```

Expected: `FAILED` with `KeyError: 'poll_detail'`

- [ ] **Step 3: Run all new tests after Task 1 is complete**

```bash
uv run pytest tests/model/test_pool.py -v -k "poll_detail"
```

Expected: all 10 new tests `PASSED`

- [ ] **Step 4: Run the full test suite to check for regressions**

```bash
uv run pytest tests/model/test_pool.py -v
```

Expected: all tests pass

- [ ] **Step 5: Commit**

```bash
git add backend/model/pool.py tests/model/test_pool.py
git commit -m "feat: add poll_detail to pool model — per-step poll rows with normalised weights"
```

---

## Task 3: Frontend — extend `PoolModel` type in `api.ts`

**Files:**
- Modify: `frontend/src/lib/api.ts`

- [ ] **Step 1: Add `PollDetail` types above the `PoolModel` export**

Insert the following block immediately before the `export type ConsolidationTrend` line:

```typescript
type ApprovalPollRow = {
  date: string;
  firm: string;
  approve: number;
  disapprove: number;
  not_sure: number;
  weight: number;
};

type FloorPollRow = {
  date: string;
  firm: string;
  field_tested: string;
  chow: number;
  sample_size: number;
  candidate_weight: number;
};

type H2HPollRow = {
  date: string;
  firm: string;
  chow: number;
  bradford: number;
  sample_size: number;
  recency_weight: number;
};

type CapturePollRow = {
  date: string;
  firm: string;
  field_tested: string;
  bradford: number;
  recency_weight: number;
};

export type PollDetail = {
  approval_polls: ApprovalPollRow[];
  floor_polls: FloorPollRow[];
  h2h_polls: H2HPollRow[];
  capture_polls: CapturePollRow[];
};
```

- [ ] **Step 2: Add `poll_detail` to `PoolModel`**

In the `PoolModel` type, add `poll_detail` as the last field (after `data_notes`):

```typescript
  data_notes: {
    full_field_poll_count: number;
    total_polls: number;
    approval_data_points: number;
    h2h_available: boolean;
  };
  poll_detail: PollDetail;
```

- [ ] **Step 3: Add defensive fallback in `getPollingAverages`**

Replace the `pool_model: data.pool_model ?? null` line in the return block of `getPollingAverages` with:

```typescript
    pool_model: data.pool_model
      ? {
          ...data.pool_model,
          poll_detail: data.pool_model.poll_detail ?? {
            approval_polls: [],
            floor_polls: [],
            h2h_polls: [],
            capture_polls: [],
          },
        }
      : null,
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd /Users/alex/code/personal/toronto-election-poll-tracker/frontend
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/api.ts
git commit -m "feat: extend PoolModel type with poll_detail for per-step poll rows"
```

---

## Task 4: Frontend CSS — append model explainer styles to `globals.css`

**Files:**
- Modify: `frontend/src/app/globals.css`

- [ ] **Step 1: Append `.me-*` styles to the end of `globals.css`**

Append the following block to the end of `frontend/src/app/globals.css`:

```css
/* ── Model Explainer ─────────────────────────────────────── */

.me-shell {
  background: #faf9f6;
  border: 1px solid #ccc;
  border-top: 2px solid #555;
}

.me-intro {
  padding: 1.1rem 1.5rem 0.9rem;
  border-bottom: 1px solid #ccc;
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0 1.5rem;
  align-items: baseline;
}

.me-kicker {
  font-family: var(--font-ibm-mono), monospace;
  font-size: 0.58rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #555;
  white-space: nowrap;
}

.me-dek {
  font-family: var(--font-newsreader), serif;
  font-size: 0.8rem;
  color: #555;
  font-style: italic;
  line-height: 1.6;
}

/* Subgrid: outer grid owns column + row tracks; each step spans all 4 rows */
.me-steps {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr;
  grid-template-rows: auto auto 1fr auto;
}

.me-step {
  display: grid;
  grid-template-rows: subgrid;
  grid-row: span 4;
  border-right: 1px solid #ccc;
  padding: 1.1rem 1.25rem 1rem;
  cursor: pointer;
  transition: background 0.12s;
  position: relative;
}

.me-step:last-child {
  border-right: none;
}

.me-step:hover {
  background: #f5f2ed;
}

.me-step--active {
  background: #f0ede8;
}

/* Downward caret pointing into the open drawer */
.me-step--active::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 8px solid transparent;
  border-right: 8px solid transparent;
  border-top: 8px solid #555;
  z-index: 10;
}

.me-step-header {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding-bottom: 0.55rem;
  border-bottom: 1px solid #e0ddd8;
  margin-bottom: 0.55rem;
}

.me-step-badge {
  font-family: var(--font-ibm-mono), monospace;
  font-size: 0.5rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #fff;
  background: #1a1a1a;
  padding: 0.12rem 0.38rem;
  flex-shrink: 0;
  margin-top: 1px;
}

.me-step--active .me-step-badge {
  background: #555;
}

.me-step-source {
  font-family: var(--font-ibm-mono), monospace;
  font-size: 0.48rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #999;
  line-height: 1.45;
}

.me-step-title {
  font-family: var(--font-newsreader), serif;
  font-size: 0.82rem;
  font-weight: 700;
  color: #1a1a1a;
  line-height: 1.3;
  align-self: start;
}

.me-step-body {
  font-family: var(--font-newsreader), serif;
  font-size: 0.72rem;
  color: #444;
  line-height: 1.65;
  align-self: start;
}

.me-step-body p {
  margin: 0 0 0.45rem;
}

.me-step-body p:last-child {
  margin-bottom: 0;
}

/* Inline monospace emphasis within body prose */
.me-step-body em {
  font-style: normal;
  font-family: var(--font-ibm-mono), monospace;
  font-size: 0.65rem;
  font-weight: 700;
  color: #1a1a1a;
}

.me-step-output {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  padding-top: 0.6rem;
  border-top: 1px solid #e0ddd8;
  margin-top: 0.75rem;
  align-self: end;
}

.me-pill {
  font-family: var(--font-ibm-mono), monospace;
  font-size: 0.52rem;
  font-weight: 700;
  color: #fff;
  padding: 0.15rem 0.4rem;
  white-space: nowrap;
}

.me-pill--purple      { background: #854a90; }
.me-pill--purple-soft { background: #c8a0d0; color: #3a1a4a; }
.me-pill--blue        { background: #00a2bf; }
.me-pill--grey        { background: #666; }
.me-pill--dark        { background: #1a1a1a; }

.me-expand-hint {
  width: 100%;
  font-family: var(--font-ibm-mono), monospace;
  font-size: 0.48rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #aaa;
  margin-top: 0.15rem;
}

.me-step--active .me-expand-hint {
  color: #555;
}

/* ── Drawer ── */

.me-drawer {
  border-top: 1px solid #ccc;
  background: #f0ede8;
  padding: 1.25rem 1.5rem 1.5rem;
}

.me-drawer-title {
  font-family: var(--font-ibm-mono), monospace;
  font-size: 0.58rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #555;
  margin-bottom: 1rem;
}

.me-drawer-cols {
  display: grid;
  grid-template-columns: 1fr 200px;
  gap: 0 2.5rem;
  align-items: start;
}

/* ── Data table ── */

.me-data-table {
  width: 100%;
  border-collapse: collapse;
}

.me-data-table th {
  font-family: var(--font-ibm-mono), monospace;
  font-size: 0.5rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: #888;
  text-align: left;
  padding: 0.3rem 0.6rem 0.3rem 0;
  border-bottom: 1px solid #ccc;
  white-space: nowrap;
}

.me-data-table td {
  font-family: var(--font-ibm-mono), monospace;
  font-size: 0.55rem;
  color: #444;
  padding: 0.35rem 0.6rem 0.35rem 0;
  border-bottom: 1px solid #e8e5e0;
  vertical-align: top;
}

.me-data-table tr:last-child td {
  border-bottom: none;
}

.me-num {
  text-align: right;
  padding-right: 0 !important;
  font-variant-numeric: tabular-nums;
}

.me-dim { color: #aaa; }

.me-row--highlight td { background: #e8e5df; }

.me-row--total td {
  border-top: 2px solid #ccc !important;
  border-bottom: none !important;
  font-weight: 700;
  color: #1a1a1a;
  padding-top: 0.45rem;
}

/* ── Computed panel ── */

.me-computed-kicker {
  font-family: var(--font-ibm-mono), monospace;
  font-size: 0.5rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #888;
  margin-bottom: 0.6rem;
}

.me-computed-item {
  margin-bottom: 0.85rem;
}

.me-computed-item:last-child { margin-bottom: 0; }

.me-computed-label {
  font-family: var(--font-ibm-mono), monospace;
  font-size: 0.48rem;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: #888;
  margin-bottom: 0.15rem;
}

.me-computed-val {
  font-family: var(--font-newsreader), serif;
  font-size: 1.5rem;
  font-weight: 700;
  color: #1a1a1a;
  line-height: 1;
}

.me-computed-sublabel {
  font-family: var(--font-ibm-mono), monospace;
  font-size: 0.45rem;
  color: #aaa;
  margin-top: 0.1rem;
  line-height: 1.4;
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/app/globals.css
git commit -m "style: add model explainer CSS classes (me-*)"
```

---

## Task 5: Frontend — build `ModelExplainer` component

**Files:**
- Create: `frontend/src/components/model-explainer.tsx`

- [ ] **Step 1: Create the component file**

Create `frontend/src/components/model-explainer.tsx` with the full content below:

```tsx
'use client';

import { useState, type ReactNode } from 'react';
import type { PoolModel } from '@/lib/api';

function pct(v: number): string {
  return `${Math.round(v * 100)}%`;
}

function wt(v: number): string {
  return v.toFixed(3);
}

function ComputedValue({
  label,
  value,
  color,
  sublabel,
}: {
  label: string;
  value: string;
  color?: string;
  sublabel: string;
}) {
  return (
    <div className="me-computed-item">
      <div className="me-computed-label">{label}</div>
      <div className="me-computed-val" style={color ? { color } : undefined}>
        {value}
      </div>
      <div className="me-computed-sublabel">{sublabel}</div>
    </div>
  );
}

const STEP_BODY: Record<1 | 2 | 3 | 4, ReactNode> = {
  1: (
    <>
      <p>
        Before looking at vote intentions, we ask something simpler: does Toronto{' '}
        <em>approve</em> or <em>disapprove</em> of Chow as mayor? Approval
        measures a voter&apos;s underlying orientation — independent of who else
        is running.
      </p>
      <p>
        Those who approve form Chow&apos;s reachable universe. Those who
        disapprove are the anti-Chow pool — the bloc any challenger needs to
        consolidate to win. &ldquo;Not sure&rdquo; voters are genuinely
        persuadable; how they break depends on the campaign.
      </p>
      <p>
        We weight approval data with a 30-day half-life, because approval moves
        slowly and older readings are still informative.
      </p>
    </>
  ),
  2: (
    <>
      <p>
        Not all of Chow&apos;s ceiling is equally solid. To find the floor, we
        look at polls that test four or more named candidates simultaneously. In
        a crowded field, vote share is fragmented — so Chow&apos;s number in
        those polls is close to the minimum she&apos;ll hold under any realistic
        scenario.
      </p>
      <p>
        We weight by candidate count: a six-way field gives a better floor
        estimate than a four-way one. Crucially, we do <em>not</em>{' '}
        recency-weight this step — the floor is a structural property of
        Chow&apos;s coalition, not a trend. A poll from six months ago is just
        as informative as last week&apos;s.
      </p>
    </>
  ),
  3: (
    <>
      <p>
        Head-to-head polls isolate the core contest. We use only Bradford vs
        Chow surveys — Tory has publicly declined to run, so those polls reflect
        a scenario that&apos;s no longer on the table. Three-way polls are also
        excluded, since they depress both candidates&apos; shares in ways that
        make comparisons misleading.
      </p>
      <p>
        Recent polls dominate here. A <em>12-day half-life</em> means a poll
        from three weeks ago carries roughly a quarter of the weight of
        today&apos;s. This gives us Chow&apos;s current position within the
        floor-to-ceiling range set in steps 1 and 2.
      </p>
    </>
  ),
  4: (
    <>
      <p>
        The anti-Chow pool is the key battleground. Wanting change isn&apos;t
        the same as having a candidate — right now a meaningful share of that
        pool remains uncaptured by any challenger.
      </p>
      <p>
        Bradford&apos;s capture rate is his share in multi-candidate polls
        divided by the total anti-Chow pool. We also track whether it&apos;s
        rising, stalling, or reversing: comparing his mean rate in the past 90
        days against older polls. A rising rate means he&apos;s consolidating
        the opposition; stalling means the field may be waiting for someone else.
      </p>
    </>
  ),
};

function Step1Drawer({ model }: { model: PoolModel }) {
  const { approval, pool, poll_detail } = model;
  return (
    <div className="me-drawer">
      <div className="me-drawer-title">Step 1 · All approval polls used</div>
      <div className="me-drawer-cols">
        <table className="me-data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Firm</th>
              <th className="me-num">Approve</th>
              <th className="me-num">Disapprove</th>
              <th className="me-num">Not sure</th>
              <th className="me-num">Weight</th>
            </tr>
          </thead>
          <tbody>
            {poll_detail.approval_polls.map((row, i) => (
              <tr key={i} className={i === 0 ? 'me-row--highlight' : ''}>
                <td>{row.date}</td>
                <td>{row.firm}</td>
                <td className="me-num">{pct(row.approve)}</td>
                <td className="me-num">{pct(row.disapprove)}</td>
                <td className="me-num">{pct(row.not_sure)}</td>
                <td className="me-num">{wt(row.weight)}</td>
              </tr>
            ))}
            <tr className="me-row--total">
              <td colSpan={2}>Weighted average</td>
              <td className="me-num">{pct(approval.approve)}</td>
              <td className="me-num">{pct(approval.disapprove)}</td>
              <td className="me-num">{pct(approval.not_sure)}</td>
              <td className="me-num me-dim">—</td>
            </tr>
          </tbody>
        </table>
        <div>
          <div className="me-computed-kicker">Computed values</div>
          <ComputedValue
            label="Chow ceiling"
            value={pct(pool.chow_ceiling)}
            color="#854a90"
            sublabel="Weighted approve rate → Chow's reachable universe"
          />
          <ComputedValue
            label="Anti-Chow pool"
            value={pct(pool.anti_chow_pool)}
            color="#00a2bf"
            sublabel="Weighted disapprove rate → Available to any challenger"
          />
          <ComputedValue
            label="Not yet engaged"
            value={pct(approval.not_sure)}
            color="#666"
            sublabel={'Weighted "not sure" rate → Persuadable electorate'}
          />
        </div>
      </div>
    </div>
  );
}

function Step2Drawer({ model }: { model: PoolModel }) {
  const { pool, poll_detail } = model;
  const available = Math.max(0, pool.chow_ceiling - pool.chow_floor);
  return (
    <div className="me-drawer">
      <div className="me-drawer-title">
        Step 2 · Full-field qualifying polls (4+ candidates, n ≥ 500)
      </div>
      <div className="me-drawer-cols">
        <table className="me-data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Firm</th>
              <th>Field tested</th>
              <th className="me-num">Chow</th>
              <th className="me-num">n</th>
              <th className="me-num">Cand. weight</th>
            </tr>
          </thead>
          <tbody>
            {poll_detail.floor_polls.map((row, i) => (
              <tr key={i} className={i === 0 ? 'me-row--highlight' : ''}>
                <td>{row.date}</td>
                <td>{row.firm}</td>
                <td>{row.field_tested}</td>
                <td className="me-num">{pct(row.chow)}</td>
                <td className="me-num">{row.sample_size.toLocaleString()}</td>
                <td className="me-num">{row.candidate_weight}</td>
              </tr>
            ))}
            <tr className="me-row--total">
              <td colSpan={3}>Weighted floor (by candidate count)</td>
              <td className="me-num">{pct(pool.chow_floor)}</td>
              <td className="me-num me-dim">—</td>
              <td className="me-num me-dim">—</td>
            </tr>
          </tbody>
        </table>
        <div>
          <div className="me-computed-kicker">Computed values</div>
          <ComputedValue
            label="Chow floor"
            value={pct(pool.chow_floor)}
            color="#854a90"
            sublabel="Candidate-count weighted avg → Holds regardless of field size"
          />
          <ComputedValue
            label="Available above floor"
            value={pct(available)}
            color="#c8a0d0"
            sublabel={`Ceiling (${pct(pool.chow_ceiling)}) minus floor (${pct(pool.chow_floor)}) → Soft Chow support`}
          />
        </div>
      </div>
    </div>
  );
}

function Step3Drawer({ model }: { model: PoolModel }) {
  const { pool, poll_detail } = model;
  const currentChow = pool.chow_h2h_current ?? pool.chow_floor;
  return (
    <div className="me-drawer">
      <div className="me-drawer-title">
        Step 3 · Bradford vs Chow head-to-head polls
      </div>
      <div className="me-drawer-cols">
        <table className="me-data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Firm</th>
              <th className="me-num">Chow</th>
              <th className="me-num">Bradford</th>
              <th className="me-num">n</th>
              <th className="me-num">Recency weight</th>
            </tr>
          </thead>
          <tbody>
            {poll_detail.h2h_polls.map((row, i) => (
              <tr key={i} className={i === 0 ? 'me-row--highlight' : ''}>
                <td>{row.date}</td>
                <td>{row.firm}</td>
                <td className="me-num">{pct(row.chow)}</td>
                <td className="me-num">{pct(row.bradford)}</td>
                <td className="me-num">{row.sample_size.toLocaleString()}</td>
                <td className="me-num">{wt(row.recency_weight)}</td>
              </tr>
            ))}
            <tr className="me-row--total">
              <td colSpan={2}>Recency-weighted average</td>
              <td className="me-num">{pct(currentChow)}</td>
              <td className="me-num me-dim">—</td>
              <td className="me-num me-dim">—</td>
              <td className="me-num me-dim">—</td>
            </tr>
          </tbody>
        </table>
        <div>
          <div className="me-computed-kicker">Computed values</div>
          <ComputedValue
            label="Chow current (H2H)"
            value={pct(currentChow)}
            color="#854a90"
            sublabel={`Within floor (${pct(pool.chow_floor)}) to ceiling (${pct(pool.chow_ceiling)}) range`}
          />
          <ComputedValue
            label="PP activated"
            value={`+${Math.round(pool.protective_progressive_activated * 100)}pp`}
            sublabel={`Current (${pct(currentChow)}) minus floor (${pct(pool.chow_floor)}) → Protective progressive premium`}
          />
        </div>
      </div>
    </div>
  );
}

function Step4Drawer({ model }: { model: PoolModel }) {
  const { pool, candidates, consolidation_trend, uncaptured_anti_chow, poll_detail } = model;
  const bradfordShare = candidates['bradford']?.share ?? 0;
  const captureRate = pool.anti_chow_pool > 0 ? bradfordShare / pool.anti_chow_pool : 0;
  const trendLabel =
    consolidation_trend === 'consolidating'
      ? 'Rising — consolidating the opposition'
      : consolidation_trend === 'reversing'
        ? 'Reversing — losing opposition support'
        : consolidation_trend === 'stalling'
          ? 'Stalling — opposition not consolidating'
          : 'Insufficient data to determine trend';

  return (
    <div className="me-drawer">
      <div className="me-drawer-title">
        Step 4 · Multi-candidate polls used for capture rate
      </div>
      <div className="me-drawer-cols">
        <table className="me-data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Firm</th>
              <th>Field tested</th>
              <th className="me-num">Bradford</th>
              <th className="me-num">Recency weight</th>
            </tr>
          </thead>
          <tbody>
            {poll_detail.capture_polls.map((row, i) => (
              <tr key={i} className={i === 0 ? 'me-row--highlight' : ''}>
                <td>{row.date}</td>
                <td>{row.firm}</td>
                <td>{row.field_tested}</td>
                <td className="me-num">{pct(row.bradford)}</td>
                <td className="me-num">{wt(row.recency_weight)}</td>
              </tr>
            ))}
            <tr className="me-row--total">
              <td colSpan={3}>Recency-weighted Bradford share</td>
              <td className="me-num">{pct(bradfordShare)}</td>
              <td className="me-num me-dim">—</td>
            </tr>
          </tbody>
        </table>
        <div>
          <div className="me-computed-kicker">Computed values</div>
          <ComputedValue
            label="Bradford share"
            value={pct(bradfordShare)}
            color="#00a2bf"
            sublabel="Recency-weighted avg across multi-candidate polls"
          />
          <ComputedValue
            label="Capture rate"
            value={pct(captureRate)}
            color="#00a2bf"
            sublabel={`${pct(bradfordShare)} ÷ ${pct(pool.anti_chow_pool)} anti-Chow pool → ${pct(uncaptured_anti_chow)} of pool still uncaptured`}
          />
          <ComputedValue
            label="Consolidation trend"
            value={
              consolidation_trend === 'insufficient_data'
                ? 'No data'
                : consolidation_trend.charAt(0).toUpperCase() +
                  consolidation_trend.slice(1)
            }
            sublabel={trendLabel}
          />
        </div>
      </div>
    </div>
  );
}

export function ModelExplainer({ model }: { model: PoolModel | null }) {
  const [activeStep, setActiveStep] = useState<1 | 2 | 3 | 4 | null>(null);

  if (!model) return null;

  const { pool, approval, candidates, consolidation_trend, data_notes, poll_detail } = model;
  const bradfordShare = candidates['bradford']?.share ?? 0;
  const antiChowPool = pool.anti_chow_pool;
  const captureRate = antiChowPool > 0 ? bradfordShare / antiChowPool : 0;
  const currentChow = pool.chow_h2h_current ?? pool.chow_floor;

  function toggle(step: 1 | 2 | 3 | 4) {
    setActiveStep((prev) => (prev === step ? null : step));
  }

  const steps: {
    num: 1 | 2 | 3 | 4;
    source: string;
    title: string;
    pills: { label: string; className: string }[];
    pollCount: number;
  }[] = [
    {
      num: 1,
      source: `Approval polls · ${data_notes.approval_data_points} data points · 30-day half-life`,
      title: 'Set the size of each voter pool',
      pills: [
        { label: `Chow ceiling ${pct(pool.chow_ceiling)}`, className: 'me-pill me-pill--purple' },
        { label: `Anti-Chow pool ${pct(antiChowPool)}`, className: 'me-pill me-pill--blue' },
        { label: `Not engaged ${pct(approval.not_sure)}`, className: 'me-pill me-pill--grey' },
      ],
      pollCount: poll_detail.approval_polls.length,
    },
    {
      num: 2,
      source: `Full-field polls · ${data_notes.full_field_poll_count} qualifying · n ≥ 500`,
      title: "Establish Chow's structural floor",
      pills: [
        { label: `Chow floor ${pct(pool.chow_floor)}`, className: 'me-pill me-pill--purple' },
        {
          label: `Available ${pct(Math.max(0, pool.chow_ceiling - pool.chow_floor))}`,
          className: 'me-pill me-pill--purple-soft',
        },
      ],
      pollCount: poll_detail.floor_polls.length,
    },
    {
      num: 3,
      source: `Bradford vs Chow H2H polls · 12-day half-life`,
      title: 'Where does Chow sit in the likely match-up?',
      pills: [
        { label: `Current position ${pct(currentChow)}`, className: 'me-pill me-pill--purple' },
      ],
      pollCount: poll_detail.h2h_polls.length,
    },
    {
      num: 4,
      source: `Multi-candidate polls · 2+ challengers tested`,
      title: 'How much of the anti-Chow vote has Bradford captured?',
      pills: [
        { label: `Bradford capture ${pct(captureRate)}`, className: 'me-pill me-pill--blue' },
        {
          label:
            consolidation_trend === 'insufficient_data'
              ? 'Insufficient data'
              : `Trend: ${consolidation_trend}`,
          className: 'me-pill me-pill--dark',
        },
      ],
      pollCount: poll_detail.capture_polls.length,
    },
  ];

  return (
    <div className="me-shell">
      <div className="me-intro">
        <div className="me-kicker">How the model works</div>
        <div className="me-dek">
          The visualization above isn&apos;t a poll average — it&apos;s a
          structural picture of where the electorate sits right now. Here&apos;s
          how we build it from the raw polling data.
        </div>
      </div>

      <div className="me-steps">
        {steps.map((step) => (
          <div
            key={step.num}
            className={`me-step${activeStep === step.num ? ' me-step--active' : ''}`}
            onClick={() => toggle(step.num)}
          >
            <div className="me-step-header">
              <span className="me-step-badge">Step {step.num}</span>
              <span className="me-step-source">{step.source}</span>
            </div>
            <div className="me-step-title">{step.title}</div>
            <div className="me-step-body">{STEP_BODY[step.num]}</div>
            <div className="me-step-output">
              {step.pills.map((pill) => (
                <span key={pill.label} className={pill.className}>
                  {pill.label}
                </span>
              ))}
              <div className="me-expand-hint">
                {activeStep === step.num ? '↑' : '↓'} See {step.pollCount} polls
              </div>
            </div>
          </div>
        ))}
      </div>

      {activeStep === 1 && <Step1Drawer model={model} />}
      {activeStep === 2 && <Step2Drawer model={model} />}
      {activeStep === 3 && <Step3Drawer model={model} />}
      {activeStep === 4 && <Step4Drawer model={model} />}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/alex/code/personal/toronto-election-poll-tracker/frontend
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/model-explainer.tsx
git commit -m "feat: add ModelExplainer client component with expandable per-step drawers"
```

---

## Task 6: Wire `ModelExplainer` into the homepage

**Files:**
- Modify: `frontend/src/app/page.tsx`

- [ ] **Step 1: Import `ModelExplainer`**

Add the import alongside the existing imports at the top of `frontend/src/app/page.tsx`:

```typescript
import { ModelExplainer } from "@/components/model-explainer";
```

- [ ] **Step 2: Render `<ModelExplainer>` between Zone 1 and Zone 2**

In the JSX, between the closing `</div>` of Zone 1 and the Zone 2 `<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", ... marginTop: "2rem" ... }}>`, insert:

```tsx
      {/* Zone 1.5: Model explainer */}
      <ModelExplainer model={pollsData.pool_model} />
```

The full Zone 1 → explainer → Zone 2 ordering in the return should read:

```tsx
      {/* Zone 1: Hero */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 200px", ... }}>
        ...
      </div>

      {/* Zone 1.5: Model explainer */}
      <ModelExplainer model={pollsData.pool_model} />

      {/* Zone 2: Section teasers */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", ... marginTop: "2rem" ... }}>
        ...
      </div>
```

- [ ] **Step 3: Start the dev server and verify the section renders**

```bash
cd /Users/alex/code/personal/toronto-election-poll-tracker
uv run uvicorn backend.main:app --reload --port 8000 &
cd frontend && npm run dev
```

Open `http://localhost:3000`. Verify:
- The "How the model works" section appears directly below the voter alignment bars
- All four step columns are present with correct source tags and prose
- Output pills show live values (not placeholder numbers)
- Clicking a step expands the drawer with a data table and computed panel
- The most recent row in each table is highlighted
- Clicking the active step again collapses it
- Only one drawer is open at a time

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/page.tsx
git commit -m "feat: render ModelExplainer on homepage between hero and section teasers"
```
