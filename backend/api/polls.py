from fastapi import APIRouter
from ..db.storage import init_db, get_all_polls, save_poll
from ..scrapers.wikipedia import scrape_wikipedia_polls

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
    polls = get_all_polls()
    return {"message": "TODO: implement aggregation"}
