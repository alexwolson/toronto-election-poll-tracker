"""Run the election model and return JSON results."""
import json
from pathlib import Path

import pandas as pd


def load_processed_data() -> dict:
    """Load all processed data files."""
    data_dir = Path(__file__).parent.parent.parent / "data" / "processed"
    return {
        "defeatability": pd.read_csv(data_dir / "ward_defeatability.csv"),
        "challengers": pd.read_csv(data_dir / "challengers.csv"),
        "leans": pd.read_csv(data_dir / "ward_mayoral_lean.csv"),
        "coattails": pd.read_csv(data_dir / "coattail_adjustments.csv"),
        "polls": pd.read_csv(data_dir / "polls.csv"),
    }


def run_model() -> dict:
    """Run the full model pipeline."""
    data = load_processed_data()
    
    # TODO: Run simulation
    # For now, just return raw data with basic structure
    
    return {
        "wards": data["defeatability"].to_dict("records"),
        "challengers": data["challengers"].to_dict("records"),
        "leans": data["leans"].to_dict("records"),
        "coattails": data["coattails"].to_dict("records"),
    }
