import { NextRequest, NextResponse } from 'next/server';
import { db, rosterHistory } from '@/lib/db';
import { and, asc, eq } from 'drizzle-orm';

function isAuthenticated(request: NextRequest): boolean {
  const session = request.cookies.get('lakeland_admin_session');
  const expected = Buffer.from(process.env.ADMIN_PASSWORD || '').toString('base64');
  return session?.value === expected;
}

// GET /api/admin/rosters?season=2024-25
// Returns: { seasons: string[], rosters: { [teamId]: string[] } }
// When season is omitted, returns the list of seasons that have any rows.
export async function GET(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const season = request.nextUrl.searchParams.get('season');

    const seasonRows = await db
      .selectDistinct({ season: rosterHistory.season })
      .from(rosterHistory)
      .orderBy(asc(rosterHistory.season));
    const seasons = seasonRows.map((r) => r.season);

    if (!season) {
      return NextResponse.json({ seasons, rosters: {} });
    }

    const rows = await db
      .select({
        id: rosterHistory.id,
        playerName: rosterHistory.playerName,
        teamId: rosterHistory.teamId,
      })
      .from(rosterHistory)
      .where(eq(rosterHistory.season, season))
      .orderBy(asc(rosterHistory.teamId), asc(rosterHistory.playerName));

    const rosters: Record<number, string[]> = {};
    for (const r of rows) {
      if (!rosters[r.teamId]) rosters[r.teamId] = [];
      rosters[r.teamId].push(r.playerName);
    }
    return NextResponse.json({ seasons, rosters });
  } catch (err) {
    console.error('Failed to list rosters:', err);
    return NextResponse.json({ error: 'Failed to list rosters' }, { status: 500 });
  }
}

interface RosterInput {
  teamId?: number;
  season?: string;
  players?: string[];
}

// POST /api/admin/rosters — replace one (team, season) with the given player list.
export async function POST(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const url = new URL(request.url);

    // Copy mode: POST /api/admin/rosters?copy=1 with body { from, to } duplicates
    // the entire season's rosters from `from` to `to` (skipping rows that would
    // collide with the unique index).
    if (url.searchParams.get('copy') === '1') {
      const body = (await request.json()) as { from?: string; to?: string };
      if (!body.from || !body.to) {
        return NextResponse.json({ error: 'from and to seasons required' }, { status: 400 });
      }
      const sourceRows = await db
        .select({ playerName: rosterHistory.playerName, teamId: rosterHistory.teamId })
        .from(rosterHistory)
        .where(eq(rosterHistory.season, body.from));
      if (sourceRows.length === 0) {
        return NextResponse.json({ inserted: 0 });
      }
      await db
        .insert(rosterHistory)
        .values(sourceRows.map((r) => ({ ...r, season: body.to! })))
        .onConflictDoNothing();
      return NextResponse.json({ inserted: sourceRows.length });
    }

    const body = (await request.json()) as RosterInput;
    if (!body.teamId || !body.season || !Array.isArray(body.players)) {
      return NextResponse.json(
        { error: 'invalid', message: 'teamId, season, and players[] are required.' },
        { status: 400 },
      );
    }
    if (!/^\d{4}-\d{2}$/.test(body.season)) {
      return NextResponse.json(
        { error: 'invalid', message: 'Season must look like 2024-25.' },
        { status: 400 },
      );
    }

    const cleanPlayers = Array.from(
      new Set(
        body.players
          .map((p) => p.trim())
          .filter((p) => p.length > 0),
      ),
    );

    await db
      .delete(rosterHistory)
      .where(
        and(eq(rosterHistory.teamId, body.teamId), eq(rosterHistory.season, body.season)),
      );

    if (cleanPlayers.length > 0) {
      await db.insert(rosterHistory).values(
        cleanPlayers.map((p) => ({
          playerName: p,
          teamId: body.teamId!,
          season: body.season!,
        })),
      );
    }
    return NextResponse.json({ count: cleanPlayers.length });
  } catch (err) {
    console.error('Failed to save roster:', err);
    return NextResponse.json(
      { error: 'save_failed', message: err instanceof Error ? err.message : 'Save failed' },
      { status: 500 },
    );
  }
}

// DELETE /api/admin/rosters?season=2024-25 (whole season) OR ?season=...&teamId=N
export async function DELETE(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const season = request.nextUrl.searchParams.get('season');
    const teamIdRaw = request.nextUrl.searchParams.get('teamId');
    if (!season) return NextResponse.json({ error: 'season required' }, { status: 400 });

    if (teamIdRaw) {
      const teamId = parseInt(teamIdRaw, 10);
      await db
        .delete(rosterHistory)
        .where(and(eq(rosterHistory.teamId, teamId), eq(rosterHistory.season, season)));
    } else {
      await db.delete(rosterHistory).where(eq(rosterHistory.season, season));
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Failed to delete roster:', err);
    return NextResponse.json({ error: 'delete_failed' }, { status: 500 });
  }
}
