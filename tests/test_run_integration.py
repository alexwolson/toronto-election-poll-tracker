"""Integration test: run_model() returns full simulation results."""

from __future__ import annotations


def test_run_model_returns_win_probabilities():
    """run_model() should return win_probability for all 25 wards."""
    from src.run import run_model

    run_model.cache_clear()
    result = run_model()

    assert "wards" in result
    assert len(result["wards"]) == 25

    for ward in result["wards"]:
        assert "win_probability" in ward
        assert 0.0 <= ward["win_probability"] <= 1.0
        assert "race_class" in ward
        assert ward["race_class"] in ("safe", "competitive", "open")


def test_run_model_returns_composition_stats():
    from src.run import run_model

    run_model.cache_clear()
    result = run_model()

    assert "composition_mean" in result
    assert 0 <= result["composition_mean"] <= 25
    assert "composition_std" in result
    assert result["composition_std"] >= 0


def test_run_model_returns_mayoral_averages():
    from src.run import run_model

    run_model.cache_clear()
    result = run_model()

    assert "mayoral_averages" in result
    assert "chow" in result["mayoral_averages"]
    assert "bradford" in result["mayoral_averages"]
    for candidate, share in result["mayoral_averages"].items():
        assert 0.0 <= share <= 1.0, f"{candidate} share {share} out of range"


def test_run_model_returns_scenarios_metadata():
    from src.run import run_model

    run_model.cache_clear()
    result = run_model()

    assert "scenarios" in result
    assert "default_scenario" in result
    assert isinstance(result["scenarios"], dict)
