import { describe, it, expect, vi } from 'vitest';

var getUser: any;
var getChat: any;
var replyFunc: any;

vi.mock('../src/services/user.js', () => {
  getUser = vi.fn(async () => ({ user_id: 1, name: 'test' }));
  return {
    getOrCreateUser: getUser,
    buildName: (f: string, l?: string) => (l ? `${f} ${l}` : f),
  };
});
vi.mock('../src/services/chat.js', () => {
  getChat = vi.fn(async () => ({ chat_id: 2, title: 't' }));
  return { getOrCreateChat: getChat };
});
vi.mock('../src/services/context.js', () => {
  replyFunc = vi.fn();
  return { createReplyWithTextFunc: () => replyFunc };
});

import { createExtendContextMiddleware } from '../src/config/extend-context.js';

describe('createExtendContextMiddleware', () => {
  it('skips when no from', async () => {
    const next = vi.fn();
    await createExtendContextMiddleware({} as any)({} as any, next);
    expect(next).toHaveBeenCalled();
  });

  it('adds db entities and calls services', async () => {
    const next = vi.fn();
    const ctx: any = {
      from: { id: 1, first_name: 'A', last_name: 'B' },
      chat: { id: 2, type: 'group', title: 'G' },
    };
    await createExtendContextMiddleware({} as any)(ctx, next);
    expect(getUser).toHaveBeenCalled();
    expect(getChat).toHaveBeenCalled();
    expect(ctx.dbEntities).toEqual({ user: { user_id: 1, name: 'test' }, chat: { chat_id: 2, title: 't' } });
    expect(replyFunc).toBe(ctx.text);
    expect(next).toHaveBeenCalled();
  });
});
