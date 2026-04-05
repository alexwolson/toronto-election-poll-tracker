import os
import subprocess
import sys
import threading
from pathlib import Path
from fastapi import APIRouter
from ..model.run import run_model, load_processed_data

router = APIRouter()

# Simple lock to prevent multiple refreshes from running simultaneously
_refresh_lock = threading.Lock()


@router.post("/refresh")
def refresh_model():
    """Re-run process_all and model, return fresh results."""
    
    # Try to acquire the lock without blocking the API call
    if not _refresh_lock.acquire(blocking=False):
        return {"status": "error", "error": "refresh already in progress"}
    
    try:
        # Get project root to run scripts from the correct directory
        root_dir = Path(__file__).parent.parent.parent
        
        # Run process_all.py using the current executable
        result = subprocess.run(
            [sys.executable, "-m", "scripts.process_all"],
            capture_output=True,
            text=True,
            cwd=root_dir,
            env={**os.environ, "PYTHONPATH": str(root_dir)}
        )
        
        if result.returncode != 0:
            return {"status": "error", "error": "process_all failed", "detail": result.stderr}
        
        # Invalidate both caches to ensure fresh data is loaded
        run_model.cache_clear()
        load_processed_data.cache_clear()
        
        # Run model to get fresh results
        model_results = run_model()
        
        return {"status": "ok", "result": model_results}
    finally:
        _refresh_lock.release()
