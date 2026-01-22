import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { members, seasons } from './schema';
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

interface LeagueData {
  teams: { name: string; owner: string; logo?: string }[];
  seasons: {
    season: string;
    champion_team: string;
    champion_owner: string;
    runner_up_team: string;
    runner_up_owner: string;
    playoffs: PlayoffMatchup[] | null;
    notes?: string;
  }[];
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
  'Eastside Grizzlys': 'Eastside Grizzlies', // Spelling typo
  'Elfenau Gamblers': 'Oerlikon Gamblers',   // Sven renamed his team
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

  // Build a map from team name to logo filename
  const logoMap = new Map<string, string>();
  for (const team of leagueData.teams) {
    if (team.logo) {
      logoMap.set(team.name, team.logo);
      // Also map normalized name to logo
      const normalizedName = normalizeTeamName(team.name);
      if (normalizedName !== team.name) {
        logoMap.set(normalizedName, team.logo);
      }
    }
  }

  // Build unique members map from ALL teams in the data
  const memberMap = new Map<string, { name: string; owner: string; logo?: string }>();

  // First, add all teams from the teams array
  for (const team of leagueData.teams) {
    const teamName = normalizeTeamName(team.name);
    if (!memberMap.has(teamName)) {
      memberMap.set(teamName, {
        name: teamName,
        owner: team.owner,
        logo: team.logo,
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
      });
    }
    if (!memberMap.has(runnerUpName)) {
      memberMap.set(runnerUpName, {
        name: runnerUpName,
        owner: season.runner_up_owner,
        logo: logoMap.get(runnerUpName),
      });
    }
  }

  console.log(`Identified ${memberMap.size} unique teams`);

  // Clear existing data
  console.log('Clearing existing data...');
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

  console.log('Seed complete!');
  await pool.end();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
