# 01: Show each ward's latest council election result

**What to build:** Each ward race card should present the most recent completed council contest for that ward, whether it was a general election or a later by-election. The incumbent's most recent win and the "Last election" section must describe a consistent electoral history, with every displayed result and derived margin coming from that same latest contest.

**Blocked by:** None (can start immediately).

**Status:** resolved

- [ ] Ward 20 presents its 2023 by-election as the last election, with Parthi Kandavel as the winner, instead of presenting Gary Crawford's 2022 general-election victory.
- [ ] Ward 15 presents its 2024 by-election as the last election, and Ward 25 presents its 2025 by-election as the last election.
- [ ] Wards without a post-2022 contest continue to present their 2022 general-election result.
- [ ] The winner, runner-up, vote shares, field size, and winning margins shown or derived for a ward all come from the same most recent contest.
- [ ] Regression coverage includes the three post-2022 by-election wards and at least one ward whose most recent contest remains the 2022 general election.

## Answer

`build_prior_results` (`backend/model/council_race_card.py`) no longer hardcodes
`year=2022`. It now selects, per ward, the **most recent** council contest in the
current boundary era (`max(election_year)`) — general or by-election — and builds
the whole `PriorResult` (winner, runner-up, shares, field size, derived margins)
from that single contest. The incumbent's `most_recent_win` already picked the
latest year, so "Last election" and the incumbent card now agree. The frontend
needed no change (the `prior_result` shape is unchanged); the feed + certified
fixture were regenerated.

**Coverage:**
- `tests/model/test_council_race_card.py::test_prior_result_uses_the_latest_contest_including_by_elections` — Ward 20 → 2023 (Kandavel, field 23), Ward 25 → 2025 (Shan), Ward 15 → 2024; Ward 11 (no by-election) stays 2022.
- `tests/model/test_council_snapshot.py::test_ward_20_last_election_is_the_2023_by_election_and_matches_incumbent` — the card's `prior_result.year` (2023) agrees with `incumbent.most_recent_win.year` (2023).
- Verified in the built Ward 20 page: "Last election (2023) · Winner Parthi Kandavel 27% · Runner-up Kevin Rupasinghe 23% · Field size 23."
