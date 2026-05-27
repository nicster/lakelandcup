import { NextRequest, NextResponse } from 'next/server';
import { db, rosterHistory, franchisePlayers, members } from '@/lib/db';
import { asc } from 'drizzle-orm';
import { nextSeason } from '@/lib/season';

function isAuthenticated(request: NextRequest): boolean {
  const session = request.cookies.get('lakeland_admin_session');
  const expected = Buffer.from(process.env.ADMIN_PASSWORD || '').toString('base64');
  return session?.value === expected;
}

const FRANCHISE_THRESHOLD = 10;

// Longest run of consecutive season-start-years in a sorted unique list.
// Seasons format: "YYYY-YY"; the start year is the first 4 chars.
function longestConsecutiveRun(seasons: string[]): { run: number; start: string; end: string } {
  if (seasons.length === 0) return { run: 0, start: '', end: '' };
  const sorted = Array.from(new Set(seasons)).sort();
  let bestRun = 1;
  let bestStart = sorted[0];
  let bestEnd = sorted[0];
  let currentRun = 1;
  let currentStart = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    const prev = parseInt(sorted[i - 1].slice(0, 4), 10);
    const cur = parseInt(sorted[i].slice(0, 4), 10);
    if (cur === prev + 1) {
      currentRun++;
    } else {
      currentRun = 1;
      currentStart = sorted[i];
    }
    if (currentRun > bestRun) {
      bestRun = currentRun;
      bestStart = currentStart;
      bestEnd = sorted[i];
    }
  }
  return { run: bestRun, start: bestStart, end: bestEnd };
}

// GET /api/admin/franchise-candidates
// Returns players with ≥10 consecutive seasons on one team who aren't yet
// on the Rafters wall. Also returns "near-misses" (8-9 streaks) so the
// commissioner can plan ahead.
export async function GET(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const [allRoster, allTeams, alreadyBanner] = await Promise.all([
      db
        .select({
          playerName: rosterHistory.playerName,
          teamId: rosterHistory.teamId,
          season: rosterHistory.season,
          jerseyNumber: rosterHistory.jerseyNumber,
          position: rosterHistory.position,
        })
        .from(rosterHistory)
        .orderBy(asc(rosterHistory.playerName), asc(rosterHistory.teamId), asc(rosterHistory.season)),
      db
        .select({ id: members.id, name: members.name, logo: members.logo })
        .from(members),
      db
        .select({
          id: franchisePlayers.id,
          playerName: franchisePlayers.playerName,
          teamId: franchisePlayers.teamId,
          teamName: franchisePlayers.teamName,
          seasonEnd: franchisePlayers.seasonEnd,
        })
        .from(franchisePlayers),
    ]);

    const teamMap = new Map(allTeams.map((t) => [t.id, t]));
    const bannerKey = (player: string, teamId: number | null) =>
      `${player.toLowerCase()}|${teamId ?? 'null'}`;
    const bannerSet = new Set(
      alreadyBanner.map((b) => bannerKey(b.playerName, b.teamId ?? null)),
    );

    // Group by (player, team). Track the latest non-null jersey + position
    // seen — allRoster is ordered by season ASC, so the last assignment wins.
    const groups = new Map<
      string,
      {
        playerName: string;
        teamId: number;
        seasons: string[];
        jerseyNumber: string | null;
        position: string | null;
      }
    >();
    for (const r of allRoster) {
      const key = `${r.playerName.toLowerCase()}|${r.teamId}`;
      if (!groups.has(key)) {
        groups.set(key, {
          playerName: r.playerName,
          teamId: r.teamId,
          seasons: [],
          jerseyNumber: null,
          position: null,
        });
      }
      const g = groups.get(key)!;
      g.seasons.push(r.season);
      if (r.jerseyNumber) g.jerseyNumber = r.jerseyNumber;
      if (r.position) g.position = r.position;
    }

    type CandidateRow = {
      playerName: string;
      teamId: number;
      teamName: string | null;
      teamLogo: string | null;
      run: number;
      seasonStart: string;
      seasonEnd: string;
      jerseyNumber: string | null;
      position: string | null;
    };
    const all: CandidateRow[] = [];
    const near: CandidateRow[] = [];
    Array.from(groups.values()).forEach((g) => {
      const { run, start, end } = longestConsecutiveRun(g.seasons);
      if (run < 8) return;
      if (bannerSet.has(bannerKey(g.playerName, g.teamId))) return;
      const team = teamMap.get(g.teamId);
      const row: CandidateRow = {
        playerName: g.playerName,
        teamId: g.teamId,
        teamName: team?.name ?? null,
        teamLogo: team?.logo ?? null,
        run,
        seasonStart: start,
        seasonEnd: end,
        jerseyNumber: g.jerseyNumber,
        position: g.position,
      };
      if (run >= FRANCHISE_THRESHOLD) all.push(row);
      else near.push(row);
    });

    // Sort: longest streak first, then alphabetical.
    all.sort((a, b) => b.run - a.run || a.playerName.localeCompare(b.playerName));
    near.sort((a, b) => b.run - a.run || a.playerName.localeCompare(b.playerName));

    // Stale banners: a banner is "active" (no seasonEnd, or seasonEnd ===
    // CURRENT_SEASON) but the player isn't on that team's most recently synced
    // roster. Suggest closing at the player's last seen season.
    //
    // Index: latest synced season per team, and per (player, team) the
    // player's latest synced season.
    const teamLatestSeason = new Map<number, string>();
    const playerTeamLatest = new Map<string, string>();
    for (const r of allRoster) {
      const cur = teamLatestSeason.get(r.teamId);
      if (!cur || r.season > cur) teamLatestSeason.set(r.teamId, r.season);
      const ptKey = `${r.playerName.toLowerCase()}|${r.teamId}`;
      const ptCur = playerTeamLatest.get(ptKey);
      if (!ptCur || r.season > ptCur) playerTeamLatest.set(ptKey, r.season);
    }

    type StaleBanner = {
      id: number;
      playerName: string;
      teamId: number | null;
      teamName: string;
      teamLogo: string | null;
      lastSeason: string;
      teamLatestSeason: string;
      suggestedEnd: string;
    };
    const stale: StaleBanner[] = [];
    for (const b of alreadyBanner) {
      // Only flag banners with no explicit end. Any non-null seasonEnd —
      // even CURRENT_SEASON — is a deliberate close by the commissioner;
      // don't second-guess it here.
      if (b.seasonEnd) continue;
      // Need a teamId to look up roster history. Banners with null teamId
      // (legacy historical-only entries) skip — can't verify.
      if (b.teamId == null) continue;
      const teamLatest = teamLatestSeason.get(b.teamId);
      // No roster data for this team → can't decide. Skip silently.
      if (!teamLatest) continue;
      const ptKey = `${b.playerName.toLowerCase()}|${b.teamId}`;
      const playerLast = playerTeamLatest.get(ptKey);
      // Player still on team's latest synced roster → not stale.
      if (playerLast && playerLast >= teamLatest) continue;
      // No roster data for this player on this team at all → can't suggest.
      if (!playerLast) continue;
      const team = teamMap.get(b.teamId);
      // The player was on the wall through `playerLast` and got dropped
      // during the next season — so close at lastSeason + 1.
      const suggestedEnd = nextSeason(playerLast) ?? playerLast;
      stale.push({
        id: b.id,
        playerName: b.playerName,
        teamId: b.teamId,
        teamName: b.teamName,
        teamLogo: team?.logo ?? null,
        lastSeason: playerLast,
        teamLatestSeason: teamLatest,
        suggestedEnd,
      });
    }
    stale.sort(
      (a, b) =>
        a.lastSeason.localeCompare(b.lastSeason) ||
        a.playerName.localeCompare(b.playerName),
    );

    return NextResponse.json({
      threshold: FRANCHISE_THRESHOLD,
      candidates: all,
      nearMisses: near,
      staleBanners: stale,
      hasRosterData: allRoster.length > 0,
    });
  } catch (err) {
    console.error('Failed to compute candidates:', err);
    return NextResponse.json({ error: 'compute_failed' }, { status: 500 });
  }
}
