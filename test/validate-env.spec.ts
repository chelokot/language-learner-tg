import { describe, it, expect } from 'vitest';
import { validateEnv } from '../src/helpers/validate-env.js';

describe('validateEnv', () => {
  it('throws when required env missing', () => {
    expect(() => validateEnv(['MISSING_VAR'])).toThrow(
      'ERROR: Required variable "MISSING_VAR" is not specified',
    );
  });

  it('does nothing when env present', () => {
    process.env.TEST_VAR = '1';
    expect(() => validateEnv(['TEST_VAR'])).not.toThrow();
  });
});
