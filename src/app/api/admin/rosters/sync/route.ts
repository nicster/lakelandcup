import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db, rosterHistory, members } from '@/lib/db';
import { fetchYahooSeason, loadYahooConfig } from '@/lib/yahoo-client';
import { isSeasonEnded, leagueKeyFor } from '@/lib/yahoo-leagues';

function isAuthenticated(request: NextRequest): boolean {
  const session = request.cookies.get('lakeland_admin_session');
  const expected = Buffer.from(process.env.ADMIN_PASSWORD || '').toString('base64');
  return session?.value === expected;
}

// GET — report what's possible without doing any work. Used by the UI to
// gate the sync button before the season ends and to surface whether Yahoo
// credentials are even configured.
export async function GET(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const cfg = loadYahooConfig();
  return NextResponse.json({
    configured: cfg !== null,
  });
}

interface SyncInput {
  season?: string;
}

export async function POST(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = (await request.json()) as SyncInput;
    const season = body.season?.trim();
    if (!season || !/^\d{4}-\d{2}$/.test(season)) {
      return NextResponse.json(
        { error: 'invalid', message: 'Season must look like 2024-25.' },
        { status: 400 },
      );
    }

    if (!isSeasonEnded(season)) {
      return NextResponse.json(
        {
          error: 'season_not_ended',
          message: `The ${season} season hasn't ended yet. Sync becomes available May 1 of its end year, once the regular season has wrapped.`,
        },
        { status: 400 },
      );
    }

    const leagueKey = leagueKeyFor(season);
    if (!leagueKey) {
      return NextResponse.json(
        {
          error: 'unknown_season',
          message: `No Yahoo league key on file for ${season}.`,
        },
        { status: 400 },
      );
    }

    const cfg = loadYahooConfig();
    if (!cfg) {
      return NextResponse.json(
        {
          error: 'not_configured',
          message: 'Yahoo is not configured on the server. Set YAHOO_CLIENT_ID, YAHOO_CLIENT_SECRET, and YAHOO_REFRESH_TOKEN.',
        },
        { status: 500 },
      );
    }

    // Build a name → memberId map. Try current name first, then formerName,
    // so the sync can match teams that have been renamed since the season
    // being synced.
    const teamRows = await db
      .select({ id: members.id, name: members.name, formerName: members.formerName })
      .from(members);
    const nameMap = new Map<string, number>();
    for (const t of teamRows) {
      nameMap.set(t.name.toLowerCase(), t.id);
      if (t.formerName) nameMap.set(t.formerName.toLowerCase(), t.id);
    }

    const { teams: yahooTeams, rosters } = await fetchYahooSeason(cfg, leagueKey);

    const matched: { teamId: number; teamName: string; yahooName: string; players: number }[] = [];
    const unmatched: { yahooName: string; playerCount: number }[] = [];

    for (const yt of yahooTeams) {
      const memberId = nameMap.get(yt.name.toLowerCase());
      const roster = rosters[yt.teamKey] ?? [];
      if (!memberId) {
        unmatched.push({ yahooName: yt.name, playerCount: roster.length });
        continue;
      }
      // Replace any existing roster_history rows for this (team, season).
      await db
        .delete(rosterHistory)
        .where(and(eq(rosterHistory.teamId, memberId), eq(rosterHistory.season, season)));
      // Dedupe by player name while preserving the first-seen jersey + position.
      const byName = new Map<string, { jerseyNumber: string | null; position: string | null }>();
      for (const p of roster) {
        const name = p.name.trim();
        if (!name) continue;
        if (!byName.has(name)) {
          byName.set(name, { jerseyNumber: p.jerseyNumber, position: p.position });
        }
      }
      if (byName.size > 0) {
        await db.insert(rosterHistory).values(
          Array.from(byName.entries()).map(([playerName, meta]) => ({
            playerName,
            jerseyNumber: meta.jerseyNumber,
            position: meta.position,
            teamId: memberId,
            season,
          })),
        );
      }
      const teamName = teamRows.find((t) => t.id === memberId)?.name ?? yt.name;
      matched.push({
        teamId: memberId,
        teamName,
        yahooName: yt.name,
        players: byName.size,
      });
    }

    return NextResponse.json({
      season,
      teamsSynced: matched.length,
      totalPlayers: matched.reduce((n, m) => n + m.players, 0),
      matched,
      unmatched,
    });
  } catch (err) {
    console.error('Yahoo sync failed:', err);
    return NextResponse.json(
      {
        error: 'sync_failed',
        message: err instanceof Error ? err.message : 'Yahoo sync failed',
      },
      { status: 500 },
    );
  }
}
