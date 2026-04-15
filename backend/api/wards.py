from fastapi import APIRouter, HTTPException
from model.run import run_model
from model.snapshot import load_snapshot

router = APIRouter()


@router.get("")
def get_wards():
    """Get all ward projections."""
    result = load_snapshot()
    if result is None:
        raise HTTPException(
            status_code=503,
            detail="Model snapshot unavailable. Run scripts/build_snapshot.py first.",
        )
    return {
        "wards": result["wards"],
        "challengers": result["challengers"],
        "composition_mean": result["composition_mean"],
        "composition_std": result["composition_std"],
        "composition_by_mayor": result.get("composition_by_mayor", {}),
        "mayoral_averages": result["mayoral_averages"],
        "phase": result["phase"],
        "scenarios": result.get("scenarios", {}),
        "default_scenario": result.get("default_scenario", ""),
    }


@router.get("/{ward_num}")
def get_ward(ward_num: int):
    """Get single ward detail."""
    if ward_num < 1 or ward_num > 25:
        raise HTTPException(status_code=404, detail="Ward not found")

    result = load_snapshot()
    if result is None:
        raise HTTPException(
            status_code=503,
            detail="Model snapshot unavailable. Run scripts/build_snapshot.py first.",
        )
    ward = next((w for w in result["wards"] if w["ward"] == ward_num), None)
    if ward is None:
        raise HTTPException(status_code=404, detail="Ward not found")

    ward_challengers = [c for c in result["challengers"] if c["ward"] == ward_num]
    ward_challengers = [
        c for c in ward_challengers if c.get("candidate_name") != "Generic Challenger"
    ]

    return {"ward": ward, "challengers": ward_challengers}
