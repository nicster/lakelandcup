'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface ProtectionResult {
  playerName: string;
  teamId: number;
  teamName: string;
  draftYear: string;
  round: number;
  pick: number;
  position: string | null;
  protectionExpires: string;
  isProtected: boolean;
}

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

export default function ProtectionSearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ProtectionResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [showingRecent, setShowingRecent] = useState(true);

  const debouncedQuery = useDebounce(query, 300);

  // Load recent protected prospects on mount
  useEffect(() => {
    async function loadRecent() {
      setIsLoading(true);
      try {
        const response = await fetch('/api/protection/search?recent=true');
        if (response.ok) {
          const data = await response.json();
          setResults(data);
        }
      } catch (error) {
        console.error('Failed to load recent prospects:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadRecent();
  }, []);

  const searchPlayers = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      // When clearing search, reload recent prospects
      if (searchQuery.length === 0 && hasSearched) {
        setIsLoading(true);
        try {
          const response = await fetch('/api/protection/search?recent=true');
          if (response.ok) {
            const data = await response.json();
            setResults(data);
            setShowingRecent(true);
          }
        } catch (error) {
          console.error('Failed to load recent prospects:', error);
        } finally {
          setIsLoading(false);
          setHasSearched(false);
        }
      }
      return;
    }

    setIsLoading(true);
    setShowingRecent(false);
    try {
      const response = await fetch(`/api/protection/search?q=${encodeURIComponent(searchQuery)}`);
      if (response.ok) {
        const data = await response.json();
        setResults(data);
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsLoading(false);
      setHasSearched(true);
    }
  }, [hasSearched]);

  useEffect(() => {
    searchPlayers(debouncedQuery);
  }, [debouncedQuery, searchPlayers]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      {/* Page Header */}
      <header className="mb-10">
        <p className="text-[clamp(0.7rem,0.65rem+0.2vw,0.85rem)] uppercase tracking-[0.25em] text-lake-gold mb-3">Player Lookup</p>
        <h1 className="text-[clamp(1.875rem,1.4rem+1.5vw,2.5rem)] font-bold text-lake-ice tracking-tight leading-tight">Protection Search</h1>
        <p className="text-[clamp(1rem,0.92rem+0.25vw,1.125rem)] text-lake-ice-muted mt-2 max-w-xl">
          Check any drafted player to see who holds their rights and when protection expires.
        </p>
        <div className="w-12 h-0.5 bg-lake-gold mt-6" />
      </header>

      {/* Search Input */}
      <div className="relative mb-8">
        <label htmlFor="player-search" className="sr-only">
          Player name
        </label>
        <input
          id="player-search"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter player name..."
          className="w-full px-4 py-3 pl-12 bg-lake-blue/30 border border-lake-blue-light/30 rounded-lg text-lake-ice placeholder-lake-ice/60 focus:outline-none focus:border-lake-gold/50 focus:ring-1 focus:ring-lake-gold/30"
        />
        <svg aria-hidden="true"
          className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-lake-ice-muted"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        {isLoading && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <div className="w-5 h-5 border-2 border-lake-gold/30 border-t-lake-gold rounded-full animate-spin" />
          </div>
        )}
        {query.length > 0 && query.length < 2 && (
          <p className="mt-2 text-sm text-lake-ice-muted" aria-live="polite">
            Keep typing — search needs at least 2 characters.
          </p>
        )}
      </div>

      {/* Results */}
      {hasSearched && results.length === 0 && !isLoading && (
        <div className="text-center py-12 text-lake-ice-muted">
          No players found matching &ldquo;{query}&rdquo;
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-3">
          {showingRecent && (
            <h2 className="text-lg font-semibold text-lake-ice/70 mb-4">
              Recently Drafted Prospects
            </h2>
          )}
          {results.map((player, index) => (
            <div
              key={`${player.playerName}-${player.draftYear}-${index}`}
              className={`p-4 rounded-lg border ${
                player.isProtected
                  ? 'bg-lake-success/10 border-lake-success/30'
                  : 'bg-lake-error/10 border-lake-error/30'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-lake-ice">
                      {player.playerName}
                    </h3>
                    {player.position === 'G' && (
                      <span className="px-1.5 py-0.5 text-xs font-medium bg-lake-goalie/20 text-lake-goalie rounded">
                        G
                      </span>
                    )}
                  </div>
                  <p className="text-lake-ice-muted text-sm">
                    {player.draftYear} Draft · Round {player.round}, Pick {player.pick}
                  </p>
                  <Link
                    href={`/teams/${player.teamId}`}
                    className="text-lake-gold hover:text-lake-gold/80 text-sm"
                  >
                    {player.teamName}
                  </Link>
                </div>
                <div className="text-right">
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                      player.isProtected
                        ? 'bg-lake-success/20 text-lake-success'
                        : 'bg-lake-error/20 text-lake-error'
                    }`}
                  >
                    {player.isProtected ? 'Protected' : 'Expired'}
                  </span>
                  <p className={`text-sm mt-1 ${
                    player.isProtected ? 'text-lake-success/80' : 'text-lake-error/80'
                  }`}>
                    {player.isProtected
                      ? `Until ${player.protectionExpires}`
                      : `Expired ${player.protectionExpires}`}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
