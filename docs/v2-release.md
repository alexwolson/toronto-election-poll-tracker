# Coordinated snapshot release

The frontend rejects any polling snapshot whose `schema_version` is not `2`
and any Council snapshot whose `schema_version` is not `3`.
Production data URLs are pinned with `NEXT_PUBLIC_DATA_REVISION`; the default is
`main` only for ordinary development.

1. Generate and verify `model_snapshot.json` and `polls_snapshot.json` on a data branch.
2. Record that branch's immutable commit SHA and deploy the frontend with
   `NEXT_PUBLIC_DATA_REVISION=<data-commit-sha>`.
3. Verify `/`, `/polls`, `/wards`, `/wards/11`, `/wards/4`, and `/sources` against that deployment.
4. Merge the data branch to the data repository's `main` branch.
5. Redeploy the frontend with `NEXT_PUBLIC_DATA_REVISION=main`.

Rollback is a frontend redeploy of the previous frontend commit with its prior
data commit SHA. Treat the mayoral v2 and Council v3 files as one immutable data
release; never deploy a frontend against a mismatched snapshot contract.
