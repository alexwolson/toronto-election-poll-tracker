# Domain Docs

How engineering skills consume this repository's domain documentation.

## Before exploring

Read these when they exist:

- `CONTEXT.md` at the repository root
- `CONTEXT-MAP.md` if present, followed by each relevant context
- Relevant decisions under `docs/adr/`

Proceed silently when these files do not exist. Domain-modeling workflows create them when terminology or decisions need recording.

## Layout

This is a single-context repository:

```
/
├── CONTEXT.md
├── docs/adr/
└── src/
```

## Vocabulary

Use terminology defined in `CONTEXT.md` in issue titles, hypotheses, tests, and proposals. Avoid synonyms the glossary rejects.

If a needed concept is absent, reconsider whether it belongs or note the gap for domain modeling.

## ADR conflicts

Explicitly identify proposals that contradict an existing ADR rather than silently overriding it.
