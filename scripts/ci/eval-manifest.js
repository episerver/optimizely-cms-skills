import { loadPluginSkills, loadManifest, resolveTargetSkills, computeAffectedSkills, findSkillNameByPath } from '../lib/manifest.js';
import { parseArgs } from '../lib/cli-args.js';

function resolveFromChangedFiles(changedFiles, manifest, pluginSkills) {
  const files = changedFiles.split('\n').map((f) => f.trim()).filter(Boolean);
  const changedSkills = new Set();

  for (const file of files) {
    const normalized = file.replace(/\\/g, '/');
    for (const skillPath of pluginSkills) {
      const cleanPath = skillPath.replace(/^\.\//, '');
      if (normalized.startsWith(cleanPath + '/')) {
        const name = findSkillNameByPath(manifest, skillPath);
        changedSkills.add(name);
      }
    }
  }

  if (changedSkills.size === 0) return [];

  const affected = computeAffectedSkills(manifest.skills, changedSkills);
  return [...affected].map((name) => {
    const entry = manifest.skills[name];
    return entry ? { name, path: entry.path } : null;
  }).filter(Boolean);
}

const opts = parseArgs(process.argv, {
  flags: {
    skill: { type: 'string' },
    deps: { type: 'boolean' },
    'changed-files': { type: 'string' },
  },
  defaults: { skill: null, deps: false, changedFiles: null },
  strict: false,
});
const manifest = loadManifest();
if (!manifest) {
  console.error('Error: skill-deps.json not found. Run "npm run update-deps" first.');
  process.exit(2);
}

const pluginSkills = loadPluginSkills();

let targets;
if (opts.changedFiles) {
  targets = resolveFromChangedFiles(opts.changedFiles, manifest, pluginSkills);
} else {
  targets = resolveTargetSkills(opts, manifest, pluginSkills);
}

console.log(JSON.stringify(targets));
