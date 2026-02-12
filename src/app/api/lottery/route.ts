import { NextRequest, NextResponse } from 'next/server';
import { db, lotteryResults, members } from '@/lib/db';
import { eq, desc, and } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const year = searchParams.get('year');

  try {
    // Build query for published results only
    let query = db
      .select()
      .from(lotteryResults)
      .where(eq(lotteryResults.isPublished, true));

    if (year) {
      query = db
        .select()
        .from(lotteryResults)
        .where(and(eq(lotteryResults.isPublished, true), eq(lotteryResults.year, year)));
    }

    const results = await query.orderBy(desc(lotteryResults.year));

    if (results.length === 0) {
      return NextResponse.json({ results: [] });
    }

    // Get all team IDs from results
    const teamIds = new Set<number>();
    for (const result of results) {
      if (result.team9thId) teamIds.add(result.team9thId);
      if (result.team10thId) teamIds.add(result.team10thId);
      if (result.team11thId) teamIds.add(result.team11thId);
      if (result.team12thId) teamIds.add(result.team12thId);
      if (result.pick1TeamId) teamIds.add(result.pick1TeamId);
      if (result.pick2TeamId) teamIds.add(result.pick2TeamId);
      if (result.pick3TeamId) teamIds.add(result.pick3TeamId);
      if (result.pick4TeamId) teamIds.add(result.pick4TeamId);
    }

    // Fetch team details
    const teams = await db
      .select({
        id: members.id,
        name: members.name,
        logo: members.logo,
      })
      .from(members);

    const teamMap = new Map(teams.map(t => [t.id, t]));

    // Transform results to include team details
    const enrichedResults = results.map(result => ({
      year: result.year,
      runAt: result.runAt,
      publishedAt: result.publishedAt,
      teams: {
        '9th': result.team9thId ? teamMap.get(result.team9thId) : null,
        '10th': result.team10thId ? teamMap.get(result.team10thId) : null,
        '11th': result.team11thId ? teamMap.get(result.team11thId) : null,
        '12th': result.team12thId ? teamMap.get(result.team12thId) : null,
      },
      picks: [
        { pick: 1, team: result.pick1TeamId ? teamMap.get(result.pick1TeamId) : null },
        { pick: 2, team: result.pick2TeamId ? teamMap.get(result.pick2TeamId) : null },
        { pick: 3, team: result.pick3TeamId ? teamMap.get(result.pick3TeamId) : null },
        { pick: 4, team: result.pick4TeamId ? teamMap.get(result.pick4TeamId) : null },
      ],
    }));

    return NextResponse.json({ results: enrichedResults });
  } catch (error) {
    console.error('Failed to fetch lottery results:', error);
    return NextResponse.json({ error: 'Failed to fetch results' }, { status: 500 });
  }
}
