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


def test_run_model_returns_composition_by_mayor_winner():
    from src.run import run_model

    run_model.cache_clear()
    result = run_model()

    assert "composition_by_mayor" in result
    composition_by_mayor = result["composition_by_mayor"]
    assert isinstance(composition_by_mayor, dict)
    assert composition_by_mayor

    total_draws = 0
    for candidate, stats in composition_by_mayor.items():
        assert isinstance(candidate, str)
        assert isinstance(stats, dict)
        assert set(stats.keys()) == {"mean", "std", "n_draws"}
        assert 0.0 <= stats["mean"] <= 25.0
        assert stats["std"] >= 0.0
        assert isinstance(stats["n_draws"], int)
        assert stats["n_draws"] >= 0
        total_draws += stats["n_draws"]

    assert total_draws == 5000


def test_run_model_filters_to_default_executable_scenario(monkeypatch):
    from src import run as run_module

    captured: dict[str, object] = {}

    class DummySimulation:
        def __init__(self, **kwargs):
            captured["mayoral_averages"] = kwargs["mayoral_averages"].copy()

        def run(self):
            return {
                "win_probabilities": {1: 0.5},
                "incumbent_probability_interval": {1: {"low": 0.4, "high": 0.6}},
                "candidate_win_probabilities": {1: {"Inc": 0.5, "Chal": 0.5}},
                "factors": {1: {"vuln": 0.0, "coat": 0.0, "chal": 0.0}},
                "composition_mean": 12.0,
                "composition_std": 1.0,
                "composition_by_mayor": {
                    "chow": {"mean": 12.0, "std": 1.0, "n_draws": 10}
                },
            }

    polls = [
        {
            "poll_id": "default-field",
            "date_published": "2026-03-20",
            "field_tested": "chow, bradford",
            "chow": 0.40,
            "bradford": 0.30,
            "matlow": 0.10,
        },
        {
            "poll_id": "other-field",
            "date_published": "2026-04-01",
            "field_tested": "chow, bradford, furey",
            "chow": 0.10,
            "bradford": 0.10,
            "furey": 0.70,
        },
    ]

    monkeypatch.setattr(
        run_module,
        "load_processed_data",
        lambda: {
            "defeatability": run_module.pd.DataFrame(
                [{"ward": 1, "councillor_name": "Inc", "is_running": True}]
            ),
            "challengers": run_module.pd.DataFrame(
                [
                    {
                        "ward": 1,
                        "candidate_name": "Chal",
                        "name_recognition_tier": "known",
                        "mayoral_alignment": "chow",
                    }
                ]
            ),
            "leans": run_module.pd.DataFrame([]),
            "coattails": run_module.pd.DataFrame(
                [{"ward": 1, "coattail_adjustment": 0.0}]
            ),
            "polls": run_module.pd.DataFrame(polls),
            "ward_polls": run_module.pd.DataFrame([]),
        },
    )
    monkeypatch.setattr(run_module, "WardSimulation", DummySimulation)
    monkeypatch.setattr(run_module, "detect_phase", lambda _: "active")

    run_module.run_model.cache_clear()
    result = run_module.run_model()

    scenario_cands = set(run_module.SCENARIOS[run_module.DEFAULT_SCENARIO])
    assert set(result["mayoral_averages"].keys()) == scenario_cands
    assert set(captured["mayoral_averages"]["candidate"].tolist()) == scenario_cands
    assert "matlow" not in result["mayoral_averages"]


def test_run_model_excludes_polls_with_declined_candidates(monkeypatch):
    from src import run as run_module

    captured: dict[str, object] = {}

    class DummySimulation:
        def __init__(self, **kwargs):
            captured["mayoral_averages"] = kwargs["mayoral_averages"].copy()

        def run(self):
            return {
                "win_probabilities": {1: 0.5},
                "incumbent_probability_interval": {1: {"low": 0.4, "high": 0.6}},
                "candidate_win_probabilities": {1: {"Inc": 0.5, "Chal": 0.5}},
                "factors": {1: {"vuln": 0.0, "coat": 0.0, "chal": 0.0}},
                "composition_mean": 12.0,
                "composition_std": 1.0,
                "composition_by_mayor": {
                    "chow": {"mean": 12.0, "std": 1.0, "n_draws": 10}
                },
            }

    polls = [
        {
            "poll_id": "include",
            "date_published": "2026-03-20",
            "field_tested": "chow, bradford",
            "chow": 0.2,
            "bradford": 0.2,
        },
        {
            "poll_id": "exclude-declined",
            "date_published": "2026-03-21",
            "field_tested": "chow, bradford, tory",
            "chow": 0.8,
            "bradford": 0.1,
            "tory": 0.1,
        },
    ]

    monkeypatch.setattr(
        run_module,
        "load_processed_data",
        lambda: {
            "defeatability": run_module.pd.DataFrame(
                [{"ward": 1, "councillor_name": "Inc", "is_running": True}]
            ),
            "challengers": run_module.pd.DataFrame(
                [
                    {
                        "ward": 1,
                        "candidate_name": "Chal",
                        "name_recognition_tier": "known",
                        "mayoral_alignment": "chow",
                    }
                ]
            ),
            "leans": run_module.pd.DataFrame([]),
            "coattails": run_module.pd.DataFrame(
                [{"ward": 1, "coattail_adjustment": 0.0}]
            ),
            "polls": run_module.pd.DataFrame(polls),
            "ward_polls": run_module.pd.DataFrame([]),
        },
    )
    monkeypatch.setattr(run_module, "WardSimulation", DummySimulation)
    monkeypatch.setattr(run_module, "detect_phase", lambda _: "active")

    run_module.run_model.cache_clear()
    result = run_module.run_model()

    assert result["mayoral_averages"]["chow"] == 0.2
    assert result["mayoral_averages"]["bradford"] == 0.2


def test_run_model_adds_generic_challenger_for_wards_without_declared(monkeypatch):
    from src import run as run_module

    class DummySimulation:
        def __init__(self, **kwargs):
            self.challengers = kwargs["challengers"]

        def run(self):
            return {
                "win_probabilities": {1: 0.5},
                "incumbent_probability_interval": {1: {"low": 0.4, "high": 0.6}},
                "candidate_win_probabilities": {
                    1: {"Inc": 0.5, "Generic Challenger": 0.5}
                },
                "factors": {1: {"vuln": 0.0, "coat": 0.0, "chal": 0.0}},
                "composition_mean": 12.0,
                "composition_std": 1.0,
                "composition_by_mayor": {
                    "chow": {"mean": 12.0, "std": 1.0, "n_draws": 10}
                },
            }

    monkeypatch.setattr(
        run_module,
        "load_processed_data",
        lambda: {
            "defeatability": run_module.pd.DataFrame(
                [
                    {
                        "ward": 1,
                        "councillor_name": "Inc",
                        "is_running": True,
                        "defeatability_score": 45,
                    }
                ]
            ),
            "challengers": run_module.pd.DataFrame(
                columns=[
                    "ward",
                    "candidate_name",
                    "name_recognition_tier",
                    "fundraising_tier",
                    "mayoral_alignment",
                    "is_endorsed_by_departing",
                ]
            ),
            "leans": run_module.pd.DataFrame([]),
            "coattails": run_module.pd.DataFrame(
                [{"ward": 1, "coattail_adjustment": 0.0}]
            ),
            "polls": run_module.pd.DataFrame(
                [
                    {
                        "poll_id": "default-field",
                        "date_published": "2026-03-20",
                        "field_tested": "chow, bradford",
                        "chow": 0.5,
                        "bradford": 0.5,
                    }
                ]
            ),
            "ward_polls": run_module.pd.DataFrame([]),
        },
    )
    monkeypatch.setattr(run_module, "WardSimulation", DummySimulation)
    monkeypatch.setattr(run_module, "detect_phase", lambda _: "active")

    run_module.run_model.cache_clear()
    result = run_module.run_model()

    ward_challengers = [c for c in result["challengers"] if c["ward"] == 1]
    assert any(c["candidate_name"] == "Generic Challenger" for c in ward_challengers)
