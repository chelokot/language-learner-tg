import { InlineKeyboard } from 'grammy';
import type { Vocabulary } from '../services/vocabulary.js';

export const kbMenu = () =>
  new InlineKeyboard().text('Vocabularies', 'vocabularies').row().text('Exercises', 'exercises');

export const kbVocabularies = (vocabularies: Vocabulary[]) => {
  const kb = new InlineKeyboard();
  vocabularies.forEach(v => kb.text(`${v.name}`, `open_vocab:${v.id}`).row());
  return kb.text('Create vocabulary', 'create_vocab').row().text('Back', 'menu');
};

export const kbVocabulary = (id: number) =>
  new InlineKeyboard()
    .text('Add word', `add_word:${id}`)
    .row()
    .text('Rename', `rename_vocab:${id}`)
    .row()
    .text('Delete', `delete_vocab:${id}`)
    .row()
    .text('Select', `select_vocab:${id}`)
    .row()
    .text('Back', 'back_to_vocabularies');

function dir(a: string, b: string) {
  return `${a}→${b}`;
}

export const kbExercisesForVocab = (v: Vocabulary) => {
  const g = (v.goal_code || v.goal_language).toUpperCase();
  const n = (v.native_code || v.native_language).toUpperCase();
  return new InlineKeyboard()
    .text(`Word ${dir(g, n)}`, 'exercise:word:gn')
    .row()
    .text(`Word ${dir(n, g)}`, 'exercise:word:ng')
    .row()
    .text(`Sentence ${dir(g, n)}`, 'exercise:sentence:gn')
    .row()
    .text(`Sentence ${dir(n, g)}`, 'exercise:sentence:ng')
    .row()
    .text('Back', 'menu');
};
