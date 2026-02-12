'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Team {
  id: number;
  name: string;
}

interface LotteryResult {
  id: number;
  year: string;
  isPublished: boolean;
  runAt: string;
  publishedAt: string | null;
  picks: {
    pick: number;
    team: Team | null;
    standing: string;
  }[];
}

export default function LotteryResultsPage() {
  const [results, setResults] = useState<LotteryResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchResults = async () => {
    try {
      const response = await fetch('/api/admin/lottery/all');
      if (response.ok) {
        const data = await response.json();
        setResults(data);
      }
    } catch (error) {
      console.error('Failed to fetch results:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, []);

  const publishResult = async (year: string) => {
    setActionLoading(year);
    setMessage(null);
    try {
      const response = await fetch('/api/admin/lottery/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year }),
      });
      if (response.ok) {
        setMessage({ type: 'success', text: `${year} lottery results published!` });
        fetchResults();
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.message || 'Failed to publish' });
      }
    } catch (error) {
      console.error('Publish failed:', error);
      setMessage({ type: 'error', text: 'Failed to publish results' });
    } finally {
      setActionLoading(null);
    }
  };

  const deleteResult = async (year: string) => {
    if (!confirm(`Are you sure you want to delete the ${year} lottery draft?`)) {
      return;
    }

    setActionLoading(year);
    setMessage(null);
    try {
      const response = await fetch('/api/admin/lottery/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year }),
      });
      if (response.ok) {
        setMessage({ type: 'success', text: `${year} lottery draft deleted.` });
        fetchResults();
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.message || 'Failed to delete' });
      }
    } catch (error) {
      console.error('Delete failed:', error);
      setMessage({ type: 'error', text: 'Failed to delete draft' });
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl">
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-lake-ice/20 border-t-lake-gold rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-lake-ice">Lottery Results</h1>
          <p className="text-lake-ice/60 mt-1">
            Manage saved and published lottery results
          </p>
        </div>
        <Link
          href="/admin/lottery"
          className="px-4 py-2 bg-lake-gold text-lake-blue-dark font-semibold rounded-lg hover:bg-lake-gold/90 transition-colors"
        >
          Run New Lottery
        </Link>
      </div>

      {/* Messages */}
      {message && (
        <div
          className={`mb-6 p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
              : 'bg-red-500/20 text-red-400 border border-red-500/30'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Results List */}
      {results.length === 0 ? (
        <div className="bg-lake-blue/30 rounded-lg border border-lake-blue-light/20 p-12 text-center">
          <p className="text-lake-ice/50 mb-4">No lottery results saved yet.</p>
          <Link
            href="/admin/lottery"
            className="text-lake-gold hover:text-lake-gold/80"
          >
            Run your first lottery →
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {results.map((result) => (
            <div
              key={result.year}
              className={`bg-lake-blue/30 rounded-lg border p-6 ${
                result.isPublished
                  ? 'border-green-500/30'
                  : 'border-lake-blue-light/20'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  {/* Year and Status */}
                  <div className="flex items-center gap-3 mb-3">
                    <h2 className="text-xl font-bold text-lake-ice">
                      {result.year} Draft Lottery
                    </h2>
                    <span
                      className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                        result.isPublished
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-yellow-500/20 text-yellow-400'
                      }`}
                    >
                      {result.isPublished ? 'Published' : 'Draft'}
                    </span>
                  </div>

                  {/* Picks */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                    {result.picks.map((pick) => (
                      <div
                        key={pick.pick}
                        className={`p-2 rounded text-center ${
                          pick.pick === 1
                            ? 'bg-lake-gold/20 border border-lake-gold/30'
                            : 'bg-lake-blue-dark/30'
                        }`}
                      >
                        <span className="text-lake-ice/50 text-xs">
                          Pick {pick.pick}
                        </span>
                        <p
                          className={`font-medium truncate ${
                            pick.pick === 1 ? 'text-lake-gold' : 'text-lake-ice'
                          }`}
                        >
                          {pick.team?.name || 'Unknown'}
                        </p>
                        <span className="text-lake-ice/40 text-xs">
                          {pick.standing}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Timestamps */}
                  <div className="text-lake-ice/40 text-sm">
                    <span>Run: {formatDate(result.runAt)}</span>
                    {result.publishedAt && (
                      <span className="ml-4">
                        Published: {formatDate(result.publishedAt)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2">
                  {!result.isPublished && (
                    <>
                      <button
                        onClick={() => publishResult(result.year)}
                        disabled={actionLoading === result.year}
                        className="px-4 py-2 bg-lake-gold text-lake-blue-dark font-medium rounded-lg hover:bg-lake-gold/90 transition-colors disabled:opacity-50 text-sm"
                      >
                        {actionLoading === result.year ? 'Publishing...' : 'Publish'}
                      </button>
                      <button
                        onClick={() => deleteResult(result.year)}
                        disabled={actionLoading === result.year}
                        className="px-4 py-2 bg-red-500/20 text-red-400 font-medium rounded-lg hover:bg-red-500/30 transition-colors disabled:opacity-50 text-sm"
                      >
                        {actionLoading === result.year ? 'Deleting...' : 'Delete'}
                      </button>
                    </>
                  )}
                  {result.isPublished && (
                    <Link
                      href="/lottery"
                      className="px-4 py-2 bg-lake-blue-light/20 text-lake-ice/70 font-medium rounded-lg hover:bg-lake-blue-light/30 transition-colors text-sm text-center"
                    >
                      View Public
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
