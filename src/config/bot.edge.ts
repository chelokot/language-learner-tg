import { conversations } from '@grammyjs/conversations';
import type { I18n } from '@grammyjs/i18n';
import { type MiddlewareFn, Bot as TelegramBot } from 'grammy';
import type { Transformer } from 'grammy/out/core/client.js';

import { helpController } from '../controllers/help.js';
import { setupMenu } from '../controllers/menu.js';
import { startController } from '../controllers/start.js';
import type { CustomContext } from '../types/context.js';
import type { Database } from '../types/database.js';
import type { Bot } from '../types/telegram.js';
import { createExtendContextMiddleware } from './extend-context.js';
import { initLocaleEngineEdge } from './locale-engine.edge.js';
import { PgKVStorage } from './storage.js';

function setupPreControllers(_bot: Bot) {
  // no pre-controllers for now (edge)
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

export type CreateBotOptions = {
  apiTransformers?: Transformer[];
  preMiddlewares?: MiddlewareFn<CustomContext>[];
};

export async function createBotEdge(database: Database, options?: CreateBotOptions) {
  const i18n = initLocaleEngineEdge();

  const botInfo =
    process.env.NODE_ENV === 'test'
      ? ({ id: 1, is_bot: true, first_name: 'test', username: 'test' } as any)
      : undefined;
  const bot = new TelegramBot<CustomContext>(process.env.TOKEN, {
    client: process.env.TELEGRAM_API_ROOT ? { apiRoot: process.env.TELEGRAM_API_ROOT } : undefined,
    botInfo,
  });
  if (options?.apiTransformers) {
    bot.api.config.use(...options.apiTransformers);
  }

  const extendContextMiddleware = createExtendContextMiddleware(database);
  setupPreControllers(bot);
  bot.use(extendContextMiddleware);

  try {
    const grammyMod: any = await import('grammy');
    const sessionFn = grammyMod?.session;
    const hasDb = typeof (database as any)?.query === 'function';
    if (typeof sessionFn === 'function') {
      const storage = hasDb ? new PgKVStorage(database, 'session') : undefined;
      bot.use(
        sessionFn({
          initial: () => ({}),
          storage,
        }),
      );
    }
  } catch {
    // no-op for unit tests with strict mocks
  }

  setupMiddlewares(bot, i18n);

  const hasDb = typeof (database as any)?.query === 'function';
  const convStorage = hasDb ? new PgKVStorage(database, 'conversations') : undefined;
  const convPlugins = options?.preMiddlewares
    ? [extendContextMiddleware, ...options.preMiddlewares]
    : [extendContextMiddleware];

  if (convStorage) {
    bot.use(
      conversations({
        storage: convStorage as any,
        plugins: convPlugins,
      }),
    );
  } else {
    bot.use(
      conversations({
        plugins: convPlugins,
      }),
    );
  }

  setupControllers(bot);
  return bot;
}
