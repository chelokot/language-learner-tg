import { describe, it, expect, vi } from 'vitest';

var dotenvConfig: any;
var resolvePathMock: any;

vi.mock('dotenv', () => {
  dotenvConfig = vi.fn();
  return { default: { config: dotenvConfig } };
});
vi.mock('../src/helpers/resolve-path.js', () => {
  resolvePathMock = vi.fn(() => '/resolved/path');
  return { resolvePath: resolvePathMock };
});

import { loadEnv } from '../src/helpers/load-env.js';

describe('loadEnv', () => {
  it('calls dotenv.config with resolved path', () => {
    loadEnv('.env.test');
    expect(resolvePathMock).toHaveBeenCalledWith(expect.any(String), '.env.test');
    expect(dotenvConfig).toHaveBeenCalledWith({ path: '/resolved/path' });
  });
});
