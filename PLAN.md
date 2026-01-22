# Lakeland Cup - Fantasy Hockey League Site

## Overview
The official homepage for the Lakeland Cup fantasy hockey league. Features historical records, draft tracking, trade history, and an integrated league currency (LakeCoin). Commissioner-managed content.

## Core Features

### 1. Past Winners (Hall of Fame)
- Season-by-season champions
- Final standings
- Playoff brackets/results
- Notable stats per season

### 2. League Manual / Rules
- Official rules page (converted from existing LaTeX manual)
- Editable by commissioner
- Roster positions, prospect rules, trade rules, etc.

### 3. Draft Results + Protection Tracking
- Historical draft boards by year
- Keeper/protection status per player
- Protection expiration tracking (how many years left)
- Draft pick trades
- Draft lottery (interactive, animated)

### 4. Trade Tracker
- All trades logged with date and participants
- Players/picks exchanged
- Optional trade notes/commentary
- Filter by season, team, player

### 5. LakeCoin
- League currency for bets, trades, penalties, rewards
- Member balances
- Transaction history
- Send/receive between members

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Next.js Application                  │
├─────────────────────────────────────────────────────────┤
│  PUBLIC PAGES              │  MEMBER PAGES (auth)       │
│  - Home/Landing            │  - Dashboard (coin balance)│
│  - Hall of Fame            │  - Send LakeCoin           │
│  - Draft History           │  - Transaction History     │
│  - Trade Tracker           │                            │
│  - Protection Status       │  ADMIN (commissioner)      │
│                            │  - Add/edit winners        │
│                            │  - Add/edit drafts         │
│                            │  - Add/edit trades         │
│                            │  - Mint/manage LakeCoin    │
└─────────────────────┬──────┴────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│                     Data Layer                          │
│  - PostgreSQL (league data, users, wallets)             │
│  - Blockchain (LakeCoin token on Base Sepolia)          │
└─────────────────────────────────────────────────────────┘
```

## Tech Stack
- **Framework**: Next.js 14 (App Router)
- **Database**: PostgreSQL with Drizzle ORM (self-hosted or Neon/Supabase)
- **Styling**: Tailwind CSS
- **Auth**: NextAuth.js (simple credentials for members)
- **Blockchain**: Solidity + Hardhat, Base Sepolia testnet, viem
- **Deployment**: Self-hosted on your server (Docker or PM2)

## Database Schema

```sql
-- League Members
members (id, name, email, password_hash, wallet_address, wallet_key_encrypted, is_commissioner)

-- Player Database (synced from Yahoo/NHL)
players (
  id, yahoo_id, nhl_id,
  name, position,  -- G, D, LW, RW, C
  team, team_abbr,
  active,
  last_synced
)

-- Historical Data
seasons (id, year, champion_id, runner_up_id, notes)
draft_picks (
  id, season_id,
  round,  -- 1 or 2 (2 rounds per draft)
  pick,   -- pick number within round
  member_id,
  player_id,  -- FK to players table
  is_keeper,
  protection_start_season,  -- season when protection started
  -- protection duration derived: 5 years for G, 3 years for F/D
)
trades (id, season_id, date, member_a_id, member_b_id, description, notes)
trade_items (id, trade_id, from_member_id, to_member_id, item_type, item_value)
-- item_type: 'player', 'pick'
-- item_value: player_id or pick description

-- LakeCoin (supplemental to blockchain)
transactions_cache (id, from_member_id, to_member_id, amount, tx_hash, timestamp, note)
```

## Page Structure

```
/                           → Landing page with league overview
/hall-of-fame              → Past champions, season summaries
/rules                     → League manual/rules
/drafts                    → Draft history index
/drafts/[year]             → Specific year's draft board
/drafts/lottery            → Interactive draft lottery
/protection                → Current keeper/protection status
/trades                    → Trade tracker with filters
/members                   → League member directory

/lakecoin                  → LakeCoin overview, leaderboard
/lakecoin/dashboard        → Personal balance & recent transactions
/lakecoin/send             → Send LakeCoin to another member
/lakecoin/history          → Full transaction history

/login                     → Member login

/admin                     → Commissioner panel
/admin/seasons             → Manage season records
/admin/rules               → Edit league rules
/admin/drafts              → Manage draft data
/admin/trades              → Add/edit trades
/admin/lakecoin            → Mint coins, manage distribution
```

## File Structure

```
lakelandcup/
├── contracts/
│   ├── LakeCoin.sol           # ERC-20 token contract
│   ├── hardhat.config.ts
│   └── scripts/
│       └── deploy.ts
├── src/
│   ├── app/
│   │   ├── page.tsx           # Home
│   │   ├── hall-of-fame/
│   │   ├── drafts/
│   │   ├── protection/
│   │   ├── trades/
│   │   ├── members/
│   │   ├── lakecoin/          # LakeCoin feature pages
│   │   ├── login/
│   │   ├── admin/
│   │   └── api/
│   ├── components/
│   │   ├── layout/            # Header, Footer, Nav
│   │   ├── league/            # Draft board, Trade card, etc.
│   │   └── lakecoin/          # Balance, Send form, etc.
│   ├── lib/
│   │   ├── db.ts              # Database client
│   │   ├── blockchain.ts      # Viem setup, contract interaction
│   │   └── auth.ts
│   └── db/
│       ├── schema.ts          # Drizzle schema
│       └── seed.ts            # Initial data
├── drizzle.config.ts
└── package.json
```

## Implementation Phases (Incremental Deployment)

Each phase ends with a deployment to lakelandcup.com.

### Phase 0: Coming Soon → DEPLOY
- Initialize Next.js project with Tailwind
- Single "Coming Soon" page with:
  - Lakeland Cup logo/title
  - Brief teaser ("Your fantasy hockey league hub - launching soon")
  - Optional: email signup or countdown
- **Deploy to lakelandcup.com**
- Validates: project setup, build process, server config, domain/SSL

### Phase 1: Foundation + Past Winners + Rules → DEPLOY
- Set up PostgreSQL + Drizzle ORM
- Basic layout (header, nav, footer)
- Home page with league overview
- **Hall of Fame page** (past winners, season summaries)
- **Rules/Manual page** (converted from LaTeX)
- Admin: add/edit seasons, winners, rules
- Deploy update

### Phase 2: Draft & Protection → DEPLOY
- Player database (sync from Yahoo/NHL API)
- Draft history pages (by year)
- **Draft lottery page** (interactive, animated lottery for picks 1-4)
- Protection status page (who's protected, years remaining)
- Admin: manage draft picks
- Deploy update

### Phase 3: Trade Tracker → DEPLOY
- Trade history page with filtering
- Admin: add/edit trades
- Deploy update

### Phase 4: LakeCoin → DEPLOY
- Write & deploy ERC-20 smart contract (Base Sepolia)
- Member authentication
- Custodial wallet generation
- LakeCoin pages (dashboard, send, history)
- Admin: mint & distribute coins
- Deploy update

## Player Database
External data source for player names, positions, teams:
- **Yahoo Fantasy API** - Already using Yahoo for the league
- **NHL API** - Official stats and rosters
- Store locally, sync periodically
- Link draft picks and trades to canonical player records

## Deployment (Self-Hosted)
- Domain: lakelandcup.com (owned)
- Hosting: Self-hosted server
- Options:
  - Docker container (Next.js + PostgreSQL)
  - PM2 + nginx reverse proxy
  - Coolify/CapRover for easier management
- SSL via Let's Encrypt

## Verification (Per Phase)
**Phase 0**:
- Site loads at lakelandcup.com with HTTPS
- Coming soon page displays correctly
- Deployment pipeline works end-to-end

**Phase 1**:
- Site loads at lakelandcup.com
- Hall of Fame displays test season data
- Admin can add/edit winners

**Phase 2**:
- Player search works (data from API)
- Draft boards display by year
- Protection page shows correct expiration dates

**Phase 3**:
- Trade history page loads and filters correctly
- Admin can add trades

**Phase 4**:
- LakeCoin contract deployed and verified on BaseScan
- Users can register, see balance, send coins
- Transactions visible on block explorer

## Existing Assets
**Logos** (in Downloads):
- `lakelandcup_2.png` - Badge/crest style (red/blue, crossed sticks)
- `lakelandcuplong.png` - Horizontal, white background
- `lakelandcuplong2.png` - Horizontal, red background

**Existing Code:**
- `drafthub` - Flask app from 2016 with Yahoo Fantasy API integration (`/Users/nic/Nextcloud/games/fantasy/Draft/drafthub/`)

**Manual:**
- LaTeX source: `/Users/nic/Nextcloud/games/fantasy/Manual/main.tex`
- PDF: `/Users/nic/Nextcloud/games/fantasy/Manual/fantasy_manual.pdf`
- Content to convert to web pages

**Data Sources:**
- Winners + Trades: Yahoo Fantasy
- Drafts + Protection: Google Sheets
- Import approach: Manual entry initially, can add API import later

## League Rules
**Draft:**
- 2 rounds per draft
- First 4 picks determined by lottery (bottom 4 teams from previous season)
- Remaining picks in reverse standing order

**Draft Lottery Feature:**
- Interactive lottery page on the site
- Input: previous season standings (bottom 4 teams)
- Odds: TBD (user to provide)
- Animated lottery drawing for picks 1-4
- Can record/share results

**Protection:**
- Skaters (forwards/defensemen): Protected for 3 seasons
- Goalies: Protected for 5 seasons
- Protection countdown starts from the season they were drafted/acquired

**Other (from 2016 manual):**
- Dynasty league, 12 teams
- 24 roster positions + 6 prospects
- Prospect rights held for 3 years (may have evolved)

## Design Notes
- Hockey-themed but clean (not over-the-top)
- Mobile-friendly (members will check on phones)
- Fast page loads (static generation where possible)
- Clear navigation between league info and LakeCoin features

---

# PHASE 1 IMPLEMENTATION PLAN

## Status: Phase 0 Complete
- Coming Soon page deployed at lakelandcup.com with SSL
- GitHub Actions CI/CD pipeline working
- Docker deployment on TrueNAS via Traefik

## Phase 1 Scope
1. Database setup (PostgreSQL + Drizzle ORM)
2. Site layout (header, navigation, footer)
3. Updated home page with league overview
4. Hall of Fame page (past winners)
5. Rules page (converted from LaTeX manual)
6. Admin panel for managing seasons/winners

## Database Decision: SQLite vs PostgreSQL

For Phase 1, **SQLite** is simpler since:
- No separate database container needed
- File-based, easy to backup
- Sufficient for 12 members, ~10 seasons of data
- Can migrate to PostgreSQL later if needed

Will use **better-sqlite3** with Drizzle ORM.

## Implementation Steps

### Step 1: Install Dependencies
```bash
npm install drizzle-orm better-sqlite3
npm install -D drizzle-kit @types/better-sqlite3
```

### Step 2: Database Schema (`src/db/schema.ts`)
```typescript
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

// League members (teams)
export const members = sqliteTable('members', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),           // "The Frozen Pucks"
  owner: text('owner').notNull(),         // "John Smith"
  email: text('email'),
  isCommissioner: integer('is_commissioner', { mode: 'boolean' }).default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// Seasons with champions
export const seasons = sqliteTable('seasons', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  year: text('year').notNull().unique(),  // "2023-24"
  championId: integer('champion_id').references(() => members.id),
  runnerUpId: integer('runner_up_id').references(() => members.id),
  notes: text('notes'),
});

// Rules content (editable by admin)
export const rules = sqliteTable('rules', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  section: text('section').notNull(),     // "roster", "prospects", "trades", etc.
  title: text('title').notNull(),
  content: text('content').notNull(),     // Markdown content
  sortOrder: integer('sort_order').default(0),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});
```

### Step 3: Database Setup (`src/lib/db.ts`)
```typescript
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from '@/db/schema';

const sqlite = new Database('data/lakelandcup.db');
export const db = drizzle(sqlite, { schema });
```

### Step 4: Drizzle Config (`drizzle.config.ts`)
```typescript
import type { Config } from 'drizzle-kit';

export default {
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: 'data/lakelandcup.db',
  },
} satisfies Config;
```

### Step 5: Layout Components

**Header (`src/components/layout/Header.tsx`)**
- Logo (lakelandcup_2.png, smaller version)
- Navigation links: Hall of Fame, Rules, Drafts (coming soon), Trades (coming soon)
- Mobile hamburger menu

**Footer (`src/components/layout/Footer.tsx`)**
- "Est. 2013"
- Simple links

**Root Layout Update (`src/app/layout.tsx`)**
- Wrap children with Header + Footer
- Keep ice-texture background

### Step 6: Pages

**Home Page (`src/app/page.tsx`)**
- Hero section with logo
- Quick stats: "12 teams, Est. 2013, X seasons"
- Recent champion highlight
- Links to Hall of Fame, Rules

**Hall of Fame (`src/app/hall-of-fame/page.tsx`)**
- List of all seasons with champion/runner-up
- Trophy icon for each champion
- Click to expand season details (if notes exist)

**Rules (`src/app/rules/page.tsx`)**
- Sidebar navigation for sections
- Content from database (markdown rendered)
- Sections from LaTeX manual:
  - General Statistics
  - Roster Positions
  - Prospects
  - Trades
  - End of Season
  - Draft
  - Franchises

### Step 7: Seed Data (`src/db/seed.ts`)
- 12 member teams (placeholder names for now)
- Convert LaTeX manual to markdown rules sections
- Add any known past champions

### Step 8: Admin Routes (Simple)

For Phase 1, use a simple approach:
- `/admin` - Dashboard showing current data
- `/admin/seasons` - Add/edit season winners
- No auth yet (protected by obscurity for now, add auth in Phase 4)

Admin will use Server Actions for mutations.

### Step 9: Docker Updates

Update `Dockerfile` to:
- Create `/app/data` directory for SQLite
- Mount volume for persistence

Update `lakelandcup.yml`:
```yaml
volumes:
  - @data:/app/data
```

## Files to Create/Modify

### New Files
```
src/db/schema.ts          # Drizzle schema
src/db/seed.ts            # Initial data
src/lib/db.ts             # Database client
drizzle.config.ts         # Drizzle Kit config

src/components/layout/Header.tsx
src/components/layout/Footer.tsx
src/components/layout/Nav.tsx

src/app/hall-of-fame/page.tsx
src/app/rules/page.tsx

src/app/admin/page.tsx
src/app/admin/seasons/page.tsx
```

### Modified Files
```
package.json              # Add dependencies
src/app/layout.tsx        # Add Header/Footer
src/app/page.tsx          # Redesign home page
Dockerfile                # Add data volume
next.config.mjs           # Add output: 'standalone' if not present
```

## Rules Content (Converted from LaTeX)

### General Statistics
- Type: Dynasty league
- Number of teams: 12
- Number of roster positions: 24
- Number of prospect draft picks per year: 2
- Number of prospects: 6
- Total roster: 30

### Roster Positions
- 4 Centers
- 4 Left Wings
- 4 Right Wings
- 6 Defensemen
- 2 Goalies
- 4 Bench spots
- 3 IR spots

### Prospects
- 2 prospect picks per season
- Draft order: reverse of previous season standings
- 3-year rights window
- Can activate to roster at any time (if roster spot available)

### Trades
- Active player trades via Yahoo interface
- Draft pick/prospect trades require commissioner notification
- Both parties must confirm in writing

### End of Season
- Keep all players by default
- May drop at most one player
- Empty spot filled via single-round draft with prospect draft

### Draft
- Attendance mandatory
- Absent teams must submit draft list for auto-pick

### Franchises
- No new teams after 2016/17 season
- Teams can only be transferred

## Verification Checklist
- [ ] `npm run dev` starts without errors
- [ ] Database migrations run successfully
- [ ] Seed data populates correctly
- [ ] Home page shows league overview
- [ ] Hall of Fame displays seasons
- [ ] Rules page shows all sections
- [ ] Admin can add new season
- [ ] Docker build succeeds
- [ ] Deploy to lakelandcup.com
- [ ] Site loads with new layout
