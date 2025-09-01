import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@vercel/postgres', async () => {
  const actual: any = await vi.importActual('@vercel/postgres');
  return {
    ...actual,
    createPool: vi.fn((opts?: any) => ({ ...opts, kind: 'pool', query: vi.fn() })),
  };
});

// eslint-disable-next-line import/first
import { connectToDb } from '../src/config/database.js';
import { createPool } from '@vercel/postgres';

describe('connectToDb caching', () => {
  beforeEach(() => {
    (createPool as unknown as any).mockClear?.();
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
    expect((createPool as unknown as any).mock.calls.length).toBe(1);
  });
});
