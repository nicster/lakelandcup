// A new season is treated as started on 1 October every year. NHL opening
// night moves around by a week or so; this is a fixed cutoff on purpose.
// Also decides when prospect protection runs out (see lib/protection.ts).
const SEASON_START_MONTH = 9; // October (0-indexed)
const SEASON_START_DAY = 1;

// Start year of the season in progress on `now`. Before the October cutoff
// we're still in (the offseason of) the previous season.
export function currentSeasonStartYear(now: Date = new Date()): number {
  const year = now.getFullYear();
  const cutoff = new Date(year, SEASON_START_MONTH, SEASON_START_DAY);
  return now >= cutoff ? year : year - 1;
}

// 2025 → "2025-26".
export function formatSeason(startYear: number): string {
  return `${startYear}-${String((startYear + 1) % 100).padStart(2, '0')}`;
}

// The current Lakeland Cup season, e.g. "2025-26". Computed on every call so
// a long-running server rolls over on the cutoff without a restart.
// Consumed by:
//   - RetiredJersey: treats players whose seasonEnd equals the current
//     season (or is null) as still active.
//   - /admin/franchise-players: shows "current" instead of an end year
//     for players still on the active roster.
export function getCurrentSeason(now: Date = new Date()): string {
  return formatSeason(currentSeasonStartYear(now));
}

// "2025-26" → "2025" (the start year). Useful for displaying a year range.
export function seasonStartYear(season: string): string {
  return season.split('-')[0];
}

// "2024-25" → "2025-26". Returns null if the input doesn't match the pattern.
// Used when closing a stale banner: the player was on the roster through
// `season` and got dropped during the following season.
export function nextSeason(season: string): string | null {
  const m = season.match(/^(\d{4})-(\d{2})$/);
  if (!m) return null;
  const startYear = parseInt(m[1], 10);
  return formatSeason(startYear + 1);
}

// "2025-26" → "26" (short tail). Useful for compact ranges like 2013–22.
export function seasonShortEnd(season: string): string {
  const parts = season.split('-');
  return parts[1] ?? parts[0];
}

export function isCurrentRoster(seasonEnd: string | null | undefined): boolean {
  return !seasonEnd || seasonEnd === getCurrentSeason();
}

// Years between two seasons, inclusive. If seasonEnd is empty/missing, the
// streak is treated as still active and runs through the current season.
// "2013-14" → "2024-25" = 12 years. "2013-14" with no end (current=2025-26) = 13.
// Used everywhere franchise_players.years is displayed — the stored value can
// go stale when the current season ticks over, so we recompute on read.
export function computeYears(
  seasonStart: string | null | undefined,
  seasonEnd: string | null | undefined,
  currentSeason: string = getCurrentSeason(),
): number {
  if (!seasonStart || !/^\d{4}-\d{2}$/.test(seasonStart)) return 0;
  const end = seasonEnd && /^\d{4}-\d{2}$/.test(seasonEnd) ? seasonEnd : currentSeason;
  const startYear = parseInt(seasonStart.slice(0, 4), 10);
  const endYear = parseInt(end.slice(0, 4), 10);
  return Math.max(0, endYear - startYear + 1);
}
