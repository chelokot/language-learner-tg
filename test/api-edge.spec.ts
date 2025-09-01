import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/config/database-edge.js', () => ({
  connectToDbEdge: vi.fn(async () => ({ query: vi.fn(async () => ({ rows: [] })) })),
}));

import handler from '../api/bot-edge.ts';

describe('edge webhook handler', () => {
  beforeEach(() => {
    process.env.TOKEN = 'test-token';
    // Minimal fetch mock that satisfies grammY getMe during bot.init
    (globalThis.fetch as any) = vi.fn(async (input: any) => {
      const url = typeof input === 'string' ? input : input?.toString?.() ?? '';
      if (url.includes('/getMe')) {
        return new Response(JSON.stringify({ ok: true, result: { id: 1, is_bot: true, first_name: 't', username: 't' } }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }
      return new Response('ok', { status: 200 });
    });
  });

  it('ACKs request with 200 OK', async () => {
    const req = new Request('https://example.vercel.app/api/bot-edge', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        update_id: 1,
        message: { message_id: 1, chat: { id: 1, type: 'private' }, date: 0, text: 'hi' },
      }),
    });

    const res = await handler(req);
    expect(res.ok).toBe(true);
  });
  
});
