// Yahoo Fantasy Sports league keys for the Lakeland Cup, season by season.
// The league_id changes every year. Mirrors the LAKELAND_CUP_SEASONS map in
// scripts/fetch_yahoo_data.py — keep them in sync if Yahoo issues a new key.

export interface YahooLeagueKey {
  gameKey: string;
  leagueId: string;
}

export const LAKELAND_CUP_SEASONS: Record<string, YahooLeagueKey> = {
  '2012-13': { gameKey: '303', leagueId: '13567' },
  '2013-14': { gameKey: '321', leagueId: '11723' },
  '2014-15': { gameKey: '341', leagueId: '11755' },
  '2015-16': { gameKey: '352', leagueId: '15201' },
  '2016-17': { gameKey: '363', leagueId: '4692' },
  '2017-18': { gameKey: '376', leagueId: '10917' },
  '2018-19': { gameKey: '386', leagueId: '3405' },
  '2019-20': { gameKey: '396', leagueId: '1915' },
  '2020-21': { gameKey: '403', leagueId: '6608' },
  '2021-22': { gameKey: '411', leagueId: '30458' },
  '2022-23': { gameKey: '419', leagueId: '1720' },
  '2023-24': { gameKey: '427', leagueId: '5333' },
  '2024-25': { gameKey: '453', leagueId: '4440' },
  '2025-26': { gameKey: '465', leagueId: '2066' },
};

export function leagueKeyFor(season: string): string | null {
  const entry = LAKELAND_CUP_SEASONS[season];
  return entry ? `${entry.gameKey}.l.${entry.leagueId}` : null;
}

// The season is considered "ended" — and therefore safe to snapshot rosters
// for — starting May 1 of its end year, by which point the regular season
// has wrapped and final rosters are locked in.
export function isSeasonEnded(season: string, now: Date = new Date()): boolean {
  const m = season.match(/^(\d{4})-(\d{2})$/);
  if (!m) return false;
  const startYear = parseInt(m[1], 10);
  const endYear = startYear + 1;
  const cutoff = new Date(endYear, 4, 1); // month is 0-indexed; 4 = May
  return now >= cutoff;
}
