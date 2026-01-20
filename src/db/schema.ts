import { pgTable, serial, text, integer, boolean, timestamp } from 'drizzle-orm/pg-core';

// League members (teams)
export const members = pgTable('members', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),           // Current team name: "Stonemere Flyers"
  owner: text('owner').notNull(),         // Owner name: "Nicolas"
  formerName: text('former_name'),        // Previous team name: "Schlieren Flyers"
  logo: text('logo'),                     // Logo filename: "stonemere-flyers.png"
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

// Type exports for use in application
export type Member = typeof members.$inferSelect;
export type NewMember = typeof members.$inferInsert;
export type Season = typeof seasons.$inferSelect;
export type NewSeason = typeof seasons.$inferInsert;
export type Rule = typeof rules.$inferSelect;
export type NewRule = typeof rules.$inferInsert;
