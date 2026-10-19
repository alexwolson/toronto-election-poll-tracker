"""Build each 2026 council incumbent's share in their ward's last election (marks on the results
pages' council bars; Alex, 2026-10-19).

Inputs, given as paths:
  --canonical  the vendored canonical results, election_results.csv (toronto-election-poll-tracker-data
               data/raw/canonical/), person_id-keyed, with every council contest 2022-2025
  --joins      the 2026 Ballot Name joins, 06-feed-name-joins.csv (toronto-election-live-projection
               docs/research/): each 2026 candidacy's person_id

An incumbent here is a 2026 council candidate who won the most recent council contest of the
same ward: the 2022 general election, or a by-election since. All on the 25-ward map that 2026
uses. A candidate who last won a different ward (Dianne Saxe: Ward 11 in 2022, Ward 14 in 2026)
gets no mark. Keyed by 2026 candidacy id, never by name. Writes src/data/council-incumbents.json,
shares in percent to 2 dp like the payload's.

  uv run --no-project python scripts/council-incumbents/build.py --canonical <csv> --joins <csv>
"""

import argparse
import csv
import hashlib
import json
from pathlib import Path

OUT = Path(__file__).resolve().parents[2] / "src" / "data" / "council-incumbents.json"
YEARS = ("2022", "2023", "2024", "2025")


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def ward_of(district_name: str) -> str:
    """'Ward 15 — Don Valley West' -> '15'."""
    head = district_name.split("—")[0].split()
    assert head[0] == "Ward" and head[1].isdigit(), district_name
    return head[1]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--canonical", type=Path, required=True)
    ap.add_argument("--joins", type=Path, required=True)
    args = ap.parse_args()

    rows = [
        r
        for r in csv.DictReader(args.canonical.open(encoding="utf-8"))
        if r["office_type"] == "councillor" and r["election_year"] in YEARS
    ]
    assert {r["boundary_regime"] for r in rows} == {"toronto_council_25_wards"}
    # Each ward's most recent contest, and its winner.
    latest: dict[str, dict] = {}
    for r in rows:
        if r["elected"] != "True":
            continue
        w = ward_of(r["district_name"])
        if w not in latest or r["election_date"] > latest[w]["election_date"]:
            latest[w] = r
    assert sorted(latest, key=int) == [str(n) for n in range(1, 26)], sorted(latest)

    joins = [j for j in csv.DictReader(args.joins.open(encoding="utf-8")) if j["office"] == "Councillor"]
    assert len(joins) == 190, len(joins)
    incumbents = {}
    for j in joins:
        # A first-time candidate has no person yet ("proposed", no person_id): never an incumbent.
        if j["person_link"] != "confirmed":
            assert not j["person_id"], j
            continue
        won = latest[j["area"]]
        if won["person_id"] != j["person_id"]:
            continue
        assert won["acclaimed"] == "False", won
        share = float(won["vote_share"])
        incumbents[j["candidacy_id"]] = {
            "ward": j["area"],
            "share": round(100 * share if share <= 1 else share, 2),
            "year": int(won["election_year"]),
            "by_election": won["election_type"] == "by_election",
        }
    OUT.write_text(
        json.dumps(
            {
                "source": "Canonical Toronto election results (council contests 2022-2025), joined to 2026 candidacies",
                "canonical_sha256": sha256(args.canonical),
                "joins_sha256": sha256(args.joins),
                "incumbents": dict(sorted(incumbents.items(), key=lambda kv: int(kv[1]["ward"]))),
            },
            indent=1,
            ensure_ascii=False,
        )
        + "\n",
        encoding="utf-8",
    )
    print(f"{len(incumbents)} incumbents -> {OUT}")


if __name__ == "__main__":
    main()
