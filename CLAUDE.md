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

### How It Works

1. **Push to main** → GitHub Actions builds and pushes image to `ghcr.io/nicster/lakelandcup:latest`
2. **Deploy on NAS** → Use `nicster.py` CLI from the `nas` repo to deploy the stack

### Stack Configuration

The stack is defined in `../nas/apps/lakelandcup.yml` and includes:
- `lakelandcup` - Next.js app from GHCR
- `lakelandcup-db` - PostgreSQL 16 database

The `DATABASE_URL` is automatically configured via the stack. Database password is stored in `../nas/apps/.secrets.yml` as `LAKELANDCUP_DB_PASSWORD`.

### Deploy Commands

```bash
# From the nas repo directory
cd ../nas

# Preview changes (dry run)
python nicster.py update lakelandcup --dry-run

# Deploy the stack
python nicster.py update lakelandcup

# Force redeploy (e.g., to pull new image)
python nicster.py update lakelandcup --force

# Check status
python nicster.py status
```

### First-Time Setup

1. Add `LAKELANDCUP_DB_PASSWORD` to `../nas/apps/.secrets.yml`:
   ```yaml
   LAKELANDCUP_DB_PASSWORD: "<generate with: openssl rand -base64 32>"
   ```

2. Deploy the stack:
   ```bash
   python nicster.py update lakelandcup
   ```

3. Run database migrations and seed:
   ```bash
   ssh nas 'sudo docker exec lakelandcup npx drizzle-kit push'
   ssh nas 'sudo docker exec lakelandcup npx tsx src/db/seed.ts'
   ```

### Updating the App

```bash
# 1. Push changes to main (triggers GitHub Actions build)
git push origin main

# 2. Wait for GitHub Actions to complete (~2-3 min)

# 3. Force redeploy to pull new image
cd ../nas
python nicster.py update lakelandcup --force
```

### Troubleshooting

```bash
# View container logs
ssh nas 'sudo docker logs lakelandcup'
ssh nas 'sudo docker logs lakelandcup-db'

# Check database connection
ssh nas 'sudo docker exec lakelandcup-db psql -U lakelandcup -c "\dt"'

# Restart containers
ssh nas 'sudo docker restart lakelandcup'
```
