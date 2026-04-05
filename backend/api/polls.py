from fastapi import APIRouter

router = APIRouter()


@router.get("")
def get_polls():
    """Get mayoral polling history."""
    return {"message": "TODO: implement"}


@router.get("/latest")
def get_latest_polls():
    """Get latest aggregated shares."""
    return {"message": "TODO: implement"}
