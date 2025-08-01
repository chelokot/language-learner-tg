import { describe, it, expect } from 'vitest';
import { checkTranslation } from '../src/services/exercise.js';

describe('checkTranslation', () => {
  it('is case-insensitive and trims spaces', () => {
    expect(checkTranslation('Hello', ' hello ')).toBe(true);
  });

  it('detects incorrect answer', () => {
    expect(checkTranslation('World', 'planet')).toBe(false);
  });

  it('trims correct answer string', () => {
    expect(checkTranslation('  Hello  ', 'hello')).toBe(true);
  });
});
