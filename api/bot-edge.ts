export const config = { runtime: 'edge', regions: ['fra1', 'arn1'] } as const;

import { webhookCallback } from 'grammy';
import { connectToDbEdge } from '../src/config/database-edge.js';
import { createBotEdge } from '../src/config/bot.edge.js';

let stdHandler: ((req: Request) => Promise<Response>) | undefined;
let nodeHandler: ((req: any, res: any) => Promise<void> | void) | undefined;

async function getHandlers() {
  if (!stdHandler || !nodeHandler) {
    if (!process.env.TOKEN || !process.env.DATABASE_URL) {
      throw new Error('Missing env: TOKEN or DATABASE_URL');
    }
    const db = await connectToDbEdge();
    const bot = await createBotEdge(db);
    stdHandler = webhookCallback(bot, 'std/http');
    nodeHandler = webhookCallback(bot, 'http', 'return', 10_000);
  }
  return { stdHandler: stdHandler!, nodeHandler: nodeHandler! };
}

// Overloads to provide precise typing for both runtimes
export default async function handlerEdge(req: Request): Promise<Response>;
export default async function handlerEdge(req: unknown, res: unknown): Promise<void>;
export default async function handlerEdge(reqOrNodeReq: any, maybeRes?: any): Promise<Response | void> {
  const { stdHandler, nodeHandler } = await getHandlers();
  // Node Serverless fallback (in case runtime isn't edge)
  if (maybeRes) {
    return nodeHandler(reqOrNodeReq, maybeRes);
  }
  const req: Request = reqOrNodeReq as Request;
  if (req.method !== 'POST') return new Response('ok');
  // Edge std/http
  if (typeof (req as any)?.json === 'function') {
    return stdHandler(req);
  }
  // Fallback: unexpected shape, try to acknowledge
  return new Response('ok');
}
