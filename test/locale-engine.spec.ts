import { describe, it, expect, vi } from 'vitest';

let calledWith: any;
vi.mock('@grammyjs/i18n', () => ({
  I18n: vi.fn(opts => { calledWith = opts; return {}; })
}));

import { initLocaleEngine } from '../src/config/locale-engine.js';

describe('initLocaleEngine', () => {
  it('creates engine with defaults', () => {
    initLocaleEngine('/loc');
    expect(calledWith).toEqual({
      directory: '/loc',
      defaultLanguage: 'en',
      defaultLanguageOnMissing: true,
      useSession: true,
    });
  });
});
