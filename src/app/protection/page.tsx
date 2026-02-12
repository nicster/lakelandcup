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

  const debouncedQuery = useDebounce(query, 300);

  const searchPlayers = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    setIsLoading(true);
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
  }, []);

  useEffect(() => {
    searchPlayers(debouncedQuery);
  }, [debouncedQuery, searchPlayers]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      {/* Page Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-3 mb-4">
          <svg className="w-8 h-8 text-lake-gold" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
          </svg>
          <h1 className="text-3xl font-bold text-lake-ice">Protection Search</h1>
        </div>
        <p className="text-lake-ice/60">
          Search for any drafted player to check their protection status
        </p>
      </div>

      {/* Search Input */}
      <div className="relative mb-8">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter player name..."
          className="w-full px-4 py-3 pl-12 bg-lake-blue/30 border border-lake-blue-light/30 rounded-lg text-lake-ice placeholder-lake-ice/40 focus:outline-none focus:border-lake-gold/50 focus:ring-1 focus:ring-lake-gold/30"
        />
        <svg
          className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-lake-ice/40"
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
      </div>

      {/* Results */}
      {hasSearched && results.length === 0 && !isLoading && (
        <div className="text-center py-12 text-lake-ice/50">
          No players found matching "{query}"
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-3">
          {results.map((player, index) => (
            <div
              key={`${player.playerName}-${player.draftYear}-${index}`}
              className={`p-4 rounded-lg border ${
                player.isProtected
                  ? 'bg-green-500/10 border-green-500/30'
                  : 'bg-red-500/10 border-red-500/30'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-lake-ice">
                      {player.playerName}
                    </h3>
                    {player.position === 'G' && (
                      <span className="px-1.5 py-0.5 text-xs font-medium bg-purple-500/20 text-purple-300 rounded">
                        G
                      </span>
                    )}
                  </div>
                  <p className="text-lake-ice/60 text-sm">
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
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}
                  >
                    {player.isProtected ? 'Protected' : 'Expired'}
                  </span>
                  <p className={`text-sm mt-1 ${
                    player.isProtected ? 'text-green-400/70' : 'text-red-400/70'
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
