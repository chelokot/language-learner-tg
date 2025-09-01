import { describe, it, expect } from 'vitest';
import { connectToDbEdge as connectToDb } from '../src/config/database-edge.js';

describe('connectToDbEdge', () => {
  it('resolves when DATABASE_URL is provided', async () => {
    process.env.DATABASE_URL = 'postgres://user:pass@localhost/db';
    await expect(connectToDb()).resolves.toBeDefined();
  });

  it('throws when DATABASE_URL is missing', async () => {
    delete (process.env as any).DATABASE_URL;
    await expect(connectToDb()).rejects.toThrow('DATABASE_URL is not set');
  });
});
