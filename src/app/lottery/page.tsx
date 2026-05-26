'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FaceOffIcon, CrossedSticksIcon } from '@/components/icons/HockeyIcons';

interface Team {
  id: number;
  name: string;
  logo: string | null;
}

interface LotteryPick {
  pick: number;
  team: Team | null;
}

interface LotteryData {
  year: string;
  runAt: string;
  publishedAt: string;
  teams: {
    '9th': Team | null;
    '10th': Team | null;
    '11th': Team | null;
    '12th': Team | null;
  };
  picks: LotteryPick[];
}

// Lottery odds based on standing position
const LOTTERY_ODDS: Record<string, number> = {
  '12th': 50,
  '11th': 25,
  '10th': 15,
  '9th': 10,
};

export default function LotteryPage() {
  const [lotteryData, setLotteryData] = useState<LotteryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRevealing, setIsRevealing] = useState(false);
  const [revealedPicks, setRevealedPicks] = useState<Set<number>>(new Set());
  const [currentReveal, setCurrentReveal] = useState<number | null>(null);
  const [hasWatched, setHasWatched] = useState(false);

  useEffect(() => {
    async function fetchLottery() {
      try {
        const response = await fetch('/api/lottery');
        if (response.ok) {
          const data = await response.json();
          if (data.results && data.results.length > 0) {
            setLotteryData(data.results[0]); // Latest lottery
          }
        }
      } catch (error) {
        console.error('Failed to fetch lottery:', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchLottery();
  }, []);

  const startReveal = () => {
    if (!lotteryData || isRevealing) return;

    setIsRevealing(true);
    setRevealedPicks(new Set());
    setHasWatched(true);

    // Reveal order: 4th, 3rd, then 2nd+1st simultaneously
    const revealOrder = [4, 3]; // 2nd and 1st are revealed together at the end
    let revealIndex = 0;

    const revealNext = () => {
      if (revealIndex >= revealOrder.length) {
        // Final reveal: 2nd and 1st together
        setCurrentReveal(2); // Show anticipation for both
        setTimeout(() => {
          setRevealedPicks(prev => new Set([...Array.from(prev), 2, 1]));
          setCurrentReveal(null);
          setIsRevealing(false);
        }, 2500);
        return;
      }

      const pickToReveal = revealOrder[revealIndex];
      setCurrentReveal(pickToReveal);

      // Show anticipation for 2.5s, then reveal
      setTimeout(() => {
        setRevealedPicks(prev => new Set([...Array.from(prev), pickToReveal]));
        revealIndex++;
        // Pause before next reveal
        setTimeout(revealNext, 1500);
      }, 2500);
    };

    setTimeout(revealNext, 500);
  };

  const getTeamStanding = (teamId: number | undefined): string | null => {
    if (!teamId || !lotteryData) return null;
    for (const [standing, team] of Object.entries(lotteryData.teams)) {
      if (team?.id === teamId) return standing;
    }
    return null;
  };

  const getPickLabel = (pick: number) => {
    const labels: Record<number, string> = {
      1: '1st Overall',
      2: '2nd Overall',
      3: '3rd Overall',
      4: '4th Overall',
    };
    return labels[pick];
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-lake-ice/20 border-t-lake-gold rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!lotteryData) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center">
          <CrossedSticksIcon className="w-16 h-16 text-lake-ice/20 mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-lake-ice mb-2">No Lottery Results</h1>
          <p className="text-lake-ice-muted">
            The draft lottery results have not been published yet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="flex items-center justify-center gap-3 mb-4">
          <FaceOffIcon className="w-10 h-10 text-lake-gold" />
          <h1 className="text-3xl font-bold text-lake-ice">{lotteryData.year} Draft Lottery</h1>
        </div>
        <p className="text-lake-ice-muted">
          Determining picks 1-4 for non-playoff teams
        </p>
      </div>

      {/* Teams in Lottery */}
      <div className="bg-lake-blue/30 rounded-lg border border-lake-blue-light/20 p-6 mb-8">
        <h2 className="text-lg font-semibold text-lake-ice mb-4">Teams in the Lottery</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {(['12th', '11th', '10th', '9th'] as const).map((standing) => {
            const team = lotteryData.teams[standing];
            return (
              <div key={standing} className="text-center p-4 bg-lake-blue-dark/30 rounded-lg">
                <span className="text-lake-gold font-semibold">{standing} Place</span>
                <p className="text-lake-ice mt-1">{team?.name || 'TBD'}</p>
                <p className="text-lake-ice-muted text-sm">{LOTTERY_ODDS[standing]}% odds</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Watch Reveal Button */}
      {!isRevealing && !hasWatched && (
        <div className="text-center mb-8">
          <button
            onClick={startReveal}
            className="px-8 py-4 bg-lake-gold text-lake-blue-dark font-bold text-lg rounded-lg hover:bg-lake-gold/90 transition-all transform hover:scale-105 shadow-lg"
          >
            Watch the Lottery Reveal
          </button>
        </div>
      )}

      {/* Skip to Results */}
      {!isRevealing && !hasWatched && (
        <div className="text-center mb-8">
          <button
            onClick={() => {
              setRevealedPicks(new Set([1, 2, 3, 4]));
              setHasWatched(true);
            }}
            className="text-lake-ice-muted hover:text-lake-ice text-sm underline"
          >
            Skip to results
          </button>
        </div>
      )}

      {/* Results Display */}
      {(isRevealing || hasWatched) && (
        <div className="bg-lake-blue/30 rounded-lg border border-lake-blue-light/20 p-6">
          <h2 className="text-lg font-semibold text-lake-ice mb-6 text-center">
            {revealedPicks.size === 4 ? 'Draft Order' : 'Revealing...'}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[4, 3, 2, 1].map((pickNum) => {
              const pickData = lotteryData.picks.find(p => p.pick === pickNum);
              const team = pickData?.team;
              const standing = team ? getTeamStanding(team.id) : null;

              // For the final reveal, both 1st and 2nd animate together when currentReveal is 2
              const isCurrentlyRevealing = (currentReveal === pickNum || (currentReveal === 2 && pickNum === 1)) && !revealedPicks.has(pickNum);
              const isRevealed = revealedPicks.has(pickNum);

              return (
                <div
                  key={pickNum}
                  className={`relative overflow-hidden rounded-lg border-2 transition-all duration-500 ${
                    pickNum === 1
                      ? 'md:col-span-2 border-lake-gold bg-lake-gold/10'
                      : 'border-lake-blue-light/30 bg-lake-blue-dark/30'
                  } ${isCurrentlyRevealing ? 'lottery-anticipation' : ''}`}
                >
                  <div className="p-6">
                    <div className="text-center">
                      <span
                        className={`text-sm font-medium ${
                          pickNum === 1 ? 'text-lake-gold' : 'text-lake-ice-muted'
                        }`}
                      >
                        {getPickLabel(pickNum)}
                      </span>

                      {isCurrentlyRevealing && !isRevealed && (
                        <div className="mt-4">
                          <div className="h-16 overflow-hidden relative">
                            <div className="animate-lottery-spin">
                              {[...Array(10)].map((_, i) => {
                                const standings = ['9th', '10th', '11th', '12th'] as const;
                                const randomStanding = standings[Math.floor(Math.random() * standings.length)];
                                const randomTeam = lotteryData.teams[randomStanding];
                                return (
                                  <div
                                    key={i}
                                    className="h-16 flex items-center justify-center text-xl font-bold text-lake-ice"
                                  >
                                    {randomTeam?.name || '???'}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}

                      {isRevealed && team && (
                        <div className="mt-4 animate-reveal">
                          <Link
                            href={`/teams/${team.id}`}
                            className={`text-2xl font-bold hover:opacity-80 transition-opacity ${
                              pickNum === 1 ? 'text-lake-gold' : 'text-lake-ice'
                            }`}
                          >
                            {team.name}
                          </Link>
                          {standing && (
                            <p className="text-lake-ice-muted text-sm mt-1">
                              Finished {standing} ({LOTTERY_ODDS[standing]}% odds)
                            </p>
                          )}
                        </div>
                      )}

                      {!isCurrentlyRevealing && !isRevealed && (
                        <div className="mt-4 h-16 flex items-center justify-center">
                          <div className="w-8 h-8 border-2 border-lake-ice/20 border-t-lake-gold rounded-full animate-spin" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Replay Button */}
          {hasWatched && !isRevealing && (
            <div className="text-center mt-6">
              <button
                onClick={() => {
                  setHasWatched(false);
                  setRevealedPicks(new Set());
                }}
                className="text-lake-ice-muted hover:text-lake-ice text-sm"
              >
                Watch again
              </button>
            </div>
          )}
        </div>
      )}

      {/* CSS for custom animations */}
      <style jsx>{`
        @keyframes lottery-spin {
          0% {
            transform: translateY(0);
          }
          100% {
            transform: translateY(-640px);
          }
        }
        .animate-lottery-spin {
          animation: lottery-spin 2s ease-out forwards;
        }
        @keyframes reveal {
          0% {
            opacity: 0;
            transform: scale(0.8);
          }
          50% {
            transform: scale(1.1);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-reveal {
          animation: reveal 0.5s ease-out forwards;
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-lottery-spin,
          .animate-reveal {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
