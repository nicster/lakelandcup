#!/usr/bin/env python3
"""
Fetch draft data from Google Sheets and save to JSON.

The spreadsheet has tabs for each draft year with:
- Entry Draft Round 1 (picks 1-12)
- Entry Draft Round 2 (picks 13-24)
- Free Agent Draft (optional)
"""

import csv
import json
import re
import requests
from io import StringIO
from pathlib import Path

SPREADSHEET_ID = "1hySqKud8A6cqEZrYBmPjUGWngEvv6H4-6f1j4ZiAFFs"

# Known draft year sheet gids (mapped by inspecting the spreadsheet)
DRAFT_SHEETS = {
    "2017": "0",
    "2018": "160005617",
    "2019": "396125050",
    "2020": "2114444838",
    "2021": "93631678",
    "2022": "485319108",
    "2023": "1264216592",
    "2024": "1497614364",
    "2025": "762784180",
}

# Prospect protection sheet
PROSPECTS_GID = "1885725030"


def fetch_sheet(gid: str) -> list[list[str]]:
    """Fetch a sheet as CSV and return as list of rows."""
    url = f"https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/export?format=csv&gid={gid}"
    response = requests.get(url, allow_redirects=True)
    response.raise_for_status()

    # Explicitly decode as UTF-8 to avoid encoding issues with special characters
    content = response.content.decode('utf-8')
    reader = csv.reader(StringIO(content))
    return list(reader)


def parse_draft_sheet(rows: list[list[str]], year: str) -> dict:
    """Parse a draft sheet into structured data."""
    draft_data = {
        "year": year,
        "entry_draft": {
            "round_1": [],
            "round_2": [],
        },
    }

    current_section = None

    for row in rows:
        # Skip empty rows
        if not any(row):
            continue

        first_cell = row[0].strip().lower() if row else ""

        # Detect section headers
        if "entry draft" in first_cell:
            continue
        elif "round 1" in first_cell:
            current_section = "round_1"
            continue
        elif "round 2" in first_cell:
            current_section = "round_2"
            continue
        elif "free agent" in first_cell:
            # Stop processing at free agent draft
            current_section = None
            break
        elif first_cell in ("pick", ""):
            # Header row or empty, skip
            if "pick" in first_cell or (len(row) > 1 and "team" in row[1].lower()):
                continue

        # Parse pick rows
        if current_section in ("round_1", "round_2"):
            try:
                pick_num = int(row[0]) if row[0].strip().isdigit() else None
                if pick_num is None:
                    continue

                team = row[1].strip() if len(row) > 1 else ""
                from_team = row[2].strip() if len(row) > 2 else ""
                player = row[3].strip() if len(row) > 3 else ""
                traded_to = ""

                # Skip if "from_team" looks like a yes/no (FA draft leaked in)
                if from_team.lower() in ("yes", "no"):
                    continue

                # Handle "Traded to" or "Traded" columns
                if len(row) > 4:
                    traded_col = row[4].strip()
                    if traded_col and traded_col not in ("x", "-"):
                        traded_to = traded_col

                if len(row) > 5 and not traded_to:
                    traded_col = row[5].strip()
                    if traded_col and traded_col not in ("x", "-"):
                        traded_to = traded_col

                pick_data = {
                    "pick": pick_num,
                    "team": team,
                    "from_team": from_team if from_team and from_team != team else None,
                    "player": player,
                    "traded_to": traded_to if traded_to else None,
                }

                draft_data["entry_draft"][current_section].append(pick_data)

            except (ValueError, IndexError):
                continue

    return draft_data


def fetch_all_drafts() -> dict:
    """Fetch and parse all draft years."""
    all_drafts = {}

    for year, gid in DRAFT_SHEETS.items():
        print(f"Fetching {year} draft (gid={gid})...")
        try:
            rows = fetch_sheet(gid)
            draft_data = parse_draft_sheet(rows, year)
            all_drafts[year] = draft_data

            # Print summary
            r1_count = len(draft_data["entry_draft"]["round_1"])
            r2_count = len(draft_data["entry_draft"]["round_2"])
            print(f"  Round 1: {r1_count} picks, Round 2: {r2_count} picks")

        except Exception as e:
            print(f"  Error: {e}")

    return all_drafts


def fetch_prospects() -> dict:
    """Fetch prospect protection data."""
    print(f"Fetching prospect data (gid={PROSPECTS_GID})...")

    rows = fetch_sheet(PROSPECTS_GID)

    # Parse the prospect sheet
    # Structure: Team names as column headers, rows grouped by expiration year
    prospects = {}
    teams = []
    current_expiry = None

    for row in rows:
        if not any(row):
            continue

        first_cell = row[0].strip() if row else ""

        # First row with team names
        if not teams and len(row) > 1:
            # Check if this is the header row
            if any("snipers" in cell.lower() or "monkeys" in cell.lower() for cell in row):
                teams = [cell.strip() for cell in row[1:] if cell.strip()]
                continue

        # Expiry year row (e.g., "bis September 2024")
        if "bis" in first_cell.lower() or "september" in first_cell.lower():
            match = re.search(r"20\d{2}", first_cell)
            if match:
                current_expiry = match.group()
                continue

        # Prospect data row
        if teams and current_expiry:
            for i, cell in enumerate(row[1:], 0):
                if i < len(teams) and cell.strip():
                    team = teams[i]
                    if team not in prospects:
                        prospects[team] = []
                    prospects[team].append({
                        "player": cell.strip(),
                        "rights_expire": current_expiry,
                    })

    return prospects


def main():
    output_dir = Path(__file__).parent

    # Fetch all draft data
    drafts = fetch_all_drafts()

    # Fetch prospect data
    prospects = fetch_prospects()

    # Combine into one file
    data = {
        "drafts": drafts,
        "prospects": prospects,
    }

    # Save to JSON
    output_file = output_dir / "draft_data.json"
    with open(output_file, "w") as f:
        json.dump(data, f, indent=2)

    print(f"\nSaved draft data to {output_file}")

    # Print prospect summary
    print("\nProspect summary:")
    for team, players in sorted(prospects.items()):
        print(f"  {team}: {len(players)} prospects")


if __name__ == "__main__":
    main()
