import { describe, it, beforeEach, afterEach, expect } from 'vitest';
import TelegramServer from 'telegram-test-api';
import { createBot } from '../../src/config/bot.js';
import type { CustomContext } from '../../src/types/context.js';
import type { Database } from '../../src/types/database.js';
import { Bot } from 'grammy';
import { ChatLogger, generatePdf } from '../helpers/chat-logger.js';
import type { InlineKeyboardButton } from '@grammyjs/types';

function createMemoryDb(): Database {
  let baseId = 1;
  let wordId = 1;
  const bases: any[] = [];
  const words: any[] = [];
  return {
    async query(sql: string, params: any[]) {
      if (sql.startsWith('INSERT INTO app_user')) {
        return { rows: [{ user_id: params[0], name: params[1] }] };
      }
      if (sql.startsWith('INSERT INTO word_base')) {
        const base = { id: baseId++, owner_id: params[0], name: params[1] };
        bases.push(base);
        return { rows: [base] };
      }
      if (sql.startsWith('SELECT id, owner_id, name FROM word_base')) {
        return { rows: bases.filter(b => b.owner_id === params[0]) };
      }
      if (sql.startsWith('UPDATE word_base SET name')) {
        const base = bases.find(b => b.id === params[0] && b.owner_id === params[2]);
        if (base) base.name = params[1];
        return { rows: base ? [base] : [] };
      }
      if (sql.startsWith('DELETE FROM word_base')) {
        const idx = bases.findIndex(b => b.id === params[0] && b.owner_id === params[1]);
        if (idx !== -1) bases.splice(idx, 1);
        return { rows: [] };
      }
      if (sql.startsWith('INSERT INTO word')) {
        const word = { id: wordId++, base_id: params[0], front: params[1], back: params[2] };
        words.push(word);
        return { rows: [word] };
      }
      if (sql.startsWith('SELECT id, base_id, front, back FROM word WHERE base_id=$1 ORDER BY random() LIMIT 1')) {
        const w = words.find(word => word.base_id === params[0]);
        return { rows: w ? [w] : [] };
      }
      return { rows: [] };
    },
  } as unknown as Database;
}

describe('basic user story e2e', () => {
  let server: TelegramServer;
  let bot: Bot<CustomContext>;
  const logger = new ChatLogger();

  beforeEach(async () => {
    server = new TelegramServer({ port: 9998 });
    await server.start();
    process.env.TOKEN = 'test-token';
    process.env.TELEGRAM_API_ROOT = server.config.apiURL;
    bot = createBot(createMemoryDb());
    bot.start();
  });

  afterEach(async () => {
    await bot.stop();
    await server.stop();
  });

  it('creates base, adds words and performs exercises', async () => {
    const client = server.getClient('test-token');

    await client.sendCommand(client.makeCommand('/menu'));
    logger.logUser('/menu');
    await server.waitBotMessage();
    let updates = await client.getUpdates();
    const menuUpdate = updates.result[0].message;
    logger.logBot(
      menuUpdate.text!,
      menuUpdate.reply_markup?.inline_keyboard?.flat().map((b: InlineKeyboardButton) => b.text),
    );
    const menuMsgId = menuUpdate.message_id;

    await client.sendCallback(client.makeCallbackQuery('create_base', { message: { message_id: menuMsgId } }));
    logger.logUser('tap Create base');
    await server.waitBotMessage();
    await client.getUpdates();
    await client.sendMessage(client.makeMessage('My base'));
    logger.logUser('My base');
    await server.waitBotMessage();
    updates = await client.getUpdates();
    const createUpdate = updates.result.at(-1)!.message;
    logger.logBot(
      createUpdate.text!,
      createUpdate.reply_markup?.inline_keyboard?.flat().map((b: InlineKeyboardButton) => b.text),
    );
    const newMenuMsgId = createUpdate.message_id;

    await client.sendCallback(client.makeCallbackQuery('open_base:1', { message: { message_id: newMenuMsgId } }));
    logger.logUser('open base');
    await server.waitBotMessage();
    updates = await client.getUpdates();
    const baseUpdate = updates.result.at(-1)!.message;
    logger.logBot(
      baseUpdate.text!,
      baseUpdate.reply_markup?.inline_keyboard?.flat().map((b: InlineKeyboardButton) => b.text),
    );
    const baseMsgId = baseUpdate.message_id;

    async function addWord(front: string, back: string) {
      await client.sendCallback(client.makeCallbackQuery(`add_word:1`, { message: { message_id: baseMsgId } }));
      logger.logUser('add word');
      await server.waitBotMessage();
      await client.getUpdates();
      await client.sendMessage(client.makeMessage(front));
      logger.logUser(front);
      await server.waitBotMessage();
      await client.getUpdates();
      await client.sendMessage(client.makeMessage(back));
      logger.logUser(back);
      await server.waitBotMessage();
      const res = await client.getUpdates();
      const msg = res.result.at(-1)!.message;
      logger.logBot(
        msg.text!,
        msg.reply_markup?.inline_keyboard?.flat().map((b: InlineKeyboardButton) => b.text),
      );
    }

    await addWord('hello', 'hola');
    await addWord('world', 'mundo');

    async function exercise(answer: string) {
      await client.sendCallback(client.makeCallbackQuery(`exercise:1`, { message: { message_id: baseMsgId } }));
      logger.logUser('start exercise');
      await server.waitBotMessage();
      await client.getUpdates();
      await client.sendMessage(client.makeMessage(answer));
      logger.logUser(answer);
      await server.waitBotMessage();
      const res = await client.getUpdates();
      const msg = res.result.at(-1)!.message;
      logger.logBot(
        msg.text!,
        msg.reply_markup?.inline_keyboard?.flat().map((b: InlineKeyboardButton) => b.text),
      );
      return msg.text!;
    }

    const okText = await exercise('hola');
    const failText = await exercise('wrong');

    expect(okText).toBe('Correct');
    expect(failText.startsWith('Incorrect')).toBe(true);

    generatePdf(logger.getEvents(), 'test/e2e/reports/user-story.pdf');
  });
});
