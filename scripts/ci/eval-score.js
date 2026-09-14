import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parseJudgment } from '../lib/judge.js';
import { ROOT, loadEvalSuite } from '../lib/manifest.js';
import { parseArgs } from '../lib/cli-args.js';

const WORK_DIR = join(ROOT, 'eval-work');

function scoreCase(evalCase) {
  const caseDir = join(WORK_DIR, String(evalCase.id));
  if (!existsSync(caseDir)) {
    return { id: evalCase.id, prompt: evalCase.prompt, timedOut: false, error: 'No eval-work directory', assertionResults: [], score: 0 };
  }

  const responseFile = join(caseDir, 'response.txt');
  if (!existsSync(responseFile)) {
    return { id: evalCase.id, prompt: evalCase.prompt, timedOut: false, error: 'No response generated', assertionResults: [], score: 0 };
  }

  const files = readdirSync(caseDir);
  const verdictFiles = files
    .filter((f) => f.match(/^judge-\d+-verdict\.txt$/))
    .sort((a, b) => {
      const ai = parseInt(a.match(/^judge-(\d+)-verdict\.txt$/)[1]);
      const bi = parseInt(b.match(/^judge-(\d+)-verdict\.txt$/)[1]);
      return ai - bi;
    });

  if (verdictFiles.length === 0) {
    return { id: evalCase.id, prompt: evalCase.prompt, timedOut: false, error: 'No verdicts found', assertionResults: [], score: 0 };
  }

  const assertionResults = verdictFiles.map((vf, idx) => {
    const verdictText = readFileSync(join(caseDir, vf), 'utf-8');
    const judgment = parseJudgment(verdictText);

    let name = '';
    let check = '';
    if (evalCase.assertions && evalCase.assertions[idx]) {
      name = evalCase.assertions[idx].name;
      check = evalCase.assertions[idx].check;
    } else if (evalCase.expected_output) {
      check = evalCase.expected_output;
    }

    return { name, check, ...judgment };
  });

  const total = assertionResults.length;
  const passed = assertionResults.filter((a) => a.passed).length;
  const score = total > 0 ? (passed / total) * 100 : 100;

  return { id: evalCase.id, prompt: evalCase.prompt, timedOut: false, error: null, assertionResults, score };
}

const opts = parseArgs(process.argv, {
  flags: {
    'skill-path': { type: 'string' },
    threshold: { type: 'number' },
  },
  defaults: { skillPath: null, threshold: 80 },
  strict: false,
  usage: 'Usage: eval-score.js --skill-path <path> [--threshold N]',
  validate: [
    (o) => !o.skillPath ? '--skill-path is required' : null,
  ],
});
const suite = loadEvalSuite(opts.skillPath);

if (!suite || !suite.evals || suite.evals.length === 0) {
  const result = { skill: suite?.skill_name || opts.skillPath.split('/').pop(), cases: [], score: 100, passed: true };
  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
}

const cases = suite.evals.map(scoreCase);
const totalScore = cases.length > 0
  ? cases.reduce((sum, c) => sum + c.score, 0) / cases.length
  : 100;

const result = {
  skill: suite.skill_name,
  cases,
  score: Math.round(totalScore * 100) / 100,
  passed: totalScore >= opts.threshold,
};

console.log(JSON.stringify(result, null, 2));
process.exit(result.passed ? 0 : 1);
