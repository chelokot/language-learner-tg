import { InlineKeyboard } from 'grammy';
import type { Vocabulary } from '../services/vocabulary.js';

export function kbMenu() {
  return new InlineKeyboard().text('Vocabularies', 'vocabularies').row().text('Exercises', 'exercises');
}

export function kbVocabularies(
  vocabularies: Array<
    Pick<Vocabulary, 'id' | 'name' | 'goal_language' | 'native_language' | 'goal_code' | 'native_code'>
  >,
) {
  const kb = new InlineKeyboard();
  if (vocabularies.length) {
    vocabularies.forEach(v => kb.text(`${v.name}`, `open_vocab:${v.id}`).row());
  }
  kb.text('Create vocabulary', 'create_vocab').row().text('Back', 'menu');
  return kb;
}

export function kbVocabulary(id: number) {
  return new InlineKeyboard()
    .text('Add word', `add_word:${id}`)
    .row()
    .text('Show all words', `list_words:${id}`)
    .row()
    .text('Delete words…', `delete_words:${id}`)
    .row()
    .text('Select Vocabulary', `select_vocab:${id}`)
    .row()
    .text('Rename Vocabulary', `rename_vocab:${id}`)
    .row()
    .text('Delete Vocabulary', `delete_vocab_confirm:${id}`)
    .row()
    .text('Back', 'back_to_vocabularies');
}

export function kbConfirmDeleteVocabulary(id: number) {
  return new InlineKeyboard().text('Yes, delete', `delete_vocab:${id}`).row().text('Cancel', `open_vocab:${id}`);
}

function dir(a: string, b: string) {
  return `${a}→${b}`;
}

export const kbExercisesForVocab = (v: Vocabulary) => {
  const g = (v.goal_code || v.goal_language).toUpperCase();
  const n = (v.native_code || v.native_language).toUpperCase();
  return new InlineKeyboard()
    .text(`Word ${dir(n, g)}`, 'exercise:word:ng')
    .row()
    .text(`Word ${dir(g, n)}`, 'exercise:word:gn')
    .row()
    .text(`Sentence ${dir(n, g)}`, 'exercise:sentence:ng')
    .row()
    .text(`Sentence ${dir(g, n)}`, 'exercise:sentence:gn')
    .row()
    .text('Back', 'menu');
};
