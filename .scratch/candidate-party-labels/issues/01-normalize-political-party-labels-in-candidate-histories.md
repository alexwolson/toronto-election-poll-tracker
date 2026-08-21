# 01: Normalize political-party labels in candidate histories

**What to build:** Candidate histories should use a concise, consistent public vocabulary for federal and Ontario political parties. Replace fuzzy substring-based shortening with explicit normalization of the canonical party names so common parties receive their familiar labels, unrelated parties cannot be accidentally collapsed together, and unfamiliar parties remain accurately named.

**Blocked by:** None (can start immediately).

**Status:** resolved

- [ ] Federal candidate histories use the labels `Conservative`, `Liberal`, `NDP`, `Green`, and `PPC` for the corresponding canonical parties.
- [ ] Ontario candidate histories use the labels `PC`, `Liberal`, `NDP`, `Green`, `New Blue`, and `Ontario Party` for the corresponding canonical parties.
- [ ] The adjacent `MP` or `MPP` office label continues to supply the jurisdiction, so provincial and federal histories remain distinguishable even where their party display labels are the same.
- [ ] `New Blue Party of Ontario` renders as `New Blue`, removing the current long-name outlier from the otherwise concise party vocabulary.
- [ ] Party labels are selected from exact canonical party identity or exact canonical party name, not broad substring matching. A distinct party containing words such as “People's,” “Liberal,” “Green,” or “Conservative” is not mislabeled as `PPC`, `Liberal`, `Green`, or `Conservative` merely because of its name.
- [ ] A party without an approved public short label retains its canonical name rather than being guessed, silently dropped, or assigned to another party.
- [ ] Non-partisan municipal and school-board races continue to render without a party label.
- [ ] Regression coverage includes every normalized federal and Ontario label above, at least two collision-prone unrelated party names, an unknown-party fallback, and a non-partisan race.

## Answer

`partyLabel` (`src/lib/council-history.ts`) now maps an **exact** canonical party
name to its public label via a fixed table (federal: Conservative/Liberal/NDP/
Green/PPC; Ontario: PC/Liberal/NDP/Green/New Blue/Ontario Party), built from the
exact `party_name` values the canonical actually carries for MP/MPP races. No
substring matching, so an unrelated party whose name merely contains "Liberal"/
"Green"/etc. is never collapsed; an unknown party keeps its canonical name; a
non-partisan (empty) party gets no label. Jurisdiction still comes from the
adjacent MP/MPP office label, so same-labelled federal/provincial rows stay
distinguishable. Frontend-only (party_name is already in the feed).

**Coverage** (`src/lib/council-history.test.ts`): every federal and Ontario
label; two collision-prone names ("Christian Heritage Liberal Party",
"People's Voice") that stay unchanged; an unknown-party fallback; and the
non-partisan/null cases.
