import { describe, it, beforeEach, afterEach, expect } from 'vitest';
import TelegramServer from 'telegram-test-api';
import { Bot } from 'grammy';
import { helpController } from '../../src/controllers/help.js';
import type { CustomContext } from '../../src/types/context.js';
import { ChatLogger, generatePdf } from '../helpers/chat-logger.js';

function createBot(apiRoot: string) {
  const bot = new Bot<CustomContext>('test-token', { client: { apiRoot } });
  bot.use(async (ctx, next) => {
    if (!ctx.from) return;
    ctx.text = (key: string) => ctx.reply(key === 'help' ? 'Use /menu to manage word bases and start exercises' : key);
    ctx.db = { query: async () => ({ rows: [] }) } as any;
    ctx.dbEntities = {
      user: { user_id: ctx.from.id, name: 'Test' },
      chat: null,
    };
    await next();
  });
  bot.use(helpController);
  return bot;
}

describe('help command e2e', () => {
  let server: TelegramServer;
  let bot: Bot<CustomContext>;
  const logger = new ChatLogger();

  beforeEach(async () => {
    server = new TelegramServer({ port: 9999 });
    await server.start();
    bot = createBot(server.config.apiURL);
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
    logger.logBot(msg.text!);
    expect(msg.text).toBe('Use /menu to manage word bases and start exercises');
    generatePdf(logger.getEvents(), 'test/e2e/reports/help.pdf');
  });
});
