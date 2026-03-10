import pytest

from src.names import canonical_name, CanonicalNameError


def test_known_names_resolve():
    assert canonical_name("Olivia Chow") == "chow"
    assert canonical_name("O. Chow") == "chow"
    assert canonical_name("Brad Bradford") == "bradford"
    assert canonical_name("Ana Bailao") == "bailao"
    assert canonical_name("Josh Matlow") == "matlow"
    assert canonical_name("Anthony Furey") == "furey"
    assert canonical_name("Marco Mendicino") == "mendicino"


def test_case_insensitive():
    assert canonical_name("olivia chow") == "chow"
    assert canonical_name("OLIVIA CHOW") == "chow"


def test_unknown_name_raises():
    with pytest.raises(CanonicalNameError):
        canonical_name("Unknown Person")
