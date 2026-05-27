// The current Lakeland Cup season. Bump this once per year when the new
// season starts. Consumed by:
//   - RetiredJersey: treats players whose seasonEnd equals CURRENT_SEASON
//     (or is null) as still active.
//   - /admin/franchise-players: shows "current" instead of an end year
//     for players still on the active roster.
export const CURRENT_SEASON = '2025-26';

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
  const nextStart = startYear + 1;
  const nextEnd = (nextStart + 1) % 100;
  return `${nextStart}-${String(nextEnd).padStart(2, '0')}`;
}

// "2025-26" → "26" (short tail). Useful for compact ranges like 2013–22.
export function seasonShortEnd(season: string): string {
  const parts = season.split('-');
  return parts[1] ?? parts[0];
}

export function isCurrentRoster(seasonEnd: string | null | undefined): boolean {
  return !seasonEnd || seasonEnd === CURRENT_SEASON;
}

// Years between two seasons, inclusive. If seasonEnd is empty/missing, the
// streak is treated as still active and runs through CURRENT_SEASON.
// "2013-14" → "2024-25" = 12 years. "2013-14" with no end (current=2025-26) = 13.
// Used everywhere franchise_players.years is displayed — the stored value can
// go stale when CURRENT_SEASON ticks over, so we recompute on read.
export function computeYears(
  seasonStart: string | null | undefined,
  seasonEnd: string | null | undefined,
  currentSeason: string = CURRENT_SEASON,
): number {
  if (!seasonStart || !/^\d{4}-\d{2}$/.test(seasonStart)) return 0;
  const end = seasonEnd && /^\d{4}-\d{2}$/.test(seasonEnd) ? seasonEnd : currentSeason;
  const startYear = parseInt(seasonStart.slice(0, 4), 10);
  const endYear = parseInt(end.slice(0, 4), 10);
  return Math.max(0, endYear - startYear + 1);
}
