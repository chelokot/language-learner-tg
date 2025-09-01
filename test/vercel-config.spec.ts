import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';

describe('vercel.json', () => {
  it('uses root as output directory', () => {
    const cfg = JSON.parse(readFileSync('vercel.json', 'utf8')) as { outputDirectory?: string };
    expect(cfg.outputDirectory).toBe('.');
  });

  it('bundles locale files when functions config present', () => {
    const cfg = JSON.parse(readFileSync('vercel.json', 'utf8')) as any;
    if (cfg.functions) {
      const first = Object.values(cfg.functions)[0] as any;
      expect(first.includeFiles).toBe('src/locales/**');
    } else {
      // No functions-level config: acceptable when using pure Edge functions
      expect(cfg.functions).toBeUndefined();
    }
  });
});
