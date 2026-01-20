import Image from 'next/image';
import Link from 'next/link';
import { db, seasons, members } from '@/lib/db';
import { desc, eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

// Trophy icon component
function TrophyIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0" />
    </svg>
  );
}

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
    <div className="max-w-4xl mx-auto px-4 py-12">
      {/* Page Header */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-lake-gold/20 mb-4">
          <TrophyIcon className="w-8 h-8 text-lake-gold" />
        </div>
        <h1 className="text-3xl font-bold text-lake-ice mb-2">Hall of Fame</h1>
        <p className="text-lake-ice/60">
          Celebrating the champions of the Lakeland Cup
        </p>
      </div>

      {/* Champions List */}
      {seasonData.length === 0 ? (
        <div className="text-center py-16 bg-lake-blue/20 rounded-lg border border-lake-blue-light/20">
          <TrophyIcon className="w-12 h-12 text-lake-ice/30 mx-auto mb-4" />
          <p className="text-lake-ice/50 mb-2">No seasons recorded yet</p>
          <p className="text-lake-ice/30 text-sm">
            Check back once the commissioner adds historical data.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {seasonData.map((season, index) => (
            <div
              key={season.id}
              className="bg-lake-blue/30 rounded-lg border border-lake-blue-light/20 p-6 hover:bg-lake-blue/40 transition-colors"
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
                  <span className="text-lake-ice/40 text-sm ml-auto">
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
                      <TrophyIcon className="w-4 h-4 text-lake-gold flex-shrink-0" />
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
                    <span className="text-lake-ice/30 font-medium text-sm">vs</span>
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
