#!/usr/bin/env node
/**
 * Prepare skills for packaging using pnpm deploy.
 *
 * This script creates standalone, symlink-free copies of each skill
 * using pnpm's official deployment feature. This is the industry-standard
 * way to package pnpm workspace packages for distribution.
 *
 * Run this BEFORE electron-builder to ensure skills have proper node_modules.
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const skills = [
  'dev-browser',
  'dev-browser-mcp',
  'file-permission',
  'ask-user-question',
  'complete-task'
];

const desktopDir = path.join(__dirname, '..');
const skillsSourceDir = path.join(desktopDir, 'skills');
const outputDir = path.join(desktopDir, 'build', 'skills');
const monorepoRoot = path.resolve(desktopDir, '..', '..');

console.log('Preparing skills for packaging with pnpm deploy...');
console.log(`  Source: ${skillsSourceDir}`);
console.log(`  Output: ${outputDir}`);
console.log(`  Monorepo root: ${monorepoRoot}`);

// Clean and create output directory
if (fs.existsSync(outputDir)) {
  fs.rmSync(outputDir, { recursive: true });
}
fs.mkdirSync(outputDir, { recursive: true });

for (const skill of skills) {
  const skillOutput = path.join(outputDir, skill);
  const skillSource = path.join(skillsSourceDir, skill);

  console.log(`\nDeploying ${skill}...`);

  // Check if skill has a package.json (required for pnpm deploy)
  const packageJsonPath = path.join(skillSource, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    console.warn(`  Skipping ${skill}: no package.json found`);
    continue;
  }

  // Read the skill's package.json to get its name
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  const packageName = packageJson.name;

  try {
    // Run pnpm deploy from monorepo root
    // --prod: only install production dependencies
    execSync(`pnpm deploy --filter="${packageName}" --prod "${skillOutput}"`, {
      cwd: monorepoRoot,
      stdio: 'inherit'
    });

    // Copy the pre-built dist/ directory (esbuild output)
    const distSrc = path.join(skillSource, 'dist');
    const distDest = path.join(skillOutput, 'dist');
    if (fs.existsSync(distSrc)) {
      console.log(`  Copying dist/ for ${skill}...`);
      fs.cpSync(distSrc, distDest, { recursive: true });
    } else {
      console.warn(`  Warning: No dist/ found for ${skill}. Run build-skills.mjs first.`);
    }

    // Copy server.cjs for dev-browser (the launcher script)
    if (skill === 'dev-browser') {
      const serverSrc = path.join(skillSource, 'server.cjs');
      const serverDest = path.join(skillOutput, 'server.cjs');
      if (fs.existsSync(serverSrc)) {
        console.log(`  Copying server.cjs for ${skill}...`);
        fs.copyFileSync(serverSrc, serverDest);
      }
    }

    // Copy SKILL.md if it exists (OpenCode skill definition)
    const skillMdSrc = path.join(skillSource, 'SKILL.md');
    const skillMdDest = path.join(skillOutput, 'SKILL.md');
    if (fs.existsSync(skillMdSrc)) {
      console.log(`  Copying SKILL.md for ${skill}...`);
      fs.copyFileSync(skillMdSrc, skillMdDest);
    }

    console.log(`  Successfully deployed ${skill}`);

  } catch (error) {
    console.error(`  Failed to deploy ${skill}:`, error.message);
    throw error;
  }
}

console.log('\nSkills prepared successfully.');
console.log(`Output directory: ${outputDir}`);
