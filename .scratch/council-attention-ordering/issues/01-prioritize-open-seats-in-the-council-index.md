# 01: Prioritize open seats in the council index

**What to build:** The default council index should order ward races by reader attention rather than incumbent exposure alone. Open contests belong in the leading attention cohort alongside high-attention incumbent races, while retaining their distinct "Open seat" presentation instead of being recast as incumbent races.

**Blocked by:** None (can start immediately).

**Status:** resolved

- [ ] In the default attention ordering, every open seat appears before all elevated- and quiet-attention incumbent races.
- [ ] Open seats retain the distinct "Open seat" label and open-contest explanation wherever ward attention is presented.
- [ ] The default sort control uses attention-oriented wording that accurately includes both open contests and exposed incumbents.
- [ ] The ward-number sort continues to order all 25 wards numerically.
- [ ] Search and filtering preserve the selected sort, including the open-seat priority in the default ordering.
- [ ] Regression coverage proves the relative ordering of open, high, elevated, and quiet races rather than only checking that numeric sort scores descend.

## Answer

`attentionScore` (`src/lib/council.ts`) now scores by attention **cohort** —
`open: 4000, high: 3000, elevated: 2000, quiet: 1000` plus an intra-band intensity
(triggers·100 + defeatability, capped < 1000) so bands never cross. Open seats and
high-attention incumbents form the leading cohort; elevated and quiet follow.
`wardAttentionLevel` (and thus the "Open seat" label / open-contest copy) is
unchanged, so open seats keep their distinct presentation. The default sort mode
was renamed `exposure` → `attention`, and the control now reads **"Most watched"**
(covers open contests and exposed incumbents alike); ward-number sort is untouched.
Search/filter run before the sort, so the ordering (open-first) is preserved under
filtering.

**Coverage:**
- `src/lib/council.test.ts` → "puts open seats and high-attention races ahead of elevated and quiet ones" asserts, on the real fixture, that the max index of any open/high race precedes the min index of any elevated/quiet race (and that open seats specifically lead) — a relative-ordering check, not a scores-descend check.
- Verified in the built `/wards`: Wards 4/14/19 (OPEN SEAT) lead, then HIGH ATTENTION incumbents, then ELEVATED; control reads "Most watched."
