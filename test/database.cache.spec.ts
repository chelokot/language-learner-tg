import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@neondatabase/serverless', () => {
  const neonFn = vi.fn(() => ({
    // minimal client shape our adapter uses
    // no unsafe mocking needed in this test path
  }));
  return { neon: neonFn, neonConfig: {} as any };
});

// eslint-disable-next-line import/first
import { connectToDbEdge as connectToDb } from '../src/config/database-edge.js';
import { neon } from '@neondatabase/serverless';

describe('connectToDbEdge caching', () => {
  beforeEach(() => {
    process.env.DATABASE_URL = 'postgres://user:pass@localhost/db';
  });

  afterEach(() => {
    // reset global cache to avoid leaking state into other tests
    // @ts-ignore
    delete (globalThis as any).__DB_POOL__;
  });

  it('returns the same pool instance across calls', async () => {
    const a = await connectToDb();
    const b = await connectToDb();
    expect(a).toBe(b);
    expect((neon as unknown as any).mock.calls.length).toBe(1);
  });
});
