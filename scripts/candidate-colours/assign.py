"""Assign each 2026 candidate a best-effort campaign colour for the results page.

Inputs, beside this script:
  candidates.json  every candidate on the 2026 ballot: candidacy id, name, live race id, and
                   best vote share in any past election on record (they pick in that order)
  extracted.json   up to two colours per campaign website, most prominent first (Haiku 5.5 from a
                   homepage screenshot plus the page's own palette; best-effort, not checked)
  overrides.csv    hand corrections: candidacy_id,colour,note (colour a hex or "none"); win over
                   extracted.json

Within each race, candidates pick in order (hand-picked mayoral colours, then by best past vote
share, then by name). Each takes the first of their colours that, once moved into the chart band
(or a darker or lighter step of the same hue), stays clearly apart from every colour
already taken and from the greys; otherwise they stay
grey. Writes src/data/candidate-colours.json.

  uv run --with coloraide python scripts/candidate-colours/assign.py
"""

import csv
import json
from pathlib import Path

from coloraide import Color

HERE = Path(__file__).parent
OUT = HERE.parent.parent / "src" / "data" / "candidate-colours.json"

# The chart band (dataviz: OKLCh lightness 0.43-0.77 on a light surface, chroma >= 0.10),
# held a little inside its edges.
L_MIN, L_MAX, C_MIN = 0.46, 0.74, 0.14
# OKLab distance x100 every two colours in a race keep (dataviz's normal-vision floor).
APART = 15.0
# The greys a colourless candidate is drawn in: --muted (bars) and --live-other (map).
GREYS = ["#5c6478", "#8a8f9c"]
# Hand-picked in globals.css; pinned by name in the mayoral race.
PINNED = {
    "Olivia Chow": ("var(--color-chow)", "#854A90"),
    "Brad Bradford": ("var(--color-bradford)", "#2E8B57"),
    "Chris Alexander": ("var(--color-alexander)", "#54C4CC"),
    "Sarah McVie": ("var(--color-mcvie)", "#D70404"),
    "Odessa Paloma Parker": ("var(--color-parker)", "#B2156E"),
}


def chart_shades(hex_: str) -> list[str]:
    """The colour moved into the chart band, keeping its hue: its own lightness first, then a
    darker and a lighter step of the same hue for when the first clashes. Empty for a grey."""
    c = Color(hex_).convert("oklch")
    if c["c"] < 0.03:
        return []
    shades = []
    for lightness in (min(max(c["l"], L_MIN), L_MAX), 0.50, 0.70, 0.60):
        shade = Color("oklch", [lightness, max(c["c"], C_MIN), c["h"]]).fit(
            "srgb", method="oklch-chroma"
        )
        hex_out = shade.convert("srgb").to_string(hex=True).upper()
        if shade["c"] >= C_MIN - 0.004 and hex_out not in shades:
            shades.append(hex_out)
    return shades


def apart(a: str, b: str) -> float:
    return 100 * Color(a).delta_e(b, method="ok")


def main() -> None:
    candidates = json.loads((HERE / "candidates.json").read_text())
    extracted = json.loads((HERE / "extracted.json").read_text())
    with (HERE / "overrides.csv").open() as f:
        overrides = {
            row["candidacy_id"]: row["colour"].strip() for row in csv.DictReader(f)
        }

    races: dict[str, list[dict]] = {}
    for c in candidates:
        races.setdefault(c["race"], []).append(c)

    out: dict = {"names": {}, "races": {}}
    for race_id, field in sorted(races.items()):
        order = sorted(
            field,
            key=lambda c: (c["name"] not in PINNED, -c["best_past_share"], c["name"]),
        )
        taken: list[str] = list(GREYS)
        assigned: dict[str, str] = {}
        for c in order:
            if race_id == "mayor" and c["name"] in PINNED:
                var, hex_ = PINNED[c["name"]]
                assigned[c["id"]] = var
                taken.append(hex_)
                continue
            if c["id"] in overrides:
                options = (
                    [] if overrides[c["id"]].lower() == "none" else [overrides[c["id"]]]
                )
            else:
                options = extracted.get(c["id"], [])
            for shade in (
                shade for option in options for shade in chart_shades(option)
            ):
                if all(apart(shade, t) >= APART for t in taken):
                    assigned[c["id"]] = shade
                    taken.append(shade)
                    break
        if assigned:
            out["races"][race_id] = assigned
            out["names"].update(
                {c["id"]: c["name"] for c in field if c["id"] in assigned}
            )

    OUT.write_text(json.dumps(out, indent=1, ensure_ascii=False) + "\n")
    n = sum(len(r) for r in out["races"].values())
    print(
        f"{n} of {len(candidates)} candidates coloured across {len(out['races'])} races -> {OUT}"
    )


if __name__ == "__main__":
    main()
