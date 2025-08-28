import { conversations } from '@grammyjs/conversations';
import type { I18n } from '@grammyjs/i18n';
import { type MiddlewareFn, Bot as TelegramBot } from 'grammy';
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
import { PgKVStorage } from './storage.js';

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

export type CreateBotOptions = {
  apiTransformers?: Transformer[];
  preMiddlewares?: MiddlewareFn<CustomContext>[];
};

export async function createBot(database: Database, options?: CreateBotOptions) {
  const localesPath = resolvePath(import.meta.url, '../locales');
  const i18n = initLocaleEngine(localesPath);

  const bot = new TelegramBot<CustomContext>(process.env.TOKEN, {
    client: process.env.TELEGRAM_API_ROOT ? { apiRoot: process.env.TELEGRAM_API_ROOT } : undefined,
  });
  if (options?.apiTransformers) {
    bot.api.config.use(...options.apiTransformers);
  }

  // === Order matters: first extend the context (db and text), then sessions, then i18n, then conversations ===
  const extendContextMiddleware = createExtendContextMiddleware(database);
  setupPreControllers(bot);

  bot.use(extendContextMiddleware);

  // Session middleware with persistent storage in PG.
  // In tests where grammy is mocked or db does not have query — just skip.
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
          // Session key is "per chat" by default; do not override in serverless to avoid race conditions.
          // See grammY recommendations for keys and serverless.
          // (conversation storage below is also "per chat" by default).
        }),
      );
    }
  } catch {
    // no-op for unit tests with strict mocks
  }

  // i18n uses session → put after session
  setupMiddlewares(bot, i18n);

  // Inside conversations, access to db/text is also needed → pass extendContext into plugins.
  // Store conversations state in the database via the same KV-adapter.
  const hasDb = typeof (database as any)?.query === 'function';
  const convStorage = hasDb ? new PgKVStorage(database, 'conversations') : undefined;

  const convPlugins = options?.preMiddlewares
    ? [extendContextMiddleware, ...options.preMiddlewares]
    : [extendContextMiddleware];

  // If storage exists — connect it, otherwise use in-memory (locally/in tests this is ok).
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

export async function startBot(
  database: Database,
  options?: { apiTransformers?: Transformer[]; preMiddlewares?: any[] },
) {
  const bot = await createBot(database, options);

  return new Promise(resolve =>
    bot.start({
      onStart: () => resolve(undefined),
    }),
  );
}
