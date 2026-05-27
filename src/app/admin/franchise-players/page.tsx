'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CURRENT_SEASON, isCurrentRoster, seasonStartYear, seasonShortEnd, computeYears } from '@/lib/season';

interface Team {
  id: number;
  name: string;
  logo: string | null;
  isActive: boolean;
}

interface FPRow {
  id: number;
  playerName: string;
  jerseyNumber: string | null;
  position: string | null;
  teamId: number | null;
  teamName: string;
  years: number;
  games: number | null;
  seasonStart: string | null;
  seasonEnd: string | null;
}

interface DraftState {
  playerName: string;
  jerseyNumber: string;
  position: string;
  teamId: number | null;
  seasonStart: string;
  seasonEnd: string;
}

const POSITIONS = ['', 'C', 'LW', 'RW', 'D', 'F', 'G'] as const;

function emptyDraft(): DraftState {
  return {
    playerName: '',
    jerseyNumber: '',
    position: '',
    teamId: null,
    seasonStart: '',
    seasonEnd: '',
  };
}

// Years derived from season range. seasonStart is required for the form;
// seasonEnd null/blank means "still current" so we use CURRENT_SEASON.
interface Candidate {
  playerName: string;
  teamId: number;
  teamName: string | null;
  teamLogo: string | null;
  run: number;
  seasonStart: string;
  seasonEnd: string;
  jerseyNumber: string | null;
  position: string | null;
}

interface StaleBanner {
  id: number;
  playerName: string;
  teamId: number | null;
  teamName: string;
  teamLogo: string | null;
  lastSeason: string;
  teamLatestSeason: string;
  suggestedEnd: string;
}

interface CandidatesResponse {
  threshold: number;
  candidates: Candidate[];
  nearMisses: Candidate[];
  staleBanners: StaleBanner[];
  hasRosterData: boolean;
}

export default function AdminFranchisePlayersPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [rows, setRows] = useState<FPRow[]>([]);
  const [candidates, setCandidates] = useState<CandidatesResponse | null>(null);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<DraftState>(emptyDraft());
  const [formOpen, setFormOpen] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  async function load() {
    try {
      const [t, r, c] = await Promise.all([
        fetch('/api/teams').then((res) => res.json()),
        fetch('/api/admin/franchise-players').then((res) => res.json()),
        fetch('/api/admin/franchise-candidates').then((res) => res.json()),
      ]);
      setTeams(t);
      setRows(Array.isArray(r) ? r : []);
      setCandidates(c);
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const formRef = useRef<HTMLFormElement>(null);

  function applyCandidate(c: Candidate) {
    setEditingId(null);
    setDraft({
      playerName: c.playerName,
      jerseyNumber: c.jerseyNumber ?? '',
      position: c.position ?? '',
      teamId: c.teamId,
      seasonStart: c.seasonStart,
      seasonEnd: '', // Leave blank — admin can set it if streak has ended.
    });
    setFormOpen(true);
    setMessage(null);
    // Defer until the form has been rendered.
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  const activeTeams = useMemo(() => teams.filter((t) => t.isActive), [teams]);
  const formerTeams = useMemo(() => teams.filter((t) => !t.isActive), [teams]);

  // Group rows by team for display
  const grouped = useMemo(() => {
    const m = new Map<string, FPRow[]>();
    for (const r of rows) {
      const key = r.teamName ?? 'Unknown';
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(r);
    }
    Array.from(m.values()).forEach((list) => {
      list.sort((a, b) => (b.years - a.years) || a.playerName.localeCompare(b.playerName));
    });
    return Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [rows]);

  const isEditing = editingId !== null;

  function loadIntoForm(r: FPRow, overrides?: { seasonEnd?: string }) {
    setEditingId(r.id);
    setDraft({
      playerName: r.playerName,
      jerseyNumber: r.jerseyNumber ?? '',
      position: r.position ?? '',
      teamId: r.teamId,
      seasonStart: r.seasonStart ?? '',
      seasonEnd: overrides?.seasonEnd ?? r.seasonEnd ?? '',
    });
    setFormOpen(true);
    setMessage(null);
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  function closeBanner(s: StaleBanner) {
    const row = rows.find((r) => r.id === s.id);
    if (!row) {
      setMessage({ type: 'error', text: `Could not find banner #${s.id} in current list.` });
      return;
    }
    loadIntoForm(row, { seasonEnd: s.suggestedEnd });
  }

  function reset() {
    setEditingId(null);
    setDraft(emptyDraft());
    setFormOpen(false);
    setMessage(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setSubmitting(true);
    try {
      const years = computeYears(draft.seasonStart.trim(), draft.seasonEnd.trim(), CURRENT_SEASON);
      const payload = {
        playerName: draft.playerName.trim(),
        jerseyNumber: draft.jerseyNumber.trim() || null,
        position: draft.position || null,
        teamId: draft.teamId,
        years,
        seasonStart: draft.seasonStart.trim() || null,
        seasonEnd: draft.seasonEnd.trim() || null,
      };
      const res = await fetch(
        isEditing
          ? `/api/admin/franchise-players?id=${editingId}`
          : '/api/admin/franchise-players',
        {
          method: isEditing ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.message ?? 'Save failed');
      setMessage({
        type: 'success',
        text: isEditing ? `${payload.playerName} updated.` : `Added ${payload.playerName}.`,
      });
      await load();
      reset();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Save failed' });
    } finally {
      setSubmitting(false);
    }
  }

  async function deletePlayer(id: number, name: string) {
    if (!confirm(`Remove ${name} from the Rafters? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/admin/franchise-players?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        if (editingId === id) reset();
        await load();
      }
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="max-w-4xl">
      <header className="mb-8">
        <p className="text-xs uppercase tracking-[0.25em] text-lake-gold mb-2">Commissioner</p>
        <h1 className="text-2xl font-bold text-lake-ice tracking-tight">Franchise players</h1>
        <p className="text-lake-ice-muted mt-1">
          Players who earned a banner in the Rafters — 10+ years with the same franchise.
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

      {/* Stale banners — the player is no longer on the team's latest roster */}
      {candidates && candidates.staleBanners.length > 0 && (
        <section className="mb-6 bg-lake-warning/10 rounded-lg border border-lake-warning/30 p-5">
          <header className="flex items-baseline justify-between gap-4 mb-2">
            <h2 className="text-sm font-semibold text-lake-warning uppercase tracking-[0.18em]">
              Banners to review
            </h2>
            <span className="text-[10px] uppercase tracking-wider text-lake-ice-muted tabular-nums">
              {candidates.staleBanners.length}
            </span>
          </header>
          <p className="text-xs text-lake-ice-muted mb-4 max-w-prose">
            Marked as still active, but the player isn&rsquo;t on the team&rsquo;s latest synced
            roster. Click &ldquo;close banner&rdquo; to pre-fill the form with the last season they
            appeared.
          </p>
          <ul className="space-y-1.5">
            {candidates.staleBanners.map((s) => (
              <li
                key={`stale-${s.id}`}
                className="grid grid-cols-[2rem_minmax(0,1fr)_minmax(0,1fr)_8rem_auto] items-baseline gap-3 py-1.5"
              >
                {s.teamLogo ? (
                  <Image
                    src={`/images/teams/${s.teamLogo}`}
                    alt=""
                    width={24}
                    height={24}
                    className="rounded-full"
                  />
                ) : (
                  <span className="w-6 h-6 rounded-full bg-lake-blue-light/20 inline-block" aria-hidden="true" />
                )}
                <span className="text-sm text-lake-ice truncate">{s.playerName}</span>
                <span className="text-xs text-lake-ice-muted truncate">{s.teamName}</span>
                <span className="text-xs text-lake-warning tabular-nums whitespace-nowrap">
                  close at {s.suggestedEnd}
                </span>
                <button
                  type="button"
                  onClick={() => closeBanner(s)}
                  className="text-xs uppercase tracking-wider text-lake-warning hover:text-lake-warning/80"
                >
                  close banner →
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Candidates surfaced from roster_history */}
      {candidates && (candidates.candidates.length > 0 || candidates.nearMisses.length > 0) && (
        <section className="mb-10 bg-lake-blue/20 rounded-lg border border-lake-gold/20 p-5">
          <header className="flex items-baseline justify-between gap-4 mb-3">
            <h2 className="text-sm font-semibold text-lake-gold uppercase tracking-[0.18em]">
              Possible candidates
            </h2>
            <Link
              href="/admin/rosters"
              className="text-[10px] uppercase tracking-wider text-lake-ice-muted hover:text-lake-gold"
            >
              Manage rosters →
            </Link>
          </header>
          <p className="text-xs text-lake-ice-muted mb-4 max-w-prose">
            From the roster snapshots. Surfaces (player, team) pairs with a consecutive-season
            streak of {candidates.threshold}+ that aren&rsquo;t already on the Rafters. Near-misses
            (8&ndash;9 streaks) help you plan ahead.
          </p>
          {candidates.candidates.length > 0 && (
            <ul className="space-y-1.5 mb-3">
              {candidates.candidates.map((c, i) => (
                <li
                  key={`cand-${i}`}
                  className="grid grid-cols-[2rem_minmax(0,1fr)_minmax(0,1fr)_4rem_auto] items-baseline gap-3 py-1.5"
                >
                  {c.teamLogo ? (
                    <Image
                      src={`/images/teams/${c.teamLogo}`}
                      alt=""
                      width={24}
                      height={24}
                      className="rounded-full"
                    />
                  ) : (
                    <span className="w-6 h-6 rounded-full bg-lake-blue-light/20 inline-block" aria-hidden="true" />
                  )}
                  <span className="text-sm text-lake-ice truncate">{c.playerName}</span>
                  <span className="text-xs text-lake-ice-muted truncate">{c.teamName ?? '—'}</span>
                  <span className="text-xs text-lake-gold tabular-nums">
                    {c.run} yrs
                  </span>
                  <button
                    type="button"
                    onClick={() => applyCandidate(c)}
                    className="text-xs uppercase tracking-wider text-lake-gold hover:text-lake-gold/80"
                  >
                    raise banner →
                  </button>
                </li>
              ))}
            </ul>
          )}
          {candidates.nearMisses.length > 0 && (
            <details className="text-xs">
              <summary className="cursor-pointer text-lake-ice-muted hover:text-lake-ice select-none">
                {candidates.nearMisses.length} near-{candidates.nearMisses.length === 1 ? 'miss' : 'misses'} (8&ndash;9 seasons)
              </summary>
              <ul className="mt-2 space-y-1 pl-3">
                {candidates.nearMisses.map((c, i) => (
                  <li key={`near-${i}`} className="flex items-baseline gap-3 text-lake-ice-muted">
                    <span className="text-lake-ice truncate min-w-0 flex-1">{c.playerName}</span>
                    <span className="truncate">{c.teamName ?? '—'}</span>
                    <span className="tabular-nums">{c.run} yrs</span>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </section>
      )}

      {candidates && !candidates.hasRosterData && (
        <section className="mb-10 bg-lake-blue/15 rounded-lg border border-lake-blue-light/20 p-5">
          <h2 className="text-sm font-semibold text-lake-ice-muted uppercase tracking-[0.18em] mb-2">
            No roster snapshots yet
          </h2>
          <p className="text-xs text-lake-ice-muted mb-4 max-w-prose">
            The candidates detector reads from <Link href="/admin/rosters" className="text-lake-gold hover:text-lake-gold/80">roster history</Link>.
            Once you log this season&rsquo;s rosters, players who cross the 10-year threshold will appear here automatically.
          </p>
          <Link
            href="/admin/rosters"
            className="inline-block text-xs uppercase tracking-wider text-lake-gold hover:text-lake-gold/80"
          >
            Manage rosters →
          </Link>
        </section>
      )}

      {!formOpen && !isEditing && (
        <div className="mb-10">
          <button
            type="button"
            onClick={() => setFormOpen(true)}
            className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.18em] text-lake-ice-muted hover:text-lake-gold transition-colors"
          >
            <span aria-hidden="true" className="text-base leading-none">+</span>
            Retire a number
          </button>
        </div>
      )}

      {(formOpen || isEditing) && (
        <form
          ref={formRef}
          onSubmit={submit}
          className="bg-lake-blue/30 rounded-lg border border-lake-blue-light/20 p-6 space-y-5 mb-12"
        >
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="text-sm font-semibold text-lake-ice-muted uppercase tracking-[0.18em]">
              {isEditing ? `Editing ${draft.playerName || '…'}` : 'New banner'}
            </h2>
            <button
              type="button"
              onClick={reset}
              className="text-xs uppercase tracking-wider text-lake-ice-muted hover:text-lake-ice"
            >
              {isEditing ? 'cancel edit' : 'close'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_120px_100px] gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="playerName" className="text-xs font-medium text-lake-ice-muted uppercase tracking-wider">
                Player
              </label>
              <input
                id="playerName"
                type="text"
                required
                value={draft.playerName}
                onChange={(e) => setDraft({ ...draft, playerName: e.target.value })}
                placeholder="Sidney Crosby"
                className="px-3 py-2 bg-lake-blue-dark/50 border border-lake-blue-light/30 rounded-md text-lake-ice placeholder-lake-ice/40 focus:outline-none focus:border-lake-gold/50 focus:ring-1 focus:ring-lake-gold/30"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="jersey" className="text-xs font-medium text-lake-ice-muted uppercase tracking-wider">
                Jersey #
              </label>
              <input
                id="jersey"
                type="text"
                inputMode="numeric"
                value={draft.jerseyNumber}
                onChange={(e) => setDraft({ ...draft, jerseyNumber: e.target.value })}
                placeholder="87"
                className="px-3 py-2 bg-lake-blue-dark/50 border border-lake-blue-light/30 rounded-md text-lake-ice placeholder-lake-ice/40 tabular-nums focus:outline-none focus:border-lake-gold/50 focus:ring-1 focus:ring-lake-gold/30"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="position" className="text-xs font-medium text-lake-ice-muted uppercase tracking-wider">
                Position
              </label>
              <select
                id="position"
                value={draft.position}
                onChange={(e) => setDraft({ ...draft, position: e.target.value })}
                className="px-3 py-2 bg-lake-blue-dark/50 border border-lake-blue-light/30 rounded-md text-lake-ice focus:outline-none focus:border-lake-gold/50"
              >
                {POSITIONS.map((p) => (
                  <option key={p} value={p}>
                    {p || '—'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="teamId" className="text-xs font-medium text-lake-ice-muted uppercase tracking-wider">
              Franchise
            </label>
            <select
              id="teamId"
              required
              value={draft.teamId ?? ''}
              onChange={(e) =>
                setDraft({ ...draft, teamId: e.target.value ? parseInt(e.target.value, 10) : null })
              }
              className="px-3 py-2 bg-lake-blue-dark/50 border border-lake-blue-light/30 rounded-md text-lake-ice focus:outline-none focus:border-lake-gold/50"
            >
              <option value="">—</option>
              <optgroup label="Active">
                {activeTeams.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </optgroup>
              {formerTeams.length > 0 && (
                <optgroup label="Former">
                  {formerTeams.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </optgroup>
              )}
            </select>
            <p className="text-xs text-lake-ice-muted">
              Team name and team colors are snapshotted at save time, so historical entries stay accurate even if the franchise renames or recolors later.
            </p>
          </div>

          {(() => {
            const years = computeYears(draft.seasonStart, draft.seasonEnd, CURRENT_SEASON);
            return (
              <div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="seasonStart" className="text-xs font-medium text-lake-ice-muted uppercase tracking-wider">
                      First season
                    </label>
                    <input
                      id="seasonStart"
                      type="text"
                      pattern="\d{4}-\d{2}"
                      required
                      value={draft.seasonStart}
                      onChange={(e) => setDraft({ ...draft, seasonStart: e.target.value })}
                      placeholder="2013-14"
                      className="px-3 py-2 bg-lake-blue-dark/50 border border-lake-blue-light/30 rounded-md text-lake-ice placeholder-lake-ice/40 tabular-nums focus:outline-none focus:border-lake-gold/50 focus:ring-1 focus:ring-lake-gold/30"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="seasonEnd" className="text-xs font-medium text-lake-ice-muted uppercase tracking-wider">
                      Last season <span className="opacity-60 normal-case">(leave blank if still current)</span>
                    </label>
                    <input
                      id="seasonEnd"
                      type="text"
                      pattern="\d{4}-\d{2}"
                      value={draft.seasonEnd}
                      onChange={(e) => setDraft({ ...draft, seasonEnd: e.target.value })}
                      placeholder={`e.g. ${CURRENT_SEASON}`}
                      className="px-3 py-2 bg-lake-blue-dark/50 border border-lake-blue-light/30 rounded-md text-lake-ice placeholder-lake-ice/40 tabular-nums focus:outline-none focus:border-lake-gold/50 focus:ring-1 focus:ring-lake-gold/30"
                    />
                  </div>
                </div>
                <p className="text-xs text-lake-ice-muted mt-2" aria-live="polite">
                  {years > 0
                    ? `Computed: ${years} ${years === 1 ? 'season' : 'seasons'} on the franchise.`
                    : 'Enter a first season to compute total years.'}
                </p>
              </div>
            );
          })()}

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-md bg-lake-gold text-lake-blue-dark font-semibold disabled:opacity-50 hover:bg-lake-gold/90 transition-colors"
            >
              {submitting ? 'Saving…' : isEditing ? 'Save changes' : 'Raise the banner'}
            </button>
            <button
              type="button"
              onClick={reset}
              disabled={submitting}
              className="text-sm text-lake-ice-muted hover:text-lake-ice"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {grouped.length === 0 ? (
        <p className="text-lake-ice-muted text-sm italic">No banners hanging yet.</p>
      ) : (
        <section className="space-y-8">
          {grouped.map(([teamName, players]) => (
            <div key={teamName}>
              <h2 className="text-sm font-semibold text-lake-ice-muted uppercase tracking-[0.18em] mb-2">
                {teamName} <span className="opacity-60 normal-case font-normal">({players.length})</span>
              </h2>
              <ul className="divide-y divide-lake-blue-light/15">
                {players.map((p) => (
                  <li
                    key={p.id}
                    className={`grid grid-cols-[3rem_minmax(0,1fr)_5rem_6rem_auto] items-baseline gap-3 py-2.5 px-2 rounded-md ${
                      editingId === p.id ? 'bg-lake-gold/10' : ''
                    }`}
                  >
                    <span className="text-lake-gold font-semibold tabular-nums text-right">
                      {p.jerseyNumber ?? '—'}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm text-lake-ice truncate">{p.playerName}</span>
                      {p.position && (
                        <span className="block text-xs text-lake-ice-muted">{p.position}</span>
                      )}
                    </span>
                    <span className="text-xs text-lake-ice-muted tabular-nums">
                      {p.years} {p.years === 1 ? 'yr' : 'yrs'}
                    </span>
                    <span className="text-xs text-lake-ice-muted tabular-nums">
                      {p.seasonStart
                        ? isCurrentRoster(p.seasonEnd)
                          ? `${seasonStartYear(p.seasonStart)}–current`
                          : `${seasonStartYear(p.seasonStart)}–${seasonShortEnd(p.seasonEnd!)}`
                        : ''}
                    </span>
                    <span className="flex items-center gap-3 justify-end">
                      <button
                        type="button"
                        onClick={() => loadIntoForm(p)}
                        className="text-xs uppercase tracking-wider text-lake-ice-muted hover:text-lake-gold"
                      >
                        edit
                      </button>
                      <button
                        type="button"
                        onClick={() => deletePlayer(p.id, p.playerName)}
                        className="text-xs uppercase tracking-wider text-lake-ice-muted hover:text-lake-error"
                      >
                        delete
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
