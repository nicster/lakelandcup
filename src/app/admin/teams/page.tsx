'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';

interface TeamRow {
  id: number;
  name: string;
  owner: string;
  formerName: string | null;
  logo: string | null;
  colors: string | null;
  email: string | null;
  isCommissioner: boolean;
}

interface ActivityHint {
  id: number;
  isActive: boolean;
}

interface DraftState {
  name: string;
  owner: string;
  formerName: string;
  logo: string;
  color1: string;
  color2: string;
  color3: string;
  email: string;
  isCommissioner: boolean;
}

const DEFAULT_COLORS = ['#1e3a5f', '#e8f4f8', '#c9a227'] as const;

function emptyDraft(): DraftState {
  return {
    name: '',
    owner: '',
    formerName: '',
    logo: '',
    color1: DEFAULT_COLORS[0],
    color2: DEFAULT_COLORS[1],
    color3: DEFAULT_COLORS[2],
    email: '',
    isCommissioner: false,
  };
}

function parseColors(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    if (Array.isArray(arr) && arr.every((c) => typeof c === 'string')) return arr;
  } catch {
    /* malformed */
  }
  return [];
}

export default function AdminTeamsPage() {
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [activeIds, setActiveIds] = useState<Set<number>>(new Set());
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<DraftState>(emptyDraft());
  const [formOpen, setFormOpen] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [t, activityList] = await Promise.all([
          fetch('/api/admin/teams').then((r) => r.json()),
          fetch('/api/teams').then((r) => r.json()),
        ]);
        setTeams(t);
        setActiveIds(
          new Set(
            (activityList as ActivityHint[]).filter((x) => x.isActive).map((x) => x.id),
          ),
        );
      } catch (err) {
        console.error(err);
      }
    }
    load();
  }, []);

  const activeTeams = useMemo(
    () => teams.filter((t) => activeIds.has(t.id)).sort((a, b) => a.name.localeCompare(b.name)),
    [teams, activeIds],
  );
  const formerTeams = useMemo(
    () => teams.filter((t) => !activeIds.has(t.id)).sort((a, b) => a.name.localeCompare(b.name)),
    [teams, activeIds],
  );

  const isEditing = editingId !== null;

  function loadIntoForm(t: TeamRow) {
    const cs = parseColors(t.colors);
    setEditingId(t.id);
    setDraft({
      name: t.name,
      owner: t.owner,
      formerName: t.formerName ?? '',
      logo: t.logo ?? '',
      color1: cs[0] ?? DEFAULT_COLORS[0],
      color2: cs[1] ?? DEFAULT_COLORS[1],
      color3: cs[2] ?? DEFAULT_COLORS[2],
      email: t.email ?? '',
      isCommissioner: t.isCommissioner ?? false,
    });
    setFormOpen(true);
    setMessage(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
      const payload = {
        name: draft.name,
        owner: draft.owner,
        formerName: draft.formerName || null,
        logo: draft.logo || null,
        colors: [draft.color1, draft.color2, draft.color3],
        email: draft.email || null,
        isCommissioner: draft.isCommissioner,
      };
      const res = await fetch(
        isEditing ? `/api/admin/teams?id=${editingId}` : '/api/admin/teams',
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
        text: isEditing ? `${payload.name} updated.` : `${payload.name} added.`,
      });
      const refreshed = await fetch('/api/admin/teams').then((r) => r.json());
      setTeams(refreshed);
      reset();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Save failed' });
    } finally {
      setSubmitting(false);
    }
  }

  function ColorField({
    id,
    label,
    value,
    onChange,
  }: {
    id: string;
    label: string;
    value: string;
    onChange: (v: string) => void;
  }) {
    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={id} className="text-xs font-medium text-lake-ice-muted uppercase tracking-wider">
          {label}
        </label>
        <div className="flex items-stretch gap-2 bg-lake-blue-dark/50 border border-lake-blue-light/30 rounded-md p-1.5">
          <input
            id={id}
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-10 h-9 rounded bg-transparent border-0 cursor-pointer"
            aria-label={`${label} color picker`}
          />
          <input
            type="text"
            value={value}
            onChange={(e) => {
              const v = e.target.value.trim();
              if (/^#?[0-9a-fA-F]{0,6}$/.test(v)) {
                onChange(v.startsWith('#') ? v : `#${v}`);
              }
            }}
            className="flex-1 bg-transparent text-lake-ice text-sm tabular-nums font-mono focus:outline-none px-1"
            aria-label={`${label} hex value`}
          />
        </div>
      </div>
    );
  }

  function TeamRow({ team }: { team: TeamRow }) {
    const colors = parseColors(team.colors);
    const isCurrent = editingId === team.id;
    return (
      <li
        className={`grid grid-cols-[2rem_minmax(0,1fr)_auto_auto] items-center gap-3 py-2.5 px-2 rounded-md ${
          isCurrent ? 'bg-lake-gold/10' : ''
        }`}
      >
        {team.logo ? (
          <Image
            src={`/images/teams/${team.logo}`}
            alt=""
            width={28}
            height={28}
            className="rounded-full"
          />
        ) : (
          <span className="w-7 h-7 rounded-full bg-lake-blue-light/20 inline-flex items-center justify-center text-xs text-lake-ice-muted">
            ?
          </span>
        )}
        <span className="min-w-0">
          <span className="block text-sm text-lake-ice truncate">{team.name}</span>
          <span className="block text-xs text-lake-ice-muted truncate">{team.owner}</span>
        </span>
        <span className="flex items-center gap-0.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-3 h-3 rounded-sm border border-lake-blue-light/30"
              style={{ backgroundColor: colors[i] ?? 'transparent' }}
              aria-hidden="true"
            />
          ))}
        </span>
        <button
          type="button"
          onClick={() => loadIntoForm(team)}
          className="text-xs uppercase tracking-wider text-lake-ice-muted hover:text-lake-gold"
        >
          edit
        </button>
      </li>
    );
  }

  return (
    <div className="max-w-4xl">
      <header className="mb-8">
        <p className="text-xs uppercase tracking-[0.25em] text-lake-gold mb-2">Commissioner</p>
        <h1 className="text-2xl font-bold text-lake-ice tracking-tight">Teams</h1>
        <p className="text-lake-ice-muted mt-1">
          Edit franchise details, jersey colors, and logos. Active vs Former is set in code.
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

      {!formOpen && !isEditing && (
        <div className="mb-10">
          <button
            type="button"
            onClick={() => setFormOpen(true)}
            className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.18em] text-lake-ice-muted hover:text-lake-gold transition-colors"
          >
            <span aria-hidden="true" className="text-base leading-none">+</span>
            Add a new franchise
          </button>
        </div>
      )}

      {(formOpen || isEditing) && (
      <form
        onSubmit={submit}
        className="bg-lake-blue/30 rounded-lg border border-lake-blue-light/20 p-6 space-y-6 mb-12"
      >
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-sm font-semibold text-lake-ice-muted uppercase tracking-[0.18em]">
            {isEditing ? `Editing ${draft.name || '…'}` : 'New franchise'}
          </h2>
          <button
            type="button"
            onClick={reset}
            className="text-xs uppercase tracking-wider text-lake-ice-muted hover:text-lake-ice"
          >
            {isEditing ? 'cancel edit' : 'close'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="name" className="text-xs font-medium text-lake-ice-muted uppercase tracking-wider">
              Team name
            </label>
            <input
              id="name"
              type="text"
              required
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="Lyss Falcons"
              className="px-3 py-2 bg-lake-blue-dark/50 border border-lake-blue-light/30 rounded-md text-lake-ice placeholder-lake-ice/40 focus:outline-none focus:border-lake-gold/50 focus:ring-1 focus:ring-lake-gold/30"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="owner" className="text-xs font-medium text-lake-ice-muted uppercase tracking-wider">
              Owner (GM)
            </label>
            <input
              id="owner"
              type="text"
              required
              value={draft.owner}
              onChange={(e) => setDraft({ ...draft, owner: e.target.value })}
              placeholder="GM name"
              className="px-3 py-2 bg-lake-blue-dark/50 border border-lake-blue-light/30 rounded-md text-lake-ice placeholder-lake-ice/40 focus:outline-none focus:border-lake-gold/50 focus:ring-1 focus:ring-lake-gold/30"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="formerName" className="text-xs font-medium text-lake-ice-muted uppercase tracking-wider">
              Former name <span className="opacity-60 normal-case">(if renamed)</span>
            </label>
            <input
              id="formerName"
              type="text"
              value={draft.formerName}
              onChange={(e) => setDraft({ ...draft, formerName: e.target.value })}
              placeholder="Schlieren Flyers"
              className="px-3 py-2 bg-lake-blue-dark/50 border border-lake-blue-light/30 rounded-md text-lake-ice placeholder-lake-ice/40 focus:outline-none focus:border-lake-gold/50 focus:ring-1 focus:ring-lake-gold/30"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="logo" className="text-xs font-medium text-lake-ice-muted uppercase tracking-wider">
              Logo filename
            </label>
            <input
              id="logo"
              type="text"
              value={draft.logo}
              onChange={(e) => setDraft({ ...draft, logo: e.target.value })}
              placeholder="lyss-falcons.png"
              className="px-3 py-2 bg-lake-blue-dark/50 border border-lake-blue-light/30 rounded-md text-lake-ice placeholder-lake-ice/40 font-mono text-sm focus:outline-none focus:border-lake-gold/50 focus:ring-1 focus:ring-lake-gold/30"
            />
            <p className="text-xs text-lake-ice-muted leading-snug">
              Drop the file into <code className="font-mono text-lake-ice/80">public/images/teams/</code> in the repo, commit, then enter the filename here.
            </p>
          </div>
        </div>

        {/* Colors */}
        <div>
          <p className="text-xs font-medium text-lake-ice-muted uppercase tracking-wider mb-3">
            Jersey colors <span className="opacity-60 normal-case">— used by the Rafters wall and champion confetti</span>
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <ColorField id="color1" label="Primary" value={draft.color1} onChange={(v) => setDraft({ ...draft, color1: v })} />
            <ColorField id="color2" label="Secondary" value={draft.color2} onChange={(v) => setDraft({ ...draft, color2: v })} />
            <ColorField id="color3" label="Accent" value={draft.color3} onChange={(v) => setDraft({ ...draft, color3: v })} />
          </div>
          {/* Live preview swatch row */}
          <div className="mt-4 flex items-center gap-1 h-8 rounded overflow-hidden border border-lake-blue-light/20" aria-hidden="true">
            <span className="flex-1 h-full" style={{ backgroundColor: draft.color1 }} />
            <span className="flex-1 h-full" style={{ backgroundColor: draft.color2 }} />
            <span className="flex-1 h-full" style={{ backgroundColor: draft.color3 }} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-xs font-medium text-lake-ice-muted uppercase tracking-wider">
              Email <span className="opacity-60 normal-case">(optional)</span>
            </label>
            <input
              id="email"
              type="email"
              value={draft.email}
              onChange={(e) => setDraft({ ...draft, email: e.target.value })}
              placeholder="gm@example.com"
              className="px-3 py-2 bg-lake-blue-dark/50 border border-lake-blue-light/30 rounded-md text-lake-ice placeholder-lake-ice/40 focus:outline-none focus:border-lake-gold/50 focus:ring-1 focus:ring-lake-gold/30"
            />
          </div>
          <label className="flex items-center gap-2 pt-7 cursor-pointer">
            <input
              type="checkbox"
              checked={draft.isCommissioner}
              onChange={(e) => setDraft({ ...draft, isCommissioner: e.target.checked })}
              className="w-4 h-4 rounded border-lake-blue-light/30 bg-lake-blue-dark/50 text-lake-gold focus:ring-lake-gold/30"
            />
            <span className="text-sm text-lake-ice">Commissioner</span>
          </label>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2 rounded-md bg-lake-gold text-lake-blue-dark font-semibold disabled:opacity-50 hover:bg-lake-gold/90 transition-colors"
          >
            {submitting ? 'Saving…' : isEditing ? 'Save changes' : 'Add team'}
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

      <section className="space-y-10">
        <div>
          <h2 className="text-sm font-semibold text-lake-ice-muted uppercase tracking-[0.18em] mb-3">
            Active franchises <span className="font-normal opacity-60 normal-case">({activeTeams.length})</span>
          </h2>
          <ul className="divide-y divide-lake-blue-light/15">
            {activeTeams.map((t) => (
              <TeamRow key={t.id} team={t} />
            ))}
          </ul>
        </div>

        {formerTeams.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-lake-ice-muted uppercase tracking-[0.18em] mb-3">
              Former franchises <span className="font-normal opacity-60 normal-case">({formerTeams.length})</span>
            </h2>
            <ul className="divide-y divide-lake-blue-light/15 opacity-80">
              {formerTeams.map((t) => (
                <TeamRow key={t.id} team={t} />
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
