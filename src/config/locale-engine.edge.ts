import { MicroI18n } from './i18n.micro.js';
import en from '../locales/en.js';

export function initLocaleEngineEdge(defaultLanguage = 'en') {
  const i18n = new MicroI18n({ defaultLanguage });
  i18n.loadLocale('en', en as any);
  return i18n;
}
