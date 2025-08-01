import { describe, it, beforeEach, afterEach, expect } from 'vitest';
import TelegramServer from 'telegram-test-api';
import { Bot } from 'grammy';
import { helpController } from '../../src/controllers/help.js';
import type { CustomContext } from '../../src/types/context.js';
import {
  ChatLogger,
  generatePdf,
  saveJson,
  createLogTransformer,
} from '../helpers/chat-logger.js';
import fs from 'fs';

function createBot(apiRoot: string, t: ReturnType<typeof createLogTransformer>) {
  const bot = new Bot<CustomContext>('test-token', { client: { apiRoot } });
  bot.use(async (ctx, next) => {
    if (!ctx.from) return;
    ctx.text = (key: string) => ctx.reply(key === 'help' ? 'Use /menu to manage vocabularies and start exercises' : key);
    ctx.db = { query: async () => ({ rows: [] }) } as any;
    ctx.dbEntities = {
      user: { user_id: ctx.from.id, name: 'Test' },
      chat: null,
    };
    await next();
  });
  bot.use(helpController);
  bot.api.config.use(t);
  return bot;
}

describe('help command e2e', () => {
  let server: TelegramServer;
  let bot: Bot<CustomContext>;
  const logger = new ChatLogger();

  beforeEach(async () => {
    server = new TelegramServer({ port: 9999 });
    await server.start();
    bot = createBot(server.config.apiURL, createLogTransformer(logger));
    bot.start();
  });

  afterEach(async () => {
    await bot.stop();
    await server.stop();
  });

  it('responds with help text', async () => {
    const client = server.getClient('test-token');
    await client.sendCommand(client.makeCommand('/help'));
    logger.logUser('/help');
    await server.waitBotMessage();
    const updates = await client.getUpdates();
    const msg = updates.result[0].message;
    expect(msg.text).toBe('Use /menu to manage vocabularies and start exercises');
    const events = logger.getEvents();
    generatePdf(events, 'test/e2e/reports/help.pdf');
    saveJson(events, 'test/e2e/reports/help.json');
    const expected = JSON.parse(
      fs.readFileSync('test/e2e/expected/help.json', 'utf8'),
    );
    expect(events).toEqual(expected);
  });
});
