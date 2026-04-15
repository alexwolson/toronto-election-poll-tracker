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
                "field_tested": "chow, bradford",
                "chow": 0.40,
                "bradford": 0.30,
                "matlow": 0.10,
            },
            {
                "poll_id": "other-scenario",
                "date_published": "2026-04-01",
                "field_tested": "chow, bradford, furey",
                "chow": 0.10,
                "bradford": 0.10,
                "furey": 0.70,
            },
        ]
    )

    monkeypatch.setattr(pd, "read_csv", lambda *_args, **_kwargs: polls_df.copy())

    response = client.get("/api/polls/latest")
    assert response.status_code == 200
    data = response.json()

    expected = {"date", "chow", "bradford"}
    assert len(data["trend"]) > 0
    for point in data["trend"]:
        assert set(point.keys()) == expected
        assert "matlow" not in point


def test_polls_latest_returns_candidate_status_and_ranges(client):
    response = client.get("/api/polls/latest")
    assert response.status_code == 200
    data = response.json()

    assert "candidate_status" in data
    assert set(data["candidate_status"].keys()) == {"declared", "potential", "declined"}

    assert "candidate_ranges" in data
    assert "declared" in data["candidate_ranges"]
    assert "potential" in data["candidate_ranges"]
    assert "declined" in data["candidate_ranges"]
