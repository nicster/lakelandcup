import { currentSeasonStartYear, formatSeason } from '@/lib/season';

// Prospect protection rules. A team holds a drafted player's rights for 3
// seasons (5 for goalies), counting the season that starts after the draft.
// Rights end the moment the next season starts (the 1 October cutoff in
// lib/season.ts): the player must be on the active roster by then or he
// becomes a free agent.
//
// Example: Zach Benson, 2023 draft → protected 2023-24, 2024-25, 2025-26 →
// unprotected once 2026-27 starts.

// Player name the admin draft editor stores for picks not made yet (e.g. the
// next draft's 24 placeholder picks). Not a real prospect, so never protected.
export const PLACEHOLDER_PLAYER = 'TBD';

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
