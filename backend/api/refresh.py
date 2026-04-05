from fastapi import APIRouter

router = APIRouter()


@router.post("/refresh")
def refresh_model():
    """Re-run the model."""
    return {"message": "TODO: implement"}
