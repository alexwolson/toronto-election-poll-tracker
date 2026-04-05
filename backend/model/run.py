"""Run the election model and return JSON results."""

from functools import lru_cache
from pathlib import Path

import pandas as pd

from .aggregator import aggregate_polls, get_latest_scenario_polls, get_scenario_polls
from .phase import detect_phase
from .simulation import WardSimulation


SCENARIOS = {
    "chow_bradford_bailao": ["chow", "bradford", "bailao"],
    "chow_bradford": ["chow", "bradford"],
    "open_field_bradford_bailao": ["bradford", "bailao"],
}

DEFAULT_SCENARIO = "chow_bradford_bailao"


def _data_dir() -> Path:
    return Path(__file__).parent.parent.parent / "data" / "processed"


@lru_cache(maxsize=1)
def load_processed_data() -> dict:
    """Load all processed data files."""
    d = _data_dir()
    return {
        "defeatability": pd.read_csv(d / "ward_defeatability.csv"),
        "challengers": pd.read_csv(d / "challengers.csv"),
        "leans": pd.read_csv(d / "ward_mayoral_lean.csv"),
        "coattails": pd.read_csv(d / "coattail_adjustments.csv"),
        "polls": pd.read_csv(d / "polls.csv"),
        "ward_polls": pd.read_csv(d / "ward_polls.csv"),
    }


def _classify_race(row: dict, challengers_for_ward: list[dict]) -> str:
    if not row["is_running"]:
        return "open"
    viable = [
        c
        for c in challengers_for_ward
        if c["name_recognition_tier"] in ("well-known", "known")
    ]
    if viable:
        return "competitive"
    return "safe"


@lru_cache(maxsize=1)
def run_model() -> dict:
    """Run the full model pipeline and return structured results."""
    data = load_processed_data()

    polls_df = data["polls"]
    candidates = SCENARIOS.get(DEFAULT_SCENARIO, [])
    scenario_polls = get_scenario_polls(polls_df, candidates)
    current_polls = get_latest_scenario_polls(scenario_polls)

    mayoral_shares = aggregate_polls(current_polls, candidates)
    mayoral_shares = {k: v for k, v in mayoral_shares.items() if v > 0.001}
    mayoral_averages = pd.DataFrame(
        [{"candidate": k, "share": v} for k, v in mayoral_shares.items()]
    )

    sim = WardSimulation(
        ward_data=data["defeatability"],
        mayoral_averages=mayoral_averages,
        coattails=data["coattails"],
        challengers=data["challengers"],
        leans=data["leans"],
        ward_polls=data["ward_polls"],
    )
    results = sim.run()

    challengers_by_ward: dict[int, list[dict]] = {}
    for rec in data["challengers"].to_dict("records"):
        challengers_by_ward.setdefault(rec["ward"], []).append(rec)

    wards_out = []
    for row in data["defeatability"].to_dict("records"):
        ward_num = row["ward"]
        ward_challengers = challengers_by_ward.get(ward_num, [])
        row["win_probability"] = round(
            results["win_probabilities"].get(ward_num, 0.0), 4
        )
        row["win_probability_interval"] = results["incumbent_probability_interval"].get(
            ward_num, {"low": 0.0, "high": 0.0}
        )
        row["race_class"] = _classify_race(row, ward_challengers)
        row["factors"] = results["factors"].get(
            ward_num, {"vuln": 0.0, "coat": 0.0, "chal": 0.0}
        )
        row["candidate_win_probabilities"] = results["candidate_win_probabilities"].get(
            ward_num, {}
        )
        wards_out.append(row)

    return {
        "wards": wards_out,
        "challengers": data["challengers"].to_dict("records"),
        "composition_mean": round(float(results["composition_mean"]), 2),
        "composition_std": round(float(results["composition_std"]), 2),
        "composition_by_mayor": results["composition_by_mayor"],
        "mayoral_averages": mayoral_shares,
        "phase": detect_phase(data["challengers"]),
        "scenarios": SCENARIOS,
        "default_scenario": DEFAULT_SCENARIO,
    }
