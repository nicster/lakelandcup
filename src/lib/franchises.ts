// Lakeland Cup franchise timelines — single source of truth for which
// teams existed in which seasons, what names they wore, and which five
// "Original 5" franchises trace back to 2013-14.
//
// Consumed by:
//   - /history (timeline chart + Original 5 badge)
//   - /teams (franchise directory)
//
// When a new season starts, append it to ALL_SEASONS and to every team
// that's still active. When a team folds, stop appending. When a team
// renames, append the new name into `formerNames` on the new entry.

export const ALL_SEASONS = [
  '2012-13', '2013-14', '2014-15', '2015-16', '2016-17',
  '2017-18', '2018-19', '2019-20', '2020-21', '2021-22',
  '2022-23', '2023-24', '2024-25', '2025-26',
];

// The season that "active" means right now. Update once per year.
export const ACTIVE_SEASON = '2025-26';

export interface FranchiseTimeline {
  seasons: string[];
  formerNames?: string[];
}

export const TEAM_TIMELINES: Record<string, FranchiseTimeline> = {
  // Active franchises (sorted by founding season — Original 5 first, then expansion)
  'Stonemere Flyers':     { seasons: ['2013-14', '2014-15', '2015-16', '2016-17', '2017-18', '2018-19', '2019-20', '2020-21', '2021-22', '2022-23', '2023-24', '2024-25', '2025-26'], formerNames: ['Schlieren Flyers'] },
  'Drunken Monkeys':      { seasons: ['2013-14', '2014-15', '2015-16', '2016-17', '2017-18', '2018-19', '2019-20', '2020-21', '2021-22', '2022-23', '2023-24', '2024-25', '2025-26'], formerNames: ['Fighting Monkeys'] },
  'Slithering Goons':     { seasons: ['2013-14', '2014-15', '2015-16', '2016-17', '2017-18', '2018-19', '2019-20', '2020-21', '2021-22', '2022-23', '2023-24', '2024-25', '2025-26'], formerNames: ['Spinning Doctors'] },
  'Illinois Ice Cracker': { seasons: ['2013-14', '2014-15', '2015-16', '2016-17', '2017-18', '2018-19', '2019-20', '2020-21', '2021-22', '2022-23', '2023-24', '2024-25', '2025-26'] },
  'Oerlikon Gamblers':    { seasons: ['2013-14', '2014-15', '2015-16', '2016-17', '2017-18', '2018-19', '2019-20', '2020-21', '2021-22', '2022-23', '2023-24', '2024-25', '2025-26'], formerNames: ['Bern City Rangers', 'Elfenau Gamblers'] },
  'Galaxy Squad':         { seasons: ['2015-16', '2016-17', '2017-18', '2018-19', '2019-20', '2020-21', '2021-22', '2022-23', '2023-24', '2024-25', '2025-26'] },
  'Winnipeg Bulldozers':  { seasons: ['2015-16', '2016-17', '2017-18', '2018-19', '2019-20', '2020-21', '2021-22', '2022-23', '2023-24', '2024-25', '2025-26'] },
  'Dörfli Snipers':       { seasons: ['2016-17', '2017-18', '2018-19', '2019-20', '2020-21', '2021-22', '2022-23', '2023-24', '2024-25', '2025-26'] },
  'Eastside Grizzlies':   { seasons: ['2016-17', '2017-18', '2018-19', '2019-20', '2020-21', '2021-22', '2022-23', '2023-24', '2024-25', '2025-26'], formerNames: ['Eastside Grizzlys'] },
  'Pittsburgh Walruses':  { seasons: ['2016-17', '2017-18', '2018-19', '2019-20', '2020-21', '2021-22', '2022-23', '2023-24', '2024-25', '2025-26'] },
  'Täuffelen Phantoms':   { seasons: ['2016-17', '2017-18', '2018-19', '2019-20', '2020-21', '2021-22', '2022-23', '2023-24', '2024-25', '2025-26'] },
  'Lyss Falcons':         { seasons: ['2016-17', '2017-18', '2018-19', '2019-20', '2020-21', '2021-22', '2022-23', '2023-24', '2024-25', '2025-26'] },

  // Departed — teams that had at least one real season but no longer compete.
  'Boston Bumblebees':   { seasons: ['2013-14', '2014-15'] },
  'Biel-Bienne Trouts':  { seasons: ['2012-13', '2013-14'] },
  'Biel Sumo Hookers':   { seasons: ['2013-14', '2014-15'] },
  'Blackbears':          { seasons: ['2013-14', '2014-15'], formerNames: ['UMaine Blackbears'] },
  'Orange County Bluths': { seasons: ['2013-14', '2014-15'] },
  'Warm Wool Socks':     { seasons: ['2014-15', '2015-16'] },
  'Old Boys Bears':      { seasons: ['2015-16'] },
  'Felztown Tigers':     { seasons: ['2015-16'] },

  // Pre-season only — included for history/timeline, hidden from the directory.
  'Schlieren Flyers':    { seasons: ['2012-13'] },
  "Rock'n'Rollas":       { seasons: ['2012-13'] },
  'Spinning Doctors':    { seasons: ['2012-13'] },
  'Fighting Monkeys':    { seasons: ['2012-13'] },
  'UMaine Blackbears':   { seasons: ['2012-13'] },
  'Mountain Lions':      { seasons: ['2012-13'] },
};

// The five franchises whose lineage traces unbroken to the 2013-14 inaugural
// season. Used by /history for the pentagon badge and by /teams for the
// sweater-stripe marker on each Original 5 plaque.
export const ORIGINAL_5 = [
  'Stonemere Flyers',
  'Drunken Monkeys',
  'Slithering Goons',
  'Illinois Ice Cracker',
  'Oerlikon Gamblers',
];

export function isActiveFranchise(name: string): boolean {
  return TEAM_TIMELINES[name]?.seasons.includes(ACTIVE_SEASON) ?? false;
}

export function firstSeasonOf(name: string): string | null {
  const t = TEAM_TIMELINES[name];
  return t && t.seasons.length > 0 ? t.seasons[0] : null;
}

export function lastSeasonOf(name: string): string | null {
  const t = TEAM_TIMELINES[name];
  return t && t.seasons.length > 0 ? t.seasons[t.seasons.length - 1] : null;
}
