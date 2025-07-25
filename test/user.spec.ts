import { describe, it, expect, beforeEach } from 'vitest';
import { buildName } from '../src/services/user.js';

describe('buildName', () => {
  it('concatenates first and last name', () => {
    expect(buildName('John', 'Doe')).toBe('John Doe');
  });

  it('returns first name when last name missing', () => {
    expect(buildName('Alice')).toBe('Alice');
  });
});
