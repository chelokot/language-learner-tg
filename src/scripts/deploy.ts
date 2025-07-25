import { readFile } from 'node:fs/promises';
import type { Database } from '../types/database.js';

export async function applySchema(db: Database) {
  const file = new URL('../../sql/schema.sql', import.meta.url);
  const sql = await readFile(file, 'utf8');
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(Boolean);
  for (const stmt of statements) {
    await db.query(stmt);
  }
}

export async function registerWebhook(token: string, baseUrl: string, fetchFn = fetch) {
  const url = `https://api.telegram.org/bot${token}/setWebhook?url=${baseUrl}/api/bot`;
  const res = await fetchFn(url);
  if (!('ok' in res)) {
    throw new Error('Unexpected fetch implementation');
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Webhook setup failed: ${res.status} ${text}`);
  }
}
