import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, posix } from 'node:path';
import { createHash } from 'node:crypto';

const ROOT = join(import.meta.dirname, '..', '..');
const PLUGIN_PATH = join(ROOT, '.claude-plugin', 'plugin.json');
const MANIFEST_PATH = join(ROOT, 'skill-deps.json');

/**
 * Normalize a filesystem path to forward-slash form for manifest keys.
 */
function toForwardSlash(p) {
  return p.replace(/\\/g, '/');
}

/**
 * Load plugin.json and return the list of skill directory paths (relative to repo root).
 * Each path is a forward-slash relative path like "./skills/setup/optimizely-setup".
 */
export function loadPluginSkills() {
  if (!existsSync(PLUGIN_PATH)) {
    throw new Error(`plugin.json not found at ${PLUGIN_PATH}`);
  }
  const plugin = JSON.parse(readFileSync(PLUGIN_PATH, 'utf-8'));
  if (!Array.isArray(plugin.skills)) {
    throw new Error('plugin.json missing "skills" array');
  }

  // Deduplicate and warn
  const seen = new Set();
  const unique = [];
  for (const p of plugin.skills) {
    const normalized = toForwardSlash(p);
    if (seen.has(normalized)) {
      console.warn(`[warn] Duplicate path in plugin.json: ${normalized}`);
      continue;
    }
    seen.add(normalized);
    unique.push(normalized);
  }
  return unique;
}

/**
 * Compute SHA-256 hash of a skill's SKILL.md file.
 * Line endings are normalized (\r\n -> \n) before hashing for cross-platform consistency.
 */
export function computeSkillHash(skillPath) {
  const absPath = join(ROOT, skillPath, 'SKILL.md');
  if (!existsSync(absPath)) {
    throw new Error(`SKILL.md not found: ${absPath}`);
  }
  const content = readFileSync(absPath, 'utf-8').replace(/\r\n/g, '\n');
  return 'sha256:' + createHash('sha256').update(content, 'utf-8').digest('hex');
}

/**
 * Extract the skill name from SKILL.md YAML frontmatter.
 * Looks for `name: <value>` between `---` delimiters.
 * Falls back to directory name if no frontmatter name found.
 */
export function extractSkillName(skillPath) {
  const absPath = join(ROOT, skillPath, 'SKILL.md');
  if (!existsSync(absPath)) {
    // Fallback to directory name
    return skillPath.split('/').pop();
  }
  const content = readFileSync(absPath, 'utf-8');
  const fmMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (fmMatch) {
    const nameMatch = fmMatch[1].match(/^name:\s*(.+)$/m);
    if (nameMatch) {
      return nameMatch[1].trim();
    }
  }
  // Fallback to directory name
  const dirName = skillPath.split('/').pop();
  console.warn(`[warn] No "name:" in frontmatter for ${skillPath}, using directory name: ${dirName}`);
  return dirName;
}

/**
 * Scan a SKILL.md for references to other known skill names.
 * Matches backtick-quoted (`name`), bold (**name**), and bare word references.
 * Returns an array of referenced skill names.
 */
export function scanSkillDependencies(skillPath, allSkillNames) {
  const absPath = join(ROOT, skillPath, 'SKILL.md');
  if (!existsSync(absPath)) return [];

  const content = readFileSync(absPath, 'utf-8');
  const selfName = extractSkillName(skillPath);
  const deps = new Set();

  for (const name of allSkillNames) {
    if (name === selfName) continue;
    const escaped = escapeRegex(name);
    // Match: `skill-name`, **skill-name**, or standalone skill-name (word boundary)
    const pattern = new RegExp(
      '`' + escaped + '`|\\*\\*' + escaped + '\\*\\*|\\b' + escaped + '\\b',
    );
    if (pattern.test(content)) {
      deps.add(name);
    }
  }
  return [...deps].sort();
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Load skill-deps.json manifest. Returns null if file doesn't exist.
 */
export function loadManifest() {
  if (!existsSync(MANIFEST_PATH)) return null;
  return JSON.parse(readFileSync(MANIFEST_PATH, 'utf-8'));
}

/**
 * Write skill-deps.json manifest.
 */
export function writeManifest(manifest) {
  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n', 'utf-8');
}

/**
 * Build a reverse-dependency map from the manifest.
 * Returns { skillName -> Set<dependentSkillName> }.
 */
function buildReverseDeps(skills) {
  const reverse = {};
  for (const name of Object.keys(skills)) {
    reverse[name] = new Set();
  }
  for (const [name, entry] of Object.entries(skills)) {
    for (const dep of entry.dependencies || []) {
      if (!reverse[dep]) reverse[dep] = new Set();
      reverse[dep].add(name);
    }
  }
  return reverse;
}

/**
 * Compute the transitive closure of affected skills given a set of changed skill names.
 * Uses BFS on the reverse-dependency graph.
 * Returns a Set of all affected skill names (including the initially changed ones).
 */
export function computeAffectedSkills(skills, changedSkills) {
  const reverse = buildReverseDeps(skills);
  const visited = new Set(changedSkills);
  const queue = [...changedSkills];

  while (queue.length > 0) {
    const current = queue.shift();
    const dependents = reverse[current];
    if (dependents) {
      for (const dep of dependents) {
        if (!visited.has(dep)) {
          visited.add(dep);
          queue.push(dep);
        }
      }
    }
  }
  return visited;
}

/**
 * Compute a composite release hash from all individual skill hashes.
 * Sorts skills alphabetically by name, concatenates their hashes,
 * and produces a single SHA-256 digest.
 */
export function computeReleaseHash(skills) {
  const sortedHashes = Object.keys(skills)
    .sort()
    .map((name) => skills[name].hash)
    .join('\n');
  return 'sha256:' + createHash('sha256').update(sortedHashes, 'utf-8').digest('hex');
}

export function findSkillNameByPath(manifest, skillPath) {
  for (const [name, entry] of Object.entries(manifest.skills)) {
    if (entry.path === skillPath) return name;
  }
  return skillPath.split('/').pop();
}

export function resolveTransitiveDeps(manifest, skillName, visited = new Set()) {
  if (visited.has(skillName)) return visited;
  visited.add(skillName);
  const entry = manifest.skills[skillName];
  if (!entry) return visited;
  for (const dep of entry.dependencies || []) {
    resolveTransitiveDeps(manifest, dep, visited);
  }
  return visited;
}

export function resolveTargetSkills(opts, manifest, pluginSkills) {
  if (!opts.skill) {
    return pluginSkills.map((p) => ({
      name: findSkillNameByPath(manifest, p),
      path: p,
    }));
  }

  const entry = manifest.skills[opts.skill];
  if (!entry) {
    console.error(`Error: skill "${opts.skill}" not found in skill-deps.json`);
    process.exit(2);
  }

  const targets = [{ name: opts.skill, path: entry.path }];
  if (opts.deps) {
    const allDeps = resolveTransitiveDeps(manifest, opts.skill);
    for (const depName of allDeps) {
      if (depName === opts.skill) continue;
      const depEntry = manifest.skills[depName];
      if (depEntry) targets.push({ name: depName, path: depEntry.path });
    }
  }
  return targets;
}

export { ROOT, MANIFEST_PATH };
