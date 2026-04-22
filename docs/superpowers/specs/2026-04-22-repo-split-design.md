# Repo Split: Frontend + Backend

**Date:** 2026-04-22

## Overview

Split the current monorepo into two GitHub repositories:

- `toronto-election-poll-tracker` — Next.js frontend, deployed to Vercel
- `toronto-election-poll-tracker-data` — Python data pipeline, runs as GitHub Actions

## Repositories

### Frontend: `toronto-election-poll-tracker`

Contents of the current `frontend/` directory promoted to repo root:
- `src/`, `public/`, `package.json`, `next.config.ts`, etc.
- `public/data/` removed (data is fetched remotely at runtime)

Linked to Vercel; deploys automatically on push to `main`.

### Backend: `toronto-election-poll-tracker-data`

- `scripts/` — data processing and snapshot build scripts
- `data/` — raw and processed data files (including `data/processed/model_snapshot.json`)
- `tests/` — Python test suite
- `pyproject.toml`, `uv.lock`
- `.github/workflows/update-model.yml` — daily GH Action

The `backend/` FastAPI directory is deleted (unused since the switch to static JSON serving).

## Data Flow

1. GitHub Action in the backend repo runs daily at noon UTC
2. Runs `scripts/process_all.py` then `scripts/build_snapshot.py`
3. Commits updated files to `data/processed/` within the backend repo and pushes
4. The frontend fetches `model_snapshot.json` at runtime from:
   ```
   https://raw.githubusercontent.com/alexwolson/toronto-election-poll-tracker-data/main/data/processed/model_snapshot.json
   ```
5. Next.js ISR (`revalidate: 3600`) ensures fresh data is served within one hour of a backend commit

## Code Changes

### `src/lib/data.ts` — `dataUrl()` function

Current logic:
- If `NEXT_PUBLIC_API_URL` is set → use that (legacy FastAPI dev mode)
- Else server-side → use `NEXT_PUBLIC_BASE_URL` + `/data/<file>`
- Else client-side → use `/data/<file>`

New logic:
- If `NEXT_PUBLIC_API_URL` is set → use that (dev mode only)
- Else → use `https://raw.githubusercontent.com/alexwolson/toronto-election-poll-tracker-data/main/data/processed/<file>`

This applies to both server-side and client-side fetches in production.

### `.github/workflows/update-model.yml` (backend repo)

Remove the line:
```
git add data/processed/ frontend/public/data/
```
Replace with:
```
git add data/processed/
```

## What Doesn't Change

- GH Action schedule (daily at noon UTC)
- Frontend ISR behaviour (`revalidate: 3600`)
- Local development workflow (falls back to `NEXT_PUBLIC_API_URL` or local file)
- All frontend component and page code
- All Python model and script logic

## Migration Steps (high level)

1. Create `toronto-election-poll-tracker-data` repo with the backend contents
2. Update and push `.github/workflows/update-model.yml` in the new repo
3. Strip the current repo down to frontend-only contents (promote `frontend/` to root)
4. Update `src/lib/data.ts` with the new raw GitHub URL
5. Remove `public/data/` from the frontend repo
6. Link frontend repo to Vercel and confirm deploy
