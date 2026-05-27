import Image from 'next/image';
import Link from 'next/link';
import { db, members } from '@/lib/db';
import {
  TEAM_TIMELINES as teamTimelines,
  ALL_SEASONS as allSeasons,
  ORIGINAL_5 as original5,
} from '@/lib/franchises';

export const dynamic = 'force-dynamic';

// Era definitions. `color` tints the era row in the timeline; `swatch` is the
// brighter version used in the legend below the chart. Both must be full
// class names so Tailwind's JIT can pick them up at build time.
const eras = [
  { name: 'Pre-Season',   start: '2012-13', end: '2012-13', color: 'bg-lake-ice/10',         swatch: 'bg-lake-ice/50',         description: 'Trial season' },
  { name: 'Founding Era', start: '2013-14', end: '2014-15', color: 'bg-lake-gold/10',        swatch: 'bg-lake-gold/60',        description: 'League established' },
  { name: 'Expansion',    start: '2015-16', end: '2016-17', color: 'bg-lake-success/10',     swatch: 'bg-lake-success/60',     description: '10 → 12 teams' },
  { name: 'Modern Era',   start: '2017-18', end: '2025-26', color: 'bg-lake-blue-light/10',  swatch: 'bg-lake-blue-light/60',  description: 'Stable 12-team league' },
];


// Current teams (active in 2024-25)
const currentTeams = Object.entries(teamTimelines)
  .filter(([, data]) => data.seasons.includes('2025-26'))
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
  } catch (err) { console.error("DB query failed:", err);
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
      {/* Hero — Original 5 badge leads the page; title below */}
      <header className="flex flex-col items-center text-center mb-12">
        <div className="flex justify-center mb-8">
          <div className="relative w-80 h-80">
          {/* Outer ring */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-b from-lake-blue-dark to-lake-blue border-4 border-lake-gold/60 shadow-xl" />

          {/* Inner ring */}
          <div className="absolute inset-3 rounded-full border-2 border-lake-gold/40" />

          {/* Top text */}
          <div className="absolute top-7 left-0 right-0 text-center z-10">
            <span className="text-lake-gold font-bold text-xs tracking-[0.2em] uppercase">The Original 5</span>
          </div>

          {/* Center number */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lake-gold/20 text-8xl font-bold">5</span>
          </div>

          {/* Bottom text */}
          <div className="absolute bottom-7 left-0 right-0 text-center z-10">
            <span className="text-lake-gold/70 text-[10px] tracking-[0.15em] uppercase">Est. 2013</span>
          </div>

          {/* Logos in pentagon arrangement */}
          {original5.map((teamName, i) => {
            const member = memberMap.get(teamName);
            // Pentagon positions: top-left, top-center (higher), top-right, bottom-left, bottom-right
            const positions = [
              { top: '46%', left: '26%' },
              { top: '26.5%', left: '50%' },
              { top: '46%', left: '74%' },
              { top: '70.5%', left: '33%' },
              { top: '70.5%', left: '67%' },
            ];
            const pos = positions[i];
            return (
              <Link
                key={teamName}
                href={member ? `/teams/${member.id}` : '#'}
                className="group absolute z-20 -translate-x-1/2 -translate-y-1/2"
                style={{ top: pos.top, left: pos.left }}
                aria-label={teamName}
              >
                {member?.logo && (
                  <Image
                    src={`/images/teams/${member.logo}`}
                    alt={`${teamName} logo`}
                    width={60}
                    height={60}
                    className="rounded-full border-2 border-lake-gold/40 group-hover:border-lake-gold group-hover:scale-110 transition-all shadow-lg bg-lake-blue-dark"
                  />
                )}
              </Link>
            );
          })}
          </div>
        </div>
        <p className="text-[clamp(0.7rem,0.65rem+0.2vw,0.85rem)] uppercase tracking-[0.25em] text-lake-gold mb-3">Franchise Timeline</p>
        <h1 className="text-[clamp(1.875rem,1.4rem+1.5vw,2.5rem)] font-bold text-lake-ice tracking-tight leading-tight">League History</h1>
        <p className="text-[clamp(1rem,0.92rem+0.25vw,1.125rem)] text-lake-ice-muted mt-2 max-w-xl">
          Thirteen seasons of fantasy hockey glory.
        </p>
      </header>

      {/* Team Timeline Chart — feature panel (main content of this page) */}
      <div className="panel-feature p-4 md:p-8 mb-8">
        <h2 className="text-lg font-semibold text-lake-ice mb-4">Active Franchises</h2>

        {/* Era legend — above the chart so colors are explained before use */}
        <div className="mb-6 pb-4 border-b border-lake-blue-light/10 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          {eras.map(era => (
            <div key={era.name} className="flex items-start gap-2">
              <span className={`mt-0.5 w-3 h-3 rounded-sm flex-shrink-0 ${era.swatch}`} />
              <div className="min-w-0">
                <p className="text-lake-ice font-medium leading-tight">{era.name}</p>
                <p className="text-lake-ice-muted leading-tight">{era.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Era Row - aligned with seasons (hides label column on mobile) */}
        <div className="flex mb-4">
          <div className="hidden md:block md:w-48 flex-shrink-0 text-lake-ice-muted text-xs font-medium pr-4">Era</div>
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

        {/* Season Headers — desktop only. On mobile each team gets its own
            year axis below its bar so the labels stay adjacent to the data. */}
        <div className="hidden md:flex mb-2">
          <div className="md:w-48 flex-shrink-0"></div>
          <div className="flex-1 flex">
            {allSeasons.map(season => (
              <div
                key={season}
                className="flex-1 text-center text-lake-ice-muted text-xs font-mono"
              >
                {season.split('-')[0].slice(2)}
              </div>
            ))}
          </div>
        </div>

        {/* Team Rows — stacked on mobile, side-by-side on md+ */}
        <div className="space-y-4 md:space-y-1">
          {currentTeams.map(teamName => {
            const member = memberMap.get(teamName);
            const isOriginal5 = original5.includes(teamName);
            const timeline = teamTimelines[teamName];

            return (
              <div key={teamName} className="flex flex-col md:flex-row md:items-center">
                {/* Team Name */}
                <div className="flex items-center gap-2 mb-1 md:mb-0 md:w-48 md:flex-shrink-0 md:pr-4">
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

                {/* Timeline bar + per-row year axis (mobile only) */}
                <div className="flex flex-col flex-1">
                  <div className="flex h-6">
                    {allSeasons.map(season => {
                      const isActive = timeline.seasons.includes(season);

                      return (
                        <div
                          key={season}
                          className={`flex-1 mx-px rounded-sm ${
                            isActive
                              ? isOriginal5
                                ? 'bg-lake-gold/60'
                                : 'bg-lake-blue-light/60'
                              : 'bg-lake-blue/20'
                          }`}
                        />
                      );
                    })}
                  </div>
                  <div className="flex md:hidden mt-0.5">
                    {allSeasons.map(season => (
                      <div
                        key={season}
                        className="flex-1 text-center text-lake-ice-muted/80 text-[9px] font-mono mx-px tabular-nums"
                      >
                        {season.split('-')[0].slice(2)}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      </div>

      {/* Defunct Teams */}
      <div className="bg-lake-blue/10 rounded-lg border border-lake-blue-light/10 p-4 md:p-6">
        <h2 className="text-lg font-semibold text-lake-ice-muted mb-6">Former Franchises</h2>

        {/* Season Headers — desktop only; mobile gets per-row labels. */}
        <div className="hidden md:flex mb-2">
          <div className="md:w-48 flex-shrink-0"></div>
          <div className="flex-1 flex">
            {allSeasons.map(season => (
              <div
                key={season}
                className="flex-1 text-center text-lake-ice-muted text-xs font-mono"
              >
                {season.split('-')[0].slice(2)}
              </div>
            ))}
          </div>
        </div>

        {/* Team Rows — stacked on mobile, side-by-side on md+ */}
        <div className="space-y-4 md:space-y-1">
          {defunctTeams.map(teamName => {
            const member = memberMap.get(teamName);
            const timeline = teamTimelines[teamName];

            return (
              <div key={teamName} className="flex flex-col md:flex-row md:items-center opacity-60">
                {/* Team Name */}
                <div className="flex items-center gap-2 mb-1 md:mb-0 md:w-48 md:flex-shrink-0 md:pr-4">
                  {member?.logo && (
                    <Image
                      src={`/images/teams/${member.logo}`}
                      alt={`${teamName} logo`}
                      width={24}
                      height={24}
                      className="rounded-full flex-shrink-0 grayscale"
                    />
                  )}
                  <span className="text-lake-ice-muted text-sm truncate">
                    {teamName}
                  </span>
                </div>

                {/* Timeline bar + per-row year axis (mobile only) */}
                <div className="flex flex-col flex-1">
                  <div className="flex h-5">
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
                        />
                      );
                    })}
                  </div>
                  <div className="flex md:hidden mt-0.5">
                    {allSeasons.map(season => (
                      <div
                        key={season}
                        className="flex-1 text-center text-lake-ice-muted/80 text-[9px] font-mono mx-px tabular-nums"
                      >
                        {season.split('-')[0].slice(2)}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
