from src.names import canonical_name, CanonicalNameError


def test_known_names_resolve():
    assert canonical_name("Olivia Chow") == "chow"
    assert canonical_name("O. Chow") == "chow"
    assert canonical_name("Brad Bradford") == "bradford"
    assert canonical_name("Ana Bailao") == "bailao"
    assert canonical_name("Josh Matlow") == "matlow"
    assert canonical_name("Anthony Furey") == "furey"


def test_case_insensitive():
    assert canonical_name("olivia chow") == "chow"
    assert canonical_name("OLIVIA CHOW") == "chow"


def test_unknown_name_raises():
    try:
        canonical_name("Unknown Person")
        assert False, "should have raised"
    except CanonicalNameError:
        pass
