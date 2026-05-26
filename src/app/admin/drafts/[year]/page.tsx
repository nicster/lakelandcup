'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface Team {
  id: number;
  name: string;
  logo: string | null;
  isActive: boolean;
}

interface Row {
  // Existing pick id if loaded from server; new rows have no id (we always
  // replace-all on save so the id isn't actually used in POST).
  id?: number;
  round: number;
  pick: number;
  teamId: number | null;
  fromTeamId: number | null;
  playerName: string;
  position: string | null;
  tradedToTeamId: number | null;
}

const POSITIONS = ['', 'C', 'LW', 'RW', 'D', 'F', 'G'] as const;

function emptyRow(round: number, pick: number): Row {
  return {
    round,
    pick,
    teamId: null,
    fromTeamId: null,
    playerName: '',
    position: null,
    tradedToTeamId: null,
  };
}

export default function AdminDraftYearPage() {
  const { year: yearParam } = useParams<{ year: string }>();
  const year = String(yearParam);
  const router = useRouter();

  const [teams, setTeams] = useState<Team[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [t, r] = await Promise.all([
          fetch('/api/teams').then((res) => res.json()),
          fetch(`/api/admin/drafts/${year}`).then((res) => res.json()),
        ]);
        setTeams(t);
        if (Array.isArray(r) && r.length > 0) {
          setRows(
            r.map((p: Row & { playerName: string | null }) => ({
              id: p.id,
              round: p.round,
              pick: p.pick,
              teamId: p.teamId,
              fromTeamId: p.fromTeamId,
              playerName: p.playerName === 'TBD' ? '' : p.playerName ?? '',
              position: p.position,
              tradedToTeamId: p.tradedToTeamId,
            })),
          );
        } else {
          // No data — render an empty skeleton just in case the user navigated here directly.
          const skeleton: Row[] = [];
          for (let p = 1; p <= 24; p++) skeleton.push(emptyRow(p <= 12 ? 1 : 2, p));
          setRows(skeleton);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [year]);

  const activeTeams = useMemo(() => teams.filter((t) => t.isActive), [teams]);
  const formerTeams = useMemo(() => teams.filter((t) => !t.isActive), [teams]);

  function updateRow(idx: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  function addRow() {
    setRows((prev) => {
      const lastPick = prev.length > 0 ? Math.max(...prev.map((r) => r.pick)) : 0;
      const nextPick = lastPick + 1;
      return [...prev, emptyRow(nextPick <= 12 ? 1 : 2, nextPick)];
    });
  }

  function removeRow(idx: number) {
    setRows((prev) => prev.filter((_, i) => i !== idx));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/drafts/${year}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          picks: rows.map((r) => ({
            round: r.round,
            pick: r.pick,
            teamId: r.teamId,
            fromTeamId: r.fromTeamId && r.fromTeamId !== r.teamId ? r.fromTeamId : null,
            playerName: r.playerName.trim() || 'TBD',
            position: r.position || null,
            tradedToTeamId: r.tradedToTeamId,
          })),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.message ?? 'Save failed');
      setMessage({ type: 'success', text: `${year} draft saved.` });
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Save failed' });
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteYear() {
    if (!confirm(`Delete the entire ${year} draft (all picks)? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/admin/drafts?year=${encodeURIComponent(year)}`, {
        method: 'DELETE',
      });
      if (res.ok) router.push('/admin/drafts');
    } catch (err) {
      console.error(err);
    }
  }

  function TeamSelect({
    value,
    onChange,
    placeholder = '—',
    allowEmpty = true,
  }: {
    value: number | null;
    onChange: (v: number | null) => void;
    placeholder?: string;
    allowEmpty?: boolean;
  }) {
    return (
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value ? parseInt(e.target.value, 10) : null)}
        className="w-full px-2 py-1.5 bg-lake-blue-dark/60 border border-lake-blue-light/30 rounded text-lake-ice text-sm focus:outline-none focus:border-lake-gold/50"
      >
        {allowEmpty && <option value="">{placeholder}</option>}
        <optgroup label="Active">
          {activeTeams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </optgroup>
        {formerTeams.length > 0 && (
          <optgroup label="Former">
            {formerTeams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </optgroup>
        )}
      </select>
    );
  }

  if (loading) {
    return (
      <div className="max-w-5xl">
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-lake-ice/20 border-t-lake-gold rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  const round1 = rows.map((r, i) => ({ r, i })).filter(({ r }) => r.round === 1);
  const round2 = rows.map((r, i) => ({ r, i })).filter(({ r }) => r.round === 2);
  const otherRows = rows.map((r, i) => ({ r, i })).filter(({ r }) => r.round > 2);

  function RoundSection({
    title,
    items,
  }: {
    title: string;
    items: { r: Row; i: number }[];
  }) {
    if (items.length === 0) return null;
    return (
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-lake-ice-muted uppercase tracking-[0.18em] mb-3">
          {title}
        </h2>
        <ul className="space-y-2">
          {items.map(({ r, i }) => (
            <li
              key={`${r.round}-${r.pick}-${i}`}
              className="grid grid-cols-1 md:grid-cols-[3rem_minmax(11rem,1.2fr)_minmax(11rem,1.5fr)_5rem_minmax(11rem,1fr)_minmax(11rem,1fr)_auto] gap-3 md:items-center py-3 px-3 rounded-md bg-lake-blue-dark/30 border border-lake-blue-light/15"
            >
              <span className="text-lake-gold font-semibold tabular-nums">#{r.pick}</span>
              <TeamSelect
                value={r.teamId}
                onChange={(v) => updateRow(i, { teamId: v })}
                placeholder="Drafting team"
              />
              <input
                type="text"
                value={r.playerName}
                onChange={(e) => updateRow(i, { playerName: e.target.value })}
                placeholder="Player name"
                className="px-2 py-1.5 bg-lake-blue-dark/60 border border-lake-blue-light/30 rounded text-lake-ice text-sm placeholder-lake-ice/40 focus:outline-none focus:border-lake-gold/50"
              />
              <select
                value={r.position ?? ''}
                onChange={(e) => updateRow(i, { position: e.target.value || null })}
                aria-label="Position"
                className="px-2 py-1.5 bg-lake-blue-dark/60 border border-lake-blue-light/30 rounded text-lake-ice text-sm focus:outline-none focus:border-lake-gold/50"
              >
                {POSITIONS.map((p) => (
                  <option key={p} value={p}>
                    {p || '—'}
                  </option>
                ))}
              </select>
              <div className="md:contents">
                <div className="flex flex-col md:contents">
                  <span className="md:hidden text-[10px] uppercase tracking-wider text-lake-ice-muted mb-1">
                    From (if traded)
                  </span>
                  <TeamSelect
                    value={r.fromTeamId}
                    onChange={(v) => updateRow(i, { fromTeamId: v })}
                    placeholder="from (if traded)"
                  />
                </div>
                <div className="flex flex-col md:contents">
                  <span className="md:hidden text-[10px] uppercase tracking-wider text-lake-ice-muted mb-1 mt-2">
                    Traded to (post-draft)
                  </span>
                  <TeamSelect
                    value={r.tradedToTeamId}
                    onChange={(v) => updateRow(i, { tradedToTeamId: v })}
                    placeholder="traded to (post-draft)"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={() => removeRow(i)}
                aria-label={`Remove pick ${r.pick}`}
                className="justify-self-end inline-flex items-center justify-center w-7 h-7 rounded text-lake-ice-muted hover:text-lake-error hover:bg-lake-error/10 transition-colors"
              >
                <svg aria-hidden="true" viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                  <path d="M5 5 L15 15 M15 5 L5 15" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="max-w-5xl">
      <header className="mb-8">
        <Link
          href="/admin/drafts"
          className="text-xs uppercase tracking-wider text-lake-ice-muted hover:text-lake-gold"
        >
          ← all drafts
        </Link>
        <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <p className="text-xs uppercase tracking-[0.25em] text-lake-gold">Commissioner</p>
          <h1 className="text-2xl font-bold text-lake-ice tracking-tight tabular-nums">
            {year} draft
          </h1>
          <span className="text-sm text-lake-ice-muted tabular-nums">{rows.length} picks</span>
        </div>
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

      <form onSubmit={save}>
        <RoundSection title="Round 1" items={round1} />
        <RoundSection title="Round 2" items={round2} />
        {otherRows.length > 0 && <RoundSection title="Additional picks" items={otherRows} />}

        <div className="flex items-center gap-3 pt-4 mb-4">
          <button
            type="button"
            onClick={addRow}
            className="text-xs uppercase tracking-wider text-lake-gold hover:text-lake-gold/80"
          >
            + add pick
          </button>
        </div>

        <div className="sticky bottom-0 -mx-4 mt-12 px-4 py-4 bg-lake-blue-darkest/95 backdrop-blur-sm border-t border-lake-blue-light/20 flex flex-wrap items-center justify-between gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2 rounded-md bg-lake-gold text-lake-blue-dark font-semibold disabled:opacity-50 hover:bg-lake-gold/90 transition-colors"
          >
            {submitting ? 'Saving…' : 'Save draft'}
          </button>
          <button
            type="button"
            onClick={deleteYear}
            className="px-4 py-2 bg-lake-error/20 text-lake-error font-medium rounded-md hover:bg-lake-error/30 transition-colors text-sm"
          >
            Delete entire year
          </button>
        </div>
      </form>
    </div>
  );
}
