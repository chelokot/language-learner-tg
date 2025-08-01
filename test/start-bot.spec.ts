import { describe, it, expect, vi, beforeEach } from 'vitest';

const startMock = vi.fn();
const useMock = vi.fn();

vi.mock('grammy', () => ({
  Bot: class {
    use = useMock;
    catch() {}
    start(opts: any) {
      startMock(opts);
    }
  },
}));
vi.mock('@grammyjs/conversations', () => ({ conversations: () => () => undefined }));
vi.mock('../src/controllers/help.js', () => ({ helpController: {} }));
vi.mock('../src/controllers/menu.js', () => ({ setupMenu: () => undefined }));
vi.mock('../src/controllers/start.js', () => ({ startController: {} }));
vi.mock('../src/controllers/stop.js', () => ({ stopController: {} }));
vi.mock('../src/config/extend-context.js', () => ({ createExtendContextMiddleware: () => () => undefined }));
vi.mock('../src/config/locale-engine.js', () => ({ initLocaleEngine: () => ({ middleware: () => () => undefined }) }));

import { startBot } from '../src/config/bot.js';

beforeEach(() => {
  process.env.TOKEN = 't';
  startMock.mockClear();
});

describe('startBot', () => {
  it('starts bot and resolves when onStart called', async () => {
    startMock.mockImplementation(({ onStart }: any) => onStart());
    await expect(startBot({} as any)).resolves.toBeUndefined();
    expect(startMock).toHaveBeenCalledWith({ onStart: expect.any(Function) });
  });
});
