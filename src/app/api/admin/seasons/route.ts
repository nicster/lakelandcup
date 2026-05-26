import { NextRequest, NextResponse } from 'next/server';
import { db, seasons, members } from '@/lib/db';
import { alias } from 'drizzle-orm/pg-core';
import { desc, eq } from 'drizzle-orm';

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
    const champ = alias(members, 'champ');
    const runner = alias(members, 'runner');
    const rows = await db
      .select({
        id: seasons.id,
        year: seasons.year,
        championId: seasons.championId,
        runnerUpId: seasons.runnerUpId,
        finalResult: seasons.finalResult,
        notes: seasons.notes,
        championName: champ.name,
        runnerUpName: runner.name,
      })
      .from(seasons)
      .leftJoin(champ, eq(seasons.championId, champ.id))
      .leftJoin(runner, eq(seasons.runnerUpId, runner.id))
      .orderBy(desc(seasons.year));
    return NextResponse.json(rows);
  } catch (err) {
    console.error('Failed to list seasons:', err);
    return NextResponse.json({ error: 'Failed to list seasons' }, { status: 500 });
  }
}

interface SeasonInput {
  year?: string;
  championId?: number | null;
  runnerUpId?: number | null;
  finalResult?: string | null;
  notes?: string | null;
}

function validate(body: SeasonInput): string | null {
  if (!body.year || !/^\d{4}-\d{2}$/.test(body.year)) {
    return 'Year must be in the format YYYY-YY, e.g. 2024-25.';
  }
  if (body.championId && body.runnerUpId && body.championId === body.runnerUpId) {
    return 'Champion and runner-up must be different teams.';
  }
  return null;
}

export async function POST(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = (await request.json()) as SeasonInput;
    const validationError = validate(body);
    if (validationError) {
      return NextResponse.json({ error: 'invalid', message: validationError }, { status: 400 });
    }

    const existing = await db
      .select({ id: seasons.id })
      .from(seasons)
      .where(eq(seasons.year, body.year!))
      .limit(1);
    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'duplicate', message: `A season for ${body.year} already exists.` },
        { status: 409 },
      );
    }

    const [created] = await db
      .insert(seasons)
      .values({
        year: body.year!,
        championId: body.championId ?? null,
        runnerUpId: body.runnerUpId ?? null,
        finalResult: body.finalResult?.trim() || null,
        notes: body.notes?.trim() || null,
      })
      .returning({ id: seasons.id });

    return NextResponse.json({ id: created.id }, { status: 201 });
  } catch (err) {
    console.error('Failed to save season:', err);
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
    const body = (await request.json()) as SeasonInput;
    const validationError = validate(body);
    if (validationError) {
      return NextResponse.json({ error: 'invalid', message: validationError }, { status: 400 });
    }

    await db
      .update(seasons)
      .set({
        year: body.year!,
        championId: body.championId ?? null,
        runnerUpId: body.runnerUpId ?? null,
        finalResult: body.finalResult?.trim() || null,
        notes: body.notes?.trim() || null,
      })
      .where(eq(seasons.id, id));

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Failed to update season:', err);
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
    await db.delete(seasons).where(eq(seasons.id, id));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Failed to delete season:', err);
    return NextResponse.json({ error: 'delete_failed' }, { status: 500 });
  }
}
