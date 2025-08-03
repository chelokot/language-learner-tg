import { conversations } from '@grammyjs/conversations';
import type { I18n } from '@grammyjs/i18n/dist/source/i18n.js';
import { Bot as TelegramBot } from 'grammy';
import type { Transformer } from 'grammy/out/core/client.js';

import { helpController } from '../controllers/help.js';
import { setupMenu } from '../controllers/menu.js';
import { startController } from '../controllers/start.js';
import { resolvePath } from '../helpers/resolve-path.js';
import type { CustomContext } from '../types/context.js';
import type { Database } from '../types/database.js';
import type { Bot } from '../types/telegram.js';
import { createExtendContextMiddleware } from './extend-context.js';
import { initLocaleEngine } from './locale-engine.js';

function setupPreControllers(_bot: Bot) {
  // e.g. inline-mode controllers
}

function setupMiddlewares(bot: Bot, localeEngine: I18n) {
  bot.use(localeEngine.middleware());
  // eslint-disable-next-line github/no-then
  bot.catch(console.error);
}

function setupControllers(bot: Bot) {
  bot.use(startController);
  bot.use(helpController);
  setupMenu(bot);
}

export function createBot(database: Database, options?: { apiTransformers?: Transformer[]; preMiddlewares?: any[] }) {
  const localesPath = resolvePath(import.meta.url, '../locales');
  const i18n = initLocaleEngine(localesPath);
  const bot = new TelegramBot<CustomContext>(process.env.TOKEN, {
    client: process.env.TELEGRAM_API_ROOT ? { apiRoot: process.env.TELEGRAM_API_ROOT } : undefined,
  });
  if (options?.apiTransformers) {
    bot.api.config.use(...options.apiTransformers);
  }

  // Create context extension middleware
  const extendContextMiddleware = createExtendContextMiddleware(database);

  setupPreControllers(bot);

  // Set up context extension both outside and inside conversations
  bot.use(extendContextMiddleware);
  if (options?.preMiddlewares) {
    for (const mw of options.preMiddlewares) bot.use(mw);
  }
  bot.use(
    conversations({
      plugins: options?.preMiddlewares
        ? [extendContextMiddleware, ...options.preMiddlewares]
        : [extendContextMiddleware],
    }),
  );

  setupMiddlewares(bot, i18n);
  setupControllers(bot);

  return bot;
}

export async function startBot(
  database: Database,
  options?: { apiTransformers?: Transformer[]; preMiddlewares?: any[] },
) {
  const bot = createBot(database, options);

  return new Promise(resolve =>
    bot.start({
      onStart: () => resolve(undefined),
    }),
  );
}
