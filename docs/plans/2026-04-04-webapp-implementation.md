# Web App Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Build a public-facing web app with FastAPI backend and Next.js frontend for Toronto 2026 election projections.

**Architecture:** Next.js (frontend) → FastAPI (backend) → Python data pipeline (existing src/). Real-time mayoral polling scraped from Wikipedia.

**Tech Stack:** Next.js 14+, FastAPI, SQLite, shadcn/ui, BeautifulSoup (scraping)

---

## Phase 1: Backend Foundation

### Task 1: Set up FastAPI project structure

**Files:**
- Create: `backend/main.py`
- Create: `backend/api/__init__.py`
- Create: `backend/api/wards.py`
- Create: `backend/api/polls.py`
- Create: `backend/api/refresh.py`
- Create: `backend/model/__init__.py`
- Create: `backend/scrapers/__init__.py`
- Create: `backend/scrapers/wikipedia.py`
- Create: `backend/db/__init__.py`
- Create: `backend/db/storage.py`
- Create: `backend/requirements.txt`
- Create: `backend/uv.lock`

**Step 1: Write `backend/requirements.txt`**

```
fastapi>=0.109.0
uvicorn[standard]>=0.27.0
pydantic>=2.5.0
pandas>=2.0.0
numpy>=1.26.0
requests>=2.31.0
beautifulsoup4>=4.12.0
lxml>=5.0.0
python-dateutil>=2.8.0
```

**Step 2: Write `backend/main.py`**

```python
#!/usr/bin/env python3
"""FastAPI backend for Toronto Election Projection Tool."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api import wards, polls, refresh

app = FastAPI(
    title="Toronto 2026 Election Projections",
    description="Ward-level council race projections and mayoral polling",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(wards.router, prefix="/api/wards", tags=["wards"])
app.include_router(polls.router, prefix="/api/polls", tags=["polls"])
app.include_router(refresh.router, prefix="/api", tags=["admin"])


@app.get("/")
def root():
    return {"status": "ok", "message": "Toronto 2026 Election Projections API"}


@app.get("/api/health")
def health():
    return {"status": "healthy"}
```

**Step 3: Write `backend/api/__init__.py`**

```python
# API routes module
```

**Step 4: Write stub endpoints**

`backend/api/wards.py`:
```python
from fastapi import APIRouter, HTTPException

router = APIRouter()


@router.get("")
def get_wards():
    """Get all ward projections."""
    return {"message": "TODO: implement"}


@router.get("/{ward_num}")
def get_ward(ward_num: int):
    """Get single ward detail."""
    if ward_num < 1 or ward_num > 25:
        raise HTTPException(status_code=404, detail="Ward not found")
    return {"message": "TODO: implement"}
```

`backend/api/polls.py`:
```python
from fastapi import APIRouter

router = APIRouter()


@router.get("")
def get_polls():
    """Get mayoral polling history."""
    return {"message": "TODO: implement"}


@router.get("/latest")
def get_latest_polls():
    """Get latest aggregated shares."""
    return {"message": "TODO: implement"}
```

`backend/api/refresh.py`:
```python
from fastapi import APIRouter

router = APIRouter()


@router.post("/refresh")
def refresh_model():
    """Re-run the model."""
    return {"message": "TODO: implement"}
```

**Step 5: Write placeholder modules**

`backend/model/__init__.py`, `backend/scrapers/__init__.py`, `backend/db/__init__.py`, `backend/db/storage.py` - just empty `__init__.py` files for now.

**Step 6: Commit**

```bash
git add backend/
git commit -m "feat: set up FastAPI project structure"
```

---

### Task 2: Wire existing data pipeline into FastAPI

**Files:**
- Modify: `backend/model/__init__.py`
- Modify: `backend/api/wards.py`
- Modify: `backend/api/polls.py`

**Step 1: Copy existing Python modules**

Copy `src/lean.py`, `src/coattails.py`, `src/simulation.py`, `src/aggregator.py`, `src/validate.py`, `src/names.py` to `backend/model/`.

Update imports in each file to reference sibling modules.

**Step 2: Write `backend/model/run.py`**

```python
"""Run the election model and return JSON results."""
import json
from pathlib import Path

import pandas as pd


def load_processed_data() -> dict:
    """Load all processed data files."""
    data_dir = Path(__file__).parent.parent.parent / "data" / "processed"
    return {
        "defeatability": pd.read_csv(data_dir / "ward_defeatability.csv"),
        "challengers": pd.read_csv(data_dir / "challengers.csv"),
        "leans": pd.read_csv(data_dir / "ward_mayoral_lean.csv"),
        "coattails": pd.read_csv(data_dir / "coattail_adjustments.csv"),
        "polls": pd.read_csv(data_dir / "polls.csv"),
    }


def run_model() -> dict:
    """Run the full model pipeline."""
    data = load_processed_data()
    
    # TODO: Run simulation
    # For now, just return raw data with basic structure
    
    return {
        "wards": data["defeatability"].to_dict("records"),
        "challengers": data["challengers"].to_dict("records"),
        "leans": data["leans"].to_dict("records"),
        "coattails": data["coattails"].to_dict("records"),
    }
```

**Step 3: Update API endpoints to call model**

`backend/api/wards.py`:
```python
from fastapi import APIRouter, HTTPException
from model.run import run_model

router = APIRouter()


@router.get("")
def get_wards():
    """Get all ward projections."""
    result = run_model()
    return {"wards": result["wards"], "challengers": result["challengers"]}


@router.get("/{ward_num}")
def get_ward(ward_num: int):
    """Get single ward detail."""
    if ward_num < 1 or ward_num > 25:
        raise HTTPException(status_code=404, detail="Ward not found")
    
    result = run_model()
    ward = next((w for w in result["wards"] if w["ward"] == ward_num), None)
    if ward is None:
        raise HTTPException(status_code=404, detail="Ward not found")
    
    ward_challengers = [c for c in result["challengers"] if c["ward"] == ward_num]
    
    return {"ward": ward, "challengers": ward_challengers}
```

**Step 4: Commit**

```bash
git add backend/
git commit -m "feat: wire data pipeline into FastAPI endpoints"
```

---

### Task 3: Add SQLite storage for polls

**Files:**
- Modify: `backend/db/storage.py`
- Modify: `backend/api/polls.py`

**Step 1: Write `backend/db/storage.py`**

```python
"""SQLite storage for polling data."""
import json
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Optional

import pandas as pd


def get_db_path() -> Path:
    """Get path to SQLite database."""
    return Path(__file__).parent.parent / "polls.db"


def init_db() -> None:
    """Initialize database schema."""
    db_path = get_db_path()
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS polls (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            poll_date TEXT NOT NULL,
            firm TEXT NOT NULL,
            sample_size INTEGER,
            field_dates TEXT,
            candidates TEXT NOT NULL,
            url TEXT,
            created_at TEXT NOT NULL,
            UNIQUE(firm, field_dates)
        )
    """)
    
    conn.commit()
    conn.close()


def save_poll(poll_data: dict) -> int:
    """Save a poll to the database. Returns poll ID."""
    db_path = get_db_path()
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    cursor.execute("""
        INSERT OR REPLACE INTO polls 
        (poll_date, firm, sample_size, field_dates, candidates, url, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (
        poll_data["poll_date"],
        poll_data["firm"],
        poll_data.get("sample_size"),
        poll_data.get("field_dates"),
        json.dumps(poll_data["candidates"]),
        poll_data.get("url"),
        datetime.now().isoformat(),
    ))
    
    poll_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    return poll_id


def get_all_polls() -> list[dict]:
    """Get all polls, sorted by date."""
    db_path = get_db_path()
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT poll_date, firm, sample_size, field_dates, candidates, url, created_at
        FROM polls
        ORDER BY poll_date DESC
    """)
    
    rows = cursor.fetchall()
    conn.close()
    
    polls = []
    for row in rows:
        polls.append({
            "poll_date": row[0],
            "firm": row[1],
            "sample_size": row[2],
            "field_dates": row[3],
            "candidates": json.loads(row[4]),
            "url": row[5],
            "created_at": row[6],
        })
    
    return polls
```

**Step 2: Update `backend/api/polls.py`**

```python
from fastapi import APIRouter
from db.storage import init_db, get_all_polls

router = APIRouter()

# Initialize DB on module load
init_db()


@router.get("")
def get_polls():
    """Get mayoral polling history."""
    polls = get_all_polls()
    return {"polls": polls, "count": len(polls)}


@router.get("/latest")
def get_latest_polls():
    """Get latest aggregated shares."""
    polls = get_all_polls()
    # TODO: Aggregate
    return {"message": "TODO: implement aggregation"}
```

**Step 3: Commit**

```bash
git add backend/
git commit -m "feat: add SQLite storage for polls"
```

---

### Task 4: Wikipedia scraper for mayoral polls

**Files:**
- Modify: `backend/scrapers/wikipedia.py`
- Modify: `backend/api/polls.py`

**Step 1: Write `backend/scrapers/wikipedia.py`**

```python
"""Scraper for mayoral polling data from Wikipedia."""
import re
from datetime import datetime
from typing import Optional

import requests
from bs4 import BeautifulSoup


WIKIPEDIA_URL = "https://en.wikipedia.org/wiki/2026_Toronto_mayoral_election"


def parse_poll_row(row) -> Optional[dict]:
    """Parse a single poll row from the Wikipedia table."""
    cells = row.find_all("td")
    if len(cells) < 3:
        return None
    
    # Extract firm name
    firm_cell = cells[0]
    firm_link = firm_cell.find("a")
    firm = firm_link.text if firm_link else firm_cell.get_text(strip=True)
    if not firm:
        return None
    
    # Extract date
    date_cell = cells[1]
    date_text = date_cell.get_text(strip=True)
    # Try to parse date (handle various formats)
    try:
        poll_date = datetime.strptime(date_text[:10], "%Y-%m-%d").date().isoformat()
    except ValueError:
        try:
            poll_date = datetime.strptime(date_text, "%B %d, %Y").date().isoformat()
        except ValueError:
            return None
    
    # Extract sample size
    sample_size = None
    sample_text = cells[2].get_text(strip=True)
    sample_match = re.search(r"(\d+)", sample_text)
    if sample_match:
        sample_size = int(sample_match.group(1))
    
    # Extract candidate shares
    candidates = {}
    # Typically cells 3+ contain candidate percentages
    for cell in cells[3:]:
        text = cell.get_text(strip=True)
        # Look for patterns like "42%" or "42.3%"
        match = re.search(r"(\d+\.?\d*)%", text)
        if match:
            # This is crude - ideally we'd match candidate names
            # For MVP, just return raw data
            pass
    
    return {
        "poll_date": poll_date,
        "firm": firm,
        "sample_size": sample_size,
        "field_dates": date_text,
        "candidates": {},  # TODO: parse properly
    }


def scrape_wikipedia_polls() -> list[dict]:
    """Scrape all polls from Wikipedia."""
    response = requests.get(WIKIPEDIA_URL, timeout=30)
    response.raise_for_status()
    
    soup = BeautifulSoup(response.text, "lxml")
    
    # Find the polls table
    tables = soup.find_all("table", class_="wikitable")
    polls_table = None
    for table in tables:
        if "poll" in table.get("class", []):
            polls_table = table
            break
    
    if polls_table is None:
        # Try finding by header text
        for table in tables:
            headers = table.find_all("th")
            header_text = " ".join(h.get_text().lower() for h in headers)
            if "chow" in header_text or "bradford" in header_text:
                polls_table = table
                break
    
    if polls_table is None:
        return []
    
    polls = []
    for row in polls_table.find_all("tr")[1:]:  # Skip header
        poll = parse_poll_row(row)
        if poll:
            polls.append(poll)
    
    return polls
```

**Step 2: Add scraping endpoint**

`backend/api/polls.py`:
```python
from fastapi import APIRouter
from db.storage import init_db, get_all_polls, save_poll
from scrapers.wikipedia import scrape_wikipedia_polls

router = APIRouter()

init_db()


@router.get("")
def get_polls():
    polls = get_all_polls()
    return {"polls": polls, "count": len(polls)}


@router.post("/scrape")
def scrape_polls():
    """Scrape latest polls from Wikipedia."""
    polls = scrape_wikipedia_polls()
    saved = 0
    for poll in polls:
        try:
            save_poll(poll)
            saved += 1
        except Exception:
            pass  # Skip duplicates
    return {"scraped": len(polls), "saved": saved}


@router.get("/latest")
def get_latest_polls():
    polls = get_all_polls()
    return {"message": "TODO: implement aggregation"}
```

**Step 3: Test the scraper (manual)**

```bash
cd backend
uv run python -c "from scrapers.wikipedia import scrape_wikipedia_polls; print(scrape_wikipedia_polls())"
```

**Step 4: Commit**

```bash
git add backend/
git commit -m "feat: add Wikipedia polling scraper"
```

---

## Phase 2: Frontend Foundation

### Task 5: Set up Next.js project

**Files:**
- Create: `frontend/` (Next.js project)

**Step 1: Create Next.js project**

```bash
cd ..  # Go to project root
npx create-next-app@latest frontend \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --no-import-alias \
  --use-npm
```

**Step 2: Install shadcn/ui**

```bash
cd frontend
npx shadcn@latest init -d
npx shadcn@latest add button card badge chart table
```

**Step 3: Write basic homepage**

`frontend/src/app/page.tsx`:
```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto py-8">
        <h1 className="text-4xl font-bold mb-2">Toronto 2026 Elections</h1>
        <p className="text-muted-foreground mb-8">
          Ward-by-ward council race projections and mayoral polling
        </p>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Council Composition</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">-</p>
              <p className="text-sm text-muted-foreground">Projected incumbent wins</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Competitive Wards</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">-</p>
              <p className="text-sm text-muted-foreground">Of 25 wards</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Mayoral Race</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Loading polling data...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
```

**Step 4: Commit**

```bash
git add frontend/
git commit -m "feat: set up Next.js project with shadcn/ui"
```

---

### Task 6: Ward list page

**Files:**
- Create: `frontend/src/app/wards/page.tsx`
- Create: `frontend/src/components/ward-card.tsx`
- Create: `frontend/src/lib/api.ts`

**Step 1: Write API client**

`frontend/src/lib/api.ts`:
```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function getWards() {
  const res = await fetch(`${API_URL}/api/wards`, { 
    next: { revalidate: 60 } 
  });
  if (!res.ok) throw new Error('Failed to fetch wards');
  return res.json();
}

export async function getWard(wardNum: number) {
  const res = await fetch(`${API_URL}/api/wards/${wardNum}`, {
    next: { revalidate: 60 }
  });
  if (!res.ok) throw new Error('Failed to fetch ward');
  return res.json();
}
```

**Step 2: Write WardCard component**

`frontend/src/components/ward-card.tsx`:
```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface WardCardProps {
  ward: {
    ward: number;
    councillor_name: string;
    is_running: boolean;
    defeatability_score: number;
  };
}

export function WardCard({ ward }: WardCardProps) {
  const classification = ward.defeatability_score >= 50 ? "competitive" 
    : ward.defeatability_score >= 30 ? "likely"
    : "safe";
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle>Ward {ward.ward}</CardTitle>
          <Badge variant={classification === "competitive" ? "destructive" : "outline"}>
            {classification}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="font-medium">{ward.councillor_name}</p>
        <p className="text-sm text-muted-foreground">
          Defeatability: {ward.defeatability_score}
        </p>
      </CardContent>
    </Card>
  );
}
```

**Step 3: Write wards page**

`frontend/src/app/wards/page.tsx`:
```tsx
import { getWards } from "@/lib/api";
import { WardCard } from "@/components/ward-card";

export default async function WardsPage() {
  const data = await getWards();
  const wards = data.wards || [];
  
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-6">All Wards</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {wards.map((ward: any) => (
            <WardCard key={ward.ward} ward={ward} />
          ))}
        </div>
      </div>
    </main>
  );
}
```

**Step 4: Commit**

```bash
git add frontend/
git commit -m "feat: add ward list page"
```

---

### Task 7: Polling chart page

**Files:**
- Create: `frontend/src/app/polls/page.tsx`
- Create: `frontend/src/components/polling-chart.tsx`

**Step 1: Install chart library**

```bash
cd frontend
npm install recharts
```

**Step 2: Write polling chart component**

`frontend/src/components/polling-chart.tsx`:
```tsx
"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface PollingChartProps {
  data: any[];
}

export function PollingChart({ data }: PollingChartProps) {
  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
        <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
        <Legend />
        <Line type="monotone" dataKey="chow" stroke="#2563eb" name="Chow" />
        <Line type="monotone" dataKey="bradford" stroke="#dc2626" name="Bradford" />
        <Line type="monotone" dataKey="bailao" stroke="#16a34a" name="Bailao" />
      </LineChart>
    </ResponsiveContainer>
  );
}
```

**Step 2: Write polls page**

`frontend/src/app/polls/page.tsx`:
```tsx
import { PollingChart } from "@/components/polling-chart";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

async function getPolls() {
  const res = await fetch(`${API_URL}/api/polls`, { next: { revalidate: 60 } });
  if (!res.ok) return { polls: [] };
  return res.json();
}

export default async function PollsPage() {
  const data = await getPolls();
  const polls = data.polls || [];
  
  // Transform polls for chart
  const chartData = polls.map((poll: any) => ({
    date: poll.poll_date,
    chow: (poll.candidates?.chow || 0) * 100,
    bradford: (poll.candidates?.bradford || 0) * 100,
    bailao: (poll.candidates?.bailao || 0) * 100,
  })).reverse();
  
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-6">Mayoral Polling</h1>
        
        {chartData.length > 0 ? (
          <PollingChart data={chartData} />
        ) : (
          <p className="text-muted-foreground">No polling data available yet.</p>
        )}
        
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Poll History</h2>
          <p className="text-muted-foreground">Run the scraper to populate data.</p>
        </div>
      </div>
    </main>
  );
}
```

**Step 3: Commit**

```bash
git add frontend/
git commit -m "feat: add polling chart page"
```

---

## Phase 3: Integration & Polish

### Task 8: Add model refresh endpoint

**Files:**
- Modify: `backend/api/refresh.py`

**Step 1: Write refresh logic**

```python
import subprocess
from fastapi import APIRouter
from model.run import run_model

router = APIRouter()


@router.post("/refresh")
def refresh_model():
    """Re-run process_all and model, return fresh results."""
    # Run process_all.py
    result = subprocess.run(
        ["python", "-m", "scripts.process_all"],
        capture_output=True,
        text=True,
    )
    
    if result.returncode != 0:
        return {"error": "process_all failed", "detail": result.stderr}
    
    # Run model
    model_results = run_model()
    
    return {"status": "ok", "result": model_results}
```

**Step 2: Commit**

```bash
git add backend/
git commit -m "feat: add model refresh endpoint"
```

---

### Task 9: Add scheduler for polling scraper

**Files:**
- Create: `backend/tasks/scheduler.py`

**Step 1: Write scheduler**

```python
"""Simple scheduler for periodic polling scraper."""
import time
import threading
from datetime import datetime

from api.polls import scrape_polls


def run_scraper():
    """Run the scraper and log results."""
    print(f"[{datetime.now()}] Running poll scraper...")
    try:
        scrape_polls()
        print(f"[{datetime.now()}] Scraper finished")
    except Exception as e:
        print(f"[{datetime.now()}] Scraper error: {e}")


class PollScraperScheduler:
    def __init__(self, interval_minutes: int = 15):
        self.interval = interval_minutes * 60
        self.running = False
        
    def start(self):
        """Start the scheduler in a background thread."""
        self.running = True
        thread = threading.Thread(target=self._run_loop)
        thread.daemon = True
        thread.start()
        print(f"Scheduler started, scraping every {self.interval // 60} minutes")
        
    def _run_loop(self):
        while self.running:
            run_scraper()
            time.sleep(self.interval)
            
    def stop(self):
        self.running = False


if __name__ == "__main__":
    scheduler = PollScraperScheduler(interval_minutes=15)
    scheduler.start()
    # Keep main thread alive
    while True:
        time.sleep(60)
```

**Step 2: Integrate into main.py**

Add to `backend/main.py`:
```python
from tasks.scheduler import PollScraperScheduler

# Start scheduler on startup
@app.on_event("startup")
def start_scheduler():
    scheduler = PollScraperScheduler(interval_minutes=15)
    scheduler.start()
```

**Step 3: Commit**

```bash
git add backend/
git commit -m "feat: add polling scraper scheduler"
```

---

### Task 10: Environment configuration

**Files:**
- Create: `backend/.env.example`
- Create: `frontend/.env.local.example`

**Step 1: Write env files**

`backend/.env.example`:
```
DATABASE_URL=polls.db
POLLING_INTERVAL=15
```

`frontend/.env.local.example`:
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

**Step 2: Commit**

```bash
git add backend/.env.example frontend/.env.local.example
git commit -m "chore: add environment configuration templates"
```

---

## Summary

| Task | Description |
|------|--------------|
| 1 | Set up FastAPI project structure |
| 2 | Wire data pipeline into FastAPI |
| 3 | Add SQLite storage for polls |
| 4 | Wikipedia scraper for mayoral polls |
| 5 | Set up Next.js project |
| 6 | Ward list page |
| 7 | Polling chart page |
| 8 | Model refresh endpoint |
| 9 | Scheduler for polling scraper |
| 10 | Environment configuration |

(End of file - total 1025 lines)
