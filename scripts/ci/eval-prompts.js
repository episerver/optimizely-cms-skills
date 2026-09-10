import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { ASSERTION_PROMPT, EXPECTED_OUTPUT_PROMPT } from '../lib/judge.js';
import { ROOT } from '../lib/manifest.js';

const WORK_DIR = join(ROOT, 'eval-work');

function parseArgs(argv) {
  const args = argv.slice(2);
  const opts = { skillPath: null, phase: null };
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--skill-path':
        i++;
        opts.skillPath = args[i];
        break;
      case '--phase':
        i++;
        opts.phase = args[i];
        break;
    }
  }
  if (!opts.skillPath || !opts.phase) {
    console.error('Usage: eval-prompts.js --skill-path <path> --phase generate|judge');
    process.exit(2);
  }
  if (opts.phase !== 'generate' && opts.phase !== 'judge') {
    console.error('Error: --phase must be "generate" or "judge"');
    process.exit(2);
  }
  return opts;
}

function loadEvalSuite(skillPath) {
  const evalsPath = join(ROOT, skillPath, 'evals', 'evals.json');
  if (!existsSync(evalsPath)) return null;
  return JSON.parse(readFileSync(evalsPath, 'utf-8'));
}

function writePromptFile(caseId, filename, content) {
  const caseDir = join(WORK_DIR, String(caseId));
  mkdirSync(caseDir, { recursive: true });
  writeFileSync(join(caseDir, filename), content, 'utf-8');
}

function generatePhase(suite) {
  for (const evalCase of suite.evals) {
    writePromptFile(evalCase.id, 'generate-prompt.txt', evalCase.prompt);
  }
  console.log(`Wrote ${suite.evals.length} generate prompt(s) to ${WORK_DIR}`);
}

function judgePhase(suite) {
  let count = 0;
  for (const evalCase of suite.evals) {
    const responseFile = join(WORK_DIR, String(evalCase.id), 'response.txt');
    if (!existsSync(responseFile)) {
      console.warn(`Warning: no response for case ${evalCase.id}, skipping judge`);
      continue;
    }
    const response = readFileSync(responseFile, 'utf-8');

    if (evalCase.assertions && evalCase.assertions.length > 0) {
      for (let i = 0; i < evalCase.assertions.length; i++) {
        const assertion = evalCase.assertions[i];
        const prompt = ASSERTION_PROMPT
          .replace('{response}', response)
          .replace('{check}', assertion.check);
        writePromptFile(evalCase.id, `judge-${i}.txt`, prompt);
        count++;
      }
    } else if (evalCase.expected_output) {
      const prompt = EXPECTED_OUTPUT_PROMPT
        .replace('{response}', response)
        .replace('{expectedOutput}', evalCase.expected_output);
      writePromptFile(evalCase.id, 'judge-0.txt', prompt);
      count++;
    }
  }
  console.log(`Wrote ${count} judge prompt(s) to ${WORK_DIR}`);
}

const opts = parseArgs(process.argv);
const suite = loadEvalSuite(opts.skillPath);
if (!suite || !suite.evals || suite.evals.length === 0) {
  console.log('No eval cases found');
  process.exit(0);
}

if (opts.phase === 'generate') {
  generatePhase(suite);
} else {
  judgePhase(suite);
}
