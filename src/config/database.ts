import { createPool } from '@vercel/postgres';
import type { Database } from '../types/database.js';

export async function connectToDb(): Promise<Database> {
  const url = process.env.POSTGRES_URL;
  if (!url) {
    throw new Error('POSTGRES_URL is not set');
  }
  return createPool({ connectionString: url });
}
