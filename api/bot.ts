import { webhookCallback } from 'grammy';
import { connectToDb } from '../src/config/database.js';
import { createBot } from '../src/config/bot.js';
declare global {
  // eslint-disable-next-line no-var
  var __BOT_HANDLER__: ((req: any, res: any) => Promise<void> | void) | undefined;
}

async function initHandler() {
  if (!globalThis.__BOT_HANDLER__) {
    if (!process.env.TOKEN || !process.env.DATABASE_URL) {
      throw new Error('Missing env: TOKEN or DATABASE_URL');
    }
    const db = await connectToDb();
    const bot = await createBot(db);
    globalThis.__BOT_HANDLER__ = webhookCallback(bot, 'http', 'return', 10_000);
  }
  return globalThis.__BOT_HANDLER__!;
}

export default async function(req: any, res: any) {
  const h = await initHandler();
  return h(req, res);
}
