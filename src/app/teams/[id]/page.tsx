import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db, members, seasons, franchisePlayers, draftPicks } from '@/lib/db';
import { eq, or, desc } from 'drizzle-orm';
import { Rafters } from '@/components/league/Rafters';
import { LakeCupIcon } from '@/components/icons/HockeyIcons';

export const dynamic = 'force-dynamic';

// Trophy with medal-tier color
function MedalTrophy({ place, className = '' }: { place: 1 | 2 | 3; className?: string }) {
  const colors = {
    1: 'text-lake-gold-bright',
    2: 'text-lake-silver',
    3: 'text-lake-bronze',
  };
  return <LakeCupIcon className={`${colors[place]} ${className}`} />;
}

// Star icon for achievements
function StarIcon({ className = '' }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

async function getTeam(id: number) {
  try {
    const team = await db
      .select()
      .from(members)
      .where(eq(members.id, id))
      .limit(1);

    return team[0] || null;
  } catch (err) { console.error("DB query failed:", err);
    return null;
  }
}

async function getTeamAchievements(teamId: number) {
  try {
    const results = await db
      .select({
        year: seasons.year,
        championId: seasons.championId,
        runnerUpId: seasons.runnerUpId,
        finalResult: seasons.finalResult,
      })
      .from(seasons)
      .where(
        or(
          eq(seasons.championId, teamId),
          eq(seasons.runnerUpId, teamId)
        )
      );

    const championships = results.filter(s => s.championId === teamId);
    const runnerUps = results.filter(s => s.runnerUpId === teamId);

    return { championships, runnerUps };
  } catch (err) { console.error("DB query failed:", err);
    return { championships: [], runnerUps: [] };
  }
}

async function getTeamFranchisePlayers(teamId: number, teamName: string) {
  try {
    const results = await db
      .select()
      .from(franchisePlayers)
      .where(
        or(
          eq(franchisePlayers.teamId, teamId),
          eq(franchisePlayers.teamName, teamName)
        )
      )
      .orderBy(desc(franchisePlayers.years));

    return results.map((fp) => ({
      player: fp.playerName,
      team: fp.teamName,
      jerseyNumber: fp.jerseyNumber,
      position: fp.position || 'F',
      years: fp.years,
      seasonStart: fp.seasonStart || '',
      seasonEnd: fp.seasonEnd || null,
      teamColors: fp.teamColors ? JSON.parse(fp.teamColors) : null,
    }));
  } catch (err) { console.error("DB query failed:", err);
    return [];
  }
}

// Known goalies - goalies get 5 years protection instead of 3
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

function isGoalie(playerName: string, position: string | null): boolean {
  if (position === 'G') return true;
  return KNOWN_GOALIES.has(playerName);
}

function calculateProtectionExpiry(draftYear: string, isGoaliePlayer: boolean): number {
  const year = parseInt(draftYear, 10);
  return year + (isGoaliePlayer ? 5 : 3);
}

async function getTeamProspects(teamId: number) {
  try {
    const currentYear = new Date().getFullYear();

    const results = await db
      .select()
      .from(draftPicks)
      .where(eq(draftPicks.teamId, teamId))
      .orderBy(desc(draftPicks.year), draftPicks.round, draftPicks.pick);

    // Filter to only protected prospects and calculate expiry
    // Skaters: 3 years, Goalies: 5 years
    const protectedProspects = results
      .filter(pick => {
        const isGoaliePlayer = isGoalie(pick.playerName, pick.position);
        const expiryYear = calculateProtectionExpiry(pick.year, isGoaliePlayer);
        return expiryYear >= currentYear;
      })
      .map(pick => {
        const isGoaliePlayer = isGoalie(pick.playerName, pick.position);
        return {
          id: pick.id,
          playerName: pick.playerName,
          draftYear: pick.year,
          round: pick.round,
          pick: pick.pick,
          isGoalie: isGoaliePlayer,
          protectionExpires: calculateProtectionExpiry(pick.year, isGoaliePlayer).toString(),
        };
      });

    return protectedProspects;
  } catch (err) { console.error("DB query failed:", err);
    return [];
  }
}

export default async function TeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const teamId = parseInt(id, 10);

  if (isNaN(teamId)) {
    notFound();
  }

  const team = await getTeam(teamId);

  if (!team) {
    notFound();
  }

  const [{ championships, runnerUps }, franchisePlayerData, teamProspects] = await Promise.all([
    getTeamAchievements(teamId),
    getTeamFranchisePlayers(teamId, team.name),
    getTeamProspects(teamId),
  ]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-8 text-sm text-lake-ice-muted">
        <ol className="flex flex-wrap items-center gap-2">
          <li><Link href="/" className="hover:text-lake-gold transition-colors">Home</Link></li>
          <li aria-hidden="true">·</li>
          <li><Link href="/hall-of-fame" className="hover:text-lake-gold transition-colors">Hall of Fame</Link></li>
          <li aria-hidden="true">·</li>
          <li><Link href="/history" className="hover:text-lake-gold transition-colors">History</Link></li>
          <li aria-hidden="true">·</li>
          <li className="text-lake-ice" aria-current="page">{team.name}</li>
        </ol>
      </nav>

      {/* Team Header with Stars */}
      <div className="relative mb-12">
        {/* Achievement Stars - Top Right */}
        {(championships.length > 0 || runnerUps.length > 0) && (
          <div className="absolute top-0 right-0 flex flex-col items-center gap-1">
            {/* Gold stars for championships */}
            {championships.length > 0 && (
              <div className="flex gap-0.5">
                {championships.map((_, i) => (
                  <StarIcon key={`champ-${i}`} className="w-8 h-8 text-lake-gold-bright drop-shadow-lg" />
                ))}
              </div>
            )}
            {/* Silver stars for runner-ups */}
            {runnerUps.length > 0 && (
              <div className="flex gap-0.5">
                {runnerUps.map((_, i) => (
                  <StarIcon key={`runner-${i}`} className="w-5 h-5 text-lake-silver drop-shadow" />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Team Info - Centered */}
        <div className="flex flex-col items-center text-center">
          {team.logo ? (
            <Image
              src={`/images/teams/${team.logo}`}
              alt={`${team.name} logo`}
              width={120}
              height={120}
              className="rounded-full border-3 border-lake-gold/50 mb-6"
            />
          ) : (
            <div className="w-[120px] h-[120px] rounded-full bg-lake-blue-light/20 flex items-center justify-center mb-6">
              <span className="text-3xl text-lake-ice-muted">?</span>
            </div>
          )}
          <h1 className="text-4xl font-bold text-lake-ice mb-2">{team.name}</h1>
          <p className="text-lake-ice-muted">GM: {team.owner}</p>
          {team.formerName && (
            <p className="text-lake-ice-muted text-sm mt-1">
              Formerly known as {team.formerName}
            </p>
          )}
        </div>
      </div>

      {/* Trophy Case — feature panel when the team has hardware */}
      <div
        className={`rounded-xl p-6 md:p-10 mb-8 ${
          championships.length > 0 || runnerUps.length > 0
            ? 'panel-feature'
            : 'bg-lake-blue/30 border border-lake-blue-light/20'
        }`}
      >
        <h2 className="text-2xl font-bold text-lake-ice mb-6">Trophy Case</h2>

        {championships.length === 0 && runnerUps.length === 0 ? (
          <p className="text-lake-ice-muted text-center py-8">No trophies yet. The hunt continues!</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Championships (Gold) */}
            {championships.length > 0 && (
              <div className="bg-lake-gold-bright/10 rounded-lg border border-lake-gold-bright/30 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <MedalTrophy place={1} className="w-8 h-8" />
                  <h3 className="text-xl font-semibold text-lake-gold-bright">
                    Championships
                  </h3>
                </div>
                <div className="space-y-2">
                  {championships.map((season) => (
                    <div key={season.year} className="flex items-center justify-between">
                      <span className="text-lake-ice font-medium">{season.year}</span>
                      {season.finalResult && (
                        <span className="text-lake-ice-muted text-sm">{season.finalResult}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Runner-ups (Silver) */}
            {runnerUps.length > 0 && (
              <div className="bg-lake-silver/10 rounded-lg border border-lake-silver/30 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <MedalTrophy place={2} className="w-8 h-8" />
                  <h3 className="text-xl font-semibold text-lake-silver">
                    Runner-ups
                  </h3>
                </div>
                <div className="space-y-2">
                  {runnerUps.map((season) => (
                    <div key={season.year} className="flex items-center justify-between">
                      <span className="text-lake-ice/70">{season.year}</span>
                      {season.finalResult && (
                        <span className="text-lake-ice-muted text-sm">{season.finalResult}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Franchise Players */}
      {franchisePlayerData.length > 0 && (
        <div className="mb-8">
          <Rafters
            franchisePlayers={franchisePlayerData}
            showTeamHeaders={false}
          />
        </div>
      )}

      {/* Prospects Section */}
      <div className="bg-lake-blue/30 rounded-lg border border-lake-blue-light/20 p-8">
        <h2 className="text-2xl font-bold text-lake-ice mb-6">Protected Prospects</h2>

        {teamProspects.length === 0 ? (
          <p className="text-lake-ice-muted text-center py-8">No protected prospects</p>
        ) : (
          <div className="space-y-2">
            {teamProspects.map((prospect) => {
              const currentYear = new Date().getFullYear();
              const expiryYear = parseInt(prospect.protectionExpires, 10);
              const isExpiringSoon = expiryYear === currentYear;

              return (
                <div
                  key={prospect.id}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    isExpiringSoon
                      ? 'bg-lake-warning/10 border border-lake-warning/30'
                      : 'bg-lake-blue-light/10'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lake-ice font-medium">
                      {prospect.playerName}
                    </span>
                    {prospect.isGoalie && (
                      <span className="px-1.5 py-0.5 text-xs font-medium bg-lake-goalie/20 text-lake-goalie rounded">
                        G
                      </span>
                    )}
                    <span className="text-lake-ice-muted text-sm">
                      {prospect.draftYear} R{prospect.round}
                    </span>
                  </div>
                  <span className={`text-sm ${
                    isExpiringSoon ? 'text-lake-warning' : 'text-lake-ice-muted'
                  }`}>
                    Until {prospect.protectionExpires}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
