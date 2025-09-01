import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';

describe('vercel.json', () => {
  it('uses root as output directory', () => {
    const cfg = JSON.parse(readFileSync('vercel.json', 'utf8')) as { outputDirectory?: string };
    expect(cfg.outputDirectory).toBe('.');
  });

  it('bundles locale files', () => {
    const cfg = JSON.parse(readFileSync('vercel.json', 'utf8')) as any;
    const f = cfg.functions["api/**/*.{js,ts,tsx}"] ?? cfg.functions["api/**/*.{js,ts}"];
    expect(f.includeFiles).toBe('src/locales/**');
  });
});
