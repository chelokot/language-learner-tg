import { describe, it, expect, vi, beforeEach } from 'vitest';

import handler from '../api/bot-edge.ts';

describe('edge webhook handler', () => {
  beforeEach(() => {
    process.env.TOKEN = 'test-token';
    (globalThis.fetch as any) = vi.fn(async () => new Response('ok'));
  });

  it('ACKs immediately and forwards to Node handler', async () => {
    const req = new Request('https://example.vercel.app/api/bot-edge', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ update_id: 1 }),
    });

    const res = await handler(req);
    expect(res.ok).toBe(true);

    // fetch called once with forward URL
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    const arg = (globalThis.fetch as any).mock.calls[0][0] as string;
    expect(arg).toBe('https://example.vercel.app/api/bot');
  });

  it('respects WEBHOOK_FORWARD_URL and WEBHOOK_FORWARD_PATH', async () => {
    process.env.WEBHOOK_FORWARD_URL = 'https://override.example.com';
    process.env.WEBHOOK_FORWARD_PATH = '/api/custom';

    const req = new Request('https://example.vercel.app/api/bot-edge', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ update_id: 2 }),
    });

    await handler(req);
    const arg = (globalThis.fetch as any).mock.calls.pop()[0] as string;
    expect(arg).toBe('https://override.example.com/api/custom');
  });
});

