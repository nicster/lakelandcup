'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Team {
  id: number;
  name: string;
  logo: string | null;
}

interface LotteryTeam extends Team {
  standing: 9 | 10 | 11 | 12;
  odds: number;
}

interface LotteryResult {
  pick: number;
  team: LotteryTeam;
  revealed: boolean;
}

// Lottery odds based on standing position
const LOTTERY_ODDS: Record<number, number> = {
  12: 50, // 12th place: 50% for 1st overall
  11: 25, // 11th place: 25%
  10: 15, // 10th place: 15%
  9: 10,  // 9th place: 10%
};

export default function AdminLotteryPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeams, setSelectedTeams] = useState<Record<number, number | null>>({
    9: null,
    10: null,
    11: null,
    12: null,
  });
  const [draftYear, setDraftYear] = useState(new Date().getFullYear().toString());
  const [lotteryResults, setLotteryResults] = useState<LotteryResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentReveal, setCurrentReveal] = useState<number | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [existingYears, setExistingYears] = useState<Set<string>>(new Set());

  // Fetch active teams and existing lottery years on mount
  useEffect(() => {
    async function fetchData() {
      try {
        const [teamsRes, lotteriesRes] = await Promise.all([
          fetch('/api/teams?active=true'),
          fetch('/api/admin/lottery/all'),
        ]);

        if (teamsRes.ok) {
          const data = await teamsRes.json();
          setTeams(data);
        }

        if (lotteriesRes.ok) {
          const data = await lotteriesRes.json();
          setExistingYears(new Set(data.map((r: { year: string }) => r.year)));
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      }
    }
    fetchData();
  }, []);

  const handleTeamSelect = (standing: number, teamId: number | null) => {
    setSelectedTeams(prev => ({ ...prev, [standing]: teamId }));
    // Reset lottery if changing teams
    if (lotteryResults.length > 0) {
      setLotteryResults([]);
      setIsComplete(false);
      setCurrentReveal(null);
    }
  };

  const allTeamsSelected = Object.values(selectedTeams).every(id => id !== null);
  const uniqueTeamsSelected = new Set(Object.values(selectedTeams).filter(id => id !== null)).size === 4;
  const yearAlreadyExists = existingYears.has(draftYear);

  const runLottery = () => {
    if (!allTeamsSelected || !uniqueTeamsSelected) return;

    setIsRunning(true);
    setIsComplete(false);
    setSaveMessage(null);

    // Build lottery teams with odds
    const lotteryTeams: LotteryTeam[] = Object.entries(selectedTeams).map(([standing, teamId]) => {
      const team = teams.find(t => t.id === teamId)!;
      const standingNum = parseInt(standing) as 9 | 10 | 11 | 12;
      return {
        ...team,
        standing: standingNum,
        odds: LOTTERY_ODDS[standingNum],
      };
    });

    // Run the weighted lottery
    const results: LotteryResult[] = [];
    let remainingTeams = [...lotteryTeams];

    for (let pick = 1; pick <= 4; pick++) {
      // Calculate total odds for remaining teams
      const totalOdds = remainingTeams.reduce((sum, t) => sum + t.odds, 0);

      // Generate random number
      const random = Math.random() * totalOdds;

      // Select winner based on weighted odds
      let cumulative = 0;
      let winner: LotteryTeam | null = null;

      for (const team of remainingTeams) {
        cumulative += team.odds;
        if (random <= cumulative) {
          winner = team;
          break;
        }
      }

      if (winner) {
        results.push({ pick, team: winner, revealed: false });
        remainingTeams = remainingTeams.filter(t => t.id !== winner!.id);
      }
    }

    setLotteryResults(results);

    // Start reveal animation (4th pick first, then 3rd, then 2nd+1st simultaneously)
    const revealOrder = [4, 3]; // 2nd and 1st are revealed together at the end
    let revealIndex = 0;

    const revealNext = () => {
      if (revealIndex >= revealOrder.length) {
        // Final reveal: 2nd and 1st together
        setCurrentReveal(2); // Show anticipation for both
        setTimeout(() => {
          setLotteryResults(prev =>
            prev.map(r => (r.pick === 2 || r.pick === 1 ? { ...r, revealed: true } : r))
          );
          setCurrentReveal(null);
          setIsRunning(false);
          setIsComplete(true);
        }, 2500);
        return;
      }

      const pickToReveal = revealOrder[revealIndex];
      setCurrentReveal(pickToReveal);

      // Show anticipation animation for 2.5s, then reveal
      setTimeout(() => {
        setLotteryResults(prev =>
          prev.map(r => (r.pick === pickToReveal ? { ...r, revealed: true } : r))
        );
        revealIndex++;
        // Pause before next reveal
        setTimeout(revealNext, 1500);
      }, 2500);
    };

    // Start reveals after a short delay
    setTimeout(revealNext, 500);
  };

  const saveLotteryResults = async (publish: boolean) => {
    if (!isComplete || lotteryResults.length !== 4) return;

    setIsSaving(true);
    setSaveMessage(null);

    try {
      const response = await fetch('/api/admin/lottery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year: draftYear,
          team9thId: selectedTeams[9],
          team10thId: selectedTeams[10],
          team11thId: selectedTeams[11],
          team12thId: selectedTeams[12],
          pick1TeamId: lotteryResults.find(r => r.pick === 1)?.team.id,
          pick2TeamId: lotteryResults.find(r => r.pick === 2)?.team.id,
          pick3TeamId: lotteryResults.find(r => r.pick === 3)?.team.id,
          pick4TeamId: lotteryResults.find(r => r.pick === 4)?.team.id,
          isPublished: publish,
        }),
      });

      if (response.ok) {
        setSaveMessage({
          type: 'success',
          text: publish ? 'Lottery results published!' : 'Lottery results saved as draft.',
        });
        // Add the year to existing years
        setExistingYears(prev => new Set([...prev, draftYear]));
      } else {
        const error = await response.json();
        setSaveMessage({ type: 'error', text: error.message || 'Failed to save results.' });
      }
    } catch (error) {
      console.error('Save failed:', error);
      setSaveMessage({ type: 'error', text: 'Failed to save results.' });
    } finally {
      setIsSaving(false);
    }
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

  const getAvailableTeams = (currentStanding: number) => {
    const usedTeamIds = Object.entries(selectedTeams)
      .filter(([standing]) => parseInt(standing) !== currentStanding)
      .map(([, id]) => id)
      .filter(id => id !== null);
    return teams.filter(t => !usedTeamIds.includes(t.id));
  };

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-lake-ice">Draft Lottery</h1>
          <p className="text-lake-ice/60 mt-1">
            Run the weighted lottery for the top 4 draft picks
          </p>
        </div>
        <Link
          href="/admin/lottery/results"
          className="px-4 py-2 bg-lake-blue-light/30 text-lake-ice rounded-lg hover:bg-lake-blue-light/50 transition-colors"
        >
          View All Results
        </Link>
      </div>

      {/* Draft Year */}
      <div className="bg-lake-blue/30 rounded-lg border border-lake-blue-light/20 p-6 mb-6">
        <label className="block text-sm font-medium text-lake-ice/70 mb-2">
          Draft Year
        </label>
        <input
          type="text"
          value={draftYear}
          onChange={(e) => {
            setDraftYear(e.target.value);
            // Reset lottery state when year changes
            if (lotteryResults.length > 0) {
              setLotteryResults([]);
              setIsComplete(false);
              setCurrentReveal(null);
            }
          }}
          className={`w-32 px-3 py-2 bg-lake-blue-dark/50 border rounded-lg text-lake-ice focus:outline-none focus:border-lake-gold/50 ${
            yearAlreadyExists ? 'border-yellow-500/50' : 'border-lake-blue-light/30'
          }`}
          placeholder="2025"
        />
        {yearAlreadyExists && (
          <p className="mt-2 text-yellow-400 text-sm">
            A lottery for {draftYear} already exists.{' '}
            <Link href="/admin/lottery/results" className="underline hover:text-yellow-300">
              View results
            </Link>
          </p>
        )}
      </div>

      {/* Team Selection */}
      <div className="bg-lake-blue/30 rounded-lg border border-lake-blue-light/20 p-6 mb-6">
        <h2 className="text-lg font-semibold text-lake-ice mb-4">
          Select Non-Playoff Teams
        </h2>
        <p className="text-lake-ice/50 text-sm mb-6">
          Assign teams to their regular season finishing position
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[12, 11, 10, 9].map((standing) => (
            <div key={standing} className="flex items-center gap-4">
              <div className="w-24 flex-shrink-0">
                <span className="text-lake-ice font-medium">{standing}th Place</span>
                <span className="block text-lake-gold text-sm">{LOTTERY_ODDS[standing]}% odds</span>
              </div>
              <select
                value={selectedTeams[standing] || ''}
                onChange={(e) => handleTeamSelect(standing, e.target.value ? parseInt(e.target.value) : null)}
                className="flex-1 px-3 py-2 bg-lake-blue-dark/50 border border-lake-blue-light/30 rounded-lg text-lake-ice focus:outline-none focus:border-lake-gold/50"
                disabled={isRunning}
              >
                <option value="">Select team...</option>
                {getAvailableTeams(standing).map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>

        {allTeamsSelected && !uniqueTeamsSelected && (
          <p className="mt-4 text-red-400 text-sm">
            Please select 4 different teams.
          </p>
        )}
      </div>

      {/* Run Lottery Button */}
      {allTeamsSelected && uniqueTeamsSelected && !isRunning && !isComplete && (
        <div className="text-center mb-8">
          {yearAlreadyExists ? (
            <div className="text-yellow-400">
              <p className="mb-2">Cannot run lottery - {draftYear} already has results.</p>
              <Link
                href="/admin/lottery/results"
                className="text-lake-gold hover:text-lake-gold/80 underline"
              >
                Manage existing results →
              </Link>
            </div>
          ) : (
            <button
              onClick={runLottery}
              className="px-8 py-4 bg-lake-gold text-lake-blue-dark font-bold text-lg rounded-lg hover:bg-lake-gold/90 transition-all transform hover:scale-105 shadow-lg"
            >
              Run Draft Lottery
            </button>
          )}
        </div>
      )}

      {/* Lottery Results with Animation */}
      {lotteryResults.length > 0 && (
        <div className="bg-lake-blue/30 rounded-lg border border-lake-blue-light/20 p-6 mb-6">
          <h2 className="text-lg font-semibold text-lake-ice mb-6 text-center">
            {isComplete ? `${draftYear} Draft Lottery Results` : 'Drawing...'}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[4, 3, 2, 1].map((pick) => {
              const result = lotteryResults.find(r => r.pick === pick);
              if (!result) return null;

              // For the final reveal, both 1st and 2nd animate together when currentReveal is 2
              const isCurrentlyRevealing = (currentReveal === pick || (currentReveal === 2 && pick === 1)) && !result.revealed;
              const isRevealed = result.revealed;

              return (
                <div
                  key={pick}
                  className={`relative overflow-hidden rounded-lg border-2 transition-all duration-500 ${
                    pick === 1
                      ? 'md:col-span-2 border-lake-gold bg-lake-gold/10'
                      : 'border-lake-blue-light/30 bg-lake-blue-dark/30'
                  } ${isCurrentlyRevealing ? 'animate-pulse' : ''}`}
                >
                  <div className="p-6">
                    <div className="text-center">
                      <span
                        className={`text-sm font-medium ${
                          pick === 1 ? 'text-lake-gold' : 'text-lake-ice/50'
                        }`}
                      >
                        {getPickLabel(pick)}
                      </span>

                      {isCurrentlyRevealing && !isRevealed && (
                        <div className="mt-4">
                          {/* Slot machine animation */}
                          <div className="h-16 overflow-hidden relative">
                            <div className="animate-lottery-spin">
                              {[...Array(10)].map((_, i) => {
                                const randomTeam = teams[Math.floor(Math.random() * teams.length)];
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

                      {isRevealed && (
                        <div className="mt-4 animate-reveal">
                          <h3
                            className={`text-2xl font-bold ${
                              pick === 1 ? 'text-lake-gold' : 'text-lake-ice'
                            }`}
                          >
                            {result.team.name}
                          </h3>
                          <p className="text-lake-ice/50 text-sm mt-1">
                            Finished {result.team.standing}th ({result.team.odds}% odds)
                          </p>
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
        </div>
      )}

      {/* Save/Publish Actions */}
      {isComplete && (
        <div className="bg-lake-blue/30 rounded-lg border border-lake-blue-light/20 p-6">
          <h2 className="text-lg font-semibold text-lake-ice mb-4">Save Results</h2>

          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => saveLotteryResults(false)}
              disabled={isSaving}
              className="px-6 py-2 bg-lake-blue-light/30 text-lake-ice rounded-lg hover:bg-lake-blue-light/50 transition-colors disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save as Draft'}
            </button>
            <button
              onClick={() => saveLotteryResults(true)}
              disabled={isSaving}
              className="px-6 py-2 bg-lake-gold text-lake-blue-dark font-semibold rounded-lg hover:bg-lake-gold/90 transition-colors disabled:opacity-50"
            >
              {isSaving ? 'Publishing...' : 'Publish Results'}
            </button>
            <button
              onClick={runLottery}
              disabled={isSaving}
              className="px-6 py-2 border border-lake-ice/30 text-lake-ice/70 rounded-lg hover:bg-lake-blue-light/20 transition-colors disabled:opacity-50"
            >
              Re-run Lottery
            </button>
          </div>

          {saveMessage && (
            <div
              className={`mt-4 p-3 rounded-lg ${
                saveMessage.type === 'success'
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-red-500/20 text-red-400'
              }`}
            >
              {saveMessage.text}
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
      `}</style>
    </div>
  );
}
