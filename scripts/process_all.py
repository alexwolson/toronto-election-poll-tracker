#!/usr/bin/env python3
"""Process all raw inputs into clean, validated CSVs for the model.

Reads from data/raw/, validates, normalises, writes to data/processed/.
Fails fast: exits with a clear error if any validation step fails.

Run: uv run scripts/process_all.py
"""

from __future__ import annotations

import sys
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd

from src.validate import ValidationError, validate_council_alignment, validate_polls

RAW = Path("data/raw")
PROCESSED = Path("data/processed")
TIMESTAMP = datetime.now(timezone.utc).isoformat()


def process_polls(input_path: Path) -> pd.DataFrame:
    """Load, validate, and normalise polls CSV."""
    if not input_path.exists():
        print(f"ERROR: polls file not found: {input_path}", file=sys.stderr)
        sys.exit(1)

    df = pd.read_csv(input_path)

    try:
        validate_polls(df)
    except ValidationError as e:
        print(f"ERROR in {input_path}: {e}", file=sys.stderr)
        sys.exit(1)

    # Normalise dates to ISO strings
    df["date_conducted"] = pd.to_datetime(df["date_conducted"]).dt.strftime("%Y-%m-%d")
    df["date_published"] = pd.to_datetime(df["date_published"]).dt.strftime("%Y-%m-%d")

    return df


def process_council_alignment(input_path: Path) -> pd.DataFrame:
    """Load, validate, and normalise council alignment CSV."""
    if not input_path.exists():
        print(f"ERROR: council alignment file not found: {input_path}", file=sys.stderr)
        sys.exit(1)

    df = pd.read_csv(input_path)
    df["ward"] = df["ward"].astype(int)

    try:
        validate_council_alignment(df)
    except ValidationError as e:
        print(f"ERROR in {input_path}: {e}", file=sys.stderr)
        sys.exit(1)

    return df


def write_processed(df: pd.DataFrame, output_path: Path) -> None:
    """Write a processed DataFrame to CSV with a generation timestamp comment."""
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8") as f:
        f.write(f"# Generated at {TIMESTAMP}\n")
        df.to_csv(f, index=False)
    print(f"  Written: {output_path}")


def main() -> None:
    print("Processing polls...")
    polls = process_polls(RAW / "polls" / "polls.csv")
    write_processed(polls, PROCESSED / "polls.csv")

    print("Processing council alignment...")
    council = process_council_alignment(RAW / "council_votes" / "council_alignment.csv")
    write_processed(council, PROCESSED / "council_alignment.csv")

    print("Done. All outputs written to data/processed/.")


if __name__ == "__main__":
    main()
