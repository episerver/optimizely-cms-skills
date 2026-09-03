#!/usr/bin/env node
import {
  loadPluginSkills,
  computeSkillHash,
  extractSkillName,
  loadManifest,
  computeAffectedSkills,
} from './lib/manifest.js';

const args = process.argv.slice(2);
const jsonOutput = args.includes('--json');

const manifest = loadManifest();
if (!manifest) {
  console.error('skill-deps.json not found.');
  console.error('Run `npm run update-hashes` to bootstrap it.');
  process.exit(1);
}

const skillPaths = loadPluginSkills();
const manifestSkills = manifest.skills;

const changed = [];
const added = [];
const removed = [];

// Build name -> path mapping from plugin.json
const currentSkills = new Map();
for (const sp of skillPaths) {
  try {
    const name = extractSkillName(sp);
    currentSkills.set(name, sp);
  } catch (err) {
    console.error(`[error] ${sp}: ${err.message}`);
  }
}

// Check each current skill against manifest
for (const [name, sp] of currentSkills) {
  try {
    const currentHash = computeSkillHash(sp);
    const entry = manifestSkills[name];

    if (!entry) {
      added.push({ name, path: sp, hash: currentHash });
    } else if (entry.hash !== currentHash) {
      changed.push({
        name,
        path: sp,
        oldHash: entry.hash,
        newHash: currentHash,
      });
    }
  } catch (err) {
    console.error(`[error] ${name}: ${err.message}`);
  }
}

// Check for removed skills (in manifest but not in plugin.json)
for (const name of Object.keys(manifestSkills)) {
  if (!currentSkills.has(name)) {
    removed.push({ name, path: manifestSkills[name].path });
  }
}

// Compute transitively affected skills
const directlyChanged = [
  ...changed.map((s) => s.name),
  ...added.map((s) => s.name),
  ...removed.map((s) => s.name),
];

const allAffected = directlyChanged.length > 0
  ? computeAffectedSkills(manifestSkills, directlyChanged)
  : new Set();

// Transitively affected = allAffected minus directly changed
const transitivelyAffected = [...allAffected].filter(
  (name) => !directlyChanged.includes(name),
);

const hasMismatches = changed.length > 0 || added.length > 0 || removed.length > 0;

if (jsonOutput) {
  const report = {
    status: hasMismatches ? 'mismatched' : 'ok',
    changed,
    added,
    removed,
    transitivelyAffected,
  };
  console.log(JSON.stringify(report, null, 2));
} else {
  if (!hasMismatches) {
    console.log('All skill hashes match.');
    process.exit(0);
  }

  console.log('=== Skill Hash Check Report ===\n');

  if (changed.length > 0) {
    console.log(`Changed (${changed.length}):`);
    for (const s of changed) {
      console.log(`  - ${s.name} (${s.path})`);
    }
    console.log();
  }

  if (added.length > 0) {
    console.log(`New (${added.length}):`);
    for (const s of added) {
      console.log(`  + ${s.name} (${s.path})`);
    }
    console.log();
  }

  if (removed.length > 0) {
    console.log(`Removed (${removed.length}):`);
    for (const s of removed) {
      console.log(`  x ${s.name} (${s.path})`);
    }
    console.log();
  }

  if (transitivelyAffected.length > 0) {
    console.log(`Transitively affected (${transitivelyAffected.length}):`);
    for (const name of transitivelyAffected.sort()) {
      console.log(`  ~ ${name}`);
    }
    console.log();
  }

  console.log('Run `npm run update-hashes` to update skill-deps.json.');
}

process.exit(hasMismatches ? 1 : 0);
