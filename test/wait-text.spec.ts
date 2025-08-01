import { describe, it, expect } from 'vitest';
import { waitText } from '../src/helpers/wait-text.js';

describe('waitText', () => {
  it('returns trimmed message text', async () => {
    const conv = { wait: async () => ({ message: { text: '  hi  ' } }) } as any;
    await expect(waitText(conv)).resolves.toBe('hi');
  });

  it('returns empty string when no text', async () => {
    const conv = { wait: async () => ({}) } as any;
    await expect(waitText(conv)).resolves.toBe('');
  });
});
