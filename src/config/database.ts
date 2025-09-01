import { createPool } from '@vercel/postgres';
import type { Database } from '../types/database.js';

// Cache the pool per warm serverless instance to avoid re-creating connections.
declare global {
  // eslint-disable-next-line no-var
  var __DB_POOL__: Database | undefined;
}

export async function connectToDb(): Promise<Database> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    // Explicitly error even if a cached pool exists — matches runtime expectations and tests
    throw new Error('DATABASE_URL is not set');
  }
  if (globalThis.__DB_POOL__) return globalThis.__DB_POOL__;
  const pool = createPool({ connectionString: url });
  globalThis.__DB_POOL__ = pool as unknown as Database;
  return pool as unknown as Database;
}
