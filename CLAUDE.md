# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
npm run dev           # Start Next.js dev server on localhost:3000
npm run build         # Build production bundle
npm run lint          # Run ESLint
npm run db:push       # Sync Drizzle schema to PostgreSQL
npm run db:seed       # Populate database with league data (npx tsx src/db/seed.ts)
npm run db:studio     # Open Drizzle Studio for visual DB management
```

## Architecture Overview

**Stack**: Next.js 14 (App Router) + TypeScript + Tailwind CSS + PostgreSQL + Drizzle ORM

**Purpose**: Fantasy hockey dynasty league website for the Lakeland Cup. Features historical records, draft tracking, trade history, and a planned league currency (LakeCoin).

### Directory Structure

- `src/app/` - Next.js pages: home, hall-of-fame, history, rules, teams/[id], admin
- `src/components/layout/` - Header, Footer, Nav (client components)
- `src/db/schema.ts` - Drizzle ORM table definitions
- `src/db/seed.ts` - Database seeding from scripts/league_data.json
- `src/lib/db.ts` - Database client export
- `scripts/` - Yahoo Fantasy API data fetcher, league_data.json (gitignored)

### Database Schema (PostgreSQL)

- `members` - Teams with name, owner, formerName, logo, isCommissioner
- `seasons` - Year, championId, runnerUpId, finalResult, notes
- `rules` - Section, title, content (markdown), sortOrder

### Key Patterns

- Server components by default, 'use client' only in layout components
- Database queries directly in page components (no API routes needed yet)
- Team logos stored in `/public/images/teams/`
- Path alias: `@/*` maps to `./src/*`

## Configuration

- `DATABASE_URL` environment variable required (PostgreSQL connection string)
- `drizzle.config.ts` - Drizzle Kit configuration
- `.env.local` for local development (not committed)

## Project Roadmap

See `PLAN.md` for the full 4-phase implementation plan:
- Phase 1 (current): Database, layout, Hall of Fame, History, Rules, Team pages
- Phase 2: Draft history, protection tracking, draft lottery
- Phase 3: Trade tracker
- Phase 4: LakeCoin (ERC-20 on Base Sepolia), member authentication

## Deployment (TrueNAS)

Self-hosted on TrueNAS via Docker + Traefik reverse proxy. Domain: lakelandcup.com

### Docker Setup
- `Dockerfile` - Multi-stage build (deps → builder → runner)
- `docker-compose.yml` - Production compose file
- `docker-compose.dev.yml` - Development with hot reload

### Database Setup for Deployment
The app requires a PostgreSQL database. On the NAS:

1. Create a PostgreSQL container/service
2. Create database: `lakelandcup`
3. Set `DATABASE_URL` environment variable in the container:
   ```
   DATABASE_URL=postgresql://user:password@postgres-host:5432/lakelandcup
   ```
4. Run migrations and seed after first deploy:
   ```bash
   # Inside container or with database access
   npm run db:push      # Create tables from schema
   npm run db:seed      # Populate members, seasons from league_data.json
   ```

### Deployment Checklist
- [ ] PostgreSQL database running and accessible
- [ ] `DATABASE_URL` configured in container environment
- [ ] Run `db:push` to create tables
- [ ] Run `db:seed` to populate initial data
- [ ] Traefik routing configured for lakelandcup.com
