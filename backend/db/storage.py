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
