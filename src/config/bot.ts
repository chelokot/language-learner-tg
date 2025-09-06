export { createBotEdge as createBot } from './bot.edge.js';
export async function startBot(...args: any[]) {
  const { startBot: startBotEdge } = await import('./bot.edge.js');
  return (startBotEdge as any)(...args);
}
