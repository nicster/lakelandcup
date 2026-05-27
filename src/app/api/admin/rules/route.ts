import { NextRequest, NextResponse } from 'next/server';
import { db, rules } from '@/lib/db';
import { asc, eq, sql } from 'drizzle-orm';
import { DEFAULT_RULES } from '@/lib/default-rules';

function isAuthenticated(request: NextRequest): boolean {
  const session = request.cookies.get('lakeland_admin_session');
  const expected = Buffer.from(process.env.ADMIN_PASSWORD || '').toString('base64');
  return session?.value === expected;
}

export async function GET(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const rows = await db.select().from(rules).orderBy(asc(rules.sortOrder), asc(rules.id));
    return NextResponse.json(rows);
  } catch (err) {
    console.error('Failed to list rules:', err);
    return NextResponse.json({ error: 'Failed to list rules' }, { status: 500 });
  }
}

interface RuleInput {
  section?: string;
  title?: string;
  content?: string;
  sortOrder?: number;
}

function validate(body: RuleInput): string | null {
  if (!body.section?.trim()) return 'Section slug is required.';
  if (!/^[a-z0-9-]+$/.test(body.section.trim())) {
    return 'Section slug must be lowercase letters, digits, and hyphens only.';
  }
  if (!body.title?.trim()) return 'Title is required.';
  if (!body.content?.trim()) return 'Content cannot be empty.';
  return null;
}

export async function POST(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const url = new URL(request.url);

    // Bootstrap mode — seed defaults if the rules table is empty.
    if (url.searchParams.get('bootstrap') === '1') {
      const existing = await db.select({ count: sql<number>`count(*)::int` }).from(rules);
      if ((existing[0]?.count ?? 0) > 0) {
        return NextResponse.json(
          { error: 'not_empty', message: 'Rules already exist — refusing to bootstrap.' },
          { status: 409 },
        );
      }
      await db.insert(rules).values(
        DEFAULT_RULES.map((r) => ({
          section: r.section,
          title: r.title,
          content: r.content,
          sortOrder: r.sortOrder,
        })),
      );
      return NextResponse.json({ inserted: DEFAULT_RULES.length });
    }

    const body = (await request.json()) as RuleInput;
    const err = validate(body);
    if (err) return NextResponse.json({ error: 'invalid', message: err }, { status: 400 });

    const existing = await db
      .select({ id: rules.id })
      .from(rules)
      .where(eq(rules.section, body.section!.trim()))
      .limit(1);
    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'duplicate', message: `A rule with slug “${body.section}” already exists.` },
        { status: 409 },
      );
    }

    // Default sort: append to the end.
    let sortOrder = body.sortOrder;
    if (sortOrder === undefined || sortOrder === null) {
      const max = await db
        .select({ m: sql<number>`coalesce(max(${rules.sortOrder}), -1)::int` })
        .from(rules);
      sortOrder = (max[0]?.m ?? -1) + 1;
    }

    const [created] = await db
      .insert(rules)
      .values({
        section: body.section!.trim(),
        title: body.title!.trim(),
        content: body.content!.trim(),
        sortOrder,
      })
      .returning({ id: rules.id });
    return NextResponse.json({ id: created.id }, { status: 201 });
  } catch (err) {
    console.error('Failed to save rule:', err);
    return NextResponse.json(
      { error: 'save_failed', message: err instanceof Error ? err.message : 'Save failed' },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const id = parseInt(request.nextUrl.searchParams.get('id') ?? '', 10);
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: 'invalid id' }, { status: 400 });
    }
    const body = (await request.json()) as RuleInput;
    const err = validate(body);
    if (err) return NextResponse.json({ error: 'invalid', message: err }, { status: 400 });

    await db
      .update(rules)
      .set({
        section: body.section!.trim(),
        title: body.title!.trim(),
        content: body.content!.trim(),
        sortOrder: body.sortOrder,
        updatedAt: new Date(),
      })
      .where(eq(rules.id, id));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Failed to update rule:', err);
    return NextResponse.json(
      { error: 'update_failed', message: err instanceof Error ? err.message : 'Update failed' },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const id = parseInt(request.nextUrl.searchParams.get('id') ?? '', 10);
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: 'invalid id' }, { status: 400 });
    }
    await db.delete(rules).where(eq(rules.id, id));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Failed to delete rule:', err);
    return NextResponse.json({ error: 'delete_failed' }, { status: 500 });
  }
}
