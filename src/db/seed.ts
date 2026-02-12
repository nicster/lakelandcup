import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { members, seasons, franchisePlayers, draftPicks, prospects } from './schema';
import * as fs from 'fs';
import * as path from 'path';

// League data interface
interface PlayoffMatchup {
  week: number;
  round: number;
  teams: string[];
  scores: number[];
  winner: string | null;
}

interface FranchisePlayerData {
  player: string;
  team: string;
  jersey_number: string | null;
  position: string;
  years: number;
  games: number;
  seasons: string[];
  team_colors: string[] | null;
}

interface LeagueData {
  teams: { name: string; owner: string; logo?: string; colors?: string[] }[];
  seasons: {
    season: string;
    champion_team: string;
    champion_owner: string;
    runner_up_team: string;
    runner_up_owner: string;
    playoffs: PlayoffMatchup[] | null;
    notes?: string;
  }[];
  franchise_players?: FranchisePlayerData[];
}

interface DraftPickData {
  pick: number;
  team: string;
  from_team: string | null;
  player: string;
  traded_to: string | null;
}

interface DraftData {
  drafts: {
    [year: string]: {
      year: string;
      entry_draft: {
        round_1: DraftPickData[];
        round_2: DraftPickData[];
      };
    };
  };
  prospects: Record<string, { player: string; rights_expire: string }[]>;
}

// Extract the final result from playoff data
function getFinalResult(playoffs: PlayoffMatchup[] | null, championTeam: string, runnerUpTeam: string): string | null {
  if (!playoffs || playoffs.length === 0) return null;

  // Find the highest round number (the final)
  const maxRound = Math.max(...playoffs.map(p => p.round));

  // Find the championship game (the matchup with champion and runner-up in the final round)
  const finalGame = playoffs.find(p =>
    p.round === maxRound &&
    p.teams.includes(championTeam) &&
    p.teams.includes(runnerUpTeam)
  );

  if (!finalGame) return null;

  // Get scores in order: champion score - runner-up score
  const champIndex = finalGame.teams.indexOf(championTeam);
  const runnerUpIndex = finalGame.teams.indexOf(runnerUpTeam);

  const champScore = finalGame.scores[champIndex];
  const runnerUpScore = finalGame.scores[runnerUpIndex];

  return `${champScore}-${runnerUpScore}`;
}

// Normalize team names - map old names to current names
// These are teams that were renamed by their owners
const TEAM_NAME_NORMALIZATION: Record<string, string> = {
  // Spelling corrections
  'Eastside Grizzlys': 'Eastside Grizzlies',
  'Eastside Grizzly': 'Eastside Grizzlies',
  'Grizzlies': 'Eastside Grizzlies',
  'Elfenau Gamblers': 'Oerlikon Gamblers',
  'Elfenau Gambles': 'Oerlikon Gamblers',
  'Gamblers': 'Oerlikon Gamblers',
  'Illinois Icecrackers': 'Illinois Ice Cracker',
  'Illinois Ice Crackers': 'Illinois Ice Cracker',
  'Ice-Crackers': 'Illinois Ice Cracker',
  'Illinois Crackheads': 'Illinois Ice Cracker',
  'Illiois Ice Crackers': 'Illinois Ice Cracker',
  'Illiniois Ice Cracker': 'Illinois Ice Cracker',
  'Dörfl Snipers': 'Dörfli Snipers',
  'Snipers': 'Dörfli Snipers',
  'Stonemer Flyers': 'Stonemere Flyers',
  'Stonemery Flyers': 'Stonemere Flyers',
  'Flyers': 'Stonemere Flyers',
  'Pittsburg Walruses': 'Pittsburgh Walruses',
  'Walruses': 'Pittsburgh Walruses',
  // Short name abbreviations used in newer drafts
  'Goons': 'Slithering Goons',
  'Monkeys': 'Drunken Monkeys',
  'Falcons': 'Lyss Falcons',
  'Phantoms': 'Täuffelen Phantoms',
  'Bulldozer': 'Winnipeg Bulldozers',
  'Bulldozers': 'Winnipeg Bulldozers',
};

// Track former names for teams that were renamed
const TEAM_FORMER_NAMES: Record<string, string> = {
  'Oerlikon Gamblers': 'Elfenau Gamblers',
};

function normalizeTeamName(name: string): string {
  return TEAM_NAME_NORMALIZATION[name] || name;
}

async function seed() {
  console.log('Starting database seed...');

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  const db = drizzle(pool);

  // Read league data
  const dataPath = path.join(__dirname, '../../scripts/league_data.json');
  const leagueData: LeagueData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

  console.log(`Found ${leagueData.teams.length} teams and ${leagueData.seasons.length} seasons`);

  // Build a map from team name to logo filename and colors
  const logoMap = new Map<string, string>();
  const colorsMap = new Map<string, string[]>();
  for (const team of leagueData.teams) {
    if (team.logo) {
      logoMap.set(team.name, team.logo);
      // Also map normalized name to logo
      const normalizedName = normalizeTeamName(team.name);
      if (normalizedName !== team.name) {
        logoMap.set(normalizedName, team.logo);
      }
    }
    if (team.colors) {
      colorsMap.set(team.name, team.colors);
      const normalizedName = normalizeTeamName(team.name);
      if (normalizedName !== team.name) {
        colorsMap.set(normalizedName, team.colors);
      }
    }
  }

  // Build unique members map from ALL teams in the data
  const memberMap = new Map<string, { name: string; owner: string; logo?: string; colors?: string[] }>();

  // First, add all teams from the teams array
  for (const team of leagueData.teams) {
    const teamName = normalizeTeamName(team.name);
    if (!memberMap.has(teamName)) {
      memberMap.set(teamName, {
        name: teamName,
        owner: team.owner,
        logo: team.logo,
        colors: team.colors,
      });
    }
  }

  // Also ensure champions/runner-ups are included with their owners
  for (const season of leagueData.seasons) {
    const champName = normalizeTeamName(season.champion_team);
    const runnerUpName = normalizeTeamName(season.runner_up_team);

    if (!memberMap.has(champName)) {
      memberMap.set(champName, {
        name: champName,
        owner: season.champion_owner,
        logo: logoMap.get(champName),
        colors: colorsMap.get(champName),
      });
    }
    if (!memberMap.has(runnerUpName)) {
      memberMap.set(runnerUpName, {
        name: runnerUpName,
        owner: season.runner_up_owner,
        logo: logoMap.get(runnerUpName),
        colors: colorsMap.get(runnerUpName),
      });
    }
  }

  console.log(`Identified ${memberMap.size} unique teams`);

  // Clear existing data
  console.log('Clearing existing data...');
  await db.delete(prospects);
  await db.delete(draftPicks);
  await db.delete(franchisePlayers);
  await db.delete(seasons);
  await db.delete(members);

  // Insert members
  console.log('Inserting members...');
  const memberIdMap = new Map<string, number>();

  const memberEntries = Array.from(memberMap.entries());
  for (const entry of memberEntries) {
    const [name, member] = entry;
    const formerName = TEAM_FORMER_NAMES[name] || null;
    const result = await db
      .insert(members)
      .values({
        name: member.name,
        owner: member.owner !== '--hidden--' ? member.owner : 'Unknown',
        formerName,
        logo: member.logo || null,
        colors: member.colors ? JSON.stringify(member.colors) : null,
      })
      .returning({ id: members.id });

    memberIdMap.set(name, result[0].id);
    const formerNote = formerName ? ` (formerly ${formerName})` : '';
    const logoNote = member.logo ? ` [${member.logo}]` : '';
    console.log(`  Added: ${member.name}${formerNote} (${member.owner})${logoNote} -> ID ${result[0].id}`);
  }

  // Insert seasons
  console.log('Inserting seasons...');
  for (const season of leagueData.seasons) {
    const champName = normalizeTeamName(season.champion_team);
    const runnerUpName = normalizeTeamName(season.runner_up_team);

    const championId = memberIdMap.get(champName);
    const runnerUpId = memberIdMap.get(runnerUpName);

    if (!championId || !runnerUpId) {
      console.error(`  ERROR: Could not find member IDs for season ${season.season}`);
      console.error(`    Champion: ${champName} -> ${championId}`);
      console.error(`    Runner-up: ${runnerUpName} -> ${runnerUpId}`);
      continue;
    }

    // Extract final result from playoff data
    const finalResult = getFinalResult(season.playoffs, season.champion_team, season.runner_up_team);

    await db.insert(seasons).values({
      year: season.season,
      championId,
      runnerUpId,
      finalResult,
      notes: season.notes || null,
    });

    const resultNote = finalResult ? ` (${finalResult})` : '';
    console.log(`  Added season ${season.season}: ${champName} vs ${runnerUpName}${resultNote}`);
  }

  // Insert franchise players
  if (leagueData.franchise_players && leagueData.franchise_players.length > 0) {
    console.log('Inserting franchise players...');
    for (const fp of leagueData.franchise_players) {
      const teamName = normalizeTeamName(fp.team);
      const teamId = memberIdMap.get(teamName) || null;

      await db.insert(franchisePlayers).values({
        playerName: fp.player,
        jerseyNumber: fp.jersey_number,
        position: fp.position,
        teamId,
        teamName: fp.team,
        years: fp.years,
        games: fp.games,
        seasonStart: fp.seasons[0],
        seasonEnd: fp.seasons[fp.seasons.length - 1],
        teamColors: fp.team_colors ? JSON.stringify(fp.team_colors) : null,
      });

      const jersey = fp.jersey_number ? `#${fp.jersey_number}` : '';
      console.log(`  Added: ${fp.player} ${jersey} (${fp.team}) - ${fp.years} years`);
    }
    console.log(`  Total franchise players: ${leagueData.franchise_players.length}`);
  }

  // Insert draft picks
  const draftDataPath = path.join(__dirname, '../../scripts/draft_data.json');
  if (fs.existsSync(draftDataPath)) {
    console.log('Inserting draft picks...');
    const draftData: DraftData = JSON.parse(fs.readFileSync(draftDataPath, 'utf-8'));

    let totalPicks = 0;
    for (const [year, draft] of Object.entries(draftData.drafts)) {
      // Process round 1
      for (const pick of draft.entry_draft.round_1) {
        const teamName = normalizeTeamName(pick.team);
        const fromTeamName = pick.from_team ? normalizeTeamName(pick.from_team) : null;
        const tradedToName = pick.traded_to ? normalizeTeamName(pick.traded_to) : null;

        await db.insert(draftPicks).values({
          year,
          round: 1,
          pick: pick.pick,
          teamId: memberIdMap.get(teamName) || null,
          teamName: pick.team,
          fromTeamId: fromTeamName ? memberIdMap.get(fromTeamName) || null : null,
          fromTeamName: pick.from_team,
          playerName: pick.player,
          tradedToTeamId: tradedToName ? memberIdMap.get(tradedToName) || null : null,
          tradedToTeamName: pick.traded_to,
        });
        totalPicks++;
      }

      // Process round 2
      for (const pick of draft.entry_draft.round_2) {
        const teamName = normalizeTeamName(pick.team);
        const fromTeamName = pick.from_team ? normalizeTeamName(pick.from_team) : null;
        const tradedToName = pick.traded_to ? normalizeTeamName(pick.traded_to) : null;

        await db.insert(draftPicks).values({
          year,
          round: 2,
          pick: pick.pick,
          teamId: memberIdMap.get(teamName) || null,
          teamName: pick.team,
          fromTeamId: fromTeamName ? memberIdMap.get(fromTeamName) || null : null,
          fromTeamName: pick.from_team,
          playerName: pick.player,
          tradedToTeamId: tradedToName ? memberIdMap.get(tradedToName) || null : null,
          tradedToTeamName: pick.traded_to,
        });
        totalPicks++;
      }

      const r1 = draft.entry_draft.round_1.length;
      const r2 = draft.entry_draft.round_2.length;
      console.log(`  Added ${year} draft: ${r1} R1 picks, ${r2} R2 picks`);
    }
    console.log(`  Total draft picks: ${totalPicks}`);

    // Insert prospects from the same draft data file
    if (draftData.prospects && Object.keys(draftData.prospects).length > 0) {
      console.log('Inserting prospects...');
      let totalProspects = 0;

      for (const [teamName, players] of Object.entries(draftData.prospects)) {
        const normalizedTeamName = normalizeTeamName(teamName);
        const teamId = memberIdMap.get(normalizedTeamName) || null;

        for (const player of players as { player: string; rights_expire: string }[]) {
          await db.insert(prospects).values({
            playerName: player.player,
            teamId,
            teamName: teamName,
            rightsExpire: player.rights_expire,
          });
          totalProspects++;
        }
      }

      console.log(`  Total prospects: ${totalProspects}`);
    }
  } else {
    console.log('No draft data file found, skipping draft picks and prospects...');
  }

  console.log('Seed complete!');
  await pool.end();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
