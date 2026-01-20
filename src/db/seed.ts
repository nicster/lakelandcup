import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { members, seasons } from './schema';
import { eq } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';

// League data interface
interface LeagueData {
  teams: { name: string; owner: string }[];
  seasons: {
    season: string;
    champion_team: string;
    champion_owner: string;
    runner_up_team: string;
    runner_up_owner: string;
    playoffs: unknown;
    notes?: string;
  }[];
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

  // Build unique members map (using normalized team names)
  const memberMap = new Map<string, { name: string; owner: string }>();

  for (const season of leagueData.seasons) {
    const champName = normalizeTeamName(season.champion_team);
    const runnerUpName = normalizeTeamName(season.runner_up_team);

    if (!memberMap.has(champName)) {
      memberMap.set(champName, { name: champName, owner: season.champion_owner });
    }
    if (!memberMap.has(runnerUpName)) {
      memberMap.set(runnerUpName, { name: runnerUpName, owner: season.runner_up_owner });
    }
  }

  console.log(`Identified ${memberMap.size} unique teams from season data`);

  // Clear existing data
  console.log('Clearing existing data...');
  await db.delete(seasons);
  await db.delete(members);

  // Insert members
  console.log('Inserting members...');
  const memberIdMap = new Map<string, number>();

  for (const [name, member] of memberMap) {
    const formerName = TEAM_FORMER_NAMES[name] || null;
    const result = await db
      .insert(members)
      .values({
        name: member.name,
        owner: member.owner !== '--hidden--' ? member.owner : 'Unknown',
        formerName,
      })
      .returning({ id: members.id });

    memberIdMap.set(name, result[0].id);
    const formerNote = formerName ? ` (formerly ${formerName})` : '';
    console.log(`  Added: ${member.name}${formerNote} (${member.owner}) -> ID ${result[0].id}`);
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

    await db.insert(seasons).values({
      year: season.season,
      championId,
      runnerUpId,
      notes: season.notes || null,
    });

    console.log(`  Added season ${season.season}: ${champName} vs ${runnerUpName}`);
  }

  console.log('Seed complete!');
  await pool.end();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
