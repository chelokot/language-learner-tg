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

  it('migrates legacy base_id columns', async () => {
    const executed: string[] = [];
    const db = { query: async (sql: string) => executed.push(sql) } as any;
    await applySchema(db);
    const norm = executed.map(s => s.replace(/\s+/g, ' ').trim());
  
    // word
    expect(norm).toContain(
      'ALTER TABLE word ADD COLUMN IF NOT EXISTS vocabulary_id INTEGER REFERENCES vocabulary(id)'
    );
    expect(norm).toContain(
      'UPDATE word SET vocabulary_id = base_id WHERE base_id IS NOT NULL AND (vocabulary_id IS NULL OR vocabulary_id <> base_id)'
    );
    expect(norm).toContain(
      'ALTER TABLE word DROP COLUMN IF EXISTS base_id'
    );
  
    // exercise_state
    expect(norm).toContain(
      'ALTER TABLE exercise_state ADD COLUMN IF NOT EXISTS vocabulary_id INTEGER REFERENCES vocabulary(id)'
    );
    expect(norm).toContain(
      'UPDATE exercise_state SET vocabulary_id = base_id WHERE base_id IS NOT NULL AND (vocabulary_id IS NULL OR vocabulary_id <> base_id)'
    );
    expect(norm).toContain(
      'ALTER TABLE exercise_state DROP COLUMN IF EXISTS base_id'
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
