import { describe, it, expect, vi } from 'vitest';

vi.mock('../src/config/database.js', () => ({ connectToDb: vi.fn(async () => ({})) }));
vi.mock('../src/config/bot.js', () => ({ createBot: vi.fn(() => ({})) }));
vi.mock('grammy', () => ({ webhookCallback: vi.fn(() => vi.fn()) }));

import handler from '../api/bot.js';
import { connectToDb } from '../src/config/database.js';
import { createBot } from '../src/config/bot.js';
import { webhookCallback } from 'grammy';

// biome-ignore lint/complexity/noUselessCatch:
async function call() {
  try {
    await handler({} as any, {} as any);
  } catch (e) {
    throw e;
  }
}

describe('api handler', () => {
  it('initializes bot only once', async () => {
    const cb = vi.fn();
    (webhookCallback as unknown as vi.Mock).mockReturnValue(cb);
    process.env.TOKEN = 't';
    process.env.DATABASE_URL = 'postgres://x';

    await call();
    await call();

    expect(createBot).toHaveBeenCalledTimes(1);
    expect(connectToDb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledTimes(2);
  });
});
