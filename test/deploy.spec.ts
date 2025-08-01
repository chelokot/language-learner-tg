import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { applySchema, registerWebhook } from '../src/scripts/deploy.js';

const schemaStatements = readFileSync('sql/schema.sql', 'utf8')
  .split(';')
  .map(s => s.trim())
  .filter(Boolean).length;

describe('applySchema', () => {
  it('runs each statement from schema file', async () => {
    const executed: string[] = [];
    const db = { query: async (sql: string) => { executed.push(sql); } } as any;
    await applySchema(db);
    expect(executed.length).toBe(schemaStatements);
  });
});

describe('registerWebhook', () => {
  it('calls Telegram API with proper URL', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    await registerWebhook('abc', 'https://example.com', fetchMock);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.telegram.org/botabc/setWebhook?url=https://example.com/api/bot'
    );
  });

  it('throws when Telegram returns ok=false', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ ok: false, description: 'bad' }) });
    await expect(registerWebhook('abc', 'https://example.com', fetchMock)).rejects.toThrow(
      'Webhook setup failed: bad'
    );
  });

  it('throws when response lacks ok field', async () => {
    const fetchMock = vi.fn().mockResolvedValue({});
    await expect(registerWebhook('abc', 'https://example.com', fetchMock)).rejects.toThrow(
      'Unexpected fetch implementation'
    );
  });
});
