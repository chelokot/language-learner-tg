import type { NextFunction } from 'grammy';
import { getOrCreateChat } from '../services/chat.js';
import { createReplyWithTextFunc } from '../services/context.js';
import { buildName, getOrCreateUser } from '../services/user.js';
import type { CustomContext } from '../types/context.js';
import type { Chat, Database } from '../types/database.js';
import type { Bot } from '../types/telegram.js';

export function createExtendContextMiddleware(database: Database) {
  return async (ctx: CustomContext, next: NextFunction) => {
    // Abort early if no user data available
    if (!ctx.from) {
      return next();
    }

    // Extend context with utility functions and database
    ctx.text = createReplyWithTextFunc(ctx);
    ctx.db = database;

    // Always create/get user from database
    const user = await getOrCreateUser({
      db: database,
      userId: ctx.from.id,
      name: buildName(ctx.from.first_name, ctx.from.last_name),
    });

    // Handle chat only for non-private chats
    let chat: Chat | null = null;
    if (ctx.chat && ctx.chat.type !== 'private') {
      chat = await getOrCreateChat({
        db: database,
        chatId: ctx.chat.id,
        title: ctx.chat.title!,
      });
    }

    // Set database entities on context
    ctx.dbEntities = { user, chat };
    return next();
  };
}

export function extendContextMiddleware(bot: Bot, database: Database) {
  bot.use(createExtendContextMiddleware(database));
}
