# Player Database Implementation Plan

## Overview

Create a centralized player database to serve as the foundation for future features (player pages, improved search, stats tracking, trade history).

## Scope

**Rostered + Drafted Players** (~850-900 players)
- All 799 players from league history (from `player_history` in league_data.json)
- All drafted players (fills gaps for recent draftees not yet rostered)
- No external API dependency for core data
- Optional NHL API enrichment for extra details

## Schema Changes

### New Tables

**1. `players` table**
```typescript
players = pgTable('players', {
  id: serial('id').primaryKey(),
  yahooId: text('yahoo_id').unique(),        // "3788" - for API lookups
  name: text('name').notNull(),              // "Anze Kopitar"
  position: text('position'),                // G, D, C, LW, RW (nullable for draft-only players)
  jerseyNumber: text('jersey_number'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
```

**2. `playerTeamHistory` table** (tracks which players were on which teams each season)
```typescript
playerTeamHistory = pgTable('player_team_history', {
  id: serial('id').primaryKey(),
  playerId: integer('player_id').references(() => players.id).notNull(),
  teamId: integer('team_id').references(() => members.id).notNull(),
  season: text('season').notNull(),          // "2023-24"
});
```

### Modified Tables

Add `playerId` FK to existing tables (nullable for backwards compatibility):
- `draftPicks.playerId` → players.id
- `franchisePlayers.playerId` → players.id

## Data Population

### Primary Source: `league_data.json`

The `player_history` object contains 799 players with:
- name, position, player_id (Yahoo), jersey_number
- Team history: `{ teams: { "Stonemere Flyers": ["2023-24", "2024-25"] } }`

### Seed Process

1. Parse `player_history` from league_data.json
2. Insert into `players` table
3. Insert team-season relationships into `playerTeamHistory`
4. Backfill `playerId` in `draftPicks` by matching player names
5. Backfill `playerId` in `franchisePlayers`

### Draft Players Gap

Some recently drafted players may not be in `player_history` (not rostered yet). These get created from `draft_data.json` with minimal info (name only, position unknown until enriched).

## Update Mechanism

**Manual Refresh** (recommended for this league size):
1. Run `npm run fetch:yahoo` to update league_data.json with current rosters
2. Run `npm run db:seed` to sync changes to database

**Future Option**: Admin page with "Sync Players" button to trigger updates.

## Benefits After Implementation

1. **Remove KNOWN_GOALIES workaround** - Position data comes from database
2. **Player pages** - `/players/[id]` with career history
3. **Better protection search** - Search returns rich player data
4. **Trade tracking foundation** - Can track player movements
5. **Stats integration** - Ready for future stats features

## Files to Modify

| File | Changes |
|------|---------|
| `src/db/schema.ts` | Add `players` and `playerTeamHistory` tables, add `playerId` to existing tables |
| `src/db/seed.ts` | Add player seeding from `player_history`, backfill `playerId` |
| `src/app/teams/[id]/page.tsx` | Use player.position instead of KNOWN_GOALIES |
| `src/app/api/protection/search/route.ts` | Join with players table for position |

## Implementation Steps

### Step 1: Schema Changes (`src/db/schema.ts`)

Add new tables:
```typescript
export const players = pgTable('players', {
  id: serial('id').primaryKey(),
  yahooId: text('yahoo_id').unique(),
  name: text('name').notNull(),
  position: text('position'),
  jerseyNumber: text('jersey_number'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const playerTeamHistory = pgTable('player_team_history', {
  id: serial('id').primaryKey(),
  playerId: integer('player_id').references(() => players.id).notNull(),
  teamId: integer('team_id').references(() => members.id).notNull(),
  season: text('season').notNull(),
});
```

Add `playerId` FK to `draftPicks` and `franchisePlayers`:
```typescript
playerId: integer('player_id').references(() => players.id),
```

### Step 2: Update Seed Script (`src/db/seed.ts`)

1. Parse `player_history` from league_data.json
2. Build player name → ID map
3. Insert players, then team history
4. Backfill `playerId` in draft_picks by name match
5. Backfill `playerId` in franchise_players by name match

### Step 3: Update Protection Logic

Remove `KNOWN_GOALIES` hardcoded list from:
- `src/app/teams/[id]/page.tsx`
- `src/app/api/protection/search/route.ts`

Instead, join with `players` table to get position.

### Step 4: Push and Seed

```bash
npm run db:push    # Create new tables
npm run db:seed    # Populate players
```

## Verification

1. Run `npm run db:push` - schema syncs without errors
2. Run `npm run db:seed` - players table has ~800-900 entries
3. Check `/teams/373` (Flyers) - prospects show correct positions from DB
4. Search "Oettinger" on `/protection` - shows as goalie (G badge) from DB data
