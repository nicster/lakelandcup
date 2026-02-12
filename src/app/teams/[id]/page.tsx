import Image from 'next/image';
import { notFound } from 'next/navigation';
import { db, members, seasons, franchisePlayers, draftPicks } from '@/lib/db';
import { eq, or, desc } from 'drizzle-orm';
import { Rafters } from '@/components/league/Rafters';

// Force dynamic rendering to fetch fresh data on each request
export const dynamic = 'force-dynamic';

// Trophy icons
function TrophyIcon({ place, className = '' }: { place: 1 | 2 | 3; className?: string }) {
  const colors = {
    1: 'text-yellow-400', // Gold
    2: 'text-gray-300',   // Silver
    3: 'text-amber-600',  // Bronze
  };

  return (
    <svg className={`${colors[place]} ${className}`} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2C9.5 2 7.5 4 7.5 6.5V7H5C3.9 7 3 7.9 3 9V10C3 12.2 4.8 14 7 14C7.2 14.9 7.6 15.7 8.2 16.3L7 17V19H17V17L15.8 16.3C16.4 15.7 16.8 14.9 17 14C19.2 14 21 12.2 21 10V9C21 7.9 20.1 7 19 7H16.5V6.5C16.5 4 14.5 2 12 2M5 9H7.5V11.8C6.1 11.4 5 10.3 5 9M16.5 11.8V9H19C19 10.3 17.9 11.4 16.5 11.8M9 20V21C9 21.6 9.4 22 10 22H14C14.6 22 15 21.6 15 21V20H9Z" />
    </svg>
  );
}

// Star icon for achievements
function StarIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
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
  } catch {
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
  } catch {
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
  } catch {
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
  } catch {
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
      {/* Team Header with Stars */}
      <div className="relative mb-12">
        {/* Achievement Stars - Top Right */}
        {(championships.length > 0 || runnerUps.length > 0) && (
          <div className="absolute top-0 right-0 flex flex-col items-center gap-1">
            {/* Gold stars for championships */}
            {championships.length > 0 && (
              <div className="flex gap-0.5">
                {championships.map((_, i) => (
                  <StarIcon key={`champ-${i}`} className="w-8 h-8 text-yellow-400 drop-shadow-lg" />
                ))}
              </div>
            )}
            {/* Silver stars for runner-ups */}
            {runnerUps.length > 0 && (
              <div className="flex gap-0.5">
                {runnerUps.map((_, i) => (
                  <StarIcon key={`runner-${i}`} className="w-5 h-5 text-gray-300 drop-shadow" />
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
              <span className="text-3xl text-lake-ice/30">?</span>
            </div>
          )}
          <h1 className="text-4xl font-bold text-lake-ice mb-2">{team.name}</h1>
          <p className="text-lake-ice/60">GM: {team.owner}</p>
          {team.formerName && (
            <p className="text-lake-ice/40 text-sm mt-1">
              Formerly known as {team.formerName}
            </p>
          )}
        </div>
      </div>

      {/* Trophy Case */}
      <div className="bg-lake-blue/30 rounded-lg border border-lake-blue-light/20 p-8 mb-8">
        <h2 className="text-2xl font-bold text-lake-ice mb-6">Trophy Case</h2>

        {championships.length === 0 && runnerUps.length === 0 ? (
          <p className="text-lake-ice/50 text-center py-8">No trophies yet. The hunt continues!</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Championships (Gold) */}
            {championships.length > 0 && (
              <div className="bg-yellow-400/10 rounded-lg border border-yellow-400/30 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <TrophyIcon place={1} className="w-8 h-8" />
                  <h3 className="text-xl font-semibold text-yellow-400">
                    Championships
                  </h3>
                </div>
                <div className="space-y-2">
                  {championships.map((season) => (
                    <div key={season.year} className="flex items-center justify-between">
                      <span className="text-lake-ice font-medium">{season.year}</span>
                      {season.finalResult && (
                        <span className="text-lake-ice/50 text-sm">{season.finalResult}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Runner-ups (Silver) */}
            {runnerUps.length > 0 && (
              <div className="bg-gray-300/10 rounded-lg border border-gray-300/30 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <TrophyIcon place={2} className="w-8 h-8" />
                  <h3 className="text-xl font-semibold text-gray-300">
                    Runner-ups
                  </h3>
                </div>
                <div className="space-y-2">
                  {runnerUps.map((season) => (
                    <div key={season.year} className="flex items-center justify-between">
                      <span className="text-lake-ice/70">{season.year}</span>
                      {season.finalResult && (
                        <span className="text-lake-ice/40 text-sm">{season.finalResult}</span>
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
          <p className="text-lake-ice/50 text-center py-8">No protected prospects</p>
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
                      ? 'bg-yellow-500/10 border border-yellow-500/30'
                      : 'bg-lake-blue-light/10'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lake-ice font-medium">
                      {prospect.playerName}
                    </span>
                    {prospect.isGoalie && (
                      <span className="px-1.5 py-0.5 text-xs font-medium bg-purple-500/20 text-purple-300 rounded">
                        G
                      </span>
                    )}
                    <span className="text-lake-ice/40 text-sm">
                      {prospect.draftYear} R{prospect.round}
                    </span>
                  </div>
                  <span className={`text-sm ${
                    isExpiringSoon ? 'text-yellow-400' : 'text-lake-ice/60'
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
