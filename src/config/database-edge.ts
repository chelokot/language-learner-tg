import { neon, neonConfig } from '@neondatabase/serverless';
import type { Database, QueryResult } from '../types/database.js';

declare global {
  // eslint-disable-next-line no-var
  var __EDGE_DB__: Database | undefined;
}

export async function connectToDbEdge(): Promise<Database> {
  if (globalThis.__EDGE_DB__) return globalThis.__EDGE_DB__;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');

  neonConfig.fetchConnectionCache = true;
  const sql = neon(url);

  const db: Database = {
    async query(text: string, params?: any[]): Promise<QueryResult> {
      // Use unsafe to pass text + params
      // @ts-ignore
      const res = await sql.unsafe(text, params as any[]);
      return { rows: res as any[] };
    },
  };
  globalThis.__EDGE_DB__ = db;
  return db;
}
