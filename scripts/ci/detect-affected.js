#!/usr/bin/env node
import { loadPluginSkills, findSkillNameByPath, computeAffectedSkills, loadManifest } from '../lib/manifest.js';

const changedFiles = (process.env.CHANGED_FILES || '').split('\n').filter(Boolean);

if (changedFiles.length === 0) {
  console.log('[]');
  process.exit(0);
}

const manifest = loadManifest();
if (!manifest) {
  console.error('skill-deps.json not found. Run `npm run update-deps` first.');
  process.exit(1);
}

const pluginSkills = loadPluginSkills();

const changedSkills = new Set();
for (const file of changedFiles) {
  const normalized = './' + file.replace(/\\/g, '/');
  for (const skillPath of pluginSkills) {
    if (normalized === skillPath || normalized.startsWith(`${skillPath}/`)) {
      changedSkills.add(findSkillNameByPath(manifest, skillPath));
    }
  }
}

const allAffected = computeAffectedSkills(manifest.skills, changedSkills);
const skills = [...allAffected]
  .map((name) => {
    const entry = manifest.skills[name];
    return entry ? { name, path: entry.path } : null;
  })
  .filter(Boolean);

console.log(JSON.stringify(skills));
