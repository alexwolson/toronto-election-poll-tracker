# 01: Add human-readable geography to historical ward labels

**What to build:** Candidate histories should show the authoritative human-readable area name alongside each historical council or school-board ward number, using the electoral body and boundary system that applied when the race occurred. Carry the enriched historical label through the council-card feed so readers can understand whether a candidate's earlier race was geographically close to the current contest without mistaking identically numbered wards from different systems or eras for the same place.

**Blocked by:** None (can start immediately).

**Status:** blocked-needs-authoritative-data

> Parked pending a decision on sourcing authoritative ward-name tables (44-ward
> Toronto council, TDSB trustee, TCDSB trustee across historical boundary
> regimes). The canonical carries only bare `Ward N`; the ticket forbids guessing,
> so these names must come from authoritative City/school-board sources. See the
> conversation for options (user provides / research-and-cite / defer).

- [ ] Michael Mitchell's Ward 14 candidate history renders his 2014 race as `Councillor, Ward 10 — York Centre`, not the bare `Councillor, Ward 10`.
- [ ] Jason Stevens's Ward 14 candidate history renders his 2025 race as `TDSB Trustee, Ward 11 — Don Valley West` and his 2010 race as `Councillor, Ward 19 — Trinity-Spadina`.
- [ ] Historical labels are resolved using the represented body, election date or boundary regime, and official district identifier together. The implementation never applies the current 25-ward council names to former 44-ward council contests or assumes that council, TDSB, and Catholic trustee wards with the same number cover the same geography.
- [ ] The authoritative mappings cover every bare `Ward <number>` label currently surfaced in candidate histories, including former 44-ward Toronto council contests and the TDSB and Toronto Catholic District School Board trustee contests represented in the current field.
- [ ] Ward names come from documented authoritative City or school-board sources and retain the name that applied to the historical contest. The source and applicable electoral era for each mapping are auditable.
- [ ] Historical district labels that already include a human-readable name remain unchanged, including current-boundary labels such as `Ward 15 — Don Valley West`.
- [ ] When an authoritative human-readable name cannot be established for a district and era, the UI retains the accurate ward number rather than guessing, borrowing a current name, or hiding the race.
- [ ] The candidate-history feed continues to preserve the electoral body separately from the district label, so trustee races remain visibly distinguishable from council races.
- [ ] Regression coverage includes a former 44-ward council race, a current 25-ward council race, a TDSB trustee race, a Catholic trustee race, two identically numbered wards from different systems, and the no-authoritative-name fallback.
