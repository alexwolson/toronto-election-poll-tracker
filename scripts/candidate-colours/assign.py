"""Assign each 2026 candidate a best-effort campaign colour for the results page.

Inputs, beside this script:
  candidates.json  every candidate on the 2026 ballot: candidacy id, name, live race id, and
                   best vote share in any past election on record (clashes weigh more for them)
  extracted.json   up to three colours per campaign website, most prominent first (Haiku 5.5 from
                   a homepage screenshot plus the page's own palette; best-effort, not checked)
  overrides.csv    hand corrections: candidacy_id,colour,note (colour a hex or "none"); win over
                   extracted.json

Every candidate whose site gave a colour gets one. Their options are their colours moved into
the chart band, most prominent first, then a darker and a lighter step of each. Within each
race the script chooses one option per candidate to keep the race's colours, the greys and the
hand-picked mayoral colours as far apart as it can: it minimises clashes (pairs closer than
APART, squared, and far more under FLOOR; weighted towards better-known candidates), with a small
cost for each step away from a campaign's main colour, by descent from several seeded starts.
Writes src/data/candidate-colours.json.

  uv run --with coloraide python scripts/candidate-colours/assign.py
"""

import csv
import json
import random
from pathlib import Path

from coloraide import Color

HERE = Path(__file__).parent
OUT = HERE.parent.parent / "src" / "data" / "candidate-colours.json"

# The chart band (dataviz: OKLCh lightness 0.43-0.77 on a light surface, chroma >= 0.10),
# held a little inside its edges.
L_MIN, L_MAX, C_MIN = 0.46, 0.74, 0.14
# Some hues (cyans, teals) cannot reach C_MIN in sRGB; they keep the most they can, down to this.
C_FLOOR = 0.10
# OKLab distance x100 below which two colours in a race count as clashing (dataviz's
# normal-vision floor).
APART = 15.0
# Closer than this (dataviz's floor for labelled colours) costs far more.
FLOOR = 8.0
# Random starts per race on top of everyone's first option (seeded, so the output is stable).
RESTARTS = 40
# Cost of each step down a candidate's options, against a clash's squared shortfall.
STEP_COST = 4.0
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
    darker and a lighter step of the same hue. Empty for a grey."""
    c = Color(hex_).convert("oklch")
    if c["c"] < 0.03:
        return []
    shades = []
    for lightness in (min(max(c["l"], L_MIN), L_MAX), 0.50, 0.70, 0.60):
        shade = Color("oklch", [lightness, max(c["c"], C_MIN), c["h"]]).fit(
            "srgb", method="oklch-chroma"
        )
        hex_out = shade.convert("srgb").to_string(hex=True).upper()
        if shade["c"] >= C_FLOOR and hex_out not in shades:
            shades.append(hex_out)
    return shades


def options_for(colours: list[str]) -> list[str]:
    """Each site colour at its own lightness, most prominent first, then the steps of each."""
    shades = [chart_shades(h) for h in colours]
    ordered = [s[0] for s in shades if s] + [x for s in shades for x in s[1:]]
    return list(dict.fromkeys(ordered))


def apart(a: str, b: str) -> float:
    return 100 * Color(a).delta_e(b, method="ok")


def clash(a: str, b: str) -> float:
    d = apart(a, b)
    return max(0.0, APART - d) ** 2 + 50 * max(0.0, FLOOR - d) ** 2


def choose(
    people: list[tuple[float, list[str]]], fixed: list[str]
) -> tuple[list[int], float]:
    """One option index per person: coordinate descent from everyone's first option and from
    RESTARTS seeded random starts, keeping the cheapest result."""

    def descend(pick: list[int]) -> tuple[float, list[int]]:
        def cost_of(i: int, k: int) -> float:
            weight, options = people[i]
            colour = options[k]
            cost = STEP_COST * k + weight * sum(clash(colour, f) for f in fixed)
            for j, (w2, o2) in enumerate(people):
                if j != i:
                    cost += weight * w2 * clash(colour, o2[pick[j]])
            return cost

        for _ in range(50):
            changed = False
            for i, (_, options) in enumerate(people):
                best = min(range(len(options)), key=lambda k: (cost_of(i, k), k))
                if best != pick[i]:
                    pick[i], changed = best, True
            if not changed:
                break
        total = sum(
            STEP_COST * k + w * sum(clash(o[k], f) for f in fixed)
            for (w, o), k in zip(people, pick)
        )
        total += sum(
            people[i][0]
            * people[j][0]
            * clash(people[i][1][pick[i]], people[j][1][pick[j]])
            for i in range(len(people))
            for j in range(i + 1, len(people))
        )
        return total, pick

    rng = random.Random(2026)
    starts = [[0] * len(people)] + [
        [rng.randrange(len(o)) for _, o in people] for _ in range(RESTARTS)
    ]
    _, pick = min((descend(start) for start in starts), key=lambda r: r[0])
    colours = [o[k] for (_, o), k in zip(people, pick)] + fixed
    closest = min(
        (apart(a, b) for i, a in enumerate(colours) for b in colours[i + 1 :]),
        default=float("inf"),
    )
    return pick, closest


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
    closest_by_race = {}
    for race_id, field in sorted(races.items()):
        assigned: dict[str, str] = {}
        fixed = list(GREYS)
        people, ids = [], []
        for c in sorted(field, key=lambda c: (-c["best_past_share"], c["name"])):
            if race_id == "mayor" and c["name"] in PINNED:
                var, hex_ = PINNED[c["name"]]
                assigned[c["id"]] = var
                fixed.append(hex_)
                continue
            colours = overrides.get(c["id"], None)
            if colours is not None:
                colours = [] if colours.lower() == "none" else [colours]
            else:
                colours = extracted.get(c["id"], [])
            options = options_for(colours)
            if options:
                people.append((1.0 + 4.0 * c["best_past_share"], options))
                ids.append(c["id"])
        if people:
            pick, closest = choose(people, fixed)
            closest_by_race[race_id] = closest
            for cid, (_, options), k in zip(ids, people, pick):
                assigned[cid] = options[k]
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
    tight = sorted(closest_by_race.items(), key=lambda kv: kv[1])[:8]
    print(
        "closest pair per race, tightest first:",
        ", ".join(f"{r} {d:.1f}" for r, d in tight),
    )


if __name__ == "__main__":
    main()
