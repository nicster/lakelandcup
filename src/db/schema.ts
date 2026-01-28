import { pgTable, serial, text, integer, boolean, timestamp } from 'drizzle-orm/pg-core';

// League members (teams)
export const members = pgTable('members', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),           // Current team name: "Stonemere Flyers"
  owner: text('owner').notNull(),         // Owner name: "Nicolas"
  formerName: text('former_name'),        // Previous team name: "Schlieren Flyers"
  logo: text('logo'),                     // Logo filename: "stonemere-flyers.png"
  colors: text('colors'),                 // JSON array of hex colors: ["#1e3a5f", "#ffffff", "#c4a962"]
  email: text('email'),
  isCommissioner: boolean('is_commissioner').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

// Seasons with champions
export const seasons = pgTable('seasons', {
  id: serial('id').primaryKey(),
  year: text('year').notNull().unique(),  // "2023-24"
  championId: integer('champion_id').references(() => members.id),
  runnerUpId: integer('runner_up_id').references(() => members.id),
  finalResult: text('final_result'),      // "7-5" (champion score first)
  notes: text('notes'),
});

// Rules content (editable by admin)
export const rules = pgTable('rules', {
  id: serial('id').primaryKey(),
  section: text('section').notNull(),     // "roster", "prospects", "trades", etc.
  title: text('title').notNull(),
  content: text('content').notNull(),     // Markdown content
  sortOrder: integer('sort_order').default(0),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Draft picks
export const draftPicks = pgTable('draft_picks', {
  id: serial('id').primaryKey(),
  year: text('year').notNull(),              // "2017" (draft year)
  round: integer('round').notNull(),          // 1 or 2
  pick: integer('pick').notNull(),            // Pick number (1-12 for R1, 13-24 for R2)
  teamId: integer('team_id').references(() => members.id),
  teamName: text('team_name').notNull(),      // Team that made the pick
  fromTeamId: integer('from_team_id').references(() => members.id),
  fromTeamName: text('from_team_name'),       // Original team if pick was traded
  playerName: text('player_name').notNull(),  // Player selected
  tradedToTeamId: integer('traded_to_team_id').references(() => members.id),
  tradedToTeamName: text('traded_to_team_name'), // If player was traded after draft
});

// Franchise players (10+ consecutive years with same team)
export const franchisePlayers = pgTable('franchise_players', {
  id: serial('id').primaryKey(),
  playerName: text('player_name').notNull(),
  jerseyNumber: text('jersey_number'),
  position: text('position'),
  teamId: integer('team_id').references(() => members.id),
  teamName: text('team_name').notNull(),    // Denormalized for historical accuracy
  years: integer('years').notNull(),
  games: integer('games'),                   // Estimated games (years * 82)
  seasonStart: text('season_start'),         // "2013-14"
  seasonEnd: text('season_end'),             // "2024-25"
  teamColors: text('team_colors'),           // JSON array of hex colors
});

// Type exports for use in application
export type Member = typeof members.$inferSelect;
export type NewMember = typeof members.$inferInsert;
export type Season = typeof seasons.$inferSelect;
export type NewSeason = typeof seasons.$inferInsert;
export type Rule = typeof rules.$inferSelect;
export type NewRule = typeof rules.$inferInsert;
export type FranchisePlayer = typeof franchisePlayers.$inferSelect;
export type NewFranchisePlayer = typeof franchisePlayers.$inferInsert;
export type DraftPick = typeof draftPicks.$inferSelect;
export type NewDraftPick = typeof draftPicks.$inferInsert;
