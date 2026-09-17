#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  loadPluginSkills,
  extractSkillName,
  loadManifest,
  computeAffectedSkills,
  ROOT,
} from './lib/manifest.js';

const args = process.argv.slice(2);
const dryRun = !args.includes('--run');

const manifest = loadManifest();
if (!manifest) {
  console.error('skill-deps.json not found. Run `npm run update-deps` first.');
  process.exit(1);
}

const skillPaths = loadPluginSkills();
const manifestSkills = manifest.skills;

// Identify changed skills via --skills flag
const skillsFlag = args.find((a) => a.startsWith('--skills='))?.slice('--skills='.length)
  || (args.includes('--skills') ? args[args.indexOf('--skills') + 1] : null);

let directlyChanged;
if (skillsFlag) {
  directlyChanged = skillsFlag.split(',').map((s) => s.trim()).filter(Boolean);
} else {
  directlyChanged = [];
}

if (directlyChanged.length === 0) {
  console.log('No skills specified. No evals needed.');
  process.exit(0);
}

// Compute all affected skills (direct + transitive)
const allAffected = computeAffectedSkills(manifestSkills, directlyChanged);

console.log('=== Skill Eval Report ===\n');
console.log(`Changed skills: ${directlyChanged.join(', ')}`);
console.log(`Total affected (including transitive): ${allAffected.size}\n`);

let totalCases = 0;
let skillsWithEvals = 0;
let skillsWithoutEvals = 0;

for (const name of [...allAffected].sort()) {
  const entry = manifestSkills[name];
  if (!entry) {
    console.log(`  [?] ${name} — not in manifest`);
    continue;
  }

  const evalsPath = join(ROOT, entry.path, 'evals', 'evals.json');
  const isDirect = directlyChanged.includes(name);
  const marker = isDirect ? '*' : '~';

  if (existsSync(evalsPath)) {
    try {
      const evals = JSON.parse(readFileSync(evalsPath, 'utf-8'));
      const caseCount = Array.isArray(evals)
            ? evals.length
            : (evals.evals?.length ?? evals.cases?.length ?? 0);
      totalCases += caseCount;
      skillsWithEvals++;
      console.log(`  [${marker}] ${name} — ${caseCount} eval case(s)`);
    } catch {
      console.log(`  [${marker}] ${name} — evals.json parse error`);
    }
  } else {
    skillsWithoutEvals++;
    console.log(`  [${marker}] ${name} — no evals found`);
  }
}

console.log();
console.log(`Skills with evals: ${skillsWithEvals}`);
console.log(`Skills without evals: ${skillsWithoutEvals}`);
console.log(`Total eval cases: ${totalCases}`);

if (dryRun) {
  console.log('\n(dry-run mode — use --run to execute evals)');
} else {
  console.log('\n[TODO] Eval execution not yet implemented.');
}
