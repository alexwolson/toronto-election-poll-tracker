from fastapi import APIRouter
from db.storage import init_db, get_all_polls, save_poll
from scrapers.wikipedia import scrape_wikipedia_polls

router = APIRouter()

init_db()


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
    from model.aggregator import aggregate_polls, get_latest_scenario_polls

    data_dir = Path(__file__).parent.parent.parent / "data" / "processed"
    polls_df = pd.read_csv(data_dir / "polls.csv")

    current_polls = get_latest_scenario_polls(polls_df)

    candidates: set[str] = set()
    for field in current_polls["field_tested"].dropna():
        for c in field.split(","):
            c = c.strip()
            if c and c != "other" and c in polls_df.columns:
                candidates.add(c)

    scenario_candidates = sorted(candidates)
    aggregated = aggregate_polls(current_polls, scenario_candidates)
    aggregated = {k: round(v, 4) for k, v in aggregated.items() if v > 0.001}

    trend_df = current_polls.sort_values("date_published")
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
        "candidates": sorted(aggregated.keys()),
        "trend": trend,
    }
