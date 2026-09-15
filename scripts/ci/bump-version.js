#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';

const version = process.argv[2];
if (!version) {
  console.error('Usage: bump-version.js <version>');
  process.exit(1);
}

for (const file of ['package.json', '.claude-plugin/plugin.json']) {
  const pkg = JSON.parse(readFileSync(file, 'utf-8'));
  pkg.version = version;
  writeFileSync(file, JSON.stringify(pkg, null, 2) + '\n');
}

console.log(`Bumped version to ${version} in package.json and plugin.json`);
