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
