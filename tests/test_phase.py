"""Tests for temporal phasing logic (Part 9)."""
from __future__ import annotations

import pandas as pd


def test_empty_challengers_is_phase_1():
    from src.phase import detect_phase
    challengers = pd.DataFrame(
        columns=["ward", "candidate_name", "name_recognition_tier",
                 "fundraising_tier", "mayoral_alignment", "is_endorsed_by_departing"]
    )
    info = detect_phase(challengers)
    assert info["phase"] == 1


def test_challengers_without_fundraising_is_phase_2():
    from src.phase import detect_phase
    challengers = pd.DataFrame([{
        "ward": 1,
        "candidate_name": "Some Candidate",
        "name_recognition_tier": "known",
        "fundraising_tier": None,
        "mayoral_alignment": "unaligned",
        "is_endorsed_by_departing": False,
    }])
    info = detect_phase(challengers)
    assert info["phase"] == 2


def test_challengers_with_fundraising_is_phase_3():
    from src.phase import detect_phase
    challengers = pd.DataFrame([{
        "ward": 1,
        "candidate_name": "Funded Candidate",
        "name_recognition_tier": "known",
        "fundraising_tier": "high",
        "mayoral_alignment": "chow",
        "is_endorsed_by_departing": False,
    }])
    info = detect_phase(challengers)
    assert info["phase"] == 3


def test_phase_info_has_required_keys():
    from src.phase import detect_phase
    challengers = pd.DataFrame(
        columns=["ward", "candidate_name", "name_recognition_tier",
                 "fundraising_tier", "mayoral_alignment"]
    )
    info = detect_phase(challengers)
    assert "phase" in info
    assert "label" in info
    assert "description" in info
