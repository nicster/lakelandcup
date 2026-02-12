import { NextRequest, NextResponse } from 'next/server';
import { db, lotteryResults } from '@/lib/db';
import { eq } from 'drizzle-orm';

// Verify admin session (same logic as middleware)
function isAuthenticated(request: NextRequest): boolean {
  const session = request.cookies.get('lakeland_admin_session');
  const expected = Buffer.from(process.env.ADMIN_PASSWORD || '').toString('base64');
  return session?.value === expected;
}

export async function POST(request: NextRequest) {
  // Verify authentication
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      year,
      team9thId,
      team10thId,
      team11thId,
      team12thId,
      pick1TeamId,
      pick2TeamId,
      pick3TeamId,
      pick4TeamId,
      isPublished,
    } = body;

    // Validate required fields
    if (!year || !team9thId || !team10thId || !team11thId || !team12thId ||
        !pick1TeamId || !pick2TeamId || !pick3TeamId || !pick4TeamId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if lottery already exists for this year
    const existing = await db
      .select()
      .from(lotteryResults)
      .where(eq(lotteryResults.year, year))
      .limit(1);

    if (existing.length > 0) {
      // Update existing
      await db
        .update(lotteryResults)
        .set({
          team9thId,
          team10thId,
          team11thId,
          team12thId,
          pick1TeamId,
          pick2TeamId,
          pick3TeamId,
          pick4TeamId,
          isPublished,
          runAt: new Date(),
          publishedAt: isPublished ? new Date() : null,
        })
        .where(eq(lotteryResults.year, year));
    } else {
      // Insert new
      await db.insert(lotteryResults).values({
        year,
        team9thId,
        team10thId,
        team11thId,
        team12thId,
        pick1TeamId,
        pick2TeamId,
        pick3TeamId,
        pick4TeamId,
        isPublished,
        publishedAt: isPublished ? new Date() : null,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to save lottery results:', error);
    return NextResponse.json({ error: 'Failed to save results' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  // Verify authentication
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const results = await db
      .select()
      .from(lotteryResults)
      .orderBy(lotteryResults.year);

    return NextResponse.json(results);
  } catch (error) {
    console.error('Failed to fetch lottery results:', error);
    return NextResponse.json({ error: 'Failed to fetch results' }, { status: 500 });
  }
}
