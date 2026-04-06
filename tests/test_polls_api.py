"""Tests for /api/polls/latest endpoint."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client():
    import sys

    sys.path.insert(0, "backend")
    from main import app

    return TestClient(app)


def test_polls_latest_returns_aggregated_shares(client):
    """GET /api/polls/latest should return a dict of candidate shares."""
    response = client.get("/api/polls/latest")
    assert response.status_code == 200
    data = response.json()
    assert "aggregated" in data
    assert "chow" in data["aggregated"]
    assert "bradford" in data["aggregated"]
    for share in data["aggregated"].values():
        assert 0.0 <= share <= 1.0


def test_polls_latest_includes_poll_count(client):
    """GET /api/polls/latest should report how many polls were used."""
    response = client.get("/api/polls/latest")
    assert response.status_code == 200
    data = response.json()
    assert "polls_used" in data
    assert isinstance(data["polls_used"], int)
    assert data["polls_used"] > 0


def test_polls_latest_returns_trend_points(client):
    """GET /api/polls/latest should include date-sorted trend points."""
    response = client.get("/api/polls/latest")
    assert response.status_code == 200
    data = response.json()

    assert "trend" in data
    assert isinstance(data["trend"], list)
    assert len(data["trend"]) > 0

    dates = [point["date"] for point in data["trend"]]
    assert dates == sorted(dates)

    candidates = data.get("candidates", [])
    for point in data["trend"]:
        assert "date" in point
        for candidate in candidates:
            assert candidate in point


def test_polls_latest_includes_candidates_and_trend_date(client):
    """GET /api/polls/latest should expose candidates and dated trend points."""
    response = client.get("/api/polls/latest")
    assert response.status_code == 200
    data = response.json()

    assert "candidates" in data
    assert isinstance(data["candidates"], list)

    assert "trend" in data
    assert isinstance(data["trend"], list)
    assert len(data["trend"]) > 0
    assert "date" in data["trend"][0]


def test_polls_latest_trend_excludes_non_scenario_candidates(client, monkeypatch):
    """GET /api/polls/latest trend should only expose default scenario candidates."""
    import pandas as pd

    polls_df = pd.DataFrame(
        [
            {
                "poll_id": "default-scenario",
                "date_published": "2026-03-20",
                "field_tested": "chow, bradford, bailao",
                "chow": 0.40,
                "bradford": 0.30,
                "bailao": 0.20,
                "matlow": 0.10,
            },
            {
                "poll_id": "other-scenario",
                "date_published": "2026-04-01",
                "field_tested": "chow, bradford, matlow",
                "chow": 0.10,
                "bradford": 0.10,
                "bailao": 0.00,
                "matlow": 0.70,
            },
        ]
    )

    monkeypatch.setattr(pd, "read_csv", lambda *_args, **_kwargs: polls_df.copy())

    response = client.get("/api/polls/latest")
    assert response.status_code == 200
    data = response.json()

    expected = {"date", "chow", "bradford", "bailao"}
    assert len(data["trend"]) > 0
    for point in data["trend"]:
        assert set(point.keys()) == expected
        assert "matlow" not in point


def test_polls_latest_includes_chow_pressure_payload(client):
    """GET /api/polls/latest should include chow pressure payload."""
    response = client.get("/api/polls/latest")
    assert response.status_code == 200
    data = response.json()

    assert "chow_pressure" in data
    assert "value" in data["chow_pressure"]
    assert "trend" in data["chow_pressure"]


def test_polls_latest_includes_trust_diagnostics(client):
    """GET /api/polls/latest should include trust diagnostics metadata."""
    response = client.get("/api/polls/latest")
    assert response.status_code == 200
    data = response.json()

    assert "total_polls_available" in data
    assert "polls_with_non_scenario_candidates" in data


def test_polls_latest_includes_chow_structural_context(client):
    """GET /api/polls/latest should include separate structural context for Chow."""
    response = client.get("/api/polls/latest")
    assert response.status_code == 200
    data = response.json()

    assert "chow_structural_context" in data
    assert "score" in data["chow_structural_context"]
    assert data["chow_structural_context"]["score"] == 60


def test_polls_latest_reads_chow_structural_context_from_full_defeatability_csv(
    client, monkeypatch
):
    """Should source mayor structural score from processed full defeatability file."""
    import pandas as pd

    polls_df = pd.DataFrame(
        [
            {
                "poll_id": "p1",
                "date_published": "2026-03-01",
                "field_tested": "chow, bradford, bailao",
                "chow": 0.45,
                "bradford": 0.30,
                "bailao": 0.20,
                "other": 0.05,
            }
        ]
    )
    full_defeatability_df = pd.DataFrame(
        [
            {
                "Ward": "Mayor",
                "Elected Councillor": "Olivia Chow",
                "Defeatability Score": 61,
            },
            {
                "Ward": "10",
                "Elected Councillor": "Ausma Malik",
                "Defeatability Score": 70,
            },
        ]
    )

    real_read_csv = pd.read_csv

    def fake_read_csv(path, *args, **kwargs):
        p = str(path)
        if p.endswith("polls.csv"):
            return polls_df.copy()
        if p.endswith("defeatability_full.csv"):
            return full_defeatability_df.copy()
        return real_read_csv(path, *args, **kwargs)

    monkeypatch.setattr(pd, "read_csv", fake_read_csv)

    response = client.get("/api/polls/latest")
    assert response.status_code == 200
    data = response.json()
    assert data["chow_structural_context"]["score"] == 61
    assert (
        data["chow_structural_context"]["source"] == "Matt Elliott defeatability index"
    )
