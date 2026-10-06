import { NextRequest, NextResponse } from 'next/server';
import { db, draftPicks } from '@/lib/db';
import { desc, ne } from 'drizzle-orm';
import Fuse from 'fuse.js';
import { isGoalie, getProtectionStatus, PLACEHOLDER_PLAYER } from '@/lib/protection';

function mapPickToResult(pick: typeof draftPicks.$inferSelect, now: Date) {
  const goalie = isGoalie(pick.playerName, pick.position);
  const { protectedThrough, isProtected } = getProtectionStatus(pick.year, goalie, now);

  return {
    playerName: pick.playerName,
    teamId: pick.teamId,
    teamName: pick.teamName,
    draftYear: pick.year,
    round: pick.round,
    pick: pick.pick,
    position: goalie ? 'G' : null,
    protectedThrough,
    isProtected,
  };
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');
  const recent = searchParams.get('recent');

  try {
    const now = new Date();

    // Fetch all draft picks that have been made (skip TBD placeholders)
    const allPicks = await db
      .select()
      .from(draftPicks)
      .where(ne(draftPicks.playerName, PLACEHOLDER_PLAYER))
      .orderBy(desc(draftPicks.year), draftPicks.round, draftPicks.pick);

    // If requesting recent protected prospects (for initial page load)
    if (recent === 'true') {
      const recentProtected = allPicks
        .map(pick => mapPickToResult(pick, now))
        .filter(result => result.isProtected)
        .slice(0, 20);

      return NextResponse.json(recentProtected);
    }

    // For search, require at least 2 characters
    if (!query || query.length < 2) {
      return NextResponse.json([]);
    }

    // Set up Fuse.js for fuzzy matching
    const fuse = new Fuse(allPicks, {
      keys: ['playerName'],
      threshold: 0.4, // 0 = exact match, 1 = match anything
      distance: 100,
      includeScore: true,
    });

    // Perform fuzzy search
    const searchResults = fuse.search(query, { limit: 20 });

    const mappedResults = searchResults.map(({ item: pick }) =>
      mapPickToResult(pick, now)
    );

    return NextResponse.json(mappedResults);
  } catch (error) {
    console.error('Protection search error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
