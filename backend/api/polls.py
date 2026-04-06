from fastapi import APIRouter
from db.storage import init_db, get_all_polls, save_poll
from scrapers.wikipedia import scrape_wikipedia_polls
from model.chow_pressure import compute_chow_pressure_payload

router = APIRouter()

init_db()


def _read_chow_structural_context(data_dir):
    import pandas as pd

    default = {
        "score": None,
        "source": "Matt Elliott defeatability index",
    }

    path = data_dir / "defeatability_full.csv"
    try:
        df = pd.read_csv(path)
    except Exception:
        return default
    required_cols = {"Ward", "Elected Councillor", "Defeatability Score"}
    if not required_cols.issubset(set(df.columns)):
        return default

    mayor_rows = df[df["Ward"].astype(str).str.strip().str.lower() == "mayor"]
    if mayor_rows.empty:
        return default

    score_val = pd.to_numeric(
        mayor_rows.iloc[0]["Defeatability Score"], errors="coerce"
    )
    if pd.isna(score_val):
        return default

    return {
        "score": int(score_val),
        "source": "Matt Elliott defeatability index",
    }


@router.get("")
def get_polls():
    polls = get_all_polls()
    return {"polls": polls, "count": len(polls)}


@router.post("/scrape")
def scrape_polls():
    """Scrape latest polls from Wikipedia."""
    polls = scrape_wikipedia_polls()
    saved = 0
    for poll in polls:
        try:
            save_poll(poll)
            saved += 1
        except Exception:
            pass  # Skip duplicates
    return {"scraped": len(polls), "saved": saved}


@router.get("/latest")
def get_latest_polls():
    """Return recency-weighted mayoral polling averages from polls.csv."""
    from pathlib import Path
    import pandas as pd
    from model.aggregator import (
        aggregate_polls,
        get_latest_scenario_polls,
        get_scenario_polls,
    )
    from model.run import DEFAULT_SCENARIO, SCENARIOS

    def normalize_candidate(value: str) -> str:
        return str(value).strip().lower()

    def parse_field(field: str) -> list[str]:
        if pd.isna(field):
            return []
        return [
            normalize_candidate(c)
            for c in str(field).split(",")
            if normalize_candidate(c)
        ]

    data_dir = Path(__file__).parent.parent.parent / "data" / "processed"
    polls_df = pd.read_csv(data_dir / "polls.csv")
    chow_structural_context = _read_chow_structural_context(data_dir)

    scenario_candidates = SCENARIOS.get(DEFAULT_SCENARIO, [])
    scenario_set = set([normalize_candidate(c) for c in scenario_candidates])
    scenario_polls = get_scenario_polls(polls_df, scenario_candidates)
    current_polls = get_latest_scenario_polls(scenario_polls)
    aggregated = aggregate_polls(current_polls, scenario_candidates)
    aggregated = {k: round(v, 4) for k, v in aggregated.items() if v > 0.001}
    chow_pressure = compute_chow_pressure_payload(current_polls)

    polls_with_non_scenario_candidates = 0
    if "field_tested" in polls_df.columns:
        for field in polls_df["field_tested"].tolist():
            field_set = set(parse_field(field))
            non_scenario = [
                c
                for c in field_set
                if c not in scenario_set and c not in {"other", "undecided"}
            ]
            if non_scenario:
                polls_with_non_scenario_candidates += 1

    trend_df = current_polls.assign(
        _parsed_date=pd.to_datetime(current_polls["date_published"], errors="coerce"),
        _date_fallback=current_polls["date_published"].astype(str),
    ).sort_values(["_parsed_date", "_date_fallback"], kind="stable")
    trend = []
    for _, row in trend_df.iterrows():
        point = {
            "date": str(row["date_published"]),
        }
        for candidate in scenario_candidates:
            if candidate in row and pd.notna(row[candidate]):
                point[candidate] = round(float(row[candidate]), 4)
            else:
                point[candidate] = 0.0
        trend.append(point)

    return {
        "aggregated": aggregated,
        "polls_used": len(current_polls),
        "total_polls_available": len(polls_df),
        "polls_with_non_scenario_candidates": polls_with_non_scenario_candidates,
        "candidates": sorted(aggregated.keys()),
        "trend": trend,
        "chow_pressure": chow_pressure,
        "chow_structural_context": chow_structural_context,
    }
