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

  it('adds current_vocab_id column if missing', async () => {
    const executed: string[] = [];
    const db = { query: async (sql: string) => { executed.push(sql); } } as any;
    await applySchema(db);
    const normalized = executed.map(s => s.replace(/\s+/g, ' ').trim());
    expect(normalized).toContain(
      'ALTER TABLE app_user ADD COLUMN IF NOT EXISTS current_vocab_id INTEGER REFERENCES vocabulary(id)',
    );
  });

  it('renames legacy base_id columns', async () => {
    const executed: string[] = [];
    const db = { query: async (sql: string) => { executed.push(sql); } } as any;
    await applySchema(db);
    const normalized = executed.map(s => s.replace(/\s+/g, ' ').trim());
    expect(normalized).toContain(
      'ALTER TABLE word RENAME COLUMN IF EXISTS base_id TO vocabulary_id',
    );
    expect(normalized).toContain(
      'ALTER TABLE exercise_state RENAME COLUMN IF EXISTS base_id TO vocabulary_id',
    );
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
