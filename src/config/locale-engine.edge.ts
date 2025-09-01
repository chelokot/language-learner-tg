import { I18n } from '@grammyjs/i18n';
import en from '../locales/en.js';

export function initLocaleEngineEdge(defaultLanguage = 'en') {
  const i18n = new I18n({
    defaultLanguage,
    defaultLanguageOnMissing: true,
    useSession: true,
  });
  i18n.loadLocale('en', en as any);
  return i18n;
}
