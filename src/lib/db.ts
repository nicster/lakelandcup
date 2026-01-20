import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '@/db/schema';

// Use node-postgres for local development
// Works with any PostgreSQL via DATABASE_URL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
});

export const db = drizzle(pool, { schema });

// Re-export schema for convenience
export * from '@/db/schema';
