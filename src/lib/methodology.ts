export interface MethodologyNavItem {
  id: string;
  label: string;
}

export interface MethodologyFlowStep {
  title: string;
  body: string;
}

export interface HintEvidenceExample {
  status: "published" | "withheld";
  title: string;
  evidence: string;
  reason: string;
}

export interface GlossaryEntry {
  term: string;
  definition: string;
}

export const methodologyNav: MethodologyNavItem[] = [
  { id: "mayoral-forecast", label: "Mayoral forecast" },
  { id: "polling-trends", label: "Polling trends" },
  { id: "council-attention", label: "Council attention" },
  { id: "candidate-history", label: "Candidate history" },
  { id: "limitations", label: "Limits" },
  { id: "glossary", label: "Glossary" },
  { id: "sources", label: "Sources" },
];

export const forecastFlow: MethodologyFlowStep[] = [
  {
    title: "Choose eligible polls",
    body: "Use polls of the certified candidate field, keeping the newest eligible reading from each pollster.",
  },
  {
    title: "Balance the pollsters",
    body: "Give each represented pollster equal weight, so publishing more often does not create more influence.",
  },
  {
    title: "Account for the full ballot",
    body: "Use Toronto history to reserve support for certified candidates a poll did not measure. Missing never means zero.",
  },
  {
    title: "Model election-day uncertainty",
    body: "Use past Toronto polling misses to create thousands of plausible full-ballot results.",
  },
  {
    title: "Stress-test the result",
    body: "Repeat the forecast under other reasonable choices and after leaving out individual samples or pollsters.",
  },
  {
    title: "Publish a stable band",
    body: "Show the narrowest plain-language range that survives the required checks; otherwise broaden it or withhold it.",
  },
];

export const hintEvidenceFlow: MethodologyFlowStep[] = [
  {
    title: "Name a testable idea",
    body: "Define the candidate fact, comparison group, race type, and direction before looking at the result.",
  },
  {
    title: "Check coverage and identity",
    body: "Require enough candidates, contests, and elections, with confirmed links to their earlier races.",
  },
  {
    title: "Estimate the association",
    body: "Compare vote share after accounting for election, candidate role, and field size, with uncertainty grouped by contest.",
  },
  {
    title: "Compare elections",
    body: "Record whether the direction repeats across 2010, 2014, and 2022 or appears only in the pooled result.",
  },
  {
    title: "Publish, supersede, or withhold",
    body: "Publish only a standalone statement the evidence can carry; retain every other tested definition in the audit.",
  },
];

export const hintAuditSnapshot = {
  tested: 35,
  published: 12,
  diagnosticTested: 21,
  diagnosticCleared: 10,
  contractVersion: "2.1.0",
  primaryYears: [2010, 2014, 2022],
  reviewedOn: "2026-08-21",
} as const;

export const hintEvidenceExamples: HintEvidenceExample[] = [
  {
    status: "published",
    title: "Previously elected trustee",
    evidence: "17 candidacies · 16 contests · 3 elections",
    reason: "Associated with more council vote share in the same direction in 2010, 2014, and 2022.",
  },
  {
    status: "published",
    title: "Won at least one previous race",
    evidence: "13 candidacies · 12 contests · 3 elections",
    reason: "For non-incumbent, non-returning candidates with prior races, having at least one win was associated with more council vote share in all three elections.",
  },
  {
    status: "published",
    title: "Previous race experience",
    evidence: "107 candidacies · 68 contests · 3 elections",
    reason: "Non-incumbent, non-returning candidates with any confirmed previous race received more council vote share than otherwise comparable first-time candidates in all three elections.",
  },
  {
    status: "published",
    title: "An unsuccessful council run",
    evidence: "88 candidacies · 60 contests · 3 elections",
    reason: "The audit retains this as a pair—stronger than having no previous race, but weaker than other prior experience—but the ward cards do not turn that awkward comparison into candidate copy.",
  },
  {
    status: "published",
    title: "A former councillor in an open race",
    evidence: "4 candidacies · 4 contests · 3 elections",
    reason: "The small sample was approved at an explicit limited-evidence tier after the direction repeated in all three elections and passed additional influence and permutation checks.",
  },
  {
    status: "withheld",
    title: "Previously elected MP",
    evidence: "1 candidacy · 1 contest · 1 election",
    reason: "The estimated difference was large, but one example cannot support a public candidate-level statement.",
  },
  {
    status: "withheld",
    title: "Each additional previous victory",
    evidence: "199 candidacies · 110 contests · 3 elections",
    reason: "Across all candidate types, the uncertainty included no relationship. Among prior winners, additional wins showed no clear dose response.",
  },
  {
    status: "withheld",
    title: "Two or more unsuccessful council runs",
    evidence: "16 candidacies · 14 contests · 3 elections",
    reason: "The uncertainty included no relationship, and the estimated direction did not repeat across all three elections.",
  },
];

export const glossary: GlossaryEntry[] = [
  {
    term: "Poll",
    definition: "A reported survey reading from one pollster and respondent sample.",
  },
  {
    term: "LOESS trend",
    definition: "A smooth curve fitted locally through one candidate's reported poll results.",
  },
  {
    term: "Win-chance band",
    definition: "A public range, expressed as a frequency such as “about 4 times in 5,” rather than a fragile exact percentage.",
  },
  {
    term: "Sensitivity check",
    definition: "A rerun under another reasonable assumption to see whether the public conclusion changes.",
  },
  {
    term: "Open seat",
    definition: "A council race with no incumbent candidate in the field.",
  },
  {
    term: "Prior win",
    definition: "An incumbent's latest council victory before the current election, including a by-election when it is the latest.",
  },
  {
    term: "Councillor Defeatability Index",
    definition: "A City Hall Watcher comparison of Toronto incumbents using their prior vote share, eligible-elector support, and electorate growth relative to their winning margin.",
  },
  {
    term: "Exposure trigger",
    definition: "A concrete ward condition that adds attention, such as estimated electorate growth exceeding the incumbent's previous winning margin.",
  },
  {
    term: "Historical hint",
    definition: "A candidate-specific fact matching a supported historical association. It is context, not a candidate score.",
  },
];
