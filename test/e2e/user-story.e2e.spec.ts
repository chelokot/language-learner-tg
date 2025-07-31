import { describe, it, beforeEach, afterEach, expect } from 'vitest';
import TelegramServer from 'telegram-test-api';
import { createBot } from '../../src/config/bot.js';
import type { CustomContext } from '../../src/types/context.js';
import type { Database } from '../../src/types/database.js';
import { Bot } from 'grammy';
import { ChatLogger, generatePdf } from '../helpers/chat-logger.js';
import type { InlineKeyboardButton } from '@grammyjs/types';

function createMemoryDb(): Database {
  let vocabId = 1;
  let wordId = 1;
  const vocabs: any[] = [];
  const words: any[] = [];
  let current: number | null = null;
  return {
    async query(sql: string, params: any[]) {
      if (sql.startsWith('INSERT INTO app_user')) {
        return { rows: [{ user_id: params[0], name: params[1], current_vocab_id: current }] };
      }
      if (sql.startsWith('INSERT INTO vocabulary')) {
        const vocab = { id: vocabId++, owner_id: params[0], name: params[1] };
        vocabs.push(vocab);
        return { rows: [vocab] };
      }
      if (sql.startsWith('SELECT id, owner_id, name FROM vocabulary WHERE id=$1')) {
        const v = vocabs.find(v => v.id === params[0]);
        return { rows: v ? [v] : [] };
      }
      if (sql.startsWith('SELECT id, owner_id, name FROM vocabulary')) {
        return { rows: vocabs.filter(v => v.owner_id === params[0]) };
      }
      if (sql.startsWith('UPDATE vocabulary SET name')) {
        const vocab = vocabs.find(v => v.id === params[0] && v.owner_id === params[2]);
        if (vocab) vocab.name = params[1];
        return { rows: vocab ? [vocab] : [] };
      }
      if (sql.startsWith('DELETE FROM vocabulary')) {
        const idx = vocabs.findIndex(v => v.id === params[0] && v.owner_id === params[1]);
        if (idx !== -1) vocabs.splice(idx, 1);
        return { rows: [] };
      }
      if (sql.startsWith('UPDATE app_user SET current_vocab_id')) {
        current = params[1];
        return { rows: [] };
      }
      if (sql.startsWith('SELECT current_vocab_id FROM app_user')) {
        return { rows: [{ current_vocab_id: current }] };
      }
      if (sql.startsWith('INSERT INTO word')) {
        const word = { id: wordId++, vocabulary_id: params[0], front: params[1], back: params[2] };
        words.push(word);
        return { rows: [word] };
      }
      if (sql.startsWith('SELECT id, vocabulary_id, front, back FROM word WHERE vocabulary_id=$1 ORDER BY random() LIMIT 1')) {
        const w = words.find(word => word.vocabulary_id === params[0]);
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

  it('creates vocabulary, adds word and performs exercise', async () => {
    const client = server.getClient('test-token');

    await client.sendCommand(client.makeCommand('/menu'));
    logger.logUser('/menu');
    await server.waitBotMessage();
    let updates = await client.getUpdates();
    const menuUpdate = updates.result[0].message!;
    logger.logBot(menuUpdate.text!, menuUpdate.reply_markup?.inline_keyboard?.flat().map((b: InlineKeyboardButton) => b.text));
    const menuMsgId = menuUpdate.message_id;

    await client.sendCallback(client.makeCallbackQuery('vocabularies', { message: { message_id: menuMsgId } }));
    logger.logUser('tap vocabularies');
    await server.waitBotMessage();
    updates = await client.getUpdates();
    const listUpdate = updates.result.at(-1)!.message!;
    logger.logBot(listUpdate.text!, listUpdate.reply_markup?.inline_keyboard?.flat().map((b: InlineKeyboardButton) => b.text));
    const listMsgId = listUpdate.message_id;

    await client.sendCallback(client.makeCallbackQuery('create_vocab', { message: { message_id: listMsgId } }));
    logger.logUser('tap create');
    await server.waitBotMessage();
    await client.getUpdates();
    await client.sendMessage(client.makeMessage('My vocab'));
    logger.logUser('My vocab');
    await server.waitBotMessage();
    updates = await client.getUpdates();
    const createUpdate = updates.result.at(-1)!.message!;
    logger.logBot(createUpdate.text!, createUpdate.reply_markup?.inline_keyboard?.flat().map((b: InlineKeyboardButton) => b.text));
    const vocabListMsgId = createUpdate.message_id;

    await client.sendCallback(client.makeCallbackQuery('open_vocab:1', { message: { message_id: vocabListMsgId } }));
    logger.logUser('open vocab');
    await server.waitBotMessage();
    updates = await client.getUpdates();
    const vocabUpdate = updates.result.at(-1)!.message!;
    logger.logBot(vocabUpdate.text!, vocabUpdate.reply_markup?.inline_keyboard?.flat().map((b: InlineKeyboardButton) => b.text));
    const vocabMsgId = vocabUpdate.message_id;

    await client.sendCallback(client.makeCallbackQuery('add_word:1', { message: { message_id: vocabMsgId } }));
    logger.logUser('add word');
    await server.waitBotMessage();
    await client.getUpdates();
    await client.sendMessage(client.makeMessage('hello'));
    logger.logUser('hello');
    await server.waitBotMessage();
    await client.getUpdates();
    await client.sendMessage(client.makeMessage('hola'));
    logger.logUser('hola');
    await server.waitBotMessage();
    await client.getUpdates();
    await client.sendMessage(client.makeMessage('/stop'));
    logger.logUser('/stop');
    await server.waitBotMessage();
    updates = await client.getUpdates();
    const afterAddUpdate = updates.result.at(-1)!.message!;
    logger.logBot(afterAddUpdate.text!, afterAddUpdate.reply_markup?.inline_keyboard?.flat().map((b: InlineKeyboardButton) => b.text));

    await client.sendCallback(client.makeCallbackQuery('select_vocab:1', { message: { message_id: afterAddUpdate.message_id } }));
    logger.logUser('select vocab');
    await server.waitBotMessage();
    updates = await client.getUpdates();

    await client.sendCommand(client.makeCommand('/menu'));
    logger.logUser('/menu');
    await server.waitBotMessage();
    updates = await client.getUpdates();
    const menu2 = updates.result.at(-1)!.message!;
    const menu2MsgId = menu2.message_id;

    await client.sendCallback(client.makeCallbackQuery('exercises', { message: { message_id: menu2MsgId } }));
    logger.logUser('exercises');
    await server.waitBotMessage();
    updates = await client.getUpdates();
    const exUpdate = updates.result.at(-1)!.message!;
    logger.logBot(exUpdate.text!, exUpdate.reply_markup?.inline_keyboard?.flat().map((b: InlineKeyboardButton) => b.text));
    const exMsgId = exUpdate.message_id;

    await client.sendCallback(client.makeCallbackQuery('exercise_word', { message: { message_id: exMsgId } }));
    logger.logUser('start exercise');
    await server.waitBotMessage();
    await client.getUpdates();
    await client.sendMessage(client.makeMessage('hola'));
    logger.logUser('hola');
    await server.waitBotMessage();
    await client.getUpdates();
    await client.sendMessage(client.makeMessage('wrong'));
    logger.logUser('wrong');
    await server.waitBotMessage();
    await client.getUpdates();
    await client.sendMessage(client.makeMessage('/stop'));
    logger.logUser('/stop');
    await server.waitBotMessage();
    const res = await client.getUpdates();
    const last = res.result.at(-1)!.message!;
    logger.logBot(last.text!, last.reply_markup?.inline_keyboard?.flat().map((b: InlineKeyboardButton) => b.text));

    generatePdf(logger.getEvents(), 'test/e2e/reports/user-story.pdf');
  }, 15000);
});
