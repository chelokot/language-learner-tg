import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';

describe('vercel.json', () => {
  it('uses root as output directory', () => {
    const cfg = JSON.parse(readFileSync('vercel.json', 'utf8')) as { outputDirectory?: string };
    expect(cfg.outputDirectory).toBe('.');
  });

  it('bundles locale files', () => {
    const cfg = JSON.parse(readFileSync('vercel.json', 'utf8')) as any;
    expect(cfg.functions["api/**/*.{js,ts}"].includeFiles).toBe('src/locales/**');
  });
});
