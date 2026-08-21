# Issue tracker: Local Markdown

Issues and specs for this repo live as Markdown files in `.scratch/`.

## Conventions

- One feature per directory: `.scratch/<feature-slug>/`
- The spec is `.scratch/<feature-slug>/spec.md`
- Implementation issues are one file per ticket at `.scratch/<feature-slug>/issues/<NN>-<slug>.md`, numbered from `01`
- Triage state is recorded as a `Status:` line near the top
- Comments and conversation history append under a `## Comments` heading

## Publishing

Create new issues under `.scratch/<feature-slug>/`, creating the directory when needed.

## Fetching tickets

Read the referenced file. The user will normally provide its path or issue number.

## Wayfinding operations

- Map: `.scratch/<effort>/map.md`
- Child ticket: `.scratch/<effort>/issues/NN-<slug>.md`
- Blocking: `Blocked by: NN, NN`
- Frontier: open, unblocked, and unclaimed tickets
- Claim: set `Status: claimed`
- Resolve: add an `## Answer`, set `Status: resolved`, and update the map
