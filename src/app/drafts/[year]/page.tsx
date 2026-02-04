import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { db, draftPicks, members } from '@/lib/db';
import { eq, asc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

function ChevronLeftIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
    </svg>
  );
}

function ArrowRightIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
    </svg>
  );
}

async function getDraftPicks(year: string) {
  try {
    const picks = await db
      .select()
      .from(draftPicks)
      .where(eq(draftPicks.year, year))
      .orderBy(asc(draftPicks.round), asc(draftPicks.pick));

    return picks;
  } catch {
    return [];
  }
}

async function getTeamLogos() {
  try {
    const teams = await db.select({ id: members.id, logo: members.logo }).from(members);
    const logoMap = new Map<number, string>();
    for (const team of teams) {
      if (team.logo) {
        logoMap.set(team.id, team.logo);
      }
    }
    return logoMap;
  } catch {
    return new Map<number, string>();
  }
}

async function getAdjacentYears(year: string) {
  try {
    const allYears = await db
      .selectDistinct({ year: draftPicks.year })
      .from(draftPicks)
      .orderBy(asc(draftPicks.year));

    const years = allYears.map(y => y.year);
    const currentIndex = years.indexOf(year);

    return {
      prev: currentIndex > 0 ? years[currentIndex - 1] : null,
      next: currentIndex < years.length - 1 ? years[currentIndex + 1] : null,
    };
  } catch {
    return { prev: null, next: null };
  }
}

export default async function DraftYearPage({ params }: { params: Promise<{ year: string }> }) {
  const { year } = await params;

  const [picks, teamLogos, adjacentYears] = await Promise.all([
    getDraftPicks(year),
    getTeamLogos(),
    getAdjacentYears(year),
  ]);

  if (picks.length === 0) {
    notFound();
  }

  const round1 = picks.filter(p => p.round === 1).sort((a, b) => a.pick - b.pick);
  const round2 = picks.filter(p => p.round === 2).sort((a, b) => a.pick - b.pick);

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      {/* Navigation */}
      <div className="flex items-center justify-between mb-8">
        <Link
          href="/drafts"
          className="flex items-center gap-2 text-lake-ice/60 hover:text-lake-gold transition-colors"
        >
          <ChevronLeftIcon className="w-4 h-4" />
          <span>All Drafts</span>
        </Link>

        <div className="flex items-center gap-4">
          {adjacentYears.prev && (
            <Link
              href={`/drafts/${adjacentYears.prev}`}
              className="text-lake-ice/60 hover:text-lake-gold transition-colors"
            >
              ← {adjacentYears.prev}
            </Link>
          )}
          {adjacentYears.next && (
            <Link
              href={`/drafts/${adjacentYears.next}`}
              className="text-lake-ice/60 hover:text-lake-gold transition-colors"
            >
              {adjacentYears.next} →
            </Link>
          )}
        </div>
      </div>

      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold text-lake-gold mb-2">{year} Draft</h1>
        <p className="text-lake-ice/60">
          {picks.length} prospects selected
        </p>
      </div>

      {/* Round 1 */}
      <div className="mb-12">
        <h2 className="text-xl font-bold text-lake-ice mb-4 pb-2 border-b border-lake-blue-light/20">
          Round 1
        </h2>
        <div className="space-y-2">
          {round1.map((pick) => {
            const teamLogo = pick.teamId ? teamLogos.get(pick.teamId) : undefined;

            return (
              <div
                key={`${pick.round}-${pick.pick}`}
                className="flex items-center gap-4 bg-lake-blue/20 rounded-lg p-3 hover:bg-lake-blue/30 transition-colors"
              >
                {/* Pick number */}
                <div className="w-10 h-10 rounded-full bg-lake-gold/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-lake-gold font-bold">{pick.pick}</span>
                </div>

                {/* Team logo */}
                <div className="w-10 h-10 flex-shrink-0">
                  {teamLogo ? (
                    <Image
                      src={`/images/teams/${teamLogo}`}
                      alt={pick.teamName}
                      width={40}
                      height={40}
                      className="rounded-full"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-lake-blue-light/20 flex items-center justify-center">
                      <span className="text-lake-ice/30 text-xs">?</span>
                    </div>
                  )}
                </div>

                {/* Team name & trade info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {pick.teamId ? (
                      <Link href={`/teams/${pick.teamId}`} className="text-lake-ice font-medium truncate hover:text-lake-gold transition-colors">
                        {pick.teamName}
                      </Link>
                    ) : (
                      <span className="text-lake-ice font-medium truncate">{pick.teamName}</span>
                    )}
                    {pick.fromTeamName && (
                      <span className="text-lake-ice/40 text-sm truncate">
                        (from {pick.fromTeamId ? (
                          <Link href={`/teams/${pick.fromTeamId}`} className="hover:text-lake-gold transition-colors">
                            {pick.fromTeamName}
                          </Link>
                        ) : pick.fromTeamName})
                      </span>
                    )}
                  </div>
                </div>

                {/* Player name */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-lake-ice font-semibold">{pick.playerName}</span>
                  {pick.tradedToTeamName && (
                    <>
                      <ArrowRightIcon className="w-4 h-4 text-lake-ice/40" />
                      {pick.tradedToTeamId ? (
                        <Link href={`/teams/${pick.tradedToTeamId}`} className="text-lake-ice/60 text-sm hover:text-lake-gold transition-colors">
                          {pick.tradedToTeamName}
                        </Link>
                      ) : (
                        <span className="text-lake-ice/60 text-sm">{pick.tradedToTeamName}</span>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Round 2 */}
      <div>
        <h2 className="text-xl font-bold text-lake-ice mb-4 pb-2 border-b border-lake-blue-light/20">
          Round 2
        </h2>
        <div className="space-y-2">
          {round2.map((pick) => {
            const teamLogo = pick.teamId ? teamLogos.get(pick.teamId) : undefined;

            return (
              <div
                key={`${pick.round}-${pick.pick}`}
                className="flex items-center gap-4 bg-lake-blue/20 rounded-lg p-3 hover:bg-lake-blue/30 transition-colors"
              >
                {/* Pick number */}
                <div className="w-10 h-10 rounded-full bg-lake-blue-light/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-lake-ice/70 font-bold">{pick.pick}</span>
                </div>

                {/* Team logo */}
                <div className="w-10 h-10 flex-shrink-0">
                  {teamLogo ? (
                    <Image
                      src={`/images/teams/${teamLogo}`}
                      alt={pick.teamName}
                      width={40}
                      height={40}
                      className="rounded-full"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-lake-blue-light/20 flex items-center justify-center">
                      <span className="text-lake-ice/30 text-xs">?</span>
                    </div>
                  )}
                </div>

                {/* Team name & trade info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {pick.teamId ? (
                      <Link href={`/teams/${pick.teamId}`} className="text-lake-ice font-medium truncate hover:text-lake-gold transition-colors">
                        {pick.teamName}
                      </Link>
                    ) : (
                      <span className="text-lake-ice font-medium truncate">{pick.teamName}</span>
                    )}
                    {pick.fromTeamName && (
                      <span className="text-lake-ice/40 text-sm truncate">
                        (from {pick.fromTeamId ? (
                          <Link href={`/teams/${pick.fromTeamId}`} className="hover:text-lake-gold transition-colors">
                            {pick.fromTeamName}
                          </Link>
                        ) : pick.fromTeamName})
                      </span>
                    )}
                  </div>
                </div>

                {/* Player name */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-lake-ice font-semibold">{pick.playerName}</span>
                  {pick.tradedToTeamName && (
                    <>
                      <ArrowRightIcon className="w-4 h-4 text-lake-ice/40" />
                      {pick.tradedToTeamId ? (
                        <Link href={`/teams/${pick.tradedToTeamId}`} className="text-lake-ice/60 text-sm hover:text-lake-gold transition-colors">
                          {pick.tradedToTeamName}
                        </Link>
                      ) : (
                        <span className="text-lake-ice/60 text-sm">{pick.tradedToTeamName}</span>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
