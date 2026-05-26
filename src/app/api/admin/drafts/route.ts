import { NextRequest, NextResponse } from 'next/server';
import { db, draftPicks } from '@/lib/db';
import { desc, eq, sql } from 'drizzle-orm';

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
    const rows = await db
      .select({
        year: draftPicks.year,
        pickCount: sql<number>`count(*)::int`,
      })
      .from(draftPicks)
      .groupBy(draftPicks.year)
      .orderBy(desc(draftPicks.year));
    return NextResponse.json(rows);
  } catch (err) {
    console.error('Failed to list draft years:', err);
    return NextResponse.json({ error: 'Failed to list draft years' }, { status: 500 });
  }
}

interface CreateInput {
  year?: string;
}

// Create a new draft year skeleton: 24 empty rows (round 1: picks 1-12,
// round 2: picks 13-24). The commissioner fills them in via the editor.
export async function POST(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = (await request.json()) as CreateInput;
    const year = body.year?.trim();
    if (!year || !/^\d{4}$/.test(year)) {
      return NextResponse.json(
        { error: 'invalid', message: 'Year must be a 4-digit number (e.g. 2026).' },
        { status: 400 },
      );
    }

    const existing = await db
      .select({ id: draftPicks.id })
      .from(draftPicks)
      .where(eq(draftPicks.year, year))
      .limit(1);
    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'duplicate', message: `A ${year} draft already exists.` },
        { status: 409 },
      );
    }

    const skeleton = [];
    for (let pick = 1; pick <= 24; pick++) {
      skeleton.push({
        year,
        round: pick <= 12 ? 1 : 2,
        pick,
        teamId: null,
        teamName: 'TBD',
        playerName: 'TBD',
        position: null,
        fromTeamId: null,
        fromTeamName: null,
        tradedToTeamId: null,
        tradedToTeamName: null,
      });
    }
    await db.insert(draftPicks).values(skeleton);

    return NextResponse.json({ year }, { status: 201 });
  } catch (err) {
    console.error('Failed to create draft year:', err);
    return NextResponse.json(
      { error: 'save_failed', message: err instanceof Error ? err.message : 'Save failed' },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const year = request.nextUrl.searchParams.get('year');
    if (!year) {
      return NextResponse.json({ error: 'year required' }, { status: 400 });
    }
    await db.delete(draftPicks).where(eq(draftPicks.year, year));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Failed to delete draft year:', err);
    return NextResponse.json({ error: 'delete_failed' }, { status: 500 });
  }
}
