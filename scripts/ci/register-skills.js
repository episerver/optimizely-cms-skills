#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { ROOT } from '../lib/manifest.js';

const pluginPath = join(ROOT, '.claude-plugin', 'plugin.json');
const plugin = JSON.parse(readFileSync(pluginPath, 'utf-8'));
const registered = new Set(plugin.skills);

const skillsDir = join(ROOT, 'skills');
const added = [];
const removed = [];

// Add unregistered skills
for (const category of readdirSync(skillsDir, { withFileTypes: true })) {
  if (!category.isDirectory()) continue;
  const categoryPath = join(skillsDir, category.name);
  for (const skill of readdirSync(categoryPath, { withFileTypes: true })) {
    if (!skill.isDirectory()) continue;
    const skillMd = join(categoryPath, skill.name, 'SKILL.md');
    if (!existsSync(skillMd)) continue;
    const relPath = './' + relative(ROOT, join(categoryPath, skill.name)).replace(/\\/g, '/');
    if (!registered.has(relPath)) {
      plugin.skills.push(relPath);
      added.push(relPath);
    }
  }
}

// Remove skills that no longer exist on disk
plugin.skills = plugin.skills.filter((skillPath) => {
  const skillMd = join(ROOT, skillPath, 'SKILL.md');
  if (!existsSync(skillMd)) {
    removed.push(skillPath);
    return false;
  }
  return true;
});

if (added.length > 0 || removed.length > 0) {
  writeFileSync(pluginPath, JSON.stringify(plugin, null, 2) + '\n');
  if (added.length > 0) console.log(`Registered ${added.length} new skill(s): ${added.join(', ')}`);
  if (removed.length > 0) console.log(`Removed ${removed.length} deleted skill(s): ${removed.join(', ')}`);
} else {
  console.log('All skills already registered');
}
