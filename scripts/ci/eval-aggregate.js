import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { countAssertions } from '../lib/manifest.js';

const resultsDir = process.argv[2];
if (!resultsDir) {
  console.error('Usage: eval-aggregate.js <results-dir>');
  process.exit(2);
}

const dirs = readdirSync(resultsDir).filter((d) =>
  statSync(join(resultsDir, d)).isDirectory(),
);

const skills = dirs
  .map((d) => {
    const file = join(resultsDir, d, 'result.json');
    if (!existsSync(file)) return null;
    return JSON.parse(readFileSync(file, 'utf-8'));
  })
  .filter(Boolean);

const passed = skills.filter((s) => s.passed).length;
const totalAssertions = skills.reduce((sum, s) => sum + countAssertions(s.cases), 0);
const passedAssertions = skills.reduce((sum, s) => sum + countAssertions(s.cases, (a) => a.passed), 0);

const result = {
  command: 'evaluate',
  timestamp: new Date().toISOString(),
  config: { backend: 'copilot-cli', threshold: 80 },
  skills,
  summary: {
    total: skills.length,
    passed,
    failed: skills.length - passed,
    totalAssertions,
    passedAssertions,
  },
  passed: passed === skills.length,
};

console.log(JSON.stringify(result, null, 2));
