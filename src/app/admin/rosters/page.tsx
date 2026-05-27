'use client';

import Image from 'next/image';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { CURRENT_SEASON } from '@/lib/season';
import { LAKELAND_CUP_SEASONS } from '@/lib/yahoo-leagues';

function isSeasonEndedClient(season: string): boolean {
  const m = season.match(/^(\d{4})-(\d{2})$/);
  if (!m) return false;
  const endYear = parseInt(m[1], 10) + 1;
  const now = new Date();
  const cutoff = new Date(endYear, 4, 1);
  return now >= cutoff;
}

interface SyncResult {
  season: string;
  teamsSynced: number;
  totalPlayers: number;
  matched: { teamName: string; yahooName: string; players: number }[];
  unmatched: { yahooName: string; playerCount: number }[];
}

interface Team {
  id: number;
  name: string;
  logo: string | null;
  isActive: boolean;
}

interface RosterResponse {
  seasons: string[];
  rosters: Record<number, string[]>;
}

export default function AdminRostersPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [seasons, setSeasons] = useState<string[]>([]);
  const [season, setSeason] = useState<string>(CURRENT_SEASON);
  const [rosters, setRosters] = useState<Record<number, string[]>>({});
  const [editingTeamId, setEditingTeamId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<string>('');
  const [newSeasonInput, setNewSeasonInput] = useState<string>('');
  const [submitting, setSubmitting] = useState<number | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [yahooConfigured, setYahooConfigured] = useState<boolean | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<SyncResult | null>(null);

  useEffect(() => {
    fetch('/api/admin/rosters/sync')
      .then((r) => r.json())
      .then((d) => setYahooConfigured(Boolean(d.configured)))
      .catch(() => setYahooConfigured(false));
  }, []);

  const fetchSeason = useCallback(async (s: string) => {
    try {
      const res = await fetch(`/api/admin/rosters?season=${encodeURIComponent(s)}`);
      const data = (await res.json()) as RosterResponse;
      setSeasons(data.seasons ?? []);
      setRosters(data.rosters ?? {});
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetch('/api/teams')
      .then((r) => r.json())
      .then(setTeams)
      .catch(console.error);
    fetchSeason(season);
  }, [season, fetchSeason]);

  const activeTeams = useMemo(
    () => teams.filter((t) => t.isActive).sort((a, b) => a.name.localeCompare(b.name)),
    [teams],
  );

  function startEdit(teamId: number) {
    setEditingTeamId(teamId);
    setEditDraft((rosters[teamId] ?? []).join('\n'));
  }

  function cancelEdit() {
    setEditingTeamId(null);
    setEditDraft('');
  }

  async function saveTeamRoster(teamId: number) {
    setSubmitting(teamId);
    setMessage(null);
    try {
      const players = editDraft
        .split('\n')
        .map((p) => p.trim())
        .filter((p) => p.length > 0);
      const res = await fetch('/api/admin/rosters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId, season, players }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.message ?? 'Save failed');
      setMessage({
        type: 'success',
        text: `Saved ${players.length} ${players.length === 1 ? 'player' : 'players'} for ${
          teams.find((t) => t.id === teamId)?.name ?? 'team'
        }.`,
      });
      cancelEdit();
      await fetchSeason(season);
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Save failed' });
    } finally {
      setSubmitting(null);
    }
  }

  async function clearTeamRoster(teamId: number) {
    if (!confirm(`Clear ${season} roster for this team?`)) return;
    try {
      const res = await fetch(`/api/admin/rosters?season=${encodeURIComponent(season)}&teamId=${teamId}`, {
        method: 'DELETE',
      });
      if (res.ok) await fetchSeason(season);
    } catch (err) {
      console.error(err);
    }
  }

  async function syncFromYahoo() {
    if (!isSeasonEndedClient(season)) {
      setMessage({
        type: 'error',
        text: `The ${season} season hasn’t ended yet. Sync becomes available May 1 of its end year.`,
      });
      return;
    }
    if (
      !confirm(
        `Sync ${season} rosters from Yahoo? This will replace any existing roster history for that season.`,
      )
    )
      return;
    setSyncing(true);
    setMessage(null);
    setLastSync(null);
    try {
      const res = await fetch('/api/admin/rosters/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ season }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.message ?? 'Sync failed');
      setLastSync(json as SyncResult);
      setMessage({
        type: 'success',
        text: `Synced ${json.teamsSynced} teams (${json.totalPlayers} players) from Yahoo for ${season}.`,
      });
      await fetchSeason(season);
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Sync failed' });
    } finally {
      setSyncing(false);
    }
  }

  function addNewSeason() {
    const val = newSeasonInput.trim();
    if (!/^\d{4}-\d{2}$/.test(val)) {
      setMessage({ type: 'error', text: 'Season must look like 2025-26.' });
      return;
    }
    setSeason(val);
    setNewSeasonInput('');
    setMessage(null);
  }

  const totalPlayers = Object.values(rosters).reduce((n, list) => n + list.length, 0);

  return (
    <div className="max-w-5xl">
      <header className="mb-8">
        <p className="text-xs uppercase tracking-[0.25em] text-lake-gold mb-2">Commissioner</p>
        <h1 className="text-2xl font-bold text-lake-ice tracking-tight">Roster history</h1>
        <p className="text-lake-ice-muted mt-1 max-w-prose">
          Snapshot each team&rsquo;s roster once per season. The franchise-candidates detector on
          the Rafters page reads from this table to surface 10+ consecutive-year players.
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

      {/* Season switcher + new season + copy */}
      <div className="bg-lake-blue/30 rounded-lg border border-lake-blue-light/20 p-6 mb-8">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="season" className="text-xs font-medium text-lake-ice-muted uppercase tracking-wider">
              Season
            </label>
            <select
              id="season"
              value={season}
              onChange={(e) => {
                setSeason(e.target.value);
                cancelEdit();
              }}
              className="px-3 py-2 bg-lake-blue-dark/50 border border-lake-blue-light/30 rounded-md text-lake-ice tabular-nums focus:outline-none focus:border-lake-gold/50 focus:ring-1 focus:ring-lake-gold/30"
            >
              {/* Every Lakeland Cup season, plus anything already in the DB
                  and whatever's currently selected (covers future seasons
                  not yet in LAKELAND_CUP_SEASONS). */}
              {Array.from(
                new Set([
                  ...Object.keys(LAKELAND_CUP_SEASONS),
                  CURRENT_SEASON,
                  season,
                  ...seasons,
                ]),
              )
                .sort()
                .reverse()
                .map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="new-season" className="text-xs font-medium text-lake-ice-muted uppercase tracking-wider">
              Start a new season
            </label>
            <div className="flex gap-2">
              <input
                id="new-season"
                type="text"
                pattern="\d{4}-\d{2}"
                inputMode="numeric"
                value={newSeasonInput}
                onChange={(e) => setNewSeasonInput(e.target.value)}
                placeholder="2026-27"
                className="w-28 px-3 py-2 bg-lake-blue-dark/50 border border-lake-blue-light/30 rounded-md text-lake-ice placeholder-lake-ice/40 tabular-nums focus:outline-none focus:border-lake-gold/50 focus:ring-1 focus:ring-lake-gold/30"
              />
              <button
                type="button"
                onClick={addNewSeason}
                className="px-3 py-2 rounded-md border border-lake-gold/40 text-lake-gold hover:bg-lake-gold/10 transition-colors text-sm"
              >
                Switch
              </button>
            </div>
          </div>
          <span className="ml-auto text-xs text-lake-ice-muted tabular-nums">
            {totalPlayers} {totalPlayers === 1 ? 'player' : 'players'} on file
          </span>
        </div>

        {/* Yahoo sync row */}
        <div className="mt-5 pt-5 border-t border-lake-blue-light/15">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={syncFromYahoo}
              disabled={
                syncing ||
                yahooConfigured === false ||
                !isSeasonEndedClient(season)
              }
              className="px-4 py-2 rounded-md bg-lake-gold text-lake-blue-dark font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-lake-gold/90 transition-colors text-sm"
            >
              {syncing ? 'Syncing…' : `Sync ${season} from Yahoo`}
            </button>
            <span className="text-xs text-lake-ice-muted max-w-md leading-snug">
              {yahooConfigured === false ? (
                <>Yahoo isn&rsquo;t configured on the server &mdash; set <code className="font-mono">YAHOO_CLIENT_ID</code>, <code className="font-mono">YAHOO_CLIENT_SECRET</code>, and <code className="font-mono">YAHOO_REFRESH_TOKEN</code> in the env.</>
              ) : !isSeasonEndedClient(season) ? (
                <>Available May 1 of the season&rsquo;s end year, after the regular season has wrapped.</>
              ) : (
                <>Pulls each team&rsquo;s end-of-season roster from Yahoo and overwrites any existing snapshot for {season}.</>
              )}
            </span>
          </div>
          {lastSync && lastSync.unmatched.length > 0 && (
            <details className="mt-3 text-xs" open>
              <summary className="cursor-pointer text-lake-warning hover:text-lake-warning/90 select-none">
                {lastSync.unmatched.length} Yahoo team{lastSync.unmatched.length === 1 ? '' : 's'} not matched to a franchise
              </summary>
              <ul className="mt-2 space-y-1 pl-3 text-lake-ice-muted">
                {lastSync.unmatched.map((u, i) => (
                  <li key={i} className="flex items-baseline gap-3">
                    <span className="text-lake-ice">{u.yahooName}</span>
                    <span className="tabular-nums">{u.playerCount} players</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-lake-ice-muted max-w-prose">
                Fix by setting the Yahoo team&rsquo;s name (or matching <code className="font-mono">formerName</code>) on the franchise in <a href="/admin/teams" className="text-lake-gold hover:text-lake-gold/80">/admin/teams</a>, then re-sync.
              </p>
            </details>
          )}
        </div>
      </div>

      {/* Per-team cards */}
      <section className="space-y-3">
        {activeTeams.map((team) => {
          const roster = rosters[team.id] ?? [];
          const isEditing = editingTeamId === team.id;
          return (
            <article
              key={team.id}
              className="bg-lake-blue/20 rounded-lg border border-lake-blue-light/20 p-4"
            >
              <header className="flex items-center gap-3 mb-3">
                {team.logo && (
                  <Image
                    src={`/images/teams/${team.logo}`}
                    alt=""
                    width={28}
                    height={28}
                    className="rounded-full flex-shrink-0"
                  />
                )}
                <h2 className="text-sm font-semibold text-lake-ice flex-1">{team.name}</h2>
                <span className="text-xs text-lake-ice-muted tabular-nums">
                  {roster.length} {roster.length === 1 ? 'player' : 'players'}
                </span>
                {!isEditing ? (
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => startEdit(team.id)}
                      className="text-xs uppercase tracking-wider text-lake-ice-muted hover:text-lake-gold"
                    >
                      edit
                    </button>
                    {roster.length > 0 && (
                      <button
                        type="button"
                        onClick={() => clearTeamRoster(team.id)}
                        className="text-xs uppercase tracking-wider text-lake-ice-muted hover:text-lake-error"
                      >
                        clear
                      </button>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="text-xs uppercase tracking-wider text-lake-ice-muted hover:text-lake-ice"
                  >
                    cancel
                  </button>
                )}
              </header>

              {!isEditing ? (
                roster.length === 0 ? (
                  <p className="text-lake-ice-muted text-sm italic">No roster recorded yet.</p>
                ) : (
                  <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-1 text-sm text-lake-ice">
                    {roster.map((p) => (
                      <li key={p} className="truncate">
                        {p}
                      </li>
                    ))}
                  </ul>
                )
              ) : (
                <div>
                  <label
                    htmlFor={`roster-${team.id}`}
                    className="text-[10px] uppercase tracking-wider text-lake-ice-muted block mb-1"
                  >
                    One player per line. Save replaces the entire roster for {season}.
                  </label>
                  <textarea
                    id={`roster-${team.id}`}
                    rows={Math.max(8, editDraft.split('\n').length + 1)}
                    value={editDraft}
                    onChange={(e) => setEditDraft(e.target.value)}
                    placeholder={'Sidney Crosby\nEvgeni Malkin\nKris Letang\n…'}
                    className="w-full px-3 py-2 bg-lake-blue-dark/50 border border-lake-blue-light/30 rounded-md text-lake-ice placeholder-lake-ice/40 font-mono text-sm leading-relaxed focus:outline-none focus:border-lake-gold/50 focus:ring-1 focus:ring-lake-gold/30"
                  />
                  <div className="mt-3 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => saveTeamRoster(team.id)}
                      disabled={submitting === team.id}
                      className="px-4 py-2 rounded-md bg-lake-gold text-lake-blue-dark font-semibold disabled:opacity-50 hover:bg-lake-gold/90 transition-colors text-sm"
                    >
                      {submitting === team.id ? 'Saving…' : 'Save roster'}
                    </button>
                    <span className="text-xs text-lake-ice-muted tabular-nums">
                      {editDraft.split('\n').filter((p) => p.trim()).length} players
                    </span>
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </section>
    </div>
  );
}
