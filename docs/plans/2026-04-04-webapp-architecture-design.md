# Toronto Election Projection Tool - Architecture Design

> **Date:** 2026-04-04
> **Status:** Approved for implementation

## Overview

Public-facing web application displaying 2026 Toronto municipal election projections, with real-time mayoral polling and ward-level council race predictions.

**Tech Stack:**
- Frontend: Next.js 14+ with shadcn/ui
- Backend: FastAPI (Python)
- Database: SQLite (MVP), PostgreSQL (production)
- Scheduler: RQ (Redis Queue) for polling scraper

---

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Wikipedia      │────▶│  FastAPI        │────▶│  SQLite DB      │
│  Polling Data   │     │  Backend        │     │  (polls, cache) │
└─────────────────┘     └────────┬────────┘     └─────────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │                         │
              ┌─────▼─────┐             ┌─────▼─────┐
              │ /api/     │             │ /api/     │
              │ wards     │             │ refresh   │
              └─────┬─────┘             └─────┬─────┘
                    │                         │
         ┌──────────┴──────────┐     ┌────────┴────────┐
         │                    │     │                 │
    ┌────▼────┐         ┌─────▼───┐ ┌─▼────────┐ ┌───▼────┐
    │ model/  │         │process_ │ │scrape_   │ │ simula-│
    │ run.py  │         │all.py   │ │wikipedia │ │ tion.py│
    └─────────┘         └─────────┘ └──────────┘ └────────┘
```

---

## Backend (FastAPI)

### Directory Structure

```
backend/
├── main.py              # FastAPI app entry point
├── api/
│   ├── __init__.py
│   ├── wards.py         # /api/wards endpoints
│   ├── polls.py         # /api/polls endpoints
│   └── refresh.py       # /api/refresh model endpoints
├── model/
│   ├── __init__.py
│   ├── run.py          # Load data, run simulation, return JSON
│   └── refresh.py      # Orchestrate: process_all + run_model
├── scrapers/
│   ├── __init__.py
│   └── wikipedia.py    # Wikipedia polling scraper
├── db/
│   ├── __init__.py
│   └── storage.py      # SQLite operations
├── tasks/
│   └── scheduler.py   # RQ/cron for periodic scraping
├── requirements.txt
└── uv.lock
```

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/wards` | GET | All ward projections with factors |
| `/api/wards/{ward_num}` | GET | Single ward detail |
| `/api/polls` | GET | Mayoral polling history + aggregation |
| `/api/polls/latest` | GET | Latest aggregated shares |
| `/api/council` | GET | Council composition projection |
| `/api/refresh` | POST | Re-run model (admin only) |
| `/api/scenarios` | GET | Available scenarios |

### Data Models

**Ward Projection:**
```json
{
  "ward": 1,
  "councillor_name": "Vincent Crisanti",
  "is_running": true,
  "classification": "safe_incumbent",
  "win_probability": 0.89,
  "factors": {
    "vuln": 0.5,
    "coat": 0.2,
    "chal": -0.1
  },
  "defeatability_score": 58,
  "challengers": [...]
}
```

**Mayoral Poll:**
```json
{
  "poll_date": "2026-03-15",
  "firm": "Mainstreet",
  "sample_size": 800,
  "field_dates": "2026-03-12 to 2026-03-14",
  "candidates": {
    "chow": 0.42,
    "bradford": 0.28,
    "bailao": 0.15,
    ...
  },
  "url": "https://..."
}
```

---

## Frontend (Next.js)

### Directory Structure

```
frontend/
├── app/
│   ├── page.tsx              # Homepage
│   ├── wards/
│   │   ├── page.tsx          # Ward list
│   │   └── [ward]/page.tsx  # Ward detail
│   ├── polls/
│   │   └── page.tsx          # Polling page
│   └── layout.tsx
├── components/
│   ├── ui/                   # shadcn/ui components
│   ├── ward-card.tsx
│   ├── polling-chart.tsx
│   └── council-composition.tsx
├── lib/
│   ├── api.ts                # API client
│   └── utils.ts
├── tailwind.config.js
├── next.config.js
├── package.json
└── tsconfig.json
```

### Pages

**Homepage:**
- City-wide summary (projected council composition)
- Top 5 competitive wards
- Latest mayoral polling snapshot
- "Last updated" timestamp

**Ward Page:**
- Ward number + incumbent name
- Classification badge (safe/competitive/open)
- Win probability (incumbent + top 3 challengers)
- Factor breakdown (vuln/coat/chal bar chart)
- Challenger list with viability tier

**Polling Page:**
- Interactive line chart (all candidates)
- Trend line (moving average)
- Poll table with firm, date, sample size
- Aggregation parameters display

---

## Data Pipeline (Python)

### Integration with Existing Code

Existing `src/` modules become `backend/model/`:

```
backend/model/
├── __init__.py      # Re-export all functions
├── lean.py          # Copy from src/lean.py
├── coattails.py     # Copy from src/coattails.py
├── simulation.py   # Copy from src/simulation.py
├── aggregator.py   # Copy from src/aggregator.py
├── validate.py     # Copy from src/validate.py
└── names.py        # Copy from src/names.py
```

### Run Model

```python
# backend/model/run.py
def run_model() -> dict:
    # Load processed data
    defeatability = pd.read_csv("data/processed/ward_defeatability.csv")
    challengers = pd.read_csv("data/processed/challengers.csv")
    leans = pd.read_csv("data/processed/ward_mayoral_lean.csv")
    coattails = pd.read_csv("data/processed/coattail_adjustments.csv")
    polls = get_polls_from_db()
    
    # Aggregate mayoral polls
    mayoral_avg = aggregate_polls(polls)
    
    # Run simulation
    sim = WardSimulation(defeatability, mayoral_avg, coattails, challengers, leans)
    results = sim.run()
    
    return {
        "wards": format_ward_results(results),
        "council": format_council_composition(results),
        "mayoral": mayoral_avg,
        "updated_at": datetime.now().isoformat()
    }
```

---

## Polling Scraper

### Wikipedia Scraper

Source: Wikipedia page "2026 Toronto mayoral election" or similar

Strategy:
1. Parse HTML table of polls
2. Extract: date, firm, sample, field dates, candidates
3. Deduplicate by (firm, field_dates)
4. Store in SQLite with timestamp

**Cron:** Every 15 minutes during active campaign

```python
# backend/scrapers/wikipedia.py
def scrape_wikipedia_polls() -> list[dict]:
    url = "https://en.wikipedia.org/wiki/2026_Toronto_mayoral_election"
    response = requests.get(url, timeout=30)
    soup = BeautifulSoup(response.text, "html.parser")
    
    table = soup.find("table", class_="wikitable")
    # Parse rows...
    return polls
```

---

## MVP Scope (Weeks 1-3)

| Week | Deliverables |
|------|--------------|
| 1 | FastAPI setup, wire process_all, /api/wards, /api/polls |
| 2 | Next.js UI (homepage, ward list, polling chart) |
| 3 | Wikipedia scraper + scheduler, scenario toggle |

**Out of Scope (v1):**
- User authentication
- Admin UI for manual data entry
- Ward-level polling override
- Email alerts

---

## Configuration

**Environment Variables:**

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | SQLite/PostgreSQL connection | `sqlite:///polls.db` |
| `REDIS_URL` | Redis for queue | `redis://localhost:6379` |
| `POLLING_INTERVAL` | Minutes between scrapes | 15 |
| `NEXT_PUBLIC_API_URL` | Frontend API base | `http://localhost:8000` |

---

## Deployment

**MVP:**
- Frontend: Vercel
- Backend: Render/Fly.io
- DB: SQLite on backend (upgrade to PostgreSQL later)

**Production:**
- Frontend: Vercel
- Backend: Fly.io (Docker)
- DB: PostgreSQL (Supabase/Neon)
- Redis: Upstash

---

## Credits

- Built on existing data pipeline from `src/` modules
- Council Defeatability Index methodology used with permission from Matt Elliott
- Projection methodology inspired by 338Canada
