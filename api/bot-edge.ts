export const config = { runtime: 'edge', regions: ['fra1', 'arn1'] } as const;

import { webhookCallback } from 'grammy';
import { connectToDbEdge } from '../src/config/database-edge.js';
import { createBotEdge } from '../src/config/bot.edge.js';

let handlerPromise: Promise<(req: Request) => Promise<Response>> | undefined;

async function getEdgeHandler(): Promise<(req: Request) => Promise<Response>> {
  if (!handlerPromise) {
    if (!process.env.TOKEN || !process.env.DATABASE_URL) {
      throw new Error('Missing env: TOKEN or DATABASE_URL');
    }
    handlerPromise = (async () => {
      const db = await connectToDbEdge();
      const bot = await createBotEdge(db);
      return webhookCallback(bot, 'std/http');
    })();
  }
  return handlerPromise;
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return new Response('ok');
  const edgeHandler = await getEdgeHandler();
  return edgeHandler(req);
}
