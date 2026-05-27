import { NextRequest, NextResponse } from 'next/server';
import { db, franchisePlayers, members } from '@/lib/db';
import { asc, eq } from 'drizzle-orm';
import { computeYears } from '@/lib/season';

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
    const rows = await db.select().from(franchisePlayers).orderBy(asc(franchisePlayers.teamName), asc(franchisePlayers.playerName));
    // Recompute years on the fly. The stored value is captured at write time
    // and goes stale for active banners (seasonEnd null) once CURRENT_SEASON
    // bumps. The DB value remains for legacy readers; the API surfaces fresh.
    const refreshed = rows.map((r) => ({
      ...r,
      years: computeYears(r.seasonStart, r.seasonEnd),
    }));
    return NextResponse.json(refreshed);
  } catch (err) {
    console.error('Failed to list franchise players:', err);
    return NextResponse.json({ error: 'Failed to list franchise players' }, { status: 500 });
  }
}

interface PlayerInput {
  playerName?: string;
  jerseyNumber?: string | null;
  position?: string | null;
  teamId?: number | null;
  years?: number;
  games?: number | null;
  seasonStart?: string | null;
  seasonEnd?: string | null;
}

function validate(body: PlayerInput): string | null {
  if (!body.playerName?.trim()) return 'Player name is required.';
  if (!body.teamId) return 'Team is required.';
  if (!body.years || body.years < 1) return 'Years must be at least 1.';
  if (body.seasonStart && !/^\d{4}-\d{2}$/.test(body.seasonStart)) {
    return 'Season start must look like 2013-14.';
  }
  if (body.seasonEnd && !/^\d{4}-\d{2}$/.test(body.seasonEnd)) {
    return 'Season end must look like 2024-25.';
  }
  return null;
}

async function teamSnapshot(teamId: number): Promise<{ name: string; colors: string | null } | null> {
  const [t] = await db
    .select({ name: members.name, colors: members.colors })
    .from(members)
    .where(eq(members.id, teamId))
    .limit(1);
  return t ?? null;
}

export async function POST(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = (await request.json()) as PlayerInput;
    const err = validate(body);
    if (err) return NextResponse.json({ error: 'invalid', message: err }, { status: 400 });

    const team = await teamSnapshot(body.teamId!);
    if (!team) {
      return NextResponse.json({ error: 'invalid', message: 'Team not found.' }, { status: 400 });
    }

    const [created] = await db
      .insert(franchisePlayers)
      .values({
        playerName: body.playerName!.trim(),
        jerseyNumber: body.jerseyNumber?.trim() || null,
        position: body.position?.trim() || null,
        teamId: body.teamId!,
        teamName: team.name,
        years: body.years!,
        games: body.games ?? null,
        seasonStart: body.seasonStart?.trim() || null,
        seasonEnd: body.seasonEnd?.trim() || null,
        teamColors: team.colors,
      })
      .returning({ id: franchisePlayers.id });
    return NextResponse.json({ id: created.id }, { status: 201 });
  } catch (err) {
    console.error('Failed to create franchise player:', err);
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
    const body = (await request.json()) as PlayerInput;
    const err = validate(body);
    if (err) return NextResponse.json({ error: 'invalid', message: err }, { status: 400 });

    const team = await teamSnapshot(body.teamId!);
    if (!team) {
      return NextResponse.json({ error: 'invalid', message: 'Team not found.' }, { status: 400 });
    }

    await db
      .update(franchisePlayers)
      .set({
        playerName: body.playerName!.trim(),
        jerseyNumber: body.jerseyNumber?.trim() || null,
        position: body.position?.trim() || null,
        teamId: body.teamId!,
        teamName: team.name,
        years: body.years!,
        games: body.games ?? null,
        seasonStart: body.seasonStart?.trim() || null,
        seasonEnd: body.seasonEnd?.trim() || null,
        teamColors: team.colors,
      })
      .where(eq(franchisePlayers.id, id));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Failed to update franchise player:', err);
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
    await db.delete(franchisePlayers).where(eq(franchisePlayers.id, id));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Failed to delete franchise player:', err);
    return NextResponse.json({ error: 'delete_failed' }, { status: 500 });
  }
}
