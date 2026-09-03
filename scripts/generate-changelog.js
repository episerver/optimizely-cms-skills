#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { loadManifest } from './lib/manifest.js';

const version = process.argv[2];
if (!version) {
  console.error('Usage: generate-changelog.js <version>');
  process.exit(1);
}

function git(cmd) {
  return execSync(`git ${cmd}`, {
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe'],
  }).trim();
}

function getLastTag() {
  try {
    return execSync('git describe --tags --abbrev=0', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
  } catch {
    return null;
  }
}

function getCommits(since) {
  const range = since ? `${since}..HEAD` : 'HEAD';
  const raw = git(`log ${range} --pretty=format:"%H|%s" --no-merges`);
  if (!raw) return [];
  return raw.split('\n').map((line) => {
    const [hash, ...rest] = line.replace(/^"/, '').replace(/"$/, '').split('|');
    return { hash, subject: rest.join('|') };
  });
}

function getChangedFiles(since) {
  const range = since ? `${since}..HEAD` : 'HEAD';
  try {
    const raw = git(`diff --name-status ${range}`);
    if (!raw) return [];
    return raw.split('\n').map((line) => {
      const [status, ...fileParts] = line.split('\t');
      return { status: status.trim(), file: fileParts.join('\t').trim() };
    });
  } catch {
    return [];
  }
}

function detectSkillChanges(changedFiles, manifest) {
  const added = [];
  const changed = [];
  const removed = [];

  const skillFiles = changedFiles.filter((f) => f.file.startsWith('skills/'));
  const affectedSkills = new Set();

  for (const { status, file } of skillFiles) {
    const match = file.match(/^skills\/[^/]+\/([^/]+)/);
    if (!match) continue;
    affectedSkills.add(match[1]);
  }

  for (const name of affectedSkills) {
    const inManifest = manifest?.skills?.[name];
    const skillFileChanges = skillFiles.filter((f) => f.file.includes(`/${name}/`));
    const allAdded = skillFileChanges.every((f) => f.status === 'A');
    const allDeleted = skillFileChanges.every((f) => f.status === 'D');

    if (allAdded && !inManifest) {
      added.push(name);
    } else if (allDeleted) {
      removed.push(name);
    } else {
      changed.push(name);
    }
  }

  return { added, changed, removed };
}

function categorizeCommits(commits) {
  const categories = {
    feat: [],
    fix: [],
    docs: [],
    chore: [],
    refactor: [],
    other: [],
  };

  for (const commit of commits) {
    const match = commit.subject.match(/^(\w+)(?:\(.+?\))?:\s*/);
    const type = match ? match[1] : 'other';
    const key = categories[type] ? type : 'other';
    categories[key].push(commit);
  }

  return categories;
}

const lastTag = getLastTag();
const commits = getCommits(lastTag);
const changedFiles = getChangedFiles(lastTag);
const manifest = loadManifest();
const skillChanges = detectSkillChanges(changedFiles, manifest);
const categories = categorizeCommits(commits);

const lines = [];
lines.push(`## v${version}`);
lines.push('');

if (skillChanges.added.length > 0) {
  lines.push('### New Skills');
  lines.push('');
  for (const name of skillChanges.added.sort()) {
    const entry = manifest?.skills?.[name];
    const path = entry?.path ?? `./skills/*/${name}`;
    lines.push(`- **${name}** — \`${path}\``);
  }
  lines.push('');
}

if (skillChanges.changed.length > 0) {
  lines.push('### Changed Skills');
  lines.push('');
  for (const name of skillChanges.changed.sort()) {
    lines.push(`- **${name}**`);
  }
  lines.push('');
}

if (skillChanges.removed.length > 0) {
  lines.push('### Breaking Changes');
  lines.push('');
  for (const name of skillChanges.removed.sort()) {
    lines.push(`- **Removed:** ${name}`);
  }
  lines.push('');
}

const hasConventional = ['feat', 'fix', 'docs', 'refactor', 'chore'].some(
  (k) => categories[k].length > 0,
);

if (hasConventional || categories.other.length > 0) {
  lines.push('### Commits');
  lines.push('');

  const sectionMap = [
    ['feat', 'Features'],
    ['fix', 'Fixes'],
    ['docs', 'Documentation'],
    ['refactor', 'Refactoring'],
    ['chore', 'Chores'],
    ['other', 'Other'],
  ];

  for (const [key, label] of sectionMap) {
    if (categories[key].length > 0) {
      lines.push(`#### ${label}`);
      lines.push('');
      for (const c of categories[key]) {
        const short = c.hash.slice(0, 7);
        lines.push(`- ${c.subject} (${short})`);
      }
      lines.push('');
    }
  }
}

if (!lastTag) {
  lines.push('### Migration Notes');
  lines.push('');
  lines.push('This is the first release. Install via:');
  lines.push('```');
  lines.push('/install optimizely-cms-skills');
  lines.push('```');
  lines.push('');
}

const output = lines.join('\n');
console.log(output);
