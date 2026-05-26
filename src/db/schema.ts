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
  isActive: boolean('is_active').default(true),
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
  position: text('position'),                  // Player position: "G" for goalie, "F", "D"
  tradedToTeamId: integer('traded_to_team_id').references(() => members.id),
  tradedToTeamName: text('traded_to_team_name'), // If player was traded after draft
});

// Protected prospects (rookies with rights held by teams)
export const prospects = pgTable('prospects', {
  id: serial('id').primaryKey(),
  playerName: text('player_name').notNull(),
  teamId: integer('team_id').references(() => members.id),
  teamName: text('team_name').notNull(),      // Original team name from data
  rightsExpire: text('rights_expire').notNull(), // Year rights expire: "2025"
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

// Trades — header row per trade. A trade can involve 2+ teams; participants
// are derived from the trade_assets rows. Conditions and "better/lesser of"
// language are stored per asset so multi-party complexity is captured.
export const trades = pgTable('trades', {
  id: serial('id').primaryKey(),
  name: text('name'),                    // Optional nickname: "Vasylevsky Trade"
  tradeDate: text('trade_date').notNull(), // "2024-11-08"
  season: text('season'),                  // Optional context: "2024-25"
  notes: text('notes'),                    // Free-form commentary
  createdAt: timestamp('created_at').defaultNow(),
});

// Trade assets — one row per item that changes hands. Each row is a single
// directional transfer (from_team → to_team). A trade has many rows.
// asset_kind drives which fields are filled:
//   'pick' → pickYear + pickRound (and optionally pickOriginalTeamId)
//   'player' → playerName
//   'other' → description (e.g. "future considerations", "better of two 2nd-round picks")
export const tradeAssets = pgTable('trade_assets', {
  id: serial('id').primaryKey(),
  tradeId: integer('trade_id')
    .notNull()
    .references(() => trades.id, { onDelete: 'cascade' }),
  fromTeamId: integer('from_team_id').notNull().references(() => members.id),
  toTeamId: integer('to_team_id').notNull().references(() => members.id),
  assetKind: text('asset_kind').notNull(), // 'pick' | 'player' | 'other'
  // Pick-specific
  pickYear: text('pick_year'),             // "2026"
  pickRound: integer('pick_round'),        // 1 or 2
  pickOriginalTeamId: integer('pick_original_team_id').references(() => members.id),
  // Player-specific
  playerName: text('player_name'),
  // Fallback / sophisticated descriptions
  description: text('description'),        // "better of two 2nd-round picks"
  // Conditional language (rendered distinctively in the UI)
  condition: text('condition'),            // "if Goons win 2025 championship → becomes a 1st-round pick"
  sortOrder: integer('sort_order').default(0),
});

// Lottery results
export const lotteryResults = pgTable('lottery_results', {
  id: serial('id').primaryKey(),
  year: text('year').notNull().unique(),     // "2025" (draft year)
  // Teams entering lottery (by standing position)
  team9thId: integer('team_9th_id').references(() => members.id),
  team10thId: integer('team_10th_id').references(() => members.id),
  team11thId: integer('team_11th_id').references(() => members.id),
  team12thId: integer('team_12th_id').references(() => members.id),
  // Results (team IDs in pick order)
  pick1TeamId: integer('pick_1_team_id').references(() => members.id),
  pick2TeamId: integer('pick_2_team_id').references(() => members.id),
  pick3TeamId: integer('pick_3_team_id').references(() => members.id),
  pick4TeamId: integer('pick_4_team_id').references(() => members.id),
  // Metadata
  isPublished: boolean('is_published').default(false),
  runAt: timestamp('run_at').defaultNow(),
  publishedAt: timestamp('published_at'),
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
export type Prospect = typeof prospects.$inferSelect;
export type NewProspect = typeof prospects.$inferInsert;
export type LotteryResult = typeof lotteryResults.$inferSelect;
export type NewLotteryResult = typeof lotteryResults.$inferInsert;
export type Trade = typeof trades.$inferSelect;
export type NewTrade = typeof trades.$inferInsert;
export type TradeAsset = typeof tradeAssets.$inferSelect;
export type NewTradeAsset = typeof tradeAssets.$inferInsert;
