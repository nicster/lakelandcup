import { NextRequest, NextResponse } from 'next/server';
import { db, members } from '@/lib/db';
import { asc, eq } from 'drizzle-orm';

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
        id: members.id,
        name: members.name,
        owner: members.owner,
        formerName: members.formerName,
        logo: members.logo,
        colors: members.colors,
        email: members.email,
        isCommissioner: members.isCommissioner,
      })
      .from(members)
      .orderBy(asc(members.name));
    return NextResponse.json(rows);
  } catch (err) {
    console.error('Failed to list teams:', err);
    return NextResponse.json({ error: 'Failed to list teams' }, { status: 500 });
  }
}

interface TeamInput {
  name?: string;
  owner?: string;
  formerName?: string | null;
  logo?: string | null;
  colors?: string[] | null;
  email?: string | null;
  isCommissioner?: boolean;
}

function validate(body: TeamInput): string | null {
  if (!body.name?.trim()) return 'Team name is required.';
  if (!body.owner?.trim()) return 'Owner is required.';
  if (body.logo && !/^[a-z0-9_-]+\.(png|jpg|jpeg|svg|webp)$/i.test(body.logo.trim())) {
    return 'Logo must be a simple filename like “lyss-falcons.png”.';
  }
  if (body.colors && Array.isArray(body.colors)) {
    for (const c of body.colors) {
      if (typeof c !== 'string' || !/^#[0-9a-f]{6}$/i.test(c)) {
        return 'Colors must be 6-digit hex codes like #c41e3a.';
      }
    }
  }
  return null;
}

function serializeColors(colors: string[] | null | undefined): string | null {
  if (!colors || colors.length === 0) return null;
  return JSON.stringify(colors);
}

export async function POST(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = (await request.json()) as TeamInput;
    const err = validate(body);
    if (err) return NextResponse.json({ error: 'invalid', message: err }, { status: 400 });

    // Reject duplicate names (case-insensitive — the league is small).
    const existing = await db.select({ id: members.id, name: members.name }).from(members);
    if (existing.some((m) => m.name.toLowerCase() === body.name!.trim().toLowerCase())) {
      return NextResponse.json(
        { error: 'duplicate', message: `A team named “${body.name}” already exists.` },
        { status: 409 },
      );
    }

    const [created] = await db
      .insert(members)
      .values({
        name: body.name!.trim(),
        owner: body.owner!.trim(),
        formerName: body.formerName?.trim() || null,
        logo: body.logo?.trim() || null,
        colors: serializeColors(body.colors),
        email: body.email?.trim() || null,
        isCommissioner: Boolean(body.isCommissioner),
      })
      .returning({ id: members.id });
    return NextResponse.json({ id: created.id }, { status: 201 });
  } catch (err) {
    console.error('Failed to create team:', err);
    return NextResponse.json(
      { error: 'save_failed', message: err instanceof Error ? err.message : 'Save failed' },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const id = parseInt(request.nextUrl.searchParams.get('id') ?? '', 10);
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: 'invalid id' }, { status: 400 });
    }
    const body = (await request.json()) as TeamInput;
    const err = validate(body);
    if (err) return NextResponse.json({ error: 'invalid', message: err }, { status: 400 });

    await db
      .update(members)
      .set({
        name: body.name!.trim(),
        owner: body.owner!.trim(),
        formerName: body.formerName?.trim() || null,
        logo: body.logo?.trim() || null,
        colors: serializeColors(body.colors),
        email: body.email?.trim() || null,
        isCommissioner: Boolean(body.isCommissioner),
      })
      .where(eq(members.id, id));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Failed to update team:', err);
    return NextResponse.json(
      { error: 'update_failed', message: err instanceof Error ? err.message : 'Update failed' },
      { status: 500 },
    );
  }
}
