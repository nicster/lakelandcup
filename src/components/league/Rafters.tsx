'use client';

import { RetiredJersey } from './RetiredJersey';

interface FranchisePlayer {
  player: string;
  team: string;
  jerseyNumber: string | null;
  position: string;
  years: number;
  seasonStart: string;
  seasonEnd: string | null;
  teamColors: string[] | null;
}

interface RaftersProps {
  franchisePlayers: FranchisePlayer[];
  showTeamHeaders?: boolean;
}

export function Rafters({ franchisePlayers, showTeamHeaders = true }: RaftersProps) {
  // Group players by team
  const playersByTeam = franchisePlayers.reduce((acc, player) => {
    if (!acc[player.team]) {
      acc[player.team] = [];
    }
    acc[player.team].push(player);
    return acc;
  }, {} as Record<string, FranchisePlayer[]>);

  // Sort teams by number of franchise players (descending)
  const sortedTeams = Object.entries(playersByTeam).sort(
    ([, a], [, b]) => b.length - a.length
  );

  return (
    <div className="relative">
      {/* Arena ceiling/rafters background */}
      <div className="relative bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 rounded-lg">
        {/* Rafter beams */}
        <div className="absolute inset-0 opacity-20">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute h-2 bg-gradient-to-b from-gray-600 to-gray-700"
              style={{
                top: `${12 + i * 12}%`,
                left: 0,
                right: 0,
              }}
            />
          ))}
        </div>

        {/* Spotlights effect */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/50" />
        <div className="absolute top-0 left-1/4 w-1/2 h-32 bg-gradient-to-b from-yellow-500/10 to-transparent blur-2xl" />

        {/* Content */}
        <div className="relative p-6 md:p-8">
          {/* Teams and their retired jerseys */}
          <div className="space-y-10">
            {sortedTeams.map(([teamName, players]) => (
              <div key={teamName} className="relative">
                {/* Team divider beam - only show if showTeamHeaders is true */}
                {showTeamHeaders && (
                  <div className="flex items-center gap-4 mb-6">
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-600 to-transparent" />
                    <h3 className="text-gray-300 text-sm font-semibold uppercase tracking-widest whitespace-nowrap">
                      {teamName}
                    </h3>
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-600 to-transparent" />
                  </div>
                )}

                {/* Jerseys row */}
                <div className="flex flex-wrap justify-center gap-6 md:gap-8">
                  {players
                    .sort((a, b) => b.years - a.years)
                    .map((player) => (
                      <RetiredJersey
                        key={`${player.player}-${player.team}`}
                        playerName={player.player}
                        jerseyNumber={player.jerseyNumber}
                        seasonStart={player.seasonStart}
                        seasonEnd={player.seasonEnd}
                        teamColors={player.teamColors || []}
                      />
                    ))}
                </div>
              </div>
            ))}
          </div>

          {/* Stats footer - only show for multiple teams */}
          {showTeamHeaders && sortedTeams.length > 1 && (
            <div className="mt-10 pt-6 border-t border-gray-700/50 text-center">
              <div className="inline-flex items-center gap-6 text-sm">
                <div className="text-gray-400">
                  <span className="text-white font-bold text-lg">{franchisePlayers.length}</span>
                  {' '}Franchise Players
                </div>
                <div className="w-px h-4 bg-gray-600" />
                <div className="text-gray-400">
                  <span className="text-white font-bold text-lg">{sortedTeams.length}</span>
                  {' '}Teams Represented
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
