#!/usr/bin/env node
import {
  loadPluginSkills,
  extractSkillName,
  scanSkillDependencies,
  loadManifest,
  writeManifest,
} from './lib/manifest.js';

const args = process.argv.slice(2);
const shouldScanDeps = args.includes('--scan-deps');

const skillPaths = loadPluginSkills();
const existing = loadManifest();
const existingSkills = existing?.skills ?? {};

// Collect all skill names first (needed for --scan-deps)
const nameToPath = new Map();
for (const sp of skillPaths) {
  try {
    const name = extractSkillName(sp);
    nameToPath.set(name, sp);
  } catch (err) {
    console.error(`[error] ${sp}: ${err.message}`);
  }
}

const allNames = [...nameToPath.keys()];
const skills = {};

for (const [name, sp] of nameToPath) {
  try {
    // Preserve existing dependencies unless --scan-deps
    let dependencies = existingSkills[name]?.dependencies ?? [];
    if (shouldScanDeps) {
      dependencies = scanSkillDependencies(sp, allNames);
    }

    skills[name] = {
      path: sp,
      dependencies,
    };
  } catch (err) {
    console.error(`[error] ${name}: ${err.message}`);
  }
}

// Preserve timestamp if skill entries haven't changed (idempotent writes)
const skillsChanged = JSON.stringify(skills) !== JSON.stringify(existingSkills);
const timestamp = skillsChanged
  ? new Date().toISOString()
  : (existing?.generated ?? new Date().toISOString());

const manifest = {
  $schema: './scripts/skill-deps.schema.json',
  version: 1,
  generated: timestamp,
  skills,
};

writeManifest(manifest);

console.log(`Updated skill-deps.json with ${Object.keys(skills).length} skills`);
if (shouldScanDeps) {
  console.log('Dependencies scanned from SKILL.md cross-references');
}
