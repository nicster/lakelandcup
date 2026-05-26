import { NextRequest, NextResponse } from 'next/server';
import { db, lotteryResults } from '@/lib/db';
import { eq } from 'drizzle-orm';

// Verify admin session
function isAuthenticated(request: NextRequest): boolean {
  const session = request.cookies.get('lakeland_admin_session');
  const expected = Buffer.from(process.env.ADMIN_PASSWORD || '').toString('base64');
  return session?.value === expected;
}

export async function POST(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { year } = body;
    // Default to publish=true for backwards compatibility; pass `publish: false`
    // to unpublish (hide from the public /lottery page).
    const publish = body.publish === undefined ? true : Boolean(body.publish);

    if (!year) {
      return NextResponse.json({ error: 'Year is required' }, { status: 400 });
    }

    const existing = await db
      .select()
      .from(lotteryResults)
      .where(eq(lotteryResults.year, year))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ error: 'Lottery result not found' }, { status: 404 });
    }

    if (existing[0].isPublished === publish) {
      return NextResponse.json(
        { error: publish ? 'Already published' : 'Already hidden' },
        { status: 400 },
      );
    }

    await db
      .update(lotteryResults)
      .set({
        isPublished: publish,
        publishedAt: publish ? new Date() : null,
      })
      .where(eq(lotteryResults.year, year));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update lottery publish state:', error);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}
