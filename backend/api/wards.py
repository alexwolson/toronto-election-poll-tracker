from fastapi import APIRouter, HTTPException

router = APIRouter()


@router.get("")
def get_wards():
    """Get all ward projections."""
    return {"message": "TODO: implement"}


@router.get("/{ward_num}")
def get_ward(ward_num: int):
    """Get single ward detail."""
    if ward_num < 1 or ward_num > 25:
        raise HTTPException(status_code=404, detail="Ward not found")
    return {"message": "TODO: implement"}
