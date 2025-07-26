import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';

describe('postcompile script', () => {
  it('copies locales to build/src', () => {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as { scripts: Record<string, string> };
    expect(pkg.scripts.postcompile).toMatch(/src\/locales\s+build\/src/);
  });
});
