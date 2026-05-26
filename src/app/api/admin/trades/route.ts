import { NextRequest, NextResponse } from 'next/server';
import { db, trades, tradeAssets } from '@/lib/db';
import { desc, eq, sql } from 'drizzle-orm';

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
    const rows = await db
      .select({
        id: trades.id,
        name: trades.name,
        tradeDate: trades.tradeDate,
        assetCount: sql<number>`count(${tradeAssets.id})::int`,
      })
      .from(trades)
      .leftJoin(tradeAssets, eq(tradeAssets.tradeId, trades.id))
      .groupBy(trades.id)
      .orderBy(desc(trades.tradeDate), desc(trades.id));
    return NextResponse.json(rows);
  } catch (err) {
    console.error('Failed to list trades:', err);
    return NextResponse.json({ error: 'Failed to list trades' }, { status: 500 });
  }
}

interface AssetInput {
  sortOrder: number;
  fromTeamId: number;
  toTeamId: number;
  assetKind: 'pick' | 'player' | 'other';
  pickYear: string | null;
  pickRound: 1 | 2 | null;
  pickOriginalTeamId: number | null;
  playerName: string | null;
  description: string | null;
  condition: string | null;
}

export async function POST(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await request.json();
    const { tradeDate, name, season, notes, assets } = body as {
      tradeDate: string;
      name: string | null;
      season: string | null;
      notes: string | null;
      assets: AssetInput[];
    };

    if (!tradeDate || !Array.isArray(assets) || assets.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields', message: 'Date and at least one transfer are required.' },
        { status: 400 },
      );
    }

    const [created] = await db
      .insert(trades)
      .values({ tradeDate, name, season, notes })
      .returning({ id: trades.id });

    await db.insert(tradeAssets).values(
      assets.map((a) => ({
        tradeId: created.id,
        sortOrder: a.sortOrder ?? 0,
        fromTeamId: a.fromTeamId,
        toTeamId: a.toTeamId,
        assetKind: a.assetKind,
        pickYear: a.pickYear,
        pickRound: a.pickRound,
        pickOriginalTeamId: a.pickOriginalTeamId,
        playerName: a.playerName,
        description: a.description,
        condition: a.condition,
      })),
    );

    return NextResponse.json({ id: created.id }, { status: 201 });
  } catch (err) {
    console.error('Failed to save trade:', err);
    return NextResponse.json(
      { error: 'save_failed', message: err instanceof Error ? err.message : 'Save failed' },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const id = parseInt(request.nextUrl.searchParams.get('id') ?? '', 10);
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: 'invalid id' }, { status: 400 });
    }
    // tradeAssets has ON DELETE CASCADE
    await db.delete(trades).where(eq(trades.id, id));
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Failed to delete trade:', err);
    return NextResponse.json({ error: 'delete_failed' }, { status: 500 });
  }
}
