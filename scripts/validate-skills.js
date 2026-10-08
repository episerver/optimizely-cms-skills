import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { loadPluginSkills, loadManifest, extractSkillName, resolveTargetSkills, ROOT } from './lib/manifest.js';
import { formatValidationConsole, formatValidationJson } from './lib/reporter.js';
import { parseArgs } from './lib/cli-args.js';

const HELP_TEXT = `Usage: node scripts/validate-skills.js [options]

Options:
  --skill <name>            Validate a specific skill by name
  --deps                    Also validate the skill's dependencies (requires --skill)
  --ci                      Output JSON instead of console formatting
  --help                    Show help`;

function checkFrontmatter(skillPath) {
  const skillMdPath = join(ROOT, skillPath, 'SKILL.md');
  if (!existsSync(skillMdPath)) {
    return { name: 'frontmatter', passed: false, message: 'SKILL.md not found' };
  }
  const content = readFileSync(skillMdPath, 'utf-8');
  const fmMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!fmMatch) {
    return { name: 'frontmatter', passed: false, message: 'No YAML frontmatter found' };
  }
  const fm = fmMatch[1];
  const nameMatch = fm.match(/^name:\s*(.+)$/m);
  const descMatch = fm.match(/^description:\s*(.+)$/m);
  const descBlockMatch = fm.match(/^description:\s*[>|][-+]?\s*$\n((?:[ \t].*(?:\n|$))+)/m);
  if (!nameMatch || !nameMatch[1].trim()) {
    return { name: 'frontmatter', passed: false, message: 'Missing or empty "name" field' };
  }
  const hasInlineDescription = descMatch && !/^[>|][-+]?$/.test(descMatch[1].trim()) && descMatch[1].trim();
  const hasBlockDescription = descBlockMatch
    && descBlockMatch[1].split('\n').some((line) => line.trim().length > 0);
  if (!hasInlineDescription && !hasBlockDescription) {
    return { name: 'frontmatter', passed: false, message: 'Missing or empty "description" field' };
  }
  return { name: 'frontmatter', passed: true, message: '' };
}

function checkEvalsSchema(skillPath) {
  const evalsPath = join(ROOT, skillPath, 'evals', 'evals.json');
  if (!existsSync(evalsPath)) {
    return { name: 'evals-schema', passed: false, message: 'evals/evals.json not found' };
  }
  let data;
  try {
    data = JSON.parse(readFileSync(evalsPath, 'utf-8'));
  } catch {
    return { name: 'evals-schema', passed: false, message: 'evals.json is not valid JSON' };
  }
  if (typeof data.skill_name !== 'string' || !data.skill_name) {
    return { name: 'evals-schema', passed: false, message: 'evals.json missing required field "skill_name"' };
  }
  if (!Array.isArray(data.evals)) {
    return { name: 'evals-schema', passed: false, message: 'evals.json missing "evals" array' };
  }
  for (const ev of data.evals) {
    if (typeof ev.id !== 'number') {
      return { name: 'evals-schema', passed: false, message: `eval entry missing numeric "id"` };
    }
    if (typeof ev.prompt !== 'string' || !ev.prompt) {
      return { name: 'evals-schema', passed: false, message: `eval ${ev.id} missing "prompt"` };
    }
    if (typeof ev.expected_output !== 'string' || !ev.expected_output) {
      return { name: 'evals-schema', passed: false, message: `eval ${ev.id} missing "expected_output"` };
    }
  }
  return { name: 'evals-schema', passed: true, message: '' };
}

function checkDepIntegrity(skillName, manifest) {
  const entry = manifest.skills[skillName];
  if (!entry) {
    return { name: 'dep-integrity', passed: true, message: '' };
  }
  for (const dep of entry.dependencies || []) {
    if (!manifest.skills[dep]) {
      return { name: 'dep-integrity', passed: false, message: `dependency "${dep}" not found in skill-deps.json` };
    }
  }
  return { name: 'dep-integrity', passed: true, message: '' };
}

function findUnregisteredSkills(pluginSkills) {
  const registered = new Set(pluginSkills);
  const skillsDir = join(ROOT, 'skills');
  const unregistered = [];
  if (!existsSync(skillsDir)) return unregistered;
  for (const category of readdirSync(skillsDir, { withFileTypes: true })) {
    if (!category.isDirectory()) continue;
    const categoryPath = join(skillsDir, category.name);
    for (const skill of readdirSync(categoryPath, { withFileTypes: true })) {
      if (!skill.isDirectory()) continue;
      const skillMd = join(categoryPath, skill.name, 'SKILL.md');
      if (!existsSync(skillMd)) continue;
      const relPath = './' + relative(ROOT, join(categoryPath, skill.name)).replace(/\\/g, '/');
      if (!registered.has(relPath)) {
        unregistered.push(relPath);
      }
    }
  }
  return unregistered;
}

function checkNoOrphans(skillPath) {
  const absPath = join(ROOT, skillPath);
  if (!existsSync(absPath)) {
    return { name: 'no-orphans', passed: false, message: `directory "${skillPath}" does not exist on disk` };
  }
  return { name: 'no-orphans', passed: true, message: '' };
}

function validateSkill(skill, manifest) {
  const checks = [
    checkFrontmatter(skill.path),
    checkEvalsSchema(skill.path),
    checkDepIntegrity(skill.name, manifest),
    checkNoOrphans(skill.path),
  ];
  return {
    skill: skill.name,
    checks,
    passed: checks.every((c) => c.passed),
  };
}

const opts = parseArgs(process.argv, {
  flags: {
    skill: { type: 'string' },
    deps: { type: 'boolean' },
    ci: { type: 'boolean' },
    help: { type: 'boolean' },
  },
  defaults: { skill: null, deps: false, ci: false, help: false },
  usage: HELP_TEXT,
  validate: [(o) => o.deps && !o.skill ? '--deps requires --skill' : null],
});

if (opts.help) {
  console.log(HELP_TEXT);
  process.exit(0);
}

const manifest = loadManifest();
if (!manifest) {
  console.error('Error: skill-deps.json not found. Run "npm run update-deps" first.');
  process.exit(2);
}

const pluginSkills = loadPluginSkills();
const targets = resolveTargetSkills(opts, manifest, pluginSkills);
const results = targets.map((t) => validateSkill(t, manifest));

const unregistered = findUnregisteredSkills(pluginSkills);

if (opts.ci) {
  console.log(formatValidationJson(results, unregistered));
} else {
  console.log(formatValidationConsole(results, unregistered));
}

const allPassed = results.every((r) => r.passed) && unregistered.length === 0;
process.exit(allPassed ? 0 : 1);
