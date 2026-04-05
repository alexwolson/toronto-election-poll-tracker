from fastapi import APIRouter
from ..db.storage import init_db, get_all_polls

router = APIRouter()

# Initialize DB on module load
init_db()


@router.get("")
def get_polls():
    """Get mayoral polling history."""
    polls = get_all_polls()
    return {"polls": polls, "count": len(polls)}


@router.get("/latest")
def get_latest_polls():
    """Get latest aggregated shares."""
    polls = get_all_polls()
    # TODO: Aggregate
    return {"message": "TODO: implement aggregation"}
