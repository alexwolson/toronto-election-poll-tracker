"""Scraper for mayoral polling data from Wikipedia using MediaWiki API."""
import re
import json
from datetime import datetime
from typing import Optional, List, Dict, Any

import requests
from bs4 import BeautifulSoup


WIKIPEDIA_API_URL = "https://en.wikipedia.org/w/api.php?action=parse&page=2026_Toronto_mayoral_election&format=json&prop=text&redirects=1"


def clean_text(text: str) -> str:
    """Clean Wikipedia text (remove citations like [1], handle em-dashes)."""
    text = re.sub(r"\[\d+\]", "", text)
    text = text.replace("—", "-").replace("–", "-")
    return text.strip()


def parse_date(date_text: str) -> Optional[str]:
    """Parse Wikipedia poll dates."""
    date_text = clean_text(date_text)
    # Handle formats like "8 March 2026", "March 8, 2026", "2026-03-08"
    for fmt in ("%d %B %Y", "%B %d, %Y", "%Y-%m-%d"):
        try:
            return datetime.strptime(date_text, fmt).date().isoformat()
        except ValueError:
            continue
    
    # Try fuzzy match for "8-10 March 2026"
    match = re.search(r"(\d+)-?\d*\s+(\w+)\s+(\d{4})", date_text)
    if match:
        day, month, year = match.groups()
        try:
            return datetime.strptime(f"{day} {month} {year}", "%d %B %Y").date().isoformat()
        except ValueError:
            pass
            
    return None


def scrape_wikipedia_polls() -> List[Dict[str, Any]]:
    """Scrape all polls from Wikipedia using the MediaWiki API."""
    headers = {"User-Agent": "TorontoPollTracker/1.0 (https://github.com/alex/toronto-election-poll-tracker)"}
    response = requests.get(WIKIPEDIA_API_URL, headers=headers, timeout=30)
    response.raise_for_status()
    
    data = response.json()
    html_content = data.get("parse", {}).get("text", {}).get("*", "")
    
    if not html_content:
        return []
    
    soup = BeautifulSoup(html_content, "lxml")
    
    # Find the polls table
    tables = soup.find_all("table", class_="wikitable")
    polls_table = None
    header_mapping = []
    
    for table in tables:
        headers_tags = table.find_all("th")
        header_text = [clean_text(h.get_text().lower()) for h in headers_tags]
        
        # Look for a table that has "polling firm" and "chow" or "bradford"
        if any("chow" in h for h in header_text) or any("bradford" in h for h in header_text):
            polls_table = table
            header_mapping = header_text
            break
            
    if not polls_table:
        return []
        
    polls = []
    rows = polls_table.find_all("tr")[1:]  # Skip header
    
    # Map common candidate names to keys
    CANDIDATE_MAP = {
        "chow": "chow",
        "bradford": "bradford",
        "bailão": "bailao",
        "bailao": "bailao",
        "furey": "furey",
        "tory": "tory",
        "matlow": "matlow",
        "mendicino": "mendicino",
        "ford": "ford",
        "furey": "furey",
        "saunders": "saunders",
        "hunter": "hunter"
    }
    
    for row in rows:
        cells = row.find_all(["td", "th"])
        if len(cells) < 8:  # Skip announcements or empty rows
            continue
            
        firm = clean_text(cells[0].get_text())
        if not firm or "polling" in firm.lower():
            continue
            
        date_text = cells[2].get_text()
        poll_date = parse_date(date_text)
        if not poll_date:
            continue
            
        sample_size = None
        sample_text = clean_text(cells[3].get_text())
        sample_match = re.search(r"(\d+)", sample_text)
        if sample_match:
            sample_size = int(sample_match.group(1))
            
        candidates = {}
        # Map candidates based on header positions
        for i, h_name in enumerate(header_mapping):
            if i >= len(cells):
                break
                
            # Candidates usually start after MOE (column 4)
            if i < 5:
                continue
                
            cell_text = clean_text(cells[i].get_text())
            # Match share percentage (e.g. "42%" or "42.3%")
            match = re.search(r"(\d+\.?\d*)%", cell_text)
            if match:
                share = float(match.group(1)) / 100.0
                
                # Check for candidate in map
                for key, candidate_id in CANDIDATE_MAP.items():
                    if key in h_name:
                        candidates[candidate_id] = share
                        break
                    
        if not candidates:
            continue
            
        polls.append({
            "poll_date": poll_date,
            "firm": firm,
            "sample_size": sample_size,
            "field_dates": clean_text(date_text),
            "candidates": candidates,
            "url": None
        })
        
    return polls
