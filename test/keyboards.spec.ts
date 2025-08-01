import { describe, it, expect } from 'vitest';
import { kbBase } from '../src/ui/keyboards.js';

describe('kbBase', () => {
  it('uses callback data with id', () => {
    const kb = kbBase(42);
    const rows = kb.inline_keyboard.map(row => row.map(b => ({
      text: b.text,
      data: b.callback_data,
    })));
    expect(rows).toEqual([
      [{ text: 'Add word', data: 'add_word:42' }],
      [{ text: 'Rename base', data: 'rename_base:42' }],
      [{ text: 'Delete base', data: 'delete_base:42' }],
      [{ text: 'Exercise', data: 'exercise:42' }],
      [{ text: 'Back', data: 'back_to_bases' }],
    ]);
  });
});
