import { describe, it, expect } from 'vitest';
import { connectToDb } from '../src/config/database.js';

describe('connectToDb', () => {
  it('resolves when POSTGRES_URL is provided', async () => {
    process.env.POSTGRES_URL = 'postgres://user:pass@localhost/db';
    await expect(connectToDb()).resolves.toBeDefined();
  });
});
