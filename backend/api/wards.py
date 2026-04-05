from fastapi import APIRouter, HTTPException
from model.run import run_model

router = APIRouter()


@router.get("")
def get_wards():
    """Get all ward projections."""
    result = run_model()
    return {"wards": result["wards"], "challengers": result["challengers"]}


@router.get("/{ward_num}")
def get_ward(ward_num: int):
    """Get single ward detail."""
    if ward_num < 1 or ward_num > 25:
        raise HTTPException(status_code=404, detail="Ward not found")
    
    result = run_model()
    ward = next((w for w in result["wards"] if w["ward"] == ward_num), None)
    if ward is None:
        raise HTTPException(status_code=404, detail="Ward not found")
    
    ward_challengers = [c for c in result["challengers"] if c["ward"] == ward_num]
    
    return {"ward": ward, "challengers": ward_challengers}
