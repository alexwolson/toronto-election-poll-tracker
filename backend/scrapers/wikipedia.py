"""Scraper for mayoral polling data from Wikipedia using MediaWiki API."""
import re
import json
from datetime import datetime
from typing import Optional

import requests
from bs4 import BeautifulSoup


WIKIPEDIA_API_URL = "https://en.wikipedia.org/w/api.php?action=parse&page=2026_Toronto_mayoral_election&format=json&prop=text&redirects=1"


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
    for table in tables:
        if "poll" in table.get("class", []):
            polls_table = table
            break
    
    if polls_table is None:
        # Try finding by header text
        for table in tables:
            headers_tags = table.find_all("th")
            header_text = " ".join(h.get_text().lower() for h in headers_tags)
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
