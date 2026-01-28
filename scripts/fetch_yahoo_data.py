#!/usr/bin/env python3
"""
Fetch historical champion data from Yahoo Fantasy API.

Setup:
1. Create a Yahoo app at https://developer.yahoo.com/apps/
2. Set redirect URI to: oob (out-of-band)
3. Copy client_id and client_secret to yahoo_credentials.json

Usage:
    python fetch_yahoo_data.py
"""

import json
import os
import re
import webbrowser
from urllib.parse import urlparse, parse_qs
import requests
from pathlib import Path

# Lakeland Cup league keys by season (game_key, league_id)
# League ID changes every year!
LAKELAND_CUP_SEASONS = {
    "2012-13": ("303", "13567"),
    "2013-14": ("321", "11723"),
    "2014-15": ("341", "11755"),
    "2015-16": ("352", "15201"),
    "2016-17": ("363", "4692"),
    "2017-18": ("376", "10917"),
    "2018-19": ("386", "3405"),
    "2019-20": ("396", "1915"),
    "2020-21": ("403", "6608"),
    "2021-22": ("411", "30458"),
    "2022-23": ("419", "1720"),
    "2023-24": ("427", "5333"),
    "2024-25": ("453", "4440"),
}

CREDENTIALS_FILE = "yahoo_credentials.json"
TOKEN_FILE = "yahoo_token.json"
REDIRECT_URI = "oob"  # Out-of-band - user will manually copy the code
LOGOS_DIR = Path(__file__).parent.parent / "public" / "images" / "teams"


def extract_logo_colors(logo_path, num_colors=3):
    """Extract dominant colors from a logo image with vibrant results"""
    try:
        from PIL import Image
        from collections import Counter
        import colorsys

        img = Image.open(logo_path)
        # Convert to RGB if necessary
        if img.mode != 'RGB':
            img = img.convert('RGB')

        # Resize for faster processing
        img = img.resize((150, 150))

        # Get all pixels
        pixels = list(img.getdata())

        def get_saturation(rgb):
            """Get HSV saturation of a color"""
            r, g, b = [x / 255.0 for x in rgb]
            h, s, v = colorsys.rgb_to_hsv(r, g, b)
            return s

        def get_brightness(rgb):
            """Get perceived brightness"""
            r, g, b = rgb
            return (r * 299 + g * 587 + b * 114) / 1000

        # Filter out backgrounds and boring colors
        def is_valid_color(rgb):
            r, g, b = rgb
            brightness = get_brightness(rgb)
            saturation = get_saturation(rgb)

            # Skip very light colors (likely white background)
            if brightness > 245:
                return False
            # Skip very dark colors (likely black)
            if brightness < 15:
                return False
            # Skip low-saturation grays (but keep dark team colors)
            if saturation < 0.15 and brightness > 60 and brightness < 200:
                return False
            return True

        filtered_pixels = [p for p in pixels if is_valid_color(p)]

        if not filtered_pixels:
            # Fallback: just filter out pure white/black
            filtered_pixels = [p for p in pixels if 20 < get_brightness(p) < 240]

        if not filtered_pixels:
            return None

        # Quantize colors (round to nearest 8 for finer granularity)
        def quantize(rgb):
            return tuple((c // 8) * 8 for c in rgb)

        quantized = [quantize(p) for p in filtered_pixels]
        color_counts = Counter(quantized)

        # Score colors by frequency AND saturation (prefer vibrant colors)
        def color_score(color_count_tuple):
            rgb, count = color_count_tuple
            saturation = get_saturation(rgb)
            # Boost score for saturated colors
            return count * (1 + saturation * 2)

        sorted_colors = sorted(color_counts.items(), key=color_score, reverse=True)

        # Get top colors, but try to get diverse colors
        colors = []
        for rgb, count in sorted_colors:
            # Check if this color is too similar to already selected colors
            is_unique = True
            for existing in colors:
                existing_rgb = tuple(int(existing[i:i+2], 16) for i in (1, 3, 5))
                diff = sum(abs(a - b) for a, b in zip(rgb, existing_rgb))
                if diff < 80:  # Colors too similar
                    is_unique = False
                    break

            if is_unique:
                hex_color = '#{:02x}{:02x}{:02x}'.format(*rgb)
                colors.append(hex_color)

            if len(colors) >= num_colors:
                break

        return colors if colors else None
    except Exception as e:
        print(f"      Error extracting colors: {e}")
        return None


def slugify(text):
    """Convert text to a safe filename"""
    text = text.lower()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[-\s]+', '-', text)
    return text.strip('-')


def download_logo(url, team_name):
    """Download a team logo and save it locally"""
    if not url:
        return None

    LOGOS_DIR.mkdir(parents=True, exist_ok=True)

    # Create filename from team name
    filename = f"{slugify(team_name)}.png"
    filepath = LOGOS_DIR / filename

    # Skip if already downloaded
    if filepath.exists():
        print(f"      Logo exists: {filename}")
        return filename

    try:
        response = requests.get(url, timeout=10)
        if response.status_code == 200:
            filepath.write_bytes(response.content)
            print(f"      Downloaded: {filename}")
            return filename
        else:
            print(f"      Failed to download logo: {response.status_code}")
            return None
    except Exception as e:
        print(f"      Error downloading logo: {e}")
        return None


class YahooFantasyAPI:
    def __init__(self):
        self.client_id = None
        self.client_secret = None
        self.access_token = None
        self.refresh_token = None
        self.load_credentials()
        self.load_token()

    def load_credentials(self):
        """Load OAuth credentials from file"""
        if os.path.exists(CREDENTIALS_FILE):
            with open(CREDENTIALS_FILE) as f:
                creds = json.load(f)
                self.client_id = creds.get('client_id')
                self.client_secret = creds.get('client_secret')

        if not self.client_id or not self.client_secret:
            print("\n" + "="*60)
            print("Yahoo API credentials not found!")
            print("="*60)
            print(f"\nCreate {CREDENTIALS_FILE} with:")
            print(json.dumps({
                "client_id": "YOUR_CLIENT_ID",
                "client_secret": "YOUR_CLIENT_SECRET"
            }, indent=2))
            print("\nGet these from: https://developer.yahoo.com/apps/")
            print("="*60 + "\n")
            raise SystemExit(1)

    def load_token(self):
        """Load saved token if exists"""
        if os.path.exists(TOKEN_FILE):
            with open(TOKEN_FILE) as f:
                token = json.load(f)
                self.access_token = token.get('access_token')
                self.refresh_token = token.get('refresh_token')

    def save_token(self):
        """Save token to file"""
        with open(TOKEN_FILE, 'w') as f:
            json.dump({
                'access_token': self.access_token,
                'refresh_token': self.refresh_token
            }, f, indent=2)

    def authenticate(self):
        """Perform OAuth2 authentication"""
        if self.access_token:
            # Try to use existing token
            if self.test_token():
                print("Using existing token")
                return
            elif self.refresh_token:
                # Try to refresh
                if self.do_refresh_token():
                    print("Token refreshed")
                    return

        # Need fresh auth
        print("\nStarting OAuth authentication...")

        # Build auth URL
        auth_url = (
            "https://api.login.yahoo.com/oauth2/request_auth"
            f"?client_id={self.client_id}"
            f"&redirect_uri={REDIRECT_URI}"
            "&response_type=code"
            "&scope=fspt-r"
        )

        print("\n" + "="*60)
        print("Please visit this URL to authorize:")
        print("="*60)
        print(f"\n{auth_url}\n")
        print("="*60)

        webbrowser.open(auth_url)

        print("\nAfter authorizing, Yahoo will show you a code.")
        auth_code = input("Paste the authorization code here: ").strip()

        if not auth_code:
            print("No code provided, exiting.")
            raise SystemExit(1)

        # Exchange code for token
        self.exchange_code(auth_code)

    def exchange_code(self, code):
        """Exchange auth code for access token"""
        response = requests.post(
            "https://api.login.yahoo.com/oauth2/get_token",
            data={
                'client_id': self.client_id,
                'client_secret': self.client_secret,
                'redirect_uri': REDIRECT_URI,
                'code': code,
                'grant_type': 'authorization_code'
            }
        )

        if response.status_code == 200:
            token = response.json()
            self.access_token = token['access_token']
            self.refresh_token = token.get('refresh_token')
            self.save_token()
            print("Authentication successful!")
        else:
            print(f"Token exchange failed: {response.text}")
            raise SystemExit(1)

    def do_refresh_token(self):
        """Refresh the access token"""
        response = requests.post(
            "https://api.login.yahoo.com/oauth2/get_token",
            data={
                'client_id': self.client_id,
                'client_secret': self.client_secret,
                'refresh_token': self.refresh_token,
                'grant_type': 'refresh_token'
            }
        )

        if response.status_code == 200:
            token = response.json()
            self.access_token = token['access_token']
            self.refresh_token = token.get('refresh_token', self.refresh_token)
            self.save_token()
            return True
        return False

    def test_token(self):
        """Test if current token is valid"""
        try:
            response = requests.get(
                "https://fantasysports.yahooapis.com/fantasy/v2/users;use_login=1/games;game_keys=nhl",
                headers={'Authorization': f'Bearer {self.access_token}'},
                params={'format': 'json'}
            )
            return response.status_code == 200
        except:
            return False

    def api_request(self, endpoint):
        """Make an authenticated API request"""
        url = f"https://fantasysports.yahooapis.com/fantasy/v2/{endpoint}"
        response = requests.get(
            url,
            headers={'Authorization': f'Bearer {self.access_token}'},
            params={'format': 'json'}
        )

        if response.status_code == 401:
            # Token expired, try refresh
            if self.do_refresh_token():
                return self.api_request(endpoint)
            raise Exception("Authentication failed")

        if response.status_code != 200:
            print(f"API error: {response.status_code}")
            print(response.text)
            return None

        return response.json()

    def get_league_settings(self, game_key, league_id):
        """Get league settings including playoff info"""
        league_key = f"{game_key}.l.{league_id}"
        endpoint = f"league/{league_key}/settings"
        return self.api_request(endpoint)

    def get_playoff_bracket(self, game_key, league_id):
        """Get playoff matchups/bracket"""
        league_key = f"{game_key}.l.{league_id}"
        # Try to get scoreboard for playoff weeks
        endpoint = f"league/{league_key}/scoreboard"

        data = self.api_request(endpoint)
        if not data:
            return None

        try:
            league = data['fantasy_content']['league']
            scoreboard = None

            if isinstance(league, list):
                for item in league:
                    if isinstance(item, dict) and 'scoreboard' in item:
                        scoreboard = item['scoreboard']
                        break
            else:
                scoreboard = league.get('scoreboard')

            if not scoreboard:
                return None

            # Extract matchups
            matchups_data = scoreboard.get('0', {}).get('matchups', {})
            if not matchups_data:
                return None

            matchups = []
            count = matchups_data.get('count', 0)

            for i in range(count):
                matchup = matchups_data.get(str(i), {}).get('matchup', {})
                if matchup:
                    is_playoff = matchup.get('is_playoffs') == '1'
                    is_consolation = matchup.get('is_consolation') == '1'
                    week = matchup.get('week')

                    teams_data = matchup.get('0', {}).get('teams', {})
                    teams = []

                    for j in range(teams_data.get('count', 0)):
                        team_entry = teams_data.get(str(j), {}).get('team', [])
                        if team_entry:
                            team_info = team_entry[0] if team_entry else []
                            points_info = team_entry[1] if len(team_entry) > 1 else {}

                            name = None
                            for item in team_info:
                                if isinstance(item, dict) and 'name' in item:
                                    name = item['name']
                                    break

                            points = points_info.get('team_points', {}).get('total') if isinstance(points_info, dict) else None

                            teams.append({
                                'name': name,
                                'points': float(points) if points else None
                            })

                    if teams:
                        # Determine winner
                        winner = None
                        if len(teams) == 2 and teams[0]['points'] and teams[1]['points']:
                            winner = teams[0]['name'] if teams[0]['points'] > teams[1]['points'] else teams[1]['name']

                        matchups.append({
                            'week': week,
                            'is_playoff': is_playoff,
                            'is_consolation': is_consolation,
                            'teams': teams,
                            'winner': winner
                        })

            return matchups

        except (KeyError, IndexError, TypeError) as e:
            print(f"Error parsing bracket: {e}")
            return None

    def get_all_matchups(self, game_key, league_id):
        """Get all matchups for the season including playoffs"""
        league_key = f"{game_key}.l.{league_id}"

        # First get settings to find playoff weeks
        settings = self.get_league_settings(game_key, league_id)
        playoff_start_week = None

        if settings:
            try:
                league = settings['fantasy_content']['league']
                if isinstance(league, list):
                    for item in league:
                        if isinstance(item, dict) and 'settings' in item:
                            s = item['settings'][0]
                            playoff_start_week = s.get('playoff_start_week')
                            break
            except:
                pass

        # Get matchups for playoff weeks
        playoff_matchups = []

        if playoff_start_week:
            for week in range(int(playoff_start_week), int(playoff_start_week) + 4):  # Usually 3-4 playoff weeks
                endpoint = f"league/{league_key}/scoreboard;week={week}"
                data = self.api_request(endpoint)

                if data:
                    try:
                        league = data['fantasy_content']['league']
                        scoreboard = None

                        if isinstance(league, list):
                            for item in league:
                                if isinstance(item, dict) and 'scoreboard' in item:
                                    scoreboard = item['scoreboard']
                                    break

                        if scoreboard:
                            matchups_data = scoreboard.get('0', {}).get('matchups', {})
                            count = matchups_data.get('count', 0)

                            for i in range(count):
                                matchup = matchups_data.get(str(i), {}).get('matchup', {})
                                if matchup:
                                    is_playoff = matchup.get('is_playoffs') == '1'
                                    is_consolation = matchup.get('is_consolation') == '1'

                                    if is_playoff and not is_consolation:
                                        teams_data = matchup.get('0', {}).get('teams', {})
                                        teams = []

                                        for j in range(teams_data.get('count', 0)):
                                            team_entry = teams_data.get(str(j), {}).get('team', [])
                                            if team_entry:
                                                team_info = team_entry[0] if team_entry else []
                                                points_info = team_entry[1] if len(team_entry) > 1 else {}

                                                name = None
                                                for item in team_info:
                                                    if isinstance(item, dict) and 'name' in item:
                                                        name = item['name']
                                                        break

                                                points = None
                                                if isinstance(points_info, dict):
                                                    points = points_info.get('team_points', {}).get('total')

                                                teams.append({
                                                    'name': name,
                                                    'points': float(points) if points else None
                                                })

                                        if len(teams) == 2:
                                            winner = None
                                            if teams[0]['points'] and teams[1]['points']:
                                                winner = teams[0]['name'] if teams[0]['points'] > teams[1]['points'] else teams[1]['name']

                                            playoff_matchups.append({
                                                'week': week,
                                                'round': week - int(playoff_start_week) + 1,
                                                'teams': [t['name'] for t in teams],
                                                'scores': [t['points'] for t in teams],
                                                'winner': winner
                                            })
                    except Exception as e:
                        print(f"    Error parsing week {week}: {e}")
                        continue

        return playoff_matchups if playoff_matchups else None

    def get_league_teams_with_keys(self, game_key, league_id):
        """Get all teams in a league with their team keys"""
        league_key = f"{game_key}.l.{league_id}"
        endpoint = f"league/{league_key}/teams"

        data = self.api_request(endpoint)
        if not data:
            return None

        try:
            league = data['fantasy_content']['league']
            if isinstance(league, list):
                teams_data = None
                for item in league:
                    if isinstance(item, dict) and 'teams' in item:
                        teams_data = item['teams']
                        break
                if not teams_data:
                    return None
            else:
                teams_data = league.get('teams')

            results = []
            count = teams_data.get('count', 0)
            for i in range(count):
                team_data = teams_data.get(str(i))
                if team_data:
                    team = team_data['team']
                    team_info = team[0]

                    team_key = None
                    name = None
                    manager = None
                    for item in team_info:
                        if isinstance(item, dict):
                            if 'team_key' in item:
                                team_key = item['team_key']
                            if 'name' in item:
                                name = item['name']
                            if 'managers' in item:
                                managers = item['managers']
                                if isinstance(managers, list) and managers:
                                    manager = managers[0].get('manager', {}).get('nickname')
                                elif isinstance(managers, dict):
                                    manager = managers.get('manager', {}).get('nickname')

                    if team_key and name:
                        results.append({
                            'team_key': team_key,
                            'name': name,
                            'manager': manager
                        })

            return results
        except (KeyError, IndexError, TypeError) as e:
            print(f"Error parsing teams: {e}")
            return None

    def get_team_roster(self, team_key):
        """Get the roster for a specific team"""
        endpoint = f"team/{team_key}/roster"

        data = self.api_request(endpoint)
        if not data:
            return None

        try:
            team = data['fantasy_content']['team']
            roster_data = None

            if isinstance(team, list):
                for item in team:
                    if isinstance(item, dict) and 'roster' in item:
                        roster_data = item['roster']
                        break
            else:
                roster_data = team.get('roster')

            if not roster_data:
                return None

            # Get coverage type (usually "week" or "date")
            coverage = roster_data.get('0', {}).get('players', {})
            if not coverage:
                coverage = roster_data.get('players', {})

            players = []
            count = coverage.get('count', 0)

            for i in range(count):
                player_data = coverage.get(str(i))
                if player_data:
                    player = player_data.get('player', [])
                    if player:
                        player_info = player[0] if isinstance(player[0], list) else player

                        player_id = None
                        name = None
                        position = None
                        jersey_number = None

                        for item in player_info:
                            if isinstance(item, dict):
                                if 'player_id' in item:
                                    player_id = item['player_id']
                                if 'name' in item:
                                    name = item['name'].get('full', item['name'].get('first', '') + ' ' + item['name'].get('last', ''))
                                if 'primary_position' in item:
                                    position = item['primary_position']
                                if 'display_position' in item and not position:
                                    position = item['display_position']
                                if 'uniform_number' in item:
                                    jersey_number = item['uniform_number']

                        if name:
                            players.append({
                                'player_id': player_id,
                                'name': name,
                                'position': position,
                                'jersey_number': jersey_number
                            })

            return players
        except (KeyError, IndexError, TypeError) as e:
            print(f"Error parsing roster: {e}")
            import traceback
            traceback.print_exc()
            return None

    def get_league_standings(self, game_key, league_id):
        """Get standings for a specific league/season"""
        league_key = f"{game_key}.l.{league_id}"
        endpoint = f"league/{league_key}/standings"

        data = self.api_request(endpoint)
        if not data:
            return None

        try:
            league = data['fantasy_content']['league']
            # Handle Yahoo's weird nested array format
            if isinstance(league, list):
                standings_data = None
                for item in league:
                    if isinstance(item, dict) and 'standings' in item:
                        standings_data = item['standings']
                        break
                if not standings_data:
                    return None
            else:
                standings_data = league.get('standings')

            teams = standings_data[0]['teams']

            results = []
            # Yahoo returns teams as {"0": {...}, "1": {...}, "count": N}
            count = teams.get('count', 0)
            for i in range(count):
                team_data = teams.get(str(i))
                if team_data:
                    team = team_data['team']
                    # Team data is also nested weirdly
                    team_info = team[0]
                    standings_info = team[2] if len(team) > 2 else {}

                    name = None
                    manager = None
                    logo_url = None
                    for item in team_info:
                        if isinstance(item, dict):
                            if 'name' in item:
                                name = item['name']
                            if 'managers' in item:
                                managers = item['managers']
                                if isinstance(managers, list) and managers:
                                    manager = managers[0].get('manager', {}).get('nickname')
                                elif isinstance(managers, dict):
                                    manager = managers.get('manager', {}).get('nickname')
                            if 'team_logos' in item:
                                logos = item['team_logos']
                                if isinstance(logos, list) and logos:
                                    logo_url = logos[0].get('team_logo', {}).get('url')
                                elif isinstance(logos, dict):
                                    logo_url = logos.get('team_logo', {}).get('url')

                    rank = None
                    if isinstance(standings_info, dict) and 'team_standings' in standings_info:
                        rank = standings_info['team_standings'].get('rank')

                    results.append({
                        'rank': int(rank) if rank else i + 1,
                        'name': name,
                        'manager': manager,
                        'logo_url': logo_url
                    })

            # Sort by rank
            results.sort(key=lambda x: x['rank'])
            return results

        except (KeyError, IndexError, TypeError) as e:
            print(f"Error parsing standings: {e}")
            return None


def list_my_leagues():
    """List all leagues the user is part of"""
    print("="*60)
    print("Finding your NHL leagues...")
    print("="*60)

    api = YahooFantasyAPI()
    api.authenticate()

    # Get all NHL games the user has played
    endpoint = "users;use_login=1/games;game_codes=nhl/leagues"
    data = api.api_request(endpoint)

    if not data:
        print("Could not fetch leagues")
        return

    try:
        games = data['fantasy_content']['users']['0']['user'][1]['games']
        count = games.get('count', 0)

        print(f"\nFound leagues in {count} NHL seasons:\n")

        for i in range(count):
            game = games.get(str(i), {}).get('game', [])
            if game:
                game_info = game[0] if isinstance(game[0], dict) else {}
                game_key = game_info.get('game_key', '?')
                season = game_info.get('season', '?')

                leagues_data = game[1].get('leagues', {}) if len(game) > 1 else {}
                league_count = leagues_data.get('count', 0)

                for j in range(league_count):
                    league = leagues_data.get(str(j), {}).get('league', [])
                    if league:
                        league_info = league[0] if isinstance(league[0], dict) else {}
                        league_key = league_info.get('league_key', '?')
                        league_id = league_info.get('league_id', '?')
                        name = league_info.get('name', '?')

                        print(f"  {season}: {name}")
                        print(f"         League Key: {league_key}")
                        print(f"         League ID: {league_id}")
                        print(f"         Game Key: {game_key}")
                        print()

    except Exception as e:
        print(f"Error parsing leagues: {e}")
        import traceback
        traceback.print_exc()


def main():
    print("="*60)
    print("Lakeland Cup Data Fetcher")
    print("="*60)

    api = YahooFantasyAPI()
    api.authenticate()

    print(f"\nFetching data for Lakeland Cup")
    print("-"*60)

    champions = []
    all_teams = {}  # name -> {owner, logo_url, logo_file, seasons: []}
    all_playoffs = {}
    season_rosters = {}  # season -> [team_names]
    player_history = {}  # player_name -> {team_name -> [seasons]}
    team_rosters = {}  # season -> team_name -> [players]

    for season, (game_key, league_id) in sorted(LAKELAND_CUP_SEASONS.items()):
        print(f"\n{season} (game key: {game_key}, league: {league_id})...")

        standings = api.get_league_standings(game_key, league_id)

        if standings:
            champion = standings[0]
            runner_up = standings[1] if len(standings) > 1 else None

            print(f"  Champion: {champion['name']} ({champion['manager']})")
            if runner_up:
                print(f"  Runner-up: {runner_up['name']} ({runner_up['manager']})")

            # Try to get playoff bracket
            print(f"  Fetching playoff bracket...")
            playoffs = api.get_all_matchups(game_key, league_id)

            if playoffs:
                print(f"  Found {len(playoffs)} playoff matchups")
                all_playoffs[season] = playoffs

                # Print playoff bracket
                for match in playoffs:
                    print(f"    Round {match['round']}: {match['teams'][0]} vs {match['teams'][1]} -> {match['winner']}")
            else:
                print(f"  No playoff data available")

            champions.append({
                'season': season,
                'champion_team': champion['name'],
                'champion_owner': champion['manager'],
                'runner_up_team': runner_up['name'] if runner_up else None,
                'runner_up_owner': runner_up['manager'] if runner_up else None,
                'playoffs': playoffs,
            })

            # Collect all teams with their logos and track seasons
            season_rosters[season] = []
            for team in standings:
                name = team['name']
                season_rosters[season].append(name)

                if name not in all_teams:
                    all_teams[name] = {
                        'owner': team['manager'],
                        'logo_url': team['logo_url'],
                        'seasons': []
                    }
                # Update logo_url if we have a newer one
                if team['logo_url']:
                    all_teams[name]['logo_url'] = team['logo_url']
                # Track which seasons this team was active
                all_teams[name]['seasons'].append(season)

            # Fetch rosters for all teams
            print(f"  Fetching rosters...")
            teams_with_keys = api.get_league_teams_with_keys(game_key, league_id)
            if teams_with_keys:
                team_rosters[season] = {}
                for team_info in teams_with_keys:
                    team_key = team_info['team_key']
                    team_name = team_info['name']
                    manager = team_info['manager']

                    roster = api.get_team_roster(team_key)
                    if roster:
                        team_rosters[season][team_name] = roster
                        print(f"    {team_name}: {len(roster)} players")

                        # Track player history for franchise player analysis
                        for player in roster:
                            player_name = player['name']
                            if player_name not in player_history:
                                player_history[player_name] = {
                                    'teams': {},  # team_name -> [seasons]
                                    'position': player['position'],
                                    'player_id': player['player_id'],
                                    'jersey_number': player.get('jersey_number')
                                }
                            # Update jersey number if we have a newer one
                            if player.get('jersey_number'):
                                player_history[player_name]['jersey_number'] = player['jersey_number']
                            if team_name not in player_history[player_name]['teams']:
                                player_history[player_name]['teams'][team_name] = []
                            player_history[player_name]['teams'][team_name].append(season)
                    else:
                        print(f"    {team_name}: failed to fetch roster")
        else:
            print(f"  Could not fetch data (league may not exist for this season)")

    # Download all logos and extract colors
    print("\n" + "="*60)
    print("DOWNLOADING LOGOS & EXTRACTING COLORS")
    print("="*60)

    for name, data in all_teams.items():
        print(f"\n  {name}...")
        logo_file = download_logo(data['logo_url'], name)
        data['logo_file'] = logo_file

        # Extract colors from logo
        if logo_file:
            logo_path = LOGOS_DIR / logo_file
            if logo_path.exists():
                colors = extract_logo_colors(logo_path)
                data['colors'] = colors
                if colors:
                    print(f"      Colors: {', '.join(colors)}")
            else:
                data['colors'] = None
        else:
            data['colors'] = None

    # Output results
    print("\n" + "="*60)
    print("RESULTS")
    print("="*60)

    print("\n--- Teams ---")
    for name in sorted(all_teams.keys()):
        data = all_teams[name]
        logo_status = f"✓ {data['logo_file']}" if data.get('logo_file') else "✗ no logo"
        print(f"  {name} ({data['owner']}) [{logo_status}]")

    print("\n--- Champions by Season ---")
    for c in champions:
        print(f"  {c['season']}: {c['champion_team']} ({c['champion_owner']})")
        if c.get('playoffs'):
            # Find the final
            finals = [p for p in c['playoffs'] if p['round'] == max(p['round'] for p in c['playoffs'])]
            if finals:
                final = finals[0]
                print(f"    Final: {final['teams'][0]} ({final['scores'][0]}) vs {final['teams'][1]} ({final['scores'][1]})")

    # Analyze franchise players (10+ consecutive seasons with same team)
    print("\n" + "="*60)
    print("FRANCHISE PLAYERS (10+ consecutive seasons)")
    print("="*60)

    def get_consecutive_seasons(seasons_list):
        """Find longest consecutive run of seasons"""
        if not seasons_list:
            return [], 0

        # Sort seasons chronologically
        sorted_seasons = sorted(seasons_list, key=lambda s: int(s.split('-')[0]))

        best_run = []
        current_run = [sorted_seasons[0]]

        for i in range(1, len(sorted_seasons)):
            prev_year = int(sorted_seasons[i-1].split('-')[0])
            curr_year = int(sorted_seasons[i].split('-')[0])

            if curr_year == prev_year + 1:
                current_run.append(sorted_seasons[i])
            else:
                if len(current_run) > len(best_run):
                    best_run = current_run
                current_run = [sorted_seasons[i]]

        if len(current_run) > len(best_run):
            best_run = current_run

        return best_run, len(best_run)

    franchise_players = []

    for player_name, data in player_history.items():
        for team_name, seasons_list in data['teams'].items():
            consecutive, count = get_consecutive_seasons(seasons_list)
            if count >= 10:
                games_estimate = count * 82
                # Get team colors
                team_colors = all_teams.get(team_name, {}).get('colors')
                franchise_players.append({
                    'player': player_name,
                    'team': team_name,
                    'seasons': consecutive,
                    'years': count,
                    'games': games_estimate,
                    'position': data['position'],
                    'player_id': data['player_id'],
                    'jersey_number': data.get('jersey_number'),
                    'team_colors': team_colors
                })

    # Sort by years (descending), then by player name
    franchise_players.sort(key=lambda x: (-x['years'], x['player']))

    # Group by team for display
    teams_franchise = {}
    for fp in franchise_players:
        team = fp['team']
        if team not in teams_franchise:
            teams_franchise[team] = []
        teams_franchise[team].append(fp)

    for team_name in sorted(teams_franchise.keys()):
        players = teams_franchise[team_name]
        print(f"\n  {team_name}:")
        for fp in players:
            season_range = f"{fp['seasons'][0]} to {fp['seasons'][-1]}"
            jersey = f"#{fp['jersey_number']}" if fp.get('jersey_number') else ""
            print(f"    ★ {fp['player']} {jersey} ({fp['position']}) - {fp['years']} years ({fp['games']} games est.)")
            print(f"      {season_range}")

    print(f"\n  Total franchise players found: {len(franchise_players)}")

    # Save to JSON for easy import
    output = {
        'teams': [
            {
                'name': name,
                'owner': data['owner'],
                'logo': data.get('logo_file'),
                'colors': data.get('colors'),
                'seasons': data.get('seasons', [])
            }
            for name, data in sorted(all_teams.items())
        ],
        'seasons': champions,
        'season_rosters': season_rosters,
        'team_rosters': team_rosters,
        'franchise_players': franchise_players,
        'player_history': {
            name: {
                'teams': data['teams'],
                'position': data['position'],
                'player_id': data['player_id'],
                'jersey_number': data.get('jersey_number')
            }
            for name, data in player_history.items()
        }
    }

    with open('league_data.json', 'w') as f:
        json.dump(output, f, indent=2)

    print(f"\n✓ Data saved to league_data.json")
    print(f"✓ Logos saved to {LOGOS_DIR}")
    print("\nYou can use this data to seed the database.")


if __name__ == '__main__':
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    main()
