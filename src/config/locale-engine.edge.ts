import { I18n } from '@grammyjs/i18n';
import en from '../locales/en.js';

export function initLocaleEngineEdge(defaultLanguage = 'en') {
  const repository = { en } as const;
  return new I18n({
    repository: repository as any,
    defaultLanguage,
    defaultLanguageOnMissing: true,
    useSession: true,
  });
}

