import type { ConversationFlavor } from '@grammyjs/conversations';
import type { I18nContextFlavor, TemplateData } from '@grammyjs/i18n';
import type { Context } from 'grammy';
import type { SessionFlavor } from 'grammy';

import type { Chat, Database, User } from './database.js';
import type { Extra } from './telegram.js';

export interface Custom<C extends Context> {
  text: (text: string, templateData?: TemplateData, extra?: Extra) => ReturnType<C['reply']>;

  dbEntities: {
    user: User;
    chat: Chat | null;
  };

  seen: Record<string, true>;

  db: Database;
}

export type CustomContextMethods = Custom<Context>;

export type SessionData = Record<string, unknown>;

export type CustomContext = Context &
  SessionFlavor<SessionData> &
  Custom<Context> &
  I18nContextFlavor &
  ConversationFlavor<Context>;
