'use client';

import { useEffect, useState } from 'react';

interface Team {
  id: number;
  name: string;
  logo: string | null;
  isActive: boolean;
}

interface SeasonRow {
  id: number;
  year: string;
  championId: number | null;
  runnerUpId: number | null;
  finalResult: string | null;
  notes: string | null;
  championName: string | null;
  runnerUpName: string | null;
}

const emptyDraft = () => ({
  year: '',
  championId: null as number | null,
  runnerUpId: null as number | null,
  finalResult: '',
  notes: '',
});

function defaultYear(existing: SeasonRow[]): string {
  // Suggest the next season after the most recent one in the table.
  if (existing.length === 0) {
    const y = new Date().getFullYear();
    return `${y}-${String((y + 1) % 100).padStart(2, '0')}`;
  }
  const [startStr] = existing[0].year.split('-');
  const start = parseInt(startStr, 10) + 1;
  return `${start}-${String((start + 1) % 100).padStart(2, '0')}`;
}

export default function AdminSeasonsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [seasons, setSeasons] = useState<SeasonRow[]>([]);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState(emptyDraft());

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [t, s] = await Promise.all([
          fetch('/api/teams').then((r) => r.json()),
          fetch('/api/admin/seasons').then((r) => r.json()),
        ]);
        setTeams(t);
        setSeasons(s);
        setDraft((d) => ({ ...d, year: defaultYear(s) }));
      } catch (err) {
        console.error(err);
      }
    }
    load();
  }, []);

  const isEditing = editingId !== null;

  function loadIntoForm(s: SeasonRow) {
    setEditingId(s.id);
    setDraft({
      year: s.year,
      championId: s.championId,
      runnerUpId: s.runnerUpId,
      finalResult: s.finalResult ?? '',
      notes: s.notes ?? '',
    });
    setMessage(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function reset() {
    setEditingId(null);
    setDraft({ ...emptyDraft(), year: defaultYear(seasons) });
    setMessage(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (!/^\d{4}-\d{2}$/.test(draft.year)) {
      setMessage({ type: 'error', text: 'Year must look like 2024-25.' });
      return;
    }
    if (draft.championId && draft.runnerUpId && draft.championId === draft.runnerUpId) {
      setMessage({ type: 'error', text: 'Champion and runner-up must be different teams.' });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        year: draft.year,
        championId: draft.championId,
        runnerUpId: draft.runnerUpId,
        finalResult: draft.finalResult.trim() || null,
        notes: draft.notes.trim() || null,
      };
      const res = await fetch(
        isEditing ? `/api/admin/seasons?id=${editingId}` : '/api/admin/seasons',
        {
          method: isEditing ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? 'Save failed');
      }
      setMessage({
        type: 'success',
        text: isEditing ? `Season ${draft.year} updated.` : `Season ${draft.year} recorded.`,
      });
      const refreshed = await fetch('/api/admin/seasons').then((r) => r.json());
      setSeasons(refreshed);
      reset();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Save failed' });
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteSeason(id: number, year: string) {
    if (!confirm(`Delete the ${year} season? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/admin/seasons?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSeasons((prev) => prev.filter((s) => s.id !== id));
        if (editingId === id) reset();
      }
    } catch (err) {
      console.error(err);
    }
  }

  const activeTeams = teams.filter((t) => t.isActive);
  const formerTeams = teams.filter((t) => !t.isActive);

  function TeamSelect({
    id,
    label,
    value,
    onChange,
  }: {
    id: string;
    label: string;
    value: number | null;
    onChange: (v: number | null) => void;
  }) {
    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={id} className="text-xs font-medium text-lake-ice-muted uppercase tracking-wider">
          {label}
        </label>
        <select
          id={id}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value ? parseInt(e.target.value, 10) : null)}
          className="px-3 py-2 bg-lake-blue-dark/50 border border-lake-blue-light/30 rounded-md text-lake-ice focus:outline-none focus:border-lake-gold/50 focus:ring-1 focus:ring-lake-gold/30"
        >
          <option value="">—</option>
          <optgroup label="Active franchises">
            {activeTeams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </optgroup>
          {formerTeams.length > 0 && (
            <optgroup label="Former franchises">
              {formerTeams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </optgroup>
          )}
        </select>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <header className="mb-8">
        <p className="text-xs uppercase tracking-[0.25em] text-lake-gold mb-2">Commissioner</p>
        <h1 className="text-2xl font-bold text-lake-ice tracking-tight">Seasons</h1>
        <p className="text-lake-ice-muted mt-1">
          Record the champion, runner-up, and final score for each season.
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
        onSubmit={submit}
        className="bg-lake-blue/30 rounded-lg border border-lake-blue-light/20 p-6 space-y-6 mb-12"
      >
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-sm font-semibold text-lake-ice-muted uppercase tracking-[0.18em]">
            {isEditing ? `Editing ${draft.year}` : 'New season'}
          </h2>
          {isEditing && (
            <button
              type="button"
              onClick={reset}
              className="text-xs uppercase tracking-wider text-lake-ice-muted hover:text-lake-ice"
            >
              cancel edit
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[140px_1fr_1fr] gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="year" className="text-xs font-medium text-lake-ice-muted uppercase tracking-wider">
              Season
            </label>
            <input
              id="year"
              type="text"
              required
              pattern="\d{4}-\d{2}"
              placeholder="2024-25"
              value={draft.year}
              onChange={(e) => setDraft({ ...draft, year: e.target.value })}
              className="px-3 py-2 bg-lake-blue-dark/50 border border-lake-blue-light/30 rounded-md text-lake-ice placeholder-lake-ice/40 tabular-nums focus:outline-none focus:border-lake-gold/50 focus:ring-1 focus:ring-lake-gold/30"
            />
          </div>
          <TeamSelect
            id="champion"
            label="Champion"
            value={draft.championId}
            onChange={(v) => setDraft({ ...draft, championId: v })}
          />
          <TeamSelect
            id="runner-up"
            label="Runner-up"
            value={draft.runnerUpId}
            onChange={(v) => setDraft({ ...draft, runnerUpId: v })}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[140px_1fr] gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="final" className="text-xs font-medium text-lake-ice-muted uppercase tracking-wider">
              Final result <span className="opacity-60 normal-case">(optional)</span>
            </label>
            <input
              id="final"
              type="text"
              placeholder="4-3"
              value={draft.finalResult}
              onChange={(e) => setDraft({ ...draft, finalResult: e.target.value })}
              className="px-3 py-2 bg-lake-blue-dark/50 border border-lake-blue-light/30 rounded-md text-lake-ice placeholder-lake-ice/40 tabular-nums focus:outline-none focus:border-lake-gold/50 focus:ring-1 focus:ring-lake-gold/30"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="notes" className="text-xs font-medium text-lake-ice-muted uppercase tracking-wider">
              Notes <span className="opacity-60 normal-case">(optional)</span>
            </label>
            <textarea
              id="notes"
              rows={2}
              value={draft.notes}
              onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
              placeholder="OT thriller, lockout-shortened, etc."
              className="px-3 py-2 bg-lake-blue-dark/50 border border-lake-blue-light/30 rounded-md text-lake-ice placeholder-lake-ice/40 font-sans focus:outline-none focus:border-lake-gold/50 focus:ring-1 focus:ring-lake-gold/30"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2 rounded-md bg-lake-gold text-lake-blue-dark font-semibold disabled:opacity-50 hover:bg-lake-gold/90 transition-colors"
          >
            {submitting ? 'Saving…' : isEditing ? 'Save changes' : 'Record season'}
          </button>
          <button
            type="button"
            onClick={reset}
            disabled={submitting}
            className="text-sm text-lake-ice-muted hover:text-lake-ice"
          >
            Clear
          </button>
        </div>
      </form>

      <section>
        <h2 className="text-sm font-semibold text-lake-ice-muted uppercase tracking-[0.18em] mb-3">
          Recorded
        </h2>
        {seasons.length === 0 ? (
          <p className="text-lake-ice-muted text-sm italic">No seasons on record yet.</p>
        ) : (
          <ul className="divide-y divide-lake-blue-light/15">
            {seasons.map((s) => {
              const isCurrent = editingId === s.id;
              return (
                <li
                  key={s.id}
                  className={`grid grid-cols-[5rem_minmax(0,1fr)_minmax(0,1fr)_4rem_auto] items-baseline gap-3 py-3 px-1 rounded-md ${
                    isCurrent ? 'bg-lake-gold/10' : ''
                  }`}
                >
                  <span className="text-xs font-semibold text-lake-gold tabular-nums tracking-tight">
                    {s.year}
                  </span>
                  <span className="text-sm text-lake-ice truncate">
                    {s.championName ?? <span className="text-lake-ice-muted italic">—</span>}
                  </span>
                  <span className="text-sm text-lake-ice-muted truncate">
                    over {s.runnerUpName ?? <span className="italic">—</span>}
                  </span>
                  <span className="text-xs text-lake-ice-muted tabular-nums">
                    {s.finalResult ?? ''}
                  </span>
                  <span className="flex items-center gap-3 justify-end">
                    <button
                      type="button"
                      onClick={() => loadIntoForm(s)}
                      className="text-xs uppercase tracking-wider text-lake-ice-muted hover:text-lake-gold"
                    >
                      edit
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteSeason(s.id, s.year)}
                      className="text-xs uppercase tracking-wider text-lake-ice-muted hover:text-lake-error"
                    >
                      delete
                    </button>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
