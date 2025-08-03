import { describe, it, expect, vi } from 'vitest';

describe('runMigrations', () => {
  it('executes graphile-migrate CLI', async () => {
    vi.mock('node:child_process', () => ({
      execFile: vi.fn((_cmd: string, _args: string[], cb: (err: Error | null) => void) => {
        cb(null);
      }),
    }));
    const { runMigrations } = await import('../src/scripts/deploy.js');
    const { execFile } = await import('node:child_process');
    await runMigrations();
    expect(execFile).toHaveBeenCalledWith('graphile-migrate', ['migrate'], expect.any(Function));
  });
});

describe('registerWebhook', () => {
  it('calls Telegram API with proper URL', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    const { registerWebhook } = await import('../src/scripts/deploy.js');
    await registerWebhook('abc', 'https://example.com', fetchMock);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.telegram.org/botabc/setWebhook?url=https://example.com/api/bot',
    );
  });

  it('throws when Telegram returns ok=false', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: false, description: 'bad' }) });
    const { registerWebhook } = await import('../src/scripts/deploy.js');
    await expect(registerWebhook('abc', 'https://example.com', fetchMock)).rejects.toThrow('Webhook setup failed: bad');
  });

  it('throws when response lacks ok field', async () => {
    const fetchMock = vi.fn().mockResolvedValue({});
    const { registerWebhook } = await import('../src/scripts/deploy.js');
    await expect(registerWebhook('abc', 'https://example.com', fetchMock)).rejects.toThrow(
      'Unexpected fetch implementation',
    );
  });
});
