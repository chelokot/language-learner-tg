import { describe, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { newDb } from 'pg-mem';

describe('migrations', () => {
  it('apply without errors', async () => {
    const db = newDb();
    const pg = db.adapters.createPg();
    const client = new pg.Client();
    await client.connect();
    const dir = join(process.cwd(), 'migrations', 'committed');
    const files = readdirSync(dir).filter(f => f.endsWith('.sql')).sort();
    for (const file of files) {
      const sql = readFileSync(join(dir, file), 'utf8');
      await client.query(sql);
    }
    await client.end();
  });
});
