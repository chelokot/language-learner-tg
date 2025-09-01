export const config = { runtime: 'edge', regions: ['fra1', 'arn1'] } as const;

import { webhookCallback } from 'grammy';
import { connectToDbEdge } from '../src/config/database-edge.js';
import { createBotEdge } from '../src/config/bot.edge.js';

let handler: ((req: Request) => Promise<Response>) | undefined;

async function getHandler() {
  if (!handler) {
    if (!process.env.TOKEN || !process.env.DATABASE_URL) {
      throw new Error('Missing env: TOKEN or DATABASE_URL');
    }
    const db = await connectToDbEdge();
    const bot = await createBotEdge(db);
    const h = webhookCallback(bot, 'std/http');
    handler = (req: Request) => h(req);
  }
  return handler;
}

export default async function handlerEdge(req: Request): Promise<Response> {
  if (req.method !== 'POST') return new Response('ok');
  const h = await getHandler();
  return h(req);
}
