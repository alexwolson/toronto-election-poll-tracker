"""Canonical candidate name registry.

All candidate name variations map to a short lowercase key used
consistently across all processed data.
"""

_REGISTRY: dict[str, str] = {
    # Olivia Chow
    "olivia chow": "chow",
    "o. chow": "chow",
    "chow": "chow",
    # Brad Bradford
    "brad bradford": "bradford",
    "bradford": "bradford",
    # Ana Bailao
    "ana bailão": "bailao",
    "ana bailao": "bailao",
    "ana bailo": "bailao",
    "bailao": "bailao",
    # Josh Matlow
    "josh matlow": "matlow",
    "matlow": "matlow",
    # Anthony Furey
    "anthony furey": "furey",
    "furey": "furey",
    # Marco Mendicino
    "marco mendicino": "mendicino",
    "mendicino": "mendicino",
}

# Used by the ingestion pipeline to validate candidate columns in poll data.
KNOWN_CANDIDATES = sorted(set(_REGISTRY.values()))


class CanonicalNameError(ValueError):
    pass


def canonical_name(name: str) -> str:
    """Return the canonical key for a candidate name.

    Raises CanonicalNameError if the name is not recognised.
    """
    key = name.strip().lower()
    if key not in _REGISTRY:
        raise CanonicalNameError(
            f"Unrecognised candidate name: {name!r}. "
            f"Add it to src/names.py if it is a valid variation."
        )
    return _REGISTRY[key]
