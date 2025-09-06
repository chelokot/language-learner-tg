import { describe, it, beforeEach, afterEach, expect } from 'vitest';
import TelegramServer from 'telegram-test-api';
import { createBot } from '../../src/config/bot.js';
import type { CustomContext } from '../../src/types/context.js';
import type { Database } from '../../src/types/database.js';
import { Bot } from 'grammy';

function createMemoryDb(): Database {
  let current: number | null = null;
  const vocab = {
    id: 1,
    owner_id: 1,
    name: 'default',
    goal_language: 'English',
    native_language: 'Russian',
    goal_code: 'EN',
    native_code: 'RU',
    level: 'any',
  };
  const words = [
    {
      id: 1,
      vocabulary_id: 1,
      goal: 'hello',
      native: 'привет',
      score: 1,
      correct_count: 0,
      wrong_count: 0,
    },
  ];

  return {
    async query(sql: string, params: any[]) {
      const norm = sql.replace(/\s+/g, ' ').trim();
      // users
      if (norm.startsWith('INSERT INTO app_user')) {
        return { rows: [{ user_id: params[0], name: params[1], current_vocab_id: current }] };
      }
      if (norm.startsWith('UPDATE app_user SET current_vocab_id')) {
        current = params[1];
        return { rows: [] };
      }
      if (norm.startsWith('SELECT current_vocab_id FROM app_user')) {
        return { rows: [{ current_vocab_id: current }] };
      }
      // vocabularies
      if (norm.includes('FROM vocabulary WHERE owner_id=$1')) {
        return { rows: [vocab] };
      }
      if (norm.includes('FROM vocabulary WHERE id=$1')) {
        return { rows: [vocab] };
      }
      // words priority candidates
      if (norm.includes('FROM word') && norm.includes('WHERE vocabulary_id=$1') && norm.includes('ORDER BY priority DESC')) {
        const vsId = params[0];
        const limit = params[1] ?? 10;
        return { rows: words.filter(w => w.vocabulary_id === vsId).slice(0, limit) };
      }
      // update stats
      if (norm.startsWith('UPDATE word') && norm.includes('correct_count') && norm.includes('wrong_count') && norm.includes('score')) {
        const id = params[0];
        const correct = !!params[1];
        const w = words.find(x => x.id === id)!;
        w.correct_count = (w.correct_count ?? 0) + (correct ? 1 : 0);
        w.wrong_count = (w.wrong_count ?? 0) + (correct ? 0 : 1);
        w.score = Math.max(1, (w.score ?? 0) + (correct ? 1 : -1));
        return { rows: [] };
      }
      return { rows: [] };
    },
  } as unknown as Database;
}

describe('stop exercise via /menu or /stop', () => {
  let server: TelegramServer;
  let bot: Bot<CustomContext>;

  beforeEach(async () => {
    server = new TelegramServer({ port: 0 });
    await server.start();
    process.env.TOKEN = 'test-token';
    process.env.TELEGRAM_API_ROOT = server.config.apiURL;
    bot = await createBot(createMemoryDb());
    bot.start();
  });

  afterEach(async () => {
    await server.stop();
  });

  it('word EN→RU: /menu stops and shows Menu', async () => {
    const client = server.getClient('test-token');
    await client.sendCommand(client.makeCommand('/start'));
    await server.waitBotMessage();
    await client.getUpdates();

    await client.sendCommand(client.makeCommand('/menu'));
    await server.waitBotMessage();
    let updates = await client.getUpdates();
    const menuMsgId = updates.result.at(-1)!.message!.message_id;

    await client.sendCallback(client.makeCallbackQuery('exercises', { message: { message_id: menuMsgId } }));
    await server.waitBotMessage();
    updates = await client.getUpdates();
    const exercisesMsgId = updates.result.at(-1)!.message!.message_id;

    await client.sendCallback(
      client.makeCallbackQuery('exercise:word:gn', { message: { message_id: exercisesMsgId } }),
    );
    await server.waitBotMessage(); // task

    await client.sendMessage(client.makeMessage('/menu'));
    await server.waitBotMessage(); // should be Menu
    updates = await client.getUpdates();
    const last = updates.result.at(-1)!.message!;
    expect(last.text!.startsWith('Menu')).toBe(true);
  });

  it('word RU→EN: /stop stops and shows Menu', async () => {
    const client = server.getClient('test-token');
    await client.sendCommand(client.makeCommand('/start'));
    await server.waitBotMessage();
    await client.getUpdates();

    await client.sendCommand(client.makeCommand('/menu'));
    await server.waitBotMessage();
    let updates = await client.getUpdates();
    const menuMsgId = updates.result.at(-1)!.message!.message_id;

    await client.sendCallback(client.makeCallbackQuery('exercises', { message: { message_id: menuMsgId } }));
    await server.waitBotMessage();
    updates = await client.getUpdates();
    const exercisesMsgId = updates.result.at(-1)!.message!.message_id;

    await client.sendCallback(
      client.makeCallbackQuery('exercise:word:ng', { message: { message_id: exercisesMsgId } }),
    );
    await server.waitBotMessage(); // task

    await client.sendMessage(client.makeMessage('/stop'));
    await server.waitBotMessage(); // should be Menu
    updates = await client.getUpdates();
    const last = updates.result.at(-1)!.message!;
    expect(last.text!.startsWith('Menu')).toBe(true);
  });
});
