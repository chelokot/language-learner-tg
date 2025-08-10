import { describe, it, expect } from 'vitest';
import { CONVERSATION_NAMES, getConversationName } from '../src/controllers/CONVERSATION_NAMES.js';

describe('CONVERSATION_NAMES', () => {
  it('getConversationName returns a defined name', () => {
    expect(getConversationName('createVocabulary')).toBe(CONVERSATION_NAMES.createVocabulary);
  });
});


