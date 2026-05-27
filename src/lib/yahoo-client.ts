// Minimal Yahoo Fantasy Sports API client for server-side use.
//
// Auth: bring-your-own refresh token via environment variables. Use
// `scripts/fetch_yahoo_data.py` (or the original Yahoo OAuth flow) to obtain
// the refresh token, then export it as YAHOO_REFRESH_TOKEN.
//
// We refresh the access token once per sync operation and keep it scoped to
// that operation — no global cache, no persistence. If Yahoo rotates the
// refresh token, the next sync will fail and the admin needs to re-auth
// locally via the Python script.

export interface YahooConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}

export function loadYahooConfig(): YahooConfig | null {
  const clientId = process.env.YAHOO_CLIENT_ID;
  const clientSecret = process.env.YAHOO_CLIENT_SECRET;
  const refreshToken = process.env.YAHOO_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) return null;
  return { clientId, clientSecret, refreshToken };
}

async function refreshAccessToken(cfg: YahooConfig): Promise<string> {
  const res = await fetch('https://api.login.yahoo.com/oauth2/get_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      refresh_token: cfg.refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Yahoo token refresh failed (${res.status}): ${text}`);
  }
  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token) throw new Error('Yahoo did not return an access_token');
  return data.access_token;
}

async function yahooApi(endpoint: string, accessToken: string): Promise<unknown> {
  const sep = endpoint.includes('?') ? '&' : '?';
  const url = `https://fantasysports.yahooapis.com/fantasy/v2/${endpoint}${sep}format=json`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Yahoo API ${res.status} on ${endpoint}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

export interface YahooTeam {
  teamKey: string;
  name: string;
  managerName: string | null;
}

export interface YahooRosterPlayer {
  name: string;
  position: string | null;
  jerseyNumber: string | null;
}

// --- Parsing helpers --------------------------------------------------------
// Yahoo's JSON is deeply nested with numeric-string keys ("0", "1", "count").
// These helpers walk the tree safely.

type JsonObj = Record<string, unknown>;

function asObj(v: unknown): JsonObj | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as JsonObj) : null;
}
function asArr(v: unknown): unknown[] | null {
  return Array.isArray(v) ? v : null;
}

// Look through a Yahoo-style list-of-mixed-objects and return the first object
// that contains the given key.
function findKey(items: unknown[] | null, key: string): unknown {
  if (!items) return undefined;
  for (const item of items) {
    const o = asObj(item);
    if (o && key in o) return o[key];
  }
  return undefined;
}

export async function fetchYahooSeason(
  cfg: YahooConfig,
  leagueKey: string,
): Promise<{ teams: YahooTeam[]; rosters: Record<string, YahooRosterPlayer[]> }> {
  const accessToken = await refreshAccessToken(cfg);

  // 1. List teams in the league.
  const teamsData = (await yahooApi(`league/${leagueKey}/teams`, accessToken)) as JsonObj;
  const teams = parseTeams(teamsData);

  // 2. Fetch each team's roster (end-of-season — Yahoo's default with no
  //    date param is the current/most-recent snapshot for the league).
  const rosters: Record<string, YahooRosterPlayer[]> = {};
  for (const t of teams) {
    const rosterData = (await yahooApi(`team/${t.teamKey}/roster`, accessToken)) as JsonObj;
    rosters[t.teamKey] = parseRoster(rosterData);
  }
  return { teams, rosters };
}

function parseTeams(data: JsonObj): YahooTeam[] {
  const league = asObj(data?.fantasy_content)?.league;
  let teamsContainer: JsonObj | null = null;
  if (Array.isArray(league)) {
    for (const item of league) {
      const o = asObj(item);
      if (o && 'teams' in o) {
        teamsContainer = asObj(o.teams);
        break;
      }
    }
  } else if (asObj(league)) {
    teamsContainer = asObj(asObj(league)!.teams);
  }
  if (!teamsContainer) return [];

  const count = Number(teamsContainer.count ?? 0);
  const result: YahooTeam[] = [];
  for (let i = 0; i < count; i++) {
    const wrap = asObj(teamsContainer[String(i)]);
    if (!wrap) continue;
    const team = wrap.team;
    const info = asArr(asArr(team)?.[0]) ?? asArr(team);
    if (!info) continue;

    const teamKey = findKey(info, 'team_key');
    const name = findKey(info, 'name');
    const managers = findKey(info, 'managers');

    let managerName: string | null = null;
    if (Array.isArray(managers)) {
      const first = asObj(managers[0]);
      if (first) managerName = (asObj(first.manager)?.nickname as string) ?? null;
    } else if (asObj(managers)) {
      managerName = (asObj(asObj(managers)!.manager)?.nickname as string) ?? null;
    }

    if (typeof teamKey === 'string' && typeof name === 'string') {
      result.push({ teamKey, name, managerName });
    }
  }
  return result;
}

function parseRoster(data: JsonObj): YahooRosterPlayer[] {
  const team = asObj(data?.fantasy_content)?.team;
  let rosterContainer: JsonObj | null = null;
  if (Array.isArray(team)) {
    for (const item of team) {
      const o = asObj(item);
      if (o && 'roster' in o) {
        rosterContainer = asObj(o.roster);
        break;
      }
    }
  } else if (asObj(team)) {
    rosterContainer = asObj(asObj(team)!.roster);
  }
  if (!rosterContainer) return [];

  // Yahoo wraps "players" either directly or one level deeper under "0".
  const players =
    asObj(rosterContainer.players) ?? asObj(asObj(rosterContainer['0'])?.players);
  if (!players) return [];

  const count = Number(players.count ?? 0);
  const result: YahooRosterPlayer[] = [];
  for (let i = 0; i < count; i++) {
    const wrap = asObj(players[String(i)]);
    if (!wrap) continue;
    const playerArr = wrap.player;
    const info = asArr(asArr(playerArr)?.[0]) ?? asArr(playerArr);
    if (!info) continue;

    const nameField = findKey(info, 'name');
    let name: string | null = null;
    if (typeof nameField === 'string') name = nameField;
    else if (asObj(nameField)) name = (asObj(nameField)!.full as string) ?? null;

    const primary = findKey(info, 'primary_position');
    const display = findKey(info, 'display_position');
    const position = (typeof primary === 'string' && primary) || (typeof display === 'string' && display) || null;

    // Yahoo returns `uniform_number` as either a string ("87") or a number;
    // sometimes nested under `uniform_number.full`. Coerce to a clean string
    // or null. Empty strings become null so the form pre-fill stays empty.
    let jerseyNumber: string | null = null;
    const uniform = findKey(info, 'uniform_number');
    if (typeof uniform === 'string' && uniform.trim()) {
      jerseyNumber = uniform.trim();
    } else if (typeof uniform === 'number') {
      jerseyNumber = String(uniform);
    } else if (asObj(uniform)) {
      const full = asObj(uniform)!.full;
      if (typeof full === 'string' && full.trim()) jerseyNumber = full.trim();
    }

    if (name) result.push({ name, position, jerseyNumber });
  }
  return result;
}
