import type { I18n } from "@grammyjs/i18n/dist/source/i18n.js";
import { Bot as TelegramBot } from "grammy";
import { conversations } from "@grammyjs/conversations";

import { startController } from "../controllers/start.js";
import { stopController } from "../controllers/stop.js";
import { setupMenu } from "../controllers/menu.js";
import { helpController } from "../controllers/help.js";
import { resolvePath } from "../helpers/resolve-path.js";
import type { CustomContext } from "../types/context.js";
import type { Database } from "../types/database.js";
import type { Bot } from "../types/telegram.js";
import { initLocaleEngine } from "./locale-engine.js";
import { createExtendContextMiddleware } from "./extend-context.js";

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
  bot.use(stopController);
  bot.use(helpController);
  setupMenu(bot);
}

export function createBot(database: Database) {
  const localesPath = resolvePath(import.meta.url, "../locales");
  const i18n = initLocaleEngine(localesPath);
  const bot = new TelegramBot<CustomContext>(process.env.TOKEN, {
    client: process.env.TELEGRAM_API_ROOT
      ? { apiRoot: process.env.TELEGRAM_API_ROOT }
      : undefined,
  });

  // Create context extension middleware
  const extendContextMiddleware = createExtendContextMiddleware(database);

  setupPreControllers(bot);

  // Set up context extension both outside and inside conversations
  bot.use(extendContextMiddleware);
  bot.use(
    conversations({
      plugins: [extendContextMiddleware],
    }),
  );

  setupMiddlewares(bot, i18n);
  setupControllers(bot);

  return bot;
}

export async function startBot(database: Database) {
  const bot = createBot(database);

  return new Promise((resolve) =>
    bot.start({
      onStart: () => resolve(undefined),
    }),
  );
}
