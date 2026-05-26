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
    const { year } = await request.json();

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

    // Both drafts and published results can be deleted. The admin UI shows a
    // stronger confirmation for published ones.
    await db
      .delete(lotteryResults)
      .where(eq(lotteryResults.year, year));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete lottery:', error);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
