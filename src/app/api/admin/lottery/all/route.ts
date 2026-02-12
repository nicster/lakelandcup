import { NextRequest, NextResponse } from 'next/server';
import { db, lotteryResults, members } from '@/lib/db';
import { desc } from 'drizzle-orm';

// Verify admin session
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
    const results = await db
      .select()
      .from(lotteryResults)
      .orderBy(desc(lotteryResults.year));

    // Fetch all teams
    const teams = await db.select().from(members);
    const teamMap = new Map(teams.map(t => [t.id, { id: t.id, name: t.name }]));

    // Helper to find standing for a team
    const getStanding = (result: typeof results[0], teamId: number | null): string => {
      if (!teamId) return '';
      if (result.team12thId === teamId) return '12th (50%)';
      if (result.team11thId === teamId) return '11th (25%)';
      if (result.team10thId === teamId) return '10th (15%)';
      if (result.team9thId === teamId) return '9th (10%)';
      return '';
    };

    const enrichedResults = results.map(result => ({
      id: result.id,
      year: result.year,
      isPublished: result.isPublished,
      runAt: result.runAt,
      publishedAt: result.publishedAt,
      picks: [
        { pick: 1, team: result.pick1TeamId ? teamMap.get(result.pick1TeamId) : null, standing: getStanding(result, result.pick1TeamId) },
        { pick: 2, team: result.pick2TeamId ? teamMap.get(result.pick2TeamId) : null, standing: getStanding(result, result.pick2TeamId) },
        { pick: 3, team: result.pick3TeamId ? teamMap.get(result.pick3TeamId) : null, standing: getStanding(result, result.pick3TeamId) },
        { pick: 4, team: result.pick4TeamId ? teamMap.get(result.pick4TeamId) : null, standing: getStanding(result, result.pick4TeamId) },
      ],
    }));

    return NextResponse.json(enrichedResults);
  } catch (error) {
    console.error('Failed to fetch lottery results:', error);
    return NextResponse.json({ error: 'Failed to fetch results' }, { status: 500 });
  }
}
