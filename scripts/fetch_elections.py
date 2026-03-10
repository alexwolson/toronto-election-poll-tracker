#!/usr/bin/env python3
"""Fetch Toronto municipal election results from Toronto Open Data.

Saves CSVs to data/raw/elections/ with sidecar metadata JSON files.
Run: uv run scripts/fetch_elections.py
"""

import csv
import io
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import requests

CKAN_BASE = "https://ckan0.cf.opendata.inter.prod-toronto.ca/api/3/action"
PACKAGE_ID = "toronto-municipal-election-results"
OUTPUT_DIR = Path("data/raw/elections")

EXPECTED_COLUMNS = {
    "Ward",
    "Candidate",
    "Votes",
}


def fetch_package_resources(package_id: str) -> list[dict]:
    url = f"{CKAN_BASE}/package_show"
    response = requests.get(url, params={"id": package_id}, timeout=30)
    response.raise_for_status()
    data = response.json()
    if not data["success"]:
        raise RuntimeError(f"CKAN API error: {data.get('error')}")
    return data["result"]["resources"]


def download_resource(resource: dict, output_dir: Path) -> Path:
    name = resource["name"].replace(" ", "_").lower()
    url = resource["url"]
    output_path = output_dir / f"{name}.csv"
    sidecar_path = output_dir / f"{name}.json"

    print(f"  Downloading {name}...")
    response = requests.get(url, timeout=60)
    response.raise_for_status()
    content = response.text

    # Basic column check: look for expected column names in the header line
    first_line = content.splitlines()[0]
    header_fields = set(next(csv.reader(io.StringIO(first_line))))
    for col in EXPECTED_COLUMNS:
        if col not in header_fields:
            raise ValueError(
                f"Expected column '{col}' not found in {name}. "
                f"Header: {first_line[:200]}"
            )

    output_path.write_text(content, encoding="utf-8")

    metadata = {
        "source_url": url,
        "resource_name": resource["name"],
        "fetched_at": datetime.now(timezone.utc).isoformat(),
    }
    sidecar_path.write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    print(f"  Saved to {output_path}")
    return output_path


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    print(f"Fetching election results (package: {PACKAGE_ID})...")
    resources = fetch_package_resources(PACKAGE_ID)
    csv_resources = [r for r in resources if r.get("format", "").upper() == "CSV"]
    if not csv_resources:
        print("No CSV resources found.", file=sys.stderr)
        sys.exit(1)
    print(f"Found {len(csv_resources)} CSV resource(s).")
    for resource in csv_resources:
        download_resource(resource, OUTPUT_DIR)
    print("Done.")


if __name__ == "__main__":
    main()
