import { describe, it, expect, vi } from 'vitest';
import { applySchema, registerWebhook } from '../src/scripts/deploy.js';

const schemaStatements = 6; // We'll check dynamic count but for test we compute

describe('applySchema', () => {
  it('runs each statement from schema file', async () => {
    const executed: string[] = [];
    const db = { query: async (sql: string) => { executed.push(sql); } } as any;
    await applySchema(db);
    expect(executed.length).toBeGreaterThan(0);
  });
});

describe('registerWebhook', () => {
  it('calls Telegram API with proper URL', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    await registerWebhook('abc', 'https://example.com', fetchMock);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.telegram.org/botabc/setWebhook?url=https://example.com/api/bot'
    );
  });
});
