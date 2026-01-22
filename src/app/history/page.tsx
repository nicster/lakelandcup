import Image from 'next/image';
import Link from 'next/link';
import { db, members } from '@/lib/db';

// History icon component
function HistoryIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

// Era definitions
const eras = [
  { name: 'Pre-Season', start: '2012-13', end: '2012-13', color: 'bg-lake-ice/10', description: 'Trial season' },
  { name: 'Founding Era', start: '2013-14', end: '2014-15', color: 'bg-amber-500/10', description: 'League established' },
  { name: 'Expansion', start: '2015-16', end: '2016-17', color: 'bg-green-500/10', description: '10 → 12 teams' },
  { name: 'Modern Era', start: '2017-18', end: '2024-25', color: 'bg-lake-blue-light/10', description: 'Stable 12-team league' },
];

// All seasons in order
const allSeasons = [
  '2012-13', '2013-14', '2014-15', '2015-16', '2016-17',
  '2017-18', '2018-19', '2019-20', '2020-21', '2021-22',
  '2022-23', '2023-24', '2024-25'
];

// Team timeline data (which seasons each team was active)
const teamTimelines: Record<string, { seasons: string[]; formerNames?: string[] }> = {
  'Stonemere Flyers': { seasons: ['2013-14', '2014-15', '2015-16', '2016-17', '2017-18', '2018-19', '2019-20', '2020-21', '2021-22', '2022-23', '2023-24', '2024-25'], formerNames: ['Schlieren Flyers'] },
  'Drunken Monkeys': { seasons: ['2013-14', '2014-15', '2015-16', '2016-17', '2017-18', '2018-19', '2019-20', '2020-21', '2021-22', '2022-23', '2023-24', '2024-25'], formerNames: ['Fighting Monkeys'] },
  'Slithering Goons': { seasons: ['2013-14', '2014-15', '2015-16', '2016-17', '2017-18', '2018-19', '2019-20', '2020-21', '2021-22', '2022-23', '2023-24', '2024-25'], formerNames: ['Spinning Doctors'] },
  'Illinois Ice Cracker': { seasons: ['2013-14', '2014-15', '2015-16', '2016-17', '2017-18', '2018-19', '2019-20', '2020-21', '2021-22', '2022-23', '2023-24', '2024-25'] },
  'Galaxy Squad': { seasons: ['2015-16', '2016-17', '2017-18', '2018-19', '2019-20', '2020-21', '2021-22', '2022-23', '2023-24', '2024-25'] },
  'Winnipeg Bulldozers': { seasons: ['2015-16', '2016-17', '2017-18', '2018-19', '2019-20', '2020-21', '2021-22', '2022-23', '2023-24', '2024-25'] },
  'Dörfli Snipers': { seasons: ['2016-17', '2017-18', '2018-19', '2019-20', '2020-21', '2021-22', '2022-23', '2023-24', '2024-25'] },
  'Eastside Grizzlies': { seasons: ['2016-17', '2017-18', '2018-19', '2019-20', '2020-21', '2021-22', '2022-23', '2023-24', '2024-25'], formerNames: ['Eastside Grizzlys'] },
  'Pittsburgh Walruses': { seasons: ['2016-17', '2017-18', '2018-19', '2019-20', '2020-21', '2021-22', '2022-23', '2023-24', '2024-25'] },
  'Täuffelen Phantoms': { seasons: ['2016-17', '2017-18', '2018-19', '2019-20', '2020-21', '2021-22', '2022-23', '2023-24', '2024-25'] },
  'Lyss Falcons': { seasons: ['2016-17', '2017-18', '2018-19', '2019-20', '2020-21', '2021-22', '2022-23', '2023-24', '2024-25'] },
  'Oerlikon Gamblers': { seasons: ['2020-21', '2021-22', '2022-23', '2023-24', '2024-25'], formerNames: ['Elfenau Gamblers'] },
  // Defunct teams
  'Bern City Rangers': { seasons: ['2013-14', '2014-15', '2015-16'] },
  'Boston Bumblebees': { seasons: ['2013-14', '2014-15'] },
  'Biel-Bienne Trouts': { seasons: ['2012-13', '2013-14'] },
  'Biel Sumo Hookers': { seasons: ['2013-14', '2014-15'] },
  'Blackbears': { seasons: ['2013-14', '2014-15'], formerNames: ['UMaine Blackbears'] },
  'Orange County Bluths': { seasons: ['2013-14', '2014-15'] },
  'Warm Wool Socks': { seasons: ['2014-15', '2015-16'] },
  'Old Boys Bears': { seasons: ['2015-16'] },
  'Felztown Tigers': { seasons: ['2015-16'] },
  'Elfenau Gamblers': { seasons: ['2016-17', '2017-18', '2018-19', '2019-20'] },
  // Pre-season only teams
  'Schlieren Flyers': { seasons: ['2012-13'] },
  "Rock'n'Rollas": { seasons: ['2012-13'] },
  'Spinning Doctors': { seasons: ['2012-13'] },
  'Fighting Monkeys': { seasons: ['2012-13'] },
  'UMaine Blackbears': { seasons: ['2012-13'] },
  'Mountain Lions': { seasons: ['2012-13'] },
};

// The Original 4 - teams active since 2013-14 and still active today
const original4 = ['Stonemere Flyers', 'Drunken Monkeys', 'Slithering Goons', 'Illinois Ice Cracker'];

// Current teams (active in 2024-25)
const currentTeams = Object.entries(teamTimelines)
  .filter(([, data]) => data.seasons.includes('2024-25'))
  .map(([name]) => name)
  .sort((a, b) => {
    // Sort by first season (oldest first), then by name
    const aFirst = teamTimelines[a].seasons[0];
    const bFirst = teamTimelines[b].seasons[0];
    if (aFirst !== bFirst) return allSeasons.indexOf(aFirst) - allSeasons.indexOf(bFirst);
    return a.localeCompare(b);
  });

// Defunct teams
const defunctTeams = Object.entries(teamTimelines)
  .filter(([, data]) => !data.seasons.includes('2024-25'))
  .map(([name]) => name)
  .sort((a, b) => {
    // Sort by last season (most recent first)
    const aLast = teamTimelines[a].seasons[teamTimelines[a].seasons.length - 1];
    const bLast = teamTimelines[b].seasons[teamTimelines[b].seasons.length - 1];
    if (aLast !== bLast) return allSeasons.indexOf(bLast) - allSeasons.indexOf(aLast);
    return a.localeCompare(b);
  });

async function getMembers() {
  try {
    const results = await db.select().from(members);
    return results;
  } catch {
    return [];
  }
}

export default async function HistoryPage() {
  const memberData = await getMembers();

  // Create a map of team names to member data
  const memberMap = new Map(memberData.map(m => [m.name, m]));
  // Also map former names
  memberData.forEach(m => {
    if (m.formerName) {
      memberMap.set(m.formerName, m);
    }
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      {/* Page Header */}
      <div className="flex items-center gap-4 mb-10">
        <div className="flex-shrink-0 w-14 h-14 rounded-full bg-lake-blue-light/30 flex items-center justify-center">
          <HistoryIcon className="w-7 h-7 text-lake-gold" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-lake-ice">League History</h1>
          <p className="text-lake-ice/60 text-sm">
            12 seasons of fantasy hockey glory
          </p>
        </div>
      </div>

      {/* The Original 4 - Badge Style */}
      <div className="flex justify-center mb-10">
        <div className="relative w-80 h-80">
          {/* Outer ring */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-b from-lake-blue-dark to-lake-blue border-4 border-lake-gold/60 shadow-xl" />

          {/* Inner ring */}
          <div className="absolute inset-3 rounded-full border-2 border-lake-gold/40" />

          {/* Top text */}
          <div className="absolute top-7 left-0 right-0 text-center z-10">
            <span className="text-lake-gold font-bold text-xs tracking-[0.2em] uppercase">The Original</span>
          </div>

          {/* Center number */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lake-gold/20 text-8xl font-bold">4</span>
          </div>

          {/* Bottom text */}
          <div className="absolute bottom-7 left-0 right-0 text-center z-10">
            <span className="text-lake-gold/70 text-[10px] tracking-[0.15em] uppercase">Est. 2013</span>
          </div>

          {/* Logos in 2x2 grid - slightly spread */}
          <div className="absolute inset-0 flex items-center justify-center z-20">
            <div className="grid grid-cols-2 gap-[3.25rem]">
              {original4.map(teamName => {
                const member = memberMap.get(teamName);
                return (
                  <Link
                    key={teamName}
                    href={member ? `/teams/${member.id}` : '#'}
                    className="group"
                    title={teamName}
                  >
                    {member?.logo && (
                      <Image
                        src={`/images/teams/${member.logo}`}
                        alt={`${teamName} logo`}
                        width={72}
                        height={72}
                        className="rounded-full border-2 border-lake-gold/40 group-hover:border-lake-gold group-hover:scale-110 transition-all shadow-lg bg-lake-blue-dark"
                      />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Team Timeline Chart */}
      <div className="bg-lake-blue/20 rounded-lg border border-lake-blue-light/20 p-6 mb-8">
        <h2 className="text-lg font-semibold text-lake-ice mb-6">Active Franchises</h2>

        {/* Era Row - aligned with seasons */}
        <div className="flex mb-4">
          <div className="w-48 flex-shrink-0 text-lake-ice/50 text-xs font-medium pr-4">Era</div>
          <div className="flex-1 flex">
            {allSeasons.map(season => {
              const era = eras.find(e => {
                const startIdx = allSeasons.indexOf(e.start);
                const endIdx = allSeasons.indexOf(e.end);
                const seasonIdx = allSeasons.indexOf(season);
                return seasonIdx >= startIdx && seasonIdx <= endIdx;
              });
              const isEraStart = era && era.start === season;

              return (
                <div
                  key={season}
                  className={`flex-1 h-8 flex items-center justify-center mx-px rounded-sm ${era?.color || 'bg-lake-blue/20'} border-l ${isEraStart ? 'border-lake-ice/20' : 'border-transparent'}`}
                  title={era ? `${era.name}: ${era.description}` : ''}
                >
                  {isEraStart && (
                    <span className="text-lake-ice/70 text-[10px] font-medium truncate px-1">
                      {era.name}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Season Headers */}
        <div className="flex mb-2">
          <div className="w-48 flex-shrink-0"></div>
          <div className="flex-1 flex">
            {allSeasons.map(season => (
              <div
                key={season}
                className="flex-1 text-center text-lake-ice/40 text-xs font-mono"
              >
                {season.split('-')[0].slice(2)}
              </div>
            ))}
          </div>
        </div>

        {/* Team Rows */}
        <div className="space-y-1">
          {currentTeams.map(teamName => {
            const member = memberMap.get(teamName);
            const isOriginal4 = original4.includes(teamName);
            const timeline = teamTimelines[teamName];

            return (
              <div key={teamName} className="flex items-center">
                {/* Team Name */}
                <div className="w-48 flex-shrink-0 flex items-center gap-2 pr-4">
                  {member?.logo && (
                    <Image
                      src={`/images/teams/${member.logo}`}
                      alt={`${teamName} logo`}
                      width={24}
                      height={24}
                      className="rounded-full flex-shrink-0"
                    />
                  )}
                  <Link
                    href={member ? `/teams/${member.id}` : '#'}
                    className="text-lake-ice text-sm truncate hover:text-lake-gold transition-colors"
                  >
                    {teamName}
                  </Link>
                </div>

                {/* Timeline Bar */}
                <div className="flex-1 flex h-6">
                  {allSeasons.map(season => {
                    const isActive = timeline.seasons.includes(season);

                    return (
                      <div
                        key={season}
                        className={`flex-1 mx-px rounded-sm ${
                          isActive
                            ? isOriginal4
                              ? 'bg-lake-gold/60'
                              : 'bg-lake-blue-light/60'
                            : 'bg-lake-blue/20'
                        }`}
                        title={isActive ? `${teamName} - ${season}` : ''}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Defunct Teams */}
      <div className="bg-lake-blue/10 rounded-lg border border-lake-blue-light/10 p-6">
        <h2 className="text-lg font-semibold text-lake-ice/60 mb-6">Former Franchises</h2>

        {/* Season Headers */}
        <div className="flex mb-2">
          <div className="w-48 flex-shrink-0"></div>
          <div className="flex-1 flex">
            {allSeasons.map(season => (
              <div
                key={season}
                className="flex-1 text-center text-lake-ice/30 text-xs font-mono"
              >
                {season.split('-')[0].slice(2)}
              </div>
            ))}
          </div>
        </div>

        {/* Team Rows */}
        <div className="space-y-1">
          {defunctTeams.map(teamName => {
            const member = memberMap.get(teamName);
            const timeline = teamTimelines[teamName];

            return (
              <div key={teamName} className="flex items-center opacity-60">
                {/* Team Name */}
                <div className="w-48 flex-shrink-0 flex items-center gap-2 pr-4">
                  {member?.logo && (
                    <Image
                      src={`/images/teams/${member.logo}`}
                      alt={`${teamName} logo`}
                      width={24}
                      height={24}
                      className="rounded-full flex-shrink-0 grayscale"
                    />
                  )}
                  <span className="text-lake-ice/60 text-sm truncate">
                    {teamName}
                  </span>
                </div>

                {/* Timeline Bar */}
                <div className="flex-1 flex h-5">
                  {allSeasons.map(season => {
                    const isActive = timeline.seasons.includes(season);

                    return (
                      <div
                        key={season}
                        className={`flex-1 mx-px rounded-sm ${
                          isActive
                            ? 'bg-lake-ice/30'
                            : 'bg-lake-blue/10'
                        }`}
                        title={isActive ? `${teamName} - ${season}` : ''}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Stats Summary */}
      <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
        <div className="bg-lake-blue/20 rounded-lg border border-lake-blue-light/20 p-4">
          <div className="text-2xl font-bold text-lake-gold">13</div>
          <div className="text-lake-ice/60 text-sm">Seasons</div>
        </div>
        <div className="bg-lake-blue/20 rounded-lg border border-lake-blue-light/20 p-4">
          <div className="text-2xl font-bold text-lake-gold">12</div>
          <div className="text-lake-ice/60 text-sm">Current Teams</div>
        </div>
        <div className="bg-lake-blue/20 rounded-lg border border-lake-blue-light/20 p-4">
          <div className="text-2xl font-bold text-lake-gold">{defunctTeams.length}</div>
          <div className="text-lake-ice/60 text-sm">Former Teams</div>
        </div>
        <div className="bg-lake-blue/20 rounded-lg border border-lake-blue-light/20 p-4">
          <div className="text-2xl font-bold text-lake-gold">4</div>
          <div className="text-lake-ice/60 text-sm">Original Franchises</div>
        </div>
      </div>
    </div>
  );
}
