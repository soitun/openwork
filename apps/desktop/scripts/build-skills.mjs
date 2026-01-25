#!/usr/bin/env node
/**
 * Build all skills with esbuild.
 * Bundles TypeScript to JavaScript, eliminating the tsx runtime dependency.
 * This allows skills to run in packaged Electron apps without symlink issues.
 */

import * as esbuild from 'esbuild';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const skillsDir = join(__dirname, '..', 'skills');

// Skills to bundle with their entry points
// external: packages that should NOT be bundled (native deps, large packages)
const skills = [
  { name: 'dev-browser', entry: 'scripts/start-server.ts', external: ['playwright'] },
  { name: 'dev-browser-mcp', entry: 'src/index.ts', external: ['playwright'] },
  { name: 'file-permission', entry: 'src/index.ts', external: [] },
  { name: 'ask-user-question', entry: 'src/index.ts', external: [] },
  { name: 'complete-task', entry: 'src/index.ts', external: [] },
];

console.log('Building skills with esbuild...');

for (const skill of skills) {
  const skillPath = join(skillsDir, skill.name);
  const entryPoint = join(skillPath, skill.entry);

  if (!fs.existsSync(entryPoint)) {
    console.warn(`  Skipping ${skill.name}: entry point not found at ${skill.entry}`);
    continue;
  }

  const outfile = join(skillPath, 'dist', 'index.mjs');

  await esbuild.build({
    entryPoints: [entryPoint],
    bundle: true,
    platform: 'node',
    target: 'node20',
    format: 'esm',
    outfile,
    // Don't bundle these - they have native components or are too large
    external: ['fsevents', ...skill.external],
    // Silence warnings about __dirname (we handle it in the source)
    logLevel: 'warning',
  });

  console.log(`  Built ${skill.name}/dist/index.mjs`);
}

console.log('Skills built successfully.');
