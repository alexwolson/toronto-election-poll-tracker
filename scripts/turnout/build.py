"""Build the results pages' turnout figures: advance voters, and votes for mayor as a share of
eligible electors by ward and citywide, for 2026's electors and the 2022 and 2023 counts
(Alex, 2026-10-19).

Runs in toronto-election-live-projection's environment, which reads the City's certified
poll-by-poll workbooks and voter statistics (its data/historical, sha256-pinned there):

  uv run --project <live-projection> python scripts/turnout/build.py --live-projection <live-projection>

- 2026 electors per ward: the Night Bundle's (`electors`, from the City's test files' totalVoters).
  The City's 2026 fact sheet gives about 2.14 million, as the bundle sums (checked 2026-10-19).
- 2022 and 2023: each ward's votes for mayor (every candidate, all voting channels) from the
  workbooks, checked against the canonical citywide totals, and its electors from the voter
  statistics' "Total Electors": the voters' list before election day, as 2026's is. (The City's
  official turnout uses "Total Eligible Electors", after election-day additions and deletions,
  which 2026 can't have on the night; so these shares differ from it: 2022 29.1% against 29.7%,
  2023 38.4% against 37.2%.)
- Advance voters: the City's figures as first released (2022, 2023: live-projection's
  advance_turnout_as_released.csv; 2026: the bundle's ward_aggregates).

Votes for mayor, not ballots cast: the live count has only valid mayoral votes, so every year is
measured the same way. Writes src/data/turnout.json.
"""

import argparse
import csv
import json
import os
import sys
from pathlib import Path

OUT = Path(__file__).resolve().parents[2] / "src" / "data" / "turnout.json"
# Canonical citywide votes for mayor, and the voter statistics' "Total Electors" (the voters' list
# before election day) Grand Totals.
CANONICAL_VOTES = {2022: 551_890, 2023: 724_638}
LIST_TOTALS = {2022: 1_893_995, 2023: 1_888_082}

ap = argparse.ArgumentParser()
ap.add_argument("--live-projection", type=Path, required=True)
args = ap.parse_args()
LP = args.live_projection.resolve()
os.chdir(LP)  # the harness reads its data by repo-relative paths
sys.path.insert(0, str(LP / "src"))

from election_night.projection.history import ward_electors  # noqa: E402
from election_night.replay.historical import load_night  # noqa: E402

prereg = json.load(open(LP / "gates" / "preregistration.json"))
bundle = json.load(open(LP / "data" / "night-bundle" / "night-bundle.json"))
electors_2026 = {k: int(v) for k, v in bundle["electors"].items()}
assert len(electors_2026) == 25 and 2_100_000 < sum(electors_2026.values()) < 2_200_000

past = {}
for year in (2022, 2023):
    night = load_night(year, prereg)
    mayor = night.mayor
    votes: dict[str, int] = {}
    for (ward, _code), row in zip(mayor.units, mayor.votes):
        votes[str(ward)] = votes.get(str(ward), 0) + int(row.sum())
    electors = {str(w): e for w, e in ward_electors(year).items()}
    assert sorted(votes, key=int) == sorted(electors, key=int) == [str(n) for n in range(1, 26)]
    assert sum(votes.values()) == CANONICAL_VOTES[year], (year, sum(votes.values()))
    assert sum(electors.values()) == LIST_TOTALS[year], (year, sum(electors.values()))
    past[year] = {"votes": votes, "electors": electors}

advance = {"2026": int(bundle["ward_aggregates"]["advance_voters"])}
with open(LP / "data" / "historical" / "advance_turnout" / "advance_turnout_as_released.csv", encoding="utf-8") as f:
    for r in csv.DictReader(f):
        if r["scope"] == "city" and r["election_year"] in ("2022", "2023"):
            advance[r["election_year"]] = int(r["advance_voters"])
assert advance == {"2026": 222_550, "2022": 115_911, "2023": 129_745}, advance

wards = {
    str(n): {
        "electors_2026": electors_2026[str(n)],
        "share_2022": round(100 * past[2022]["votes"][str(n)] / past[2022]["electors"][str(n)], 2),
        "share_2023": round(100 * past[2023]["votes"][str(n)] / past[2023]["electors"][str(n)], 2),
    }
    for n in range(1, 26)
}
city = {
    "electors_2026": sum(electors_2026.values()),
    "share_2022": round(100 * sum(past[2022]["votes"].values()) / sum(past[2022]["electors"].values()), 2),
    "share_2023": round(100 * sum(past[2023]["votes"].values()) / sum(past[2023]["electors"].values()), 2),
}
OUT.write_text(json.dumps({"advance_voters": advance, "city": city, "wards": wards}, indent=1) + "\n", encoding="utf-8")
print(json.dumps(city), json.dumps(wards["1"]), json.dumps(wards["12"]))
