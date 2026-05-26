import Image from 'next/image';
import Link from 'next/link';
import { db, seasons, members } from '@/lib/db';
import { desc, eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { LakeCupIcon } from '@/components/icons/HockeyIcons';

// Revalidate hourly — champions update at most once per season.
export const revalidate = 3600;

async function getSeasons() {
  try {
    const champion = alias(members, 'champion');
    const runnerUp = alias(members, 'runner_up');

    const results = await db
      .select({
        id: seasons.id,
        year: seasons.year,
        notes: seasons.notes,
        finalResult: seasons.finalResult,
        champion: {
          id: champion.id,
          name: champion.name,
          owner: champion.owner,
          formerName: champion.formerName,
          logo: champion.logo,
        },
        runnerUp: {
          id: runnerUp.id,
          name: runnerUp.name,
          owner: runnerUp.owner,
          logo: runnerUp.logo,
        },
      })
      .from(seasons)
      .leftJoin(champion, eq(seasons.championId, champion.id))
      .leftJoin(runnerUp, eq(seasons.runnerUpId, runnerUp.id))
      .orderBy(desc(seasons.year));

    return results;
  } catch {
    // Database not yet initialized
    return [];
  }
}

export default async function HallOfFamePage() {
  const seasonData = await getSeasons();

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      {/* Page Header */}
      <header className="mb-10">
        <p className="text-[clamp(0.7rem,0.65rem+0.2vw,0.85rem)] uppercase tracking-[0.25em] text-lake-gold mb-3">Champions</p>
        <h1 className="text-[clamp(1.875rem,1.4rem+1.5vw,2.5rem)] font-bold text-lake-ice tracking-tight leading-tight">Hall of Fame</h1>
        <p className="text-[clamp(1rem,0.92rem+0.25vw,1.125rem)] text-lake-ice-muted mt-2 max-w-xl">
          Celebrating the champions of the Lakeland Cup.
        </p>
        <div className="w-12 h-0.5 bg-lake-gold mt-6" />
      </header>

      {/* Champions List */}
      {seasonData.length === 0 ? (
        <div className="text-center py-16 bg-lake-blue/20 rounded-lg border border-lake-blue-light/20">
          <LakeCupIcon className="w-12 h-12 text-lake-ice-muted mx-auto mb-4" />
          <p className="text-lake-ice-muted mb-2">No seasons recorded yet</p>
          <p className="text-lake-ice-muted text-sm">
            Check back once the commissioner adds historical data.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {seasonData.map((season, index) => (
            <div
              key={season.id}
              className={`rounded-lg border p-6 transition-colors ${
                index === 0
                  ? 'bg-gradient-to-b from-lake-blue/45 to-lake-blue/20 border-lake-gold/40 shadow-lg shadow-lake-blue-darkest/40 hover:from-lake-blue/55'
                  : 'bg-lake-blue/30 border-lake-blue-light/20 hover:bg-lake-blue/40'
              }`}
            >
              {/* Season Header */}
              <div className="flex items-center gap-3 mb-4">
                <span className="text-lake-gold font-semibold text-lg">
                  {season.year}
                </span>
                {index === 0 && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-lake-gold/20 text-lake-gold rounded-full">
                    Defending Champion
                  </span>
                )}
                {season.notes && (
                  <span className="text-lake-ice-muted text-sm ml-auto">
                    {season.notes}
                  </span>
                )}
              </div>

              {/* Matchup */}
              <div className="flex items-center justify-center gap-4">
                {/* Champion */}
                {season.champion && (
                  <Link
                    href={`/teams/${season.champion.id}`}
                    className="flex-1 flex items-center gap-3 p-3 rounded-lg bg-lake-gold/10 border border-lake-gold/30 hover:bg-lake-gold/20 transition-colors"
                  >
                    {season.champion.logo && (
                      <Image
                        src={`/images/teams/${season.champion.logo}`}
                        alt={`${season.champion.name} logo`}
                        width={48}
                        height={48}
                        className="rounded-full border-2 border-lake-gold/50 flex-shrink-0"
                      />
                    )}
                    <div className="min-w-0 flex items-center gap-2">
                      <LakeCupIcon className="w-4 h-4 text-lake-gold flex-shrink-0" />
                      <p className="text-lake-ice font-semibold truncate">
                        {season.champion.name}
                      </p>
                    </div>
                  </Link>
                )}

                {/* Result */}
                <div className="flex-shrink-0 text-center">
                  {season.finalResult ? (
                    <span className="text-lake-ice font-bold text-lg">
                      {season.finalResult}
                    </span>
                  ) : (
                    <span className="text-lake-ice-muted font-medium text-sm">vs</span>
                  )}
                </div>

                {/* Runner Up */}
                {season.runnerUp && (
                  <Link
                    href={`/teams/${season.runnerUp.id}`}
                    className="flex-1 flex items-center gap-3 p-3 rounded-lg bg-lake-blue-light/10 border border-lake-blue-light/20 hover:bg-lake-blue-light/20 transition-colors"
                  >
                    {season.runnerUp.logo && (
                      <Image
                        src={`/images/teams/${season.runnerUp.logo}`}
                        alt={`${season.runnerUp.name} logo`}
                        width={48}
                        height={48}
                        className="rounded-full border-2 border-lake-blue-light/30 flex-shrink-0"
                      />
                    )}
                    <p className="text-lake-ice/70 font-medium truncate min-w-0">
                      {season.runnerUp.name}
                    </p>
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
