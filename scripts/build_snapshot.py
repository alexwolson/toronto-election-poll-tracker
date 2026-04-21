#!/usr/bin/env python3
"""Build model snapshot for API consumption.

Run: uv run scripts/build_snapshot.py
"""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "backend"))

from model.run import load_processed_data, run_model
from model.snapshot import save_snapshot


def main() -> None:
    load_processed_data.cache_clear()
    run_model.cache_clear()
    result = run_model()
    path = save_snapshot(result)
    print(f"Snapshot written to {path}")


if __name__ == "__main__":
    main()
