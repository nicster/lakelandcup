import { NextRequest, NextResponse } from 'next/server';
import { db, draftPicks, members } from '@/lib/db';
import { asc, eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

function isAuthenticated(request: NextRequest): boolean {
  const session = request.cookies.get('lakeland_admin_session');
  const expected = Buffer.from(process.env.ADMIN_PASSWORD || '').toString('base64');
  return session?.value === expected;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ year: string }> },
) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { year } = await context.params;
    const team = alias(members, 'team');
    const fromTeam = alias(members, 'from_team');
    const tradedTo = alias(members, 'traded_to');

    const rows = await db
      .select({
        id: draftPicks.id,
        year: draftPicks.year,
        round: draftPicks.round,
        pick: draftPicks.pick,
        teamId: draftPicks.teamId,
        teamName: team.name,
        fromTeamId: draftPicks.fromTeamId,
        fromTeamName: fromTeam.name,
        playerName: draftPicks.playerName,
        position: draftPicks.position,
        tradedToTeamId: draftPicks.tradedToTeamId,
        tradedToTeamName: tradedTo.name,
      })
      .from(draftPicks)
      .leftJoin(team, eq(draftPicks.teamId, team.id))
      .leftJoin(fromTeam, eq(draftPicks.fromTeamId, fromTeam.id))
      .leftJoin(tradedTo, eq(draftPicks.tradedToTeamId, tradedTo.id))
      .where(eq(draftPicks.year, year))
      .orderBy(asc(draftPicks.round), asc(draftPicks.pick));

    return NextResponse.json(rows);
  } catch (err) {
    console.error('Failed to load draft picks:', err);
    return NextResponse.json({ error: 'Failed to load draft' }, { status: 500 });
  }
}

interface PickInput {
  round: number;
  pick: number;
  teamId: number | null;
  fromTeamId: number | null;
  playerName: string;
  position: string | null;
  tradedToTeamId: number | null;
}

// Replace-all semantics: the body's picks become the entire draft year.
// The form sends back the complete edited set so this is safe and idempotent.
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ year: string }> },
) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { year } = await context.params;
    const body = (await request.json()) as { picks: PickInput[] };
    if (!Array.isArray(body.picks) || body.picks.length === 0) {
      return NextResponse.json(
        { error: 'invalid', message: 'Send at least one pick row.' },
        { status: 400 },
      );
    }

    // Look up team names (snapshot at save time; preserves historical names).
    const teamIds = new Set<number>();
    for (const p of body.picks) {
      if (p.teamId) teamIds.add(p.teamId);
      if (p.fromTeamId) teamIds.add(p.fromTeamId);
      if (p.tradedToTeamId) teamIds.add(p.tradedToTeamId);
    }
    const teamRows = teamIds.size
      ? await db
          .select({ id: members.id, name: members.name })
          .from(members)
      : [];
    const nameById = new Map(teamRows.map((t) => [t.id, t.name]));

    await db.delete(draftPicks).where(eq(draftPicks.year, year));

    if (body.picks.length > 0) {
      await db.insert(draftPicks).values(
        body.picks.map((p) => ({
          year,
          round: p.round,
          pick: p.pick,
          teamId: p.teamId,
          teamName: p.teamId ? nameById.get(p.teamId) ?? 'TBD' : 'TBD',
          fromTeamId: p.fromTeamId,
          fromTeamName: p.fromTeamId ? nameById.get(p.fromTeamId) ?? null : null,
          playerName: p.playerName?.trim() || 'TBD',
          position: p.position?.trim() || null,
          tradedToTeamId: p.tradedToTeamId,
          tradedToTeamName: p.tradedToTeamId ? nameById.get(p.tradedToTeamId) ?? null : null,
        })),
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Failed to save draft picks:', err);
    return NextResponse.json(
      { error: 'save_failed', message: err instanceof Error ? err.message : 'Save failed' },
      { status: 500 },
    );
  }
}
