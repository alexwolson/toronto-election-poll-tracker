# Repo Split: Frontend + Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the current monorepo into `toronto-election-poll-tracker` (Next.js frontend → Vercel) and `toronto-election-poll-tracker-data` (Python data pipeline → GitHub Actions).

**Architecture:** Create the backend repo first (copying Python code from the monorepo), then transform the current monorepo in-place into the frontend-only repo by promoting `frontend/` to root and removing all Python/backend files. The frontend fetches JSON snapshots from `raw.githubusercontent.com` instead of `public/data/`.

**Tech Stack:** Next.js 15, Python 3.12, uv, GitHub Actions, Vercel, GitHub CLI (`gh`)

---

## File Map

### Backend repo — `toronto-election-poll-tracker-data` (new)

| File | Action |
|---|---|
| `scripts/` | Copy from monorepo |
| `backend/model/` | Copy from monorepo (keep model logic, remove FastAPI parts) |
| `backend/__init__.py` | Copy from monorepo |
| `data/` | Copy from monorepo |
| `tests/` | Copy from monorepo |
| `pyproject.toml` | Copy, then remove `fastapi` dependency |
| `uv.lock` | Copy from monorepo |
| `.python-version` | Copy from monorepo |
| `toronto-2026-model-spec.md` | Copy from monorepo |
| `.github/workflows/update-model.yml` | Copy, update `git add` line |
| `scripts/build_snapshot.py` | Remove `FRONTEND_DATA_DIR` copy block |

### Frontend repo — `toronto-election-poll-tracker` (current repo, transformed)

| File | Action |
|---|---|
| `frontend/src/` | Promote to `src/` |
| `frontend/public/` | Promote to `public/` (keep `toronto-wards.geojson`, remove JSON snapshots) |
| `frontend/package.json` | Promote to root, replacing old root `package.json` |
| `frontend/package-lock.json` | Promote to root |
| `frontend/tsconfig.json`, `next.config.ts`, etc. | Promote to root |
| `frontend/CLAUDE.md`, `frontend/AGENTS.md`, `frontend/README.md` | Promote to root |
| `frontend/.env.local.example` | Promote to root |
| `frontend/src/lib/api.ts` | Update `dataUrl()` to use raw GitHub URL |
| `public/data/model_snapshot.json` | Remove (now fetched remotely) |
| `public/data/polls_snapshot.json` | Remove (now fetched remotely) |
| `backend/`, `scripts/`, `data/`, `tests/` | Remove |
| `pyproject.toml`, `uv.lock`, `.python-version` | Remove |
| `toronto-2026-model-spec.md`, `vercel.json` | Remove |
| root `package.json`, root `package-lock.json` | Remove (replaced by frontend's) |

---

## Task 1: Create the backend data repo on GitHub

**Files:** new repo at `https://github.com/alexwolson/toronto-election-poll-tracker-data`

- [ ] **Step 1: Create the GitHub repo**

```bash
gh repo create toronto-election-poll-tracker-data --public --description "Toronto 2026 election data pipeline"
```

Expected output: `✓ Created repository alexwolson/toronto-election-poll-tracker-data on GitHub`

- [ ] **Step 2: Clone it alongside the monorepo**

Run this from the parent directory of the current project (e.g. `~/code/personal/`):

```bash
gh repo clone alexwolson/toronto-election-poll-tracker-data
```

- [ ] **Step 3: Copy backend contents into the new repo**

Run from the parent directory:

```bash
MONO=toronto-election-poll-tracker
BACK=toronto-election-poll-tracker-data

# Python project files
cp $MONO/pyproject.toml $BACK/
cp $MONO/uv.lock $BACK/
cp $MONO/.python-version $BACK/
cp $MONO/toronto-2026-model-spec.md $BACK/

# Code and data
cp -r $MONO/scripts $BACK/
cp -r $MONO/data $BACK/
cp -r $MONO/tests $BACK/

# backend/model only (not the FastAPI app parts)
mkdir -p $BACK/backend
cp $MONO/backend/__init__.py $BACK/backend/
cp -r $MONO/backend/model $BACK/backend/

# GitHub Actions
mkdir -p $BACK/.github/workflows
cp $MONO/.github/workflows/update-model.yml $BACK/.github/workflows/
```

- [ ] **Step 4: Create a .gitignore for the backend repo**

```bash
cat > toronto-election-poll-tracker-data/.gitignore << 'EOF'
__pycache__/
*.py[cod]
.venv/
*.egg-info/
.env
.env.*
.DS_Store
.pytest_cache/
.ruff_cache/
data/raw/
EOF
```

Note: `data/raw/` is gitignored since only `data/processed/` needs to be tracked (it contains the committed snapshots).

- [ ] **Step 5: Verify the structure looks correct**

```bash
find toronto-election-poll-tracker-data -not -path '*/.git/*' -not -path '*/__pycache__/*' | sort | head -60
```

Expected: you should see `scripts/`, `backend/model/`, `data/processed/`, `tests/`, `pyproject.toml`, `.github/workflows/update-model.yml`

- [ ] **Step 6: Commit and push**

```bash
cd toronto-election-poll-tracker-data
git add .
git commit -m "feat: initial backend data pipeline from monorepo"
git push -u origin main
```

---

## Task 2: Remove FastAPI from pyproject.toml and fix build_snapshot.py

**Files:**
- Modify: `toronto-election-poll-tracker-data/pyproject.toml`
- Modify: `toronto-election-poll-tracker-data/scripts/build_snapshot.py`

- [ ] **Step 1: Remove `fastapi` from pyproject.toml**

Edit `toronto-election-poll-tracker-data/pyproject.toml`. Remove the `fastapi>=0.135.3` line from `dependencies`:

```toml
[project]
name = "data-ingestion"
version = "0.1.0"
description = "Add your description here"
requires-python = ">=3.12"
dependencies = [
    "beautifulsoup4>=4.14.3",
    "lxml>=6.1.0",
    "numpy>=2.4.3",
    "openpyxl>=3.1.5",
    "pandas",
    "pydantic",
    "requests",
]

[dependency-groups]
dev = [
    "httpx>=0.28.1",
    "pytest",
]
```

- [ ] **Step 2: Remove the FRONTEND_DATA_DIR copy block from build_snapshot.py**

Edit `toronto-election-poll-tracker-data/scripts/build_snapshot.py`.

Remove line 25:
```python
FRONTEND_DATA_DIR = ROOT / "frontend" / "public" / "data"
```

Remove lines 150–154 (the copy loop in `main()`):
```python
    FRONTEND_DATA_DIR.mkdir(parents=True, exist_ok=True)
    for src in [model_path, polls_path]:
        dest = FRONTEND_DATA_DIR / src.name
        dest.write_bytes(src.read_bytes())
        print(f"Copied {src.name} → {dest}")
```

The `main()` function should end at:
```python
    polls_path = DATA_DIR / "polls_snapshot.json"
    save_json(polls_data, polls_path)
    print(f"Polls snapshot written to {polls_path}")
```

- [ ] **Step 3: Verify the script runs locally (in the backend repo)**

```bash
cd toronto-election-poll-tracker-data
uv sync
uv run scripts/build_snapshot.py
```

Expected: output like:
```
Model snapshot written to .../data/processed/model_snapshot.json
Polls snapshot written to .../data/processed/polls_snapshot.json
```
No mention of `frontend/public/data/`.

- [ ] **Step 4: Commit**

```bash
git add pyproject.toml scripts/build_snapshot.py
git commit -m "fix: remove FastAPI dep and frontend copy from build pipeline"
git push
```

---

## Task 3: Update the GitHub Actions workflow in the backend repo

**Files:**
- Modify: `toronto-election-poll-tracker-data/.github/workflows/update-model.yml`

- [ ] **Step 1: Update the `git add` line in the workflow**

Edit `.github/workflows/update-model.yml`. The `Commit updated data` step currently reads:

```yaml
      - name: Commit updated data
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add data/processed/ frontend/public/data/
          git diff --cached --quiet || git commit -m "data: update model snapshot"
          git push
```

Change it to:

```yaml
      - name: Commit updated data
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add data/processed/
          git diff --cached --quiet || git commit -m "data: update model snapshot [skip ci]"
          git push
```

Note the `[skip ci]` tag — prevents an infinite workflow loop if CI is ever added.

- [ ] **Step 2: Commit and push**

```bash
git add .github/workflows/update-model.yml
git commit -m "ci: commit only data/processed/, not frontend static files"
git push
```

---

## Task 4: Manually trigger and verify the backend workflow

- [ ] **Step 1: Trigger the workflow**

```bash
cd toronto-election-poll-tracker-data
gh workflow run update-model.yml
```

- [ ] **Step 2: Watch the run**

```bash
gh run watch
```

Expected: all steps pass, the run completes green.

- [ ] **Step 3: Verify the commit was made**

```bash
git pull
git log --oneline -3
```

Expected: top commit is `data: update model snapshot [skip ci]` from `github-actions[bot]`.

- [ ] **Step 4: Verify the JSON files exist and are not empty**

```bash
wc -c data/processed/model_snapshot.json data/processed/polls_snapshot.json
```

Expected: both files > 1000 bytes.

---

## Task 5: Promote frontend/ to root in the current monorepo

**Working directory:** `toronto-election-poll-tracker` (the monorepo, which becomes the frontend repo)

- [ ] **Step 1: Move tracked frontend files to root**

```bash
cd toronto-election-poll-tracker

# Source directories
git mv frontend/src src
git mv frontend/public public

# Config files
git mv frontend/package.json package.json.frontend
git mv frontend/package-lock.json package-lock.json.frontend
git mv frontend/tsconfig.json tsconfig.json
git mv frontend/next.config.ts next.config.ts
git mv frontend/next-env.d.ts next-env.d.ts
git mv frontend/components.json components.json
git mv frontend/eslint.config.mjs eslint.config.mjs
git mv frontend/postcss.config.mjs postcss.config.mjs
git mv frontend/vitest.config.ts vitest.config.ts

# Docs and env
git mv frontend/README.md README.md
git mv frontend/CLAUDE.md CLAUDE.md
git mv frontend/AGENTS.md AGENTS.md
git mv frontend/.env.local.example .env.local.example
```

- [ ] **Step 2: Replace root package.json and package-lock.json with frontend's**

```bash
git rm package.json package-lock.json
git mv package.json.frontend package.json
git mv package-lock.json.frontend package-lock.json
```

- [ ] **Step 3: Replace .gitignore with frontend's version**

```bash
cp frontend/.gitignore .gitignore
git add .gitignore
```

- [ ] **Step 4: Remove all backend/Python tracked files from root**

```bash
git rm -r backend/ scripts/ tests/
git rm -r data/
git rm pyproject.toml uv.lock .python-version toronto-2026-model-spec.md
git rm vercel.json
```

- [ ] **Step 5: Remove the now-empty frontend/ directory**

```bash
git rm -r frontend/
```

If `git rm` complains about untracked files inside `frontend/` (e.g. `.next/`, `node_modules/`), that's fine — they're gitignored and will be ignored.

- [ ] **Step 6: Verify staged changes look right**

```bash
git status
```

Expected: lots of renames (`frontend/src/ → src/`, etc.), deletions of Python files. No unexpected removals.

- [ ] **Step 7: Commit the restructure**

```bash
git commit -m "refactor: promote frontend/ to repo root, remove backend"
```

---

## Task 6: Update api.ts to fetch from raw GitHub

**Files:**
- Modify: `src/lib/api.ts` (previously `frontend/src/lib/api.ts`)

- [ ] **Step 1: Update the `dataUrl` function**

Replace lines 3–15 of `src/lib/api.ts`:

```typescript
// In production, data is served as static JSON built by scripts/build_snapshot.py.
// In development, fall back to the local FastAPI backend.
function dataUrl(file: string): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return `${process.env.NEXT_PUBLIC_API_URL}/api/${file}`;
  }
  if (typeof window === 'undefined') {
    // Server-side: use absolute URL via the static file
    const base = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';
    return `${base}/data/${file}`;
  }
  return `/data/${file}`;
}
```

With:

```typescript
const DATA_BASE_URL =
  'https://raw.githubusercontent.com/alexwolson/toronto-election-poll-tracker-data/main/data/processed';

function dataUrl(file: string): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return `${process.env.NEXT_PUBLIC_API_URL}/api/${file}`;
  }
  return `${DATA_BASE_URL}/${file}`;
}
```

- [ ] **Step 2: Remove the now-unused comment at the top of api.ts**

Delete the comment block (lines 3–4) that referenced the FastAPI backend:

```typescript
// In production, data is served as static JSON built by scripts/build_snapshot.py.
// In development, fall back to the local FastAPI backend.
```

The file should now open with the `const DATA_BASE_URL` line (after the import).

- [ ] **Step 3: Verify the build passes**

```bash
cd <repo root>
npm install
npm run build
```

Expected: build succeeds with no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/api.ts
git commit -m "feat: fetch snapshots from raw.githubusercontent.com instead of public/data"
```

---

## Task 7: Remove stale snapshot files from public/data/

**Files:**
- Remove: `public/data/model_snapshot.json`
- Remove: `public/data/polls_snapshot.json`
- Keep: `public/data/toronto-wards.geojson` (static geographic data, still served locally)

- [ ] **Step 1: Remove the JSON snapshot files**

```bash
git rm public/data/model_snapshot.json public/data/polls_snapshot.json
```

- [ ] **Step 2: Verify toronto-wards.geojson is still present**

```bash
ls public/data/
```

Expected: only `toronto-wards.geojson` remains.

- [ ] **Step 3: Commit**

```bash
git commit -m "chore: remove locally-served JSON snapshots, now fetched from GitHub"
```

---

## Task 8: Clean up root-level artifacts

- [ ] **Step 1: Remove .vercel/ at root (created by our failed linking attempt)**

```bash
rm -rf .vercel/
```

This directory is gitignored so nothing to `git rm` — just delete it.

- [ ] **Step 2: Verify git status is clean**

```bash
git status
```

Expected: `nothing to commit, working tree clean`

- [ ] **Step 3: Push all commits to GitHub**

```bash
git push
```

---

## Task 9: Link the frontend repo to Vercel and verify deploy

- [ ] **Step 1: Link the repo to Vercel**

```bash
vercel link --scope alexwolsons-projects
```

When prompted, select or create a project named `toronto-election-poll-tracker`. This creates `.vercel/project.json` locally (gitignored).

- [ ] **Step 2: Deploy a preview to verify the build**

```bash
vercel deploy --no-wait
```

Note the deployment URL printed after `--no-wait`.

- [ ] **Step 3: Check build status**

```bash
vercel inspect <deployment-url>
```

Wait until `Status: READY`. If it fails, check logs:

```bash
vercel logs <deployment-url>
```

- [ ] **Step 4: Verify data loads on the preview URL**

Open the preview URL in a browser. Confirm:
- The main page loads (wards data renders)
- The polling averages page loads
- The ward map renders (uses `toronto-wards.geojson` from `public/data/`)

- [ ] **Step 5: Connect the GitHub repo to Vercel for automatic deploys**

In the Vercel dashboard for this project, go to **Settings → Git** and connect `alexwolson/toronto-election-poll-tracker`. Future pushes to `main` will auto-deploy.

- [ ] **Step 6: Save memory — update project context**

Note in any CLAUDE.md or memory that:
- Frontend repo: `toronto-election-poll-tracker` → Vercel
- Data repo: `toronto-election-poll-tracker-data` → GitHub Actions
- Frontend fetches snapshots from `raw.githubusercontent.com/alexwolson/toronto-election-poll-tracker-data/main/data/processed/`
