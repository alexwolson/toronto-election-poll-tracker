import subprocess
import sys
from fastapi import APIRouter
from ..model.run import run_model, load_processed_data

router = APIRouter()


@router.post("/refresh")
def refresh_model():
    """Re-run process_all and model, return fresh results."""
    # Run process_all.py using the current executable
    result = subprocess.run(
        [sys.executable, "-m", "scripts.process_all"],
        capture_output=True,
        text=True,
    )
    
    if result.returncode != 0:
        return {"status": "error", "error": "process_all failed", "detail": result.stderr}
    
    # Invalidate both caches to ensure fresh data is loaded
    run_model.cache_clear()
    load_processed_data.cache_clear()
    
    # Run model to get fresh results
    model_results = run_model()
    
    return {"status": "ok", "result": model_results}
