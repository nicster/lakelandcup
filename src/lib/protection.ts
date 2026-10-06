// Prospect protection rules. A team holds a drafted player's rights for 3
// seasons (5 for goalies), counting the season that starts after the draft.
// Rights end the moment the next season starts: the player must be on the
// active roster by then or he becomes a free agent.
//
// Example: Zach Benson, 2023 draft → protected 2023-24, 2024-25, 2025-26 →
// unprotected once 2026-27 starts.

// The season is treated as started on 1 October every year. NHL opening
// night moves around by a week or so; this is a fixed cutoff on purpose.
const SEASON_START_MONTH = 9; // October (0-indexed)
const SEASON_START_DAY = 1;

const SKATER_SEASONS = 3;
const GOALIE_SEASONS = 5;

// Known goalies from our drafts. Used when draft_picks.position is empty.
const KNOWN_GOALIES = new Set([
  'Jake Oettinger',
  'Spencer Knight',
  'Yaroslav Askarov',
  'Devon Levi',
  'Jesper Wallstedt',
  'Dustin Wolf',
  'Thomas Milic',
  'Trey Augustine',
  'Carter George',
  'Michael Hrabal',
  'Sergei Ivanov',
  'Sebastian Cossa',
  'Ilya Nabokov',
  'Mikhail Yegorov',
  'Joshua Ravensbergen',
  'Jack Ivankovic',
  'M. Hrabal',
  'T. Augustine',
  'A. Gajan',
]);

export function isGoalie(playerName: string, position: string | null): boolean {
  if (position === 'G') return true;
  return KNOWN_GOALIES.has(playerName);
}

// Start year of the season in progress on `now`. Before the October cutoff
// we're still in (the offseason of) the previous season.
export function currentSeasonStartYear(now: Date = new Date()): number {
  const year = now.getFullYear();
  const cutoff = new Date(year, SEASON_START_MONTH, SEASON_START_DAY);
  return now >= cutoff ? year : year - 1;
}

function formatSeason(startYear: number): string {
  return `${startYear}-${String((startYear + 1) % 100).padStart(2, '0')}`;
}

export interface ProtectionStatus {
  protectedThrough: string; // last protected season, e.g. "2025-26"
  isProtected: boolean;
  isFinalSeason: boolean; // protected, but this is the last season of rights
}

export function getProtectionStatus(
  draftYear: string,
  goalie: boolean,
  now: Date = new Date(),
): ProtectionStatus {
  const year = parseInt(draftYear, 10);
  const lastSeasonStart = year + (goalie ? GOALIE_SEASONS : SKATER_SEASONS) - 1;
  const current = currentSeasonStartYear(now);
  return {
    protectedThrough: formatSeason(lastSeasonStart),
    isProtected: lastSeasonStart >= current,
    isFinalSeason: lastSeasonStart === current,
  };
}
