import { describe, it, expect } from 'vitest';
import { kbVocabulary } from '../src/ui/keyboards.js';
import type { InlineKeyboardButton } from '@grammyjs/types';

describe('kbVocabulary', () => {
  it('uses callback data with id', () => {
    const kb = kbVocabulary(42);
    const rows = kb.inline_keyboard.map((row: InlineKeyboardButton[]) =>
      row.map(b => ({
        text: b.text,
        data: (b as InlineKeyboardButton.CallbackButton).callback_data,
      })),
    );
    expect(rows).toEqual([
      [{ text: 'Add word', data: 'add_word:42' }],
      [{ text: 'Rename', data: 'rename_vocab:42' }],
      [{ text: 'Delete', data: 'delete_vocab:42' }],
      [{ text: 'Select', data: 'select_vocab:42' }],
      [{ text: 'Back', data: 'back_to_vocabularies' }],
    ]);
  });
});
