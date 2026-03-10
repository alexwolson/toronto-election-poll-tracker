"""Validation functions for raw input DataFrames.

Each function raises ValidationError with a descriptive message on failure.
"""

from __future__ import annotations

import pandas as pd

CANDIDATE_COLUMNS = ["chow", "bradford", "bailao", "matlow", "furey", "mendicino"]
SHARE_TOLERANCE = 0.01  # allow up to 1% rounding error


class ValidationError(ValueError):
    pass


def validate_polls(df: pd.DataFrame) -> None:
    """Validate a polls DataFrame against the polls.csv schema."""
    required = ["poll_id", "firm", "date_conducted", "date_published", "field_tested"]
    _check_required_columns(df, required, "polls")

    # Vote shares must sum to <= 1.0 (+ tolerance) per row
    share_cols = [c for c in CANDIDATE_COLUMNS if c in df.columns]
    if "undecided" in df.columns:
        share_cols = share_cols + ["undecided"]

    if share_cols:
        row_sums = df[share_cols].fillna(0).sum(axis=1)
        bad = df[row_sums > 1.0 + SHARE_TOLERANCE]
        if not bad.empty:
            raise ValidationError(
                f"Poll share columns sum to more than 1.0 in rows: "
                f"{bad['poll_id'].tolist()}"
            )

    # date_conducted must be <= date_published
    conducted = pd.to_datetime(df["date_conducted"], errors="coerce")
    published = pd.to_datetime(df["date_published"], errors="coerce")
    bad_dates = df[conducted > published]
    if not bad_dates.empty:
        raise ValidationError(
            f"date_conducted is after date_published in rows: "
            f"{bad_dates['poll_id'].tolist()}"
        )

    # poll_id must be unique
    dupes = df[df["poll_id"].duplicated()]
    if not dupes.empty:
        raise ValidationError(f"Duplicate poll_id values: {dupes['poll_id'].tolist()}")

    # sample_size must be positive if present
    if "sample_size" in df.columns:
        bad_n = df[df["sample_size"].notna() & (df["sample_size"] <= 0)]
        if not bad_n.empty:
            raise ValidationError(
                f"sample_size must be positive in rows: {bad_n['poll_id'].tolist()}"
            )


def validate_council_alignment(df: pd.DataFrame) -> None:
    """Validate a council_alignment DataFrame against the council_alignment.csv schema."""
    required = [
        "ward",
        "councillor_name",
        "alignment_chow",
        "alignment_tory",
        "last_updated",
    ]
    _check_required_columns(df, required, "council_alignment")

    # ward must be 1–25
    bad_ward = df[~df["ward"].between(1, 25)]
    if not bad_ward.empty:
        raise ValidationError(f"ward values outside 1–25: {bad_ward['ward'].tolist()}")

    # alignment scores must be in [0, 1]
    for col in ["alignment_chow", "alignment_tory"]:
        bad = df[~df[col].between(0, 1)]
        if not bad.empty:
            raise ValidationError(
                f"{col} values outside [0, 1] in wards: {bad['ward'].tolist()}"
            )

    # no duplicate wards
    dupes = df[df["ward"].duplicated()]
    if not dupes.empty:
        raise ValidationError(f"Duplicate ward values: {dupes['ward'].tolist()}")


def _check_required_columns(df: pd.DataFrame, required: list[str], name: str) -> None:
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValidationError(f"{name}: missing required columns: {missing}")
