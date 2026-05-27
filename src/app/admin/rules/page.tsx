'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

interface RuleRow {
  id: number;
  section: string;
  title: string;
  content: string;
  sortOrder: number | null;
  updatedAt: string | null;
}

interface DraftState {
  section: string;
  title: string;
  content: string;
}

const emptyDraft = (): DraftState => ({ section: '', title: '', content: '' });

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export default function AdminRulesPage() {
  const [items, setItems] = useState<RuleRow[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<DraftState>(emptyDraft());
  const [formOpen, setFormOpen] = useState(false);
  // Track whether section slug was auto-derived from title so we stop
  // overwriting it once the user types into the slug field directly.
  const [slugTouched, setSlugTouched] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  async function load() {
    try {
      const data = await fetch('/api/admin/rules').then((r) => r.json());
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const isEditing = editingId !== null;

  function loadIntoForm(r: RuleRow) {
    setEditingId(r.id);
    setDraft({ section: r.section, title: r.title, content: r.content });
    setSlugTouched(true);
    setFormOpen(true);
    setMessage(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function reset() {
    setEditingId(null);
    setDraft(emptyDraft());
    setSlugTouched(false);
    setFormOpen(false);
    setMessage(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setSubmitting(true);
    try {
      const payload = {
        section: draft.section.trim(),
        title: draft.title.trim(),
        content: draft.content.trim(),
      };
      const res = await fetch(
        isEditing ? `/api/admin/rules?id=${editingId}` : '/api/admin/rules',
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
        text: isEditing ? `“${payload.title}” updated.` : `Added “${payload.title}”.`,
      });
      await load();
      reset();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Save failed' });
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteRule(id: number, title: string) {
    if (!confirm(`Delete the “${title}” rule? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/admin/rules?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        if (editingId === id) reset();
        await load();
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function bootstrap() {
    if (
      !confirm(
        'Seed the rules table with the canonical 2023 defaults? Use this once when starting fresh. Refuses to run if any rules already exist.',
      )
    )
      return;
    try {
      const res = await fetch('/api/admin/rules?bootstrap=1', { method: 'POST' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.message ?? 'Bootstrap failed');
      setMessage({ type: 'success', text: `Seeded ${json.inserted} default rules.` });
      await load();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Bootstrap failed' });
    }
  }

  async function moveRule(idx: number, direction: -1 | 1) {
    const target = idx + direction;
    if (target < 0 || target >= items.length) return;
    const a = items[idx];
    const b = items[target];
    const aOrder = a.sortOrder ?? idx;
    const bOrder = b.sortOrder ?? target;
    try {
      // Optimistic update — swap locally, then send to server.
      setItems((prev) => {
        const next = [...prev];
        [next[idx], next[target]] = [next[target], next[idx]];
        return next;
      });
      await Promise.all([
        fetch(`/api/admin/rules?id=${a.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            section: a.section,
            title: a.title,
            content: a.content,
            sortOrder: bOrder,
          }),
        }),
        fetch(`/api/admin/rules?id=${b.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            section: b.section,
            title: b.title,
            content: b.content,
            sortOrder: aOrder,
          }),
        }),
      ]);
      await load();
    } catch (err) {
      console.error(err);
      await load();
    }
  }

  return (
    <div className="max-w-4xl">
      <header className="mb-8">
        <p className="text-xs uppercase tracking-[0.25em] text-lake-gold mb-2">Commissioner</p>
        <h1 className="text-2xl font-bold text-lake-ice tracking-tight">Rules</h1>
        <p className="text-lake-ice-muted mt-1">
          Edit the league manual. Each section is markdown — <code className="font-mono text-lake-ice/80">**bold**</code>, <code className="font-mono text-lake-ice/80">### subheadings</code>, and <code className="font-mono text-lake-ice/80">- bullet lists</code> render on the public page.
        </p>
        <p className="text-lake-ice-muted text-sm mt-2">
          Public view:{' '}
          <Link href="/rules" target="_blank" rel="noopener noreferrer" className="text-lake-gold hover:text-lake-gold/80">
            /rules
          </Link>
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

      {items.length === 0 && !formOpen && !isEditing && (
        <div className="bg-lake-blue/30 rounded-lg border border-lake-blue-light/20 p-6 mb-10">
          <h2 className="text-sm font-semibold text-lake-ice-muted uppercase tracking-[0.18em] mb-2">
            Empty manual
          </h2>
          <p className="text-lake-ice-muted text-sm mb-4 max-w-prose">
            No rules in the database — the public page is showing the hardcoded 2023 defaults. Seed
            those defaults into the database so you can edit them here.
          </p>
          <button
            type="button"
            onClick={bootstrap}
            className="px-4 py-2 rounded-md bg-lake-gold text-lake-blue-dark font-semibold hover:bg-lake-gold/90 transition-colors"
          >
            Bootstrap from defaults
          </button>
        </div>
      )}

      {!formOpen && !isEditing && items.length > 0 && (
        <div className="mb-10">
          <button
            type="button"
            onClick={() => setFormOpen(true)}
            className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.18em] text-lake-ice-muted hover:text-lake-gold transition-colors"
          >
            <span aria-hidden="true" className="text-base leading-none">+</span>
            Add a section
          </button>
        </div>
      )}

      {(formOpen || isEditing) && (
        <form
          onSubmit={submit}
          className="bg-lake-blue/30 rounded-lg border border-lake-blue-light/20 p-6 space-y-5 mb-12"
        >
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="text-sm font-semibold text-lake-ice-muted uppercase tracking-[0.18em]">
              {isEditing ? `Editing “${draft.title || '…'}”` : 'New section'}
            </h2>
            <button
              type="button"
              onClick={reset}
              className="text-xs uppercase tracking-wider text-lake-ice-muted hover:text-lake-ice"
            >
              {isEditing ? 'cancel edit' : 'close'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_220px] gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="title" className="text-xs font-medium text-lake-ice-muted uppercase tracking-wider">
                Title
              </label>
              <input
                id="title"
                type="text"
                required
                value={draft.title}
                onChange={(e) => {
                  const t = e.target.value;
                  setDraft((d) => ({
                    ...d,
                    title: t,
                    section: slugTouched ? d.section : slugify(t),
                  }));
                }}
                placeholder="Free Agent Draft"
                className="px-3 py-2 bg-lake-blue-dark/50 border border-lake-blue-light/30 rounded-md text-lake-ice placeholder-lake-ice/40 focus:outline-none focus:border-lake-gold/50 focus:ring-1 focus:ring-lake-gold/30"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="section" className="text-xs font-medium text-lake-ice-muted uppercase tracking-wider">
                Slug <span className="opacity-60 normal-case">(URL fragment)</span>
              </label>
              <input
                id="section"
                type="text"
                required
                pattern="[a-z0-9-]+"
                value={draft.section}
                onChange={(e) => {
                  setSlugTouched(true);
                  setDraft({ ...draft, section: e.target.value });
                }}
                placeholder="free-agent-draft"
                className="px-3 py-2 bg-lake-blue-dark/50 border border-lake-blue-light/30 rounded-md text-lake-ice placeholder-lake-ice/40 font-mono text-sm focus:outline-none focus:border-lake-gold/50 focus:ring-1 focus:ring-lake-gold/30"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="content" className="text-xs font-medium text-lake-ice-muted uppercase tracking-wider">
              Content <span className="opacity-60 normal-case">(markdown)</span>
            </label>
            <textarea
              id="content"
              required
              rows={14}
              value={draft.content}
              onChange={(e) => setDraft({ ...draft, content: e.target.value })}
              placeholder={'Use **bold**, ### subheadings, and bullet lists with leading dashes.'}
              className="px-3 py-2 bg-lake-blue-dark/50 border border-lake-blue-light/30 rounded-md text-lake-ice placeholder-lake-ice/40 focus:outline-none focus:border-lake-gold/50 focus:ring-1 focus:ring-lake-gold/30 font-mono text-sm leading-relaxed"
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-md bg-lake-gold text-lake-blue-dark font-semibold disabled:opacity-50 hover:bg-lake-gold/90 transition-colors"
            >
              {submitting ? 'Saving…' : isEditing ? 'Save changes' : 'Add section'}
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

      {items.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-lake-ice-muted uppercase tracking-[0.18em] mb-3">
            Manual ({items.length} {items.length === 1 ? 'section' : 'sections'})
          </h2>
          <ol className="divide-y divide-lake-blue-light/15">
            {items.map((r, idx) => (
              <li
                key={r.id}
                className={`grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-baseline gap-3 py-3 px-2 rounded-md ${
                  editingId === r.id ? 'bg-lake-gold/10' : ''
                }`}
              >
                <span className="flex flex-col items-center text-lake-ice-muted">
                  <span className="text-xs font-semibold tabular-nums text-lake-gold leading-none mb-1">
                    {idx + 1}
                  </span>
                  <span className="flex flex-col items-center -my-0.5">
                    <button
                      type="button"
                      onClick={() => moveRule(idx, -1)}
                      disabled={idx === 0}
                      aria-label={`Move ${r.title} up`}
                      className="text-[10px] leading-none hover:text-lake-gold disabled:opacity-30 disabled:hover:text-lake-ice-muted"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      onClick={() => moveRule(idx, 1)}
                      disabled={idx === items.length - 1}
                      aria-label={`Move ${r.title} down`}
                      className="text-[10px] leading-none hover:text-lake-gold disabled:opacity-30 disabled:hover:text-lake-ice-muted"
                    >
                      ▼
                    </button>
                  </span>
                </span>
                <span className="min-w-0">
                  <span className="block text-sm text-lake-ice truncate">{r.title}</span>
                  <span className="block text-xs text-lake-ice-muted truncate font-mono">
                    /rules#{r.section}
                  </span>
                </span>
                <span className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => loadIntoForm(r)}
                    className="text-xs uppercase tracking-wider text-lake-ice-muted hover:text-lake-gold"
                  >
                    edit
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteRule(r.id, r.title)}
                    className="text-xs uppercase tracking-wider text-lake-ice-muted hover:text-lake-error"
                  >
                    delete
                  </button>
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
