import { NextRequest, NextResponse } from 'next/server';
import { db, draftPicks } from '@/lib/db';
import { desc } from 'drizzle-orm';
import Fuse from 'fuse.js';

// Known goalies from our drafts - goalies get 5 years protection instead of 3
// This list can be expanded or replaced with position data in the draft_picks table
const KNOWN_GOALIES = new Set([
  'Jake Oettinger',
  'Spencer Knight',
  'Yaroslav Askarov',
  'Devon Levi',
  'Jesper Wallstedt',
  'Dustin Wolf',
  'Thomas Milic',
  'Trey Augustine',
  'Carter George',
  'Michael Hrabal',
  'Sergei Ivanov',
  'Sebastian Cossa',
  'Ilya Nabokov',
  'Mikhail Yegorov',
  'Joshua Ravensbergen',
  'Jack Ivankovic',
  'M. Hrabal',
  'T. Augustine',
  'A. Gajan',
]);

function isGoalie(playerName: string, position: string | null): boolean {
  // First check if position is explicitly set
  if (position === 'G') return true;
  // Fall back to known goalies list
  return KNOWN_GOALIES.has(playerName);
}

function calculateProtectionExpiry(draftYear: string, isGoaliePlayer: boolean): number {
  const year = parseInt(draftYear, 10);
  // Goalies get 5 years, skaters get 3 years
  return year + (isGoaliePlayer ? 5 : 3);
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');

  if (!query || query.length < 2) {
    return NextResponse.json([]);
  }

  try {
    const currentYear = new Date().getFullYear();

    // Fetch all draft picks for fuzzy search
    const allPicks = await db
      .select()
      .from(draftPicks)
      .orderBy(desc(draftPicks.year));

    // Set up Fuse.js for fuzzy matching
    const fuse = new Fuse(allPicks, {
      keys: ['playerName'],
      threshold: 0.4, // 0 = exact match, 1 = match anything
      distance: 100,
      includeScore: true,
    });

    // Perform fuzzy search
    const searchResults = fuse.search(query, { limit: 20 });

    const mappedResults = searchResults.map(({ item: pick }) => {
      const isGoaliePlayer = isGoalie(pick.playerName, pick.position);
      const protectionExpires = calculateProtectionExpiry(pick.year, isGoaliePlayer);

      return {
        playerName: pick.playerName,
        teamId: pick.teamId,
        teamName: pick.teamName,
        draftYear: pick.year,
        round: pick.round,
        pick: pick.pick,
        position: isGoaliePlayer ? 'G' : null,
        protectionExpires: protectionExpires.toString(),
        isProtected: protectionExpires >= currentYear,
      };
    });

    return NextResponse.json(mappedResults);
  } catch (error) {
    console.error('Protection search error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
