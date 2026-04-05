"""Part 8: Mayoral Polling Aggregator.

Computes a recency-weighted average of published polls using exponential decay.
"""

from __future__ import annotations

import math
from datetime import datetime, timezone

import pandas as pd

# Half-life for poll weights in days (as per spec v0.2)
POLL_HALF_LIFE_DAYS = 12.0

# Lambda for exponential decay: w = exp(-lambda * age)
# Since exp(-lambda * half_life) = 0.5, then lambda = ln(2) / half_life
DECAY_LAMBDA = math.log(2) / POLL_HALF_LIFE_DAYS


def compute_poll_weights(
    df: pd.DataFrame, reference_date: datetime | None = None
) -> pd.Series:
    """Compute exponential decay weights for each poll based on its age.

    Age is calculated relative to reference_date (defaults to now).
    """
    if reference_date is None:
        reference_date = datetime.now(timezone.utc)

    # Use date_published for age calculation
    published_dates = pd.to_datetime(df["date_published"]).dt.tz_localize("UTC")
    ages_days = (reference_date - published_dates).dt.total_seconds() / (24 * 3600)

    # Weights: w = exp(-lambda * age)
    # Ensure ages are not negative (polls from the future get weight 1.0)
    weights = ages_days.apply(lambda x: math.exp(-DECAY_LAMBDA * max(0, x)))

    return weights


def aggregate_polls(
    df: pd.DataFrame,
    candidates: list[str],
    reference_date: datetime | None = None,
) -> dict[str, float]:
    """Compute recency-weighted average for each candidate.

    Returns a dictionary of {candidate: weighted_average_share}.
    """
    if df.empty:
        return {c: 0.0 for c in candidates}

    weights = compute_poll_weights(df, reference_date)
    total_weight = weights.sum()

    if total_weight == 0:
        return {c: 0.0 for c in candidates}

    results = {}
    for cand in candidates:
        if cand not in df.columns:
            results[cand] = 0.0
            continue

        # Weighted sum of shares for this candidate
        weighted_sum = (df[cand].fillna(0) * weights).sum()
        results[cand] = weighted_sum / total_weight

    return results


def get_latest_scenario_polls(df: pd.DataFrame) -> pd.DataFrame:
    """Filter polls to only include the most relevant field scenario.

    As per spec: 'Polls testing different candidate fields are tracked separately.'
    For now, we prioritise multi-candidate field polls over head-to-heads
    unless specifically requested.
    """
    # Simple heuristic: exclude poll IDs with 'v-' or 'vs-' (head-to-heads)
    # unless they are the only ones available.
    is_h2h = df["poll_id"].str.contains("-v-|-vs-|-v-", case=False)
    
    # Also check notes for common head-to-head patterns
    is_h2h |= df["notes"].str.contains("head-to-head|vs", case=False, na=False)

    multi_field = df[~is_h2h]

    if multi_field.empty:
        return df

    return multi_field
