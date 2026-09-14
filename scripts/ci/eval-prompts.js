// Writes prompt files for both phases: --phase generate (skill+prompt) and --phase judge (verdict prompts).
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { ASSERTION_PROMPT, EXPECTED_OUTPUT_PROMPT, buildSkillPrompt } from '../lib/judge.js';
import { ROOT, loadEvalSuite } from '../lib/manifest.js';
import { parseArgs } from '../lib/cli-args.js';

const WORK_DIR = join(ROOT, 'eval-work');

function writePromptFile(caseId, filename, content) {
  const caseDir = join(WORK_DIR, String(caseId));
  mkdirSync(caseDir, { recursive: true });
  writeFileSync(join(caseDir, filename), content, 'utf-8');
}

function generatePhase(suite, skillPath) {
  for (const evalCase of suite.evals) {
    const fullPrompt = buildSkillPrompt(skillPath, evalCase.prompt);
    writePromptFile(evalCase.id, 'generate-prompt.txt', fullPrompt);
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

const USAGE = 'Usage: eval-prompts.js --skill-path <path> --phase generate|judge';

const opts = parseArgs(process.argv, {
  flags: {
    'skill-path': { type: 'string' },
    phase: { type: 'string' },
  },
  defaults: { skillPath: null, phase: null },
  strict: false,
  usage: USAGE,
  validate: [
    (o) => !o.skillPath ? '--skill-path is required' : null,
    (o) => !o.phase ? '--phase is required' : null,
    (o) => o.phase && o.phase !== 'generate' && o.phase !== 'judge' ? '--phase must be "generate" or "judge"' : null,
  ],
});
const suite = loadEvalSuite(opts.skillPath);
if (!suite || !suite.evals || suite.evals.length === 0) {
  console.log('No eval cases found');
  process.exit(0);
}

if (opts.phase === 'generate') {
  generatePhase(suite, opts.skillPath);
} else {
  judgePhase(suite);
}
