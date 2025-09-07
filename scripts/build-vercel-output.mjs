import { build } from 'esbuild';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';

const OUT_ROOT = '.vercel/output';
const FUNCTIONS_ROOT = join(OUT_ROOT, 'functions');

function ensureDir(p) {
  if (existsSync(p)) return;
  mkdirSync(p, { recursive: true });
}

async function bundleEdge(entryFile, route, regions = ['fra1', 'arn1']) {
  const funcDir = join(FUNCTIONS_ROOT, `${route}.func`);
  ensureDir(funcDir);

  await build({
    entryPoints: [entryFile],
    outfile: join(funcDir, 'index.js'),
    bundle: true,
    format: 'esm',
    platform: 'neutral',
    target: 'es2022',
    mainFields: ['module', 'browser', 'main'],
    conditions: ['worker', 'browser', 'module', 'import'],
    resolveExtensions: ['.ts', '.tsx', '.js', '.mjs'],
    sourcemap: false,
    minify: false,
    logLevel: 'info',
  });

  const vcConfig = {
    runtime: 'edge',
    entrypoint: 'index.js',
    regions,
  };
  writeFileSync(join(funcDir, '.vc-config.json'), JSON.stringify(vcConfig, null, 2));
}

async function main() {
  ensureDir(FUNCTIONS_ROOT);
  // Map of source entry file -> route path
  const entries = [
    { entry: 'build/api/bot-edge.js', route: 'api/bot-edge' },
    { entry: 'build/api/edge-ping.js', route: 'api/edge-ping' },
  ];

  for (const { entry, route } of entries) {
    await bundleEdge(entry, route);
  }
}

main().catch((err) => {
  console.error('[build-vercel-output] failed:', err);
  process.exit(1);
});
