'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

interface YearSummary {
  year: string;
  pickCount: number;
}

function nextSuggestedYear(years: YearSummary[]): string {
  if (years.length === 0) return String(new Date().getFullYear());
  const sorted = [...years].map((y) => parseInt(y.year, 10)).sort((a, b) => b - a);
  return String((sorted[0] || new Date().getFullYear()) + 1);
}

export default function AdminDraftsPage() {
  const [years, setYears] = useState<YearSummary[]>([]);
  const [newYear, setNewYear] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await fetch('/api/admin/drafts').then((r) => r.json());
        setYears(data);
        setNewYear(nextSuggestedYear(data));
      } catch (err) {
        console.error(err);
      }
    }
    load();
  }, []);

  async function createYear(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year: newYear.trim() }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.message ?? 'Save failed');
      }
      setMessage({ type: 'success', text: `Created ${newYear} skeleton with 24 picks. Edit it now.` });
      const refreshed = await fetch('/api/admin/drafts').then((r) => r.json());
      setYears(refreshed);
      setNewYear(nextSuggestedYear(refreshed));
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Save failed' });
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteYear(year: string) {
    if (!confirm(`Delete the entire ${year} draft? This removes all 24 picks. This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/admin/drafts?year=${encodeURIComponent(year)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setYears((prev) => prev.filter((y) => y.year !== year));
      }
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="max-w-4xl">
      <header className="mb-8">
        <p className="text-xs uppercase tracking-[0.25em] text-lake-gold mb-2">Commissioner</p>
        <h1 className="text-2xl font-bold text-lake-ice tracking-tight">Drafts</h1>
        <p className="text-lake-ice-muted mt-1">
          Record the picks and players for each prospect draft.
        </p>
      </header>

      {message && (
        <div
          className={`mb-6 p-3 rounded-lg ${
            message.type === 'success'
              ? 'bg-lake-success/20 border border-lake-success/30 text-lake-success'
              : 'bg-lake-error/20 border border-lake-error/30 text-lake-error'
          }`}
          aria-live="polite"
        >
          {message.text}
        </div>
      )}

      <form
        onSubmit={createYear}
        className="bg-lake-blue/30 rounded-lg border border-lake-blue-light/20 p-6 mb-12"
      >
        <h2 className="text-sm font-semibold text-lake-ice-muted uppercase tracking-[0.18em] mb-4">
          Start a new draft year
        </h2>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5 w-32">
            <label htmlFor="new-year" className="text-xs font-medium text-lake-ice-muted uppercase tracking-wider">
              Year
            </label>
            <input
              id="new-year"
              type="text"
              pattern="\d{4}"
              inputMode="numeric"
              required
              value={newYear}
              onChange={(e) => setNewYear(e.target.value)}
              className="px-3 py-2 bg-lake-blue-dark/50 border border-lake-blue-light/30 rounded-md text-lake-ice tabular-nums focus:outline-none focus:border-lake-gold/50 focus:ring-1 focus:ring-lake-gold/30"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2 rounded-md bg-lake-gold text-lake-blue-dark font-semibold disabled:opacity-50 hover:bg-lake-gold/90 transition-colors"
          >
            {submitting ? 'Creating…' : 'Create skeleton'}
          </button>
          <p className="text-xs text-lake-ice-muted basis-full">
            24 placeholder picks (round 1: 1–12, round 2: 13–24) are inserted with team and player set to TBD. Fill them in via the editor.
          </p>
        </div>
      </form>

      <section>
        <h2 className="text-sm font-semibold text-lake-ice-muted uppercase tracking-[0.18em] mb-3">
          Recorded
        </h2>
        {years.length === 0 ? (
          <p className="text-lake-ice-muted text-sm italic">No drafts on file yet.</p>
        ) : (
          <ul className="divide-y divide-lake-blue-light/15">
            {years.map((y) => (
              <li
                key={y.year}
                className="flex items-center gap-4 py-3 px-1"
              >
                <Link
                  href={`/admin/drafts/${y.year}`}
                  className="text-lake-gold tabular-nums font-semibold w-16 hover:text-lake-gold/80"
                >
                  {y.year}
                </Link>
                <span className="flex-1 text-sm text-lake-ice-muted tabular-nums">
                  {y.pickCount} {y.pickCount === 1 ? 'pick' : 'picks'}
                </span>
                <Link
                  href={`/admin/drafts/${y.year}`}
                  className="text-xs uppercase tracking-wider text-lake-ice-muted hover:text-lake-gold"
                >
                  edit
                </Link>
                <button
                  type="button"
                  onClick={() => deleteYear(y.year)}
                  className="text-xs uppercase tracking-wider text-lake-ice-muted hover:text-lake-error"
                >
                  delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
