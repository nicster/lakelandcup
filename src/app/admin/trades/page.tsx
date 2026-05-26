'use client';

import { useEffect, useState } from 'react';

interface Team {
  id: number;
  name: string;
  logo: string | null;
}

type AssetKind = 'pick' | 'player' | 'other';

interface DraftRow {
  // Local form state for one asset row
  fromTeamId: number | null;
  toTeamId: number | null;
  assetKind: AssetKind;
  pickYear: string;
  pickRound: 1 | 2 | null;
  pickOriginalTeamId: number | null;
  playerName: string;
  description: string;
  condition: string;
}

interface TradeSummary {
  id: number;
  name: string | null;
  tradeDate: string;
  assetCount: number;
}

const emptyRow = (): DraftRow => ({
  fromTeamId: null,
  toTeamId: null,
  assetKind: 'pick',
  pickYear: '',
  pickRound: 1,
  pickOriginalTeamId: null,
  playerName: '',
  description: '',
  condition: '',
});

function todayIso(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export default function AdminTradesPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [existing, setExisting] = useState<TradeSummary[]>([]);

  // Form state
  const [tradeDate, setTradeDate] = useState(todayIso());
  const [name, setName] = useState('');
  const [season, setSeason] = useState('');
  const [notes, setNotes] = useState('');
  const [rows, setRows] = useState<DraftRow[]>([emptyRow(), emptyRow()]);

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [t, e] = await Promise.all([
          fetch('/api/teams?active=true').then((r) => r.json()),
          fetch('/api/admin/trades').then((r) => r.json()),
        ]);
        setTeams(t);
        setExisting(e);
      } catch (err) {
        console.error(err);
      }
    }
    load();
  }, []);

  function updateRow(idx: number, patch: Partial<DraftRow>) {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  function addRow() {
    setRows((prev) => [...prev, emptyRow()]);
  }

  function removeRow(idx: number) {
    setRows((prev) => prev.filter((_, i) => i !== idx));
  }

  function reset() {
    setTradeDate(todayIso());
    setName('');
    setSeason('');
    setNotes('');
    setRows([emptyRow(), emptyRow()]);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    const validRows = rows.filter((r) => r.fromTeamId && r.toTeamId);
    if (validRows.length === 0) {
      setMessage({ type: 'error', text: 'Add at least one transfer (with from + to team).' });
      return;
    }
    for (const r of validRows) {
      if (r.fromTeamId === r.toTeamId) {
        setMessage({ type: 'error', text: 'A team can’t trade with itself.' });
        return;
      }
      if (r.assetKind === 'pick' && (!r.pickYear || !r.pickRound)) {
        setMessage({ type: 'error', text: 'Picks need a year and a round.' });
        return;
      }
      if (r.assetKind === 'player' && !r.playerName.trim()) {
        setMessage({ type: 'error', text: 'Player rows need a name.' });
        return;
      }
      if (r.assetKind === 'other' && !r.description.trim()) {
        setMessage({ type: 'error', text: 'Other rows need a description.' });
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/trades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tradeDate,
          name: name.trim() || null,
          season: season.trim() || null,
          notes: notes.trim() || null,
          assets: validRows.map((r, i) => ({
            sortOrder: i,
            fromTeamId: r.fromTeamId,
            toTeamId: r.toTeamId,
            assetKind: r.assetKind,
            pickYear: r.assetKind === 'pick' ? r.pickYear : null,
            pickRound: r.assetKind === 'pick' ? r.pickRound : null,
            pickOriginalTeamId:
              r.assetKind === 'pick' && r.pickOriginalTeamId && r.pickOriginalTeamId !== r.fromTeamId
                ? r.pickOriginalTeamId
                : null,
            playerName: r.assetKind === 'player' ? r.playerName.trim() : null,
            description: r.assetKind === 'other' ? r.description.trim() : null,
            condition: r.condition.trim() || null,
          })),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? 'Save failed');
      }
      setMessage({ type: 'success', text: 'Trade recorded.' });
      reset();
      const refreshed = await fetch('/api/admin/trades').then((r) => r.json());
      setExisting(refreshed);
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Save failed' });
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteTrade(id: number) {
    if (!confirm('Delete this trade? This cannot be undone.')) return;
    try {
      const res = await fetch(`/api/admin/trades?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setExisting((prev) => prev.filter((t) => t.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="max-w-4xl">
      <header className="mb-8">
        <p className="text-xs uppercase tracking-[0.25em] text-lake-gold mb-2">Commissioner</p>
        <h1 className="text-2xl font-bold text-lake-ice tracking-tight">Trades</h1>
        <p className="text-lake-ice-muted mt-1">
          Record pick movements between teams. Add as many transfers as the trade involves.
        </p>
      </header>

      {message && (
        <div
          className={`mb-6 p-3 rounded-lg ${
            message.type === 'success'
              ? 'bg-lake-success/20 border border-lake-success/30 text-lake-success'
              : 'bg-lake-error/20 border border-lake-error/30 text-lake-error'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* --- Add form --- */}
      <form
        onSubmit={submit}
        className="bg-lake-blue/30 rounded-lg border border-lake-blue-light/20 p-6 space-y-6 mb-12"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="trade-date" className="text-xs font-medium text-lake-ice-muted uppercase tracking-wider">
              Date
            </label>
            <input
              id="trade-date"
              type="date"
              required
              value={tradeDate}
              onChange={(e) => setTradeDate(e.target.value)}
              className="px-3 py-2 bg-lake-blue-dark/50 border border-lake-blue-light/30 rounded-md text-lake-ice focus:outline-none focus:border-lake-gold/50 focus:ring-1 focus:ring-lake-gold/30"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="trade-season" className="text-xs font-medium text-lake-ice-muted uppercase tracking-wider">
              Season <span className="opacity-60 normal-case">(optional, e.g. 2024-25)</span>
            </label>
            <input
              id="trade-season"
              type="text"
              value={season}
              onChange={(e) => setSeason(e.target.value)}
              placeholder="2024-25"
              className="px-3 py-2 bg-lake-blue-dark/50 border border-lake-blue-light/30 rounded-md text-lake-ice placeholder-lake-ice/40 focus:outline-none focus:border-lake-gold/50 focus:ring-1 focus:ring-lake-gold/30"
            />
          </div>
          <div className="flex flex-col gap-1.5 md:col-span-1">
            <label htmlFor="trade-name" className="text-xs font-medium text-lake-ice-muted uppercase tracking-wider">
              Name <span className="opacity-60 normal-case">(optional nickname)</span>
            </label>
            <input
              id="trade-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Vasylevsky Trade"
              className="px-3 py-2 bg-lake-blue-dark/50 border border-lake-blue-light/30 rounded-md text-lake-ice placeholder-lake-ice/40 focus:outline-none focus:border-lake-gold/50 focus:ring-1 focus:ring-lake-gold/30"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="trade-notes" className="text-xs font-medium text-lake-ice-muted uppercase tracking-wider">
            Notes <span className="opacity-60 normal-case">(optional)</span>
          </label>
          <textarea
            id="trade-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Context that doesn&rsquo;t fit into a single pick row"
            className="px-3 py-2 bg-lake-blue-dark/50 border border-lake-blue-light/30 rounded-md text-lake-ice placeholder-lake-ice/40 focus:outline-none focus:border-lake-gold/50 focus:ring-1 focus:ring-lake-gold/30 font-sans"
          />
        </div>

        {/* --- Asset rows --- */}
        <div>
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-sm font-semibold text-lake-ice-muted uppercase tracking-[0.18em]">
              Transfers
            </h2>
            <button
              type="button"
              onClick={addRow}
              className="text-xs uppercase tracking-wider text-lake-gold hover:text-lake-gold/80"
            >
              + Add transfer
            </button>
          </div>

          <div className="space-y-3">
            {rows.map((row, idx) => (
              <div
                key={idx}
                className="relative bg-lake-blue-dark/30 border border-lake-blue-light/20 rounded-md p-4 pr-12"
              >
                {/* Remove transfer */}
                <button
                  type="button"
                  onClick={() => removeRow(idx)}
                  aria-label={`Remove transfer ${idx + 1}`}
                  className="absolute top-2 right-2 w-7 h-7 inline-flex items-center justify-center rounded text-lake-ice-muted hover:text-lake-error hover:bg-lake-error/10 transition-colors"
                >
                  <svg aria-hidden="true" viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                    <path d="M5 5 L15 15 M15 5 L5 15" />
                  </svg>
                </button>

                {/* From → To row */}
                <div className="flex flex-wrap items-end gap-3 mb-3">
                  <div className="flex-1 min-w-[160px] flex flex-col gap-1">
                    <label className="text-[10px] uppercase tracking-wider text-lake-ice-muted">
                      From
                    </label>
                    <select
                      value={row.fromTeamId ?? ''}
                      onChange={(e) =>
                        updateRow(idx, {
                          fromTeamId: e.target.value ? parseInt(e.target.value, 10) : null,
                        })
                      }
                      className="px-2.5 py-1.5 bg-lake-blue-dark/60 border border-lake-blue-light/30 rounded text-lake-ice text-sm focus:outline-none focus:border-lake-gold/50"
                    >
                      <option value="">—</option>
                      {teams.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="text-lake-ice-muted pb-1.5 select-none" aria-hidden="true">
                    →
                  </div>
                  <div className="flex-1 min-w-[160px] flex flex-col gap-1">
                    <label className="text-[10px] uppercase tracking-wider text-lake-ice-muted">
                      To
                    </label>
                    <select
                      value={row.toTeamId ?? ''}
                      onChange={(e) =>
                        updateRow(idx, {
                          toTeamId: e.target.value ? parseInt(e.target.value, 10) : null,
                        })
                      }
                      className="px-2.5 py-1.5 bg-lake-blue-dark/60 border border-lake-blue-light/30 rounded text-lake-ice text-sm focus:outline-none focus:border-lake-gold/50"
                    >
                      <option value="">—</option>
                      {teams.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase tracking-wider text-lake-ice-muted">
                      Kind
                    </label>
                    <select
                      value={row.assetKind}
                      onChange={(e) => updateRow(idx, { assetKind: e.target.value as AssetKind })}
                      className="px-2.5 py-1.5 bg-lake-blue-dark/60 border border-lake-blue-light/30 rounded text-lake-ice text-sm focus:outline-none focus:border-lake-gold/50"
                    >
                      <option value="pick">Pick</option>
                      <option value="player">Player</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                {/* Asset details */}
                {row.assetKind === 'pick' && (
                  <div className="flex flex-wrap gap-3">
                    <div className="flex flex-col gap-1 w-24">
                      <label className="text-[10px] uppercase tracking-wider text-lake-ice-muted">
                        Year
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="\d{4}"
                        value={row.pickYear}
                        onChange={(e) => updateRow(idx, { pickYear: e.target.value })}
                        placeholder="2026"
                        className="px-2.5 py-1.5 bg-lake-blue-dark/60 border border-lake-blue-light/30 rounded text-lake-ice text-sm placeholder-lake-ice/40 focus:outline-none focus:border-lake-gold/50"
                      />
                    </div>
                    <div className="flex flex-col gap-1 w-28">
                      <label className="text-[10px] uppercase tracking-wider text-lake-ice-muted">
                        Round
                      </label>
                      <select
                        value={row.pickRound ?? ''}
                        onChange={(e) =>
                          updateRow(idx, { pickRound: e.target.value ? (parseInt(e.target.value, 10) as 1 | 2) : null })
                        }
                        className="px-2.5 py-1.5 bg-lake-blue-dark/60 border border-lake-blue-light/30 rounded text-lake-ice text-sm focus:outline-none focus:border-lake-gold/50"
                      >
                        <option value="1">1st</option>
                        <option value="2">2nd</option>
                      </select>
                    </div>
                    <div className="flex-1 min-w-[200px] flex flex-col gap-1">
                      <label className="text-[10px] uppercase tracking-wider text-lake-ice-muted">
                        Original team <span className="opacity-60">(if not From)</span>
                      </label>
                      <select
                        value={row.pickOriginalTeamId ?? ''}
                        onChange={(e) =>
                          updateRow(idx, {
                            pickOriginalTeamId: e.target.value ? parseInt(e.target.value, 10) : null,
                          })
                        }
                        className="px-2.5 py-1.5 bg-lake-blue-dark/60 border border-lake-blue-light/30 rounded text-lake-ice text-sm focus:outline-none focus:border-lake-gold/50"
                      >
                        <option value="">same as From</option>
                        {teams.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {row.assetKind === 'player' && (
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase tracking-wider text-lake-ice-muted">
                      Player
                    </label>
                    <input
                      type="text"
                      value={row.playerName}
                      onChange={(e) => updateRow(idx, { playerName: e.target.value })}
                      placeholder="Player name"
                      className="px-2.5 py-1.5 bg-lake-blue-dark/60 border border-lake-blue-light/30 rounded text-lake-ice text-sm placeholder-lake-ice/40 focus:outline-none focus:border-lake-gold/50"
                    />
                  </div>
                )}

                {row.assetKind === 'other' && (
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase tracking-wider text-lake-ice-muted">
                      Description
                    </label>
                    <input
                      type="text"
                      value={row.description}
                      onChange={(e) => updateRow(idx, { description: e.target.value })}
                      placeholder="Better of the two 2nd-round picks"
                      className="px-2.5 py-1.5 bg-lake-blue-dark/60 border border-lake-blue-light/30 rounded text-lake-ice text-sm placeholder-lake-ice/40 focus:outline-none focus:border-lake-gold/50"
                    />
                  </div>
                )}

                {/* Condition (always available) */}
                <div className="flex flex-col gap-1 mt-3">
                  <label className="text-[10px] uppercase tracking-wider text-lake-ice-muted">
                    Condition <span className="opacity-60">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={row.condition}
                    onChange={(e) => updateRow(idx, { condition: e.target.value })}
                    placeholder="if Goons win 2025 championship, becomes a 1st-round pick"
                    className="px-2.5 py-1.5 bg-lake-blue-dark/60 border border-lake-blue-light/30 rounded text-lake-ice text-sm placeholder-lake-ice/40 focus:outline-none focus:border-lake-gold/50"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2 rounded-md bg-lake-gold text-lake-blue-dark font-semibold disabled:opacity-50 hover:bg-lake-gold/90 transition-colors"
          >
            {submitting ? 'Saving…' : 'Record trade'}
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

      {/* --- Existing trades --- */}
      <section>
        <h2 className="text-sm font-semibold text-lake-ice-muted uppercase tracking-[0.18em] mb-3">
          Recorded
        </h2>
        {existing.length === 0 ? (
          <p className="text-lake-ice-muted text-sm italic">No trades on the ledger yet.</p>
        ) : (
          <ul className="divide-y divide-lake-blue-light/15">
            {existing.map((t) => (
              <li key={t.id} className="flex items-center gap-4 py-3">
                <time className="text-xs text-lake-gold tabular-nums w-24 shrink-0">
                  {t.tradeDate}
                </time>
                <span className="flex-1 truncate text-lake-ice">
                  {t.name ?? <span className="text-lake-ice-muted italic">unnamed</span>}
                </span>
                <span className="text-xs text-lake-ice-muted tabular-nums">
                  {t.assetCount} {t.assetCount === 1 ? 'transfer' : 'transfers'}
                </span>
                <button
                  type="button"
                  onClick={() => deleteTrade(t.id)}
                  className="text-xs text-lake-ice-muted hover:text-lake-error"
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
