import { NextRequest, NextResponse } from 'next/server';
import { db, members } from '@/lib/db';
import { asc, inArray } from 'drizzle-orm';

// Current active teams (2024-25 season)
const ACTIVE_TEAM_NAMES = [
  'Stonemere Flyers',
  'Drunken Monkeys',
  'Slithering Goons',
  'Illinois Ice Cracker',
  'Galaxy Squad',
  'Winnipeg Bulldozers',
  'Dörfli Snipers',
  'Eastside Grizzlies',
  'Pittsburgh Walruses',
  'Täuffelen Phantoms',
  'Lyss Falcons',
  'Oerlikon Gamblers',
];

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const activeOnly = searchParams.get('active') === 'true';

  try {
    let query = db
      .select({
        id: members.id,
        name: members.name,
        logo: members.logo,
      })
      .from(members);

    if (activeOnly) {
      query = db
        .select({
          id: members.id,
          name: members.name,
          logo: members.logo,
        })
        .from(members)
        .where(inArray(members.name, ACTIVE_TEAM_NAMES));
    }

    const teams = await query.orderBy(asc(members.name));

    return NextResponse.json(teams);
  } catch (error) {
    console.error('Failed to fetch teams:', error);
    return NextResponse.json({ error: 'Failed to fetch teams' }, { status: 500 });
  }
}
