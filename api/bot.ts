import { webhookCallback } from 'grammy';
import { connectToDb } from '../src/config/database.js';
import { createBot } from '../src/config/bot.js';
import { loadEnv } from '../src/helpers/load-env.js';
import { validateEnv } from '../src/helpers/validate-env.js';

let handler: ((req: any, res: any) => Promise<void> | void) | null = null;

async function initHandler() {
  if (!handler) {
    if (!process.env.TOKEN || !process.env.DATABASE_URL) {
      loadEnv('../.env');
      validateEnv(['TOKEN', 'DATABASE_URL']);
    }
    const db = await connectToDb();
    const bot = createBot(db);
    handler = webhookCallback(bot, 'http', 'return', 25_000);
  }
  return handler;
}

export default async function(req: any, res: any) {
  const h = await initHandler();
  return h(req, res);
}
