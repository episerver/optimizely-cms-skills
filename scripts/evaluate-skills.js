import { execFile } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadPluginSkills, loadManifest, resolveTargetSkills, loadEvalSuite, ROOT } from './lib/manifest.js';
import { judgeAssertion, judgeExpectedOutput } from './lib/judge.js';
import { createSemaphore } from './lib/concurrency.js';
import { formatEvalConsole } from './lib/reporter.js';

const DEFAULT_GENERATE_MODEL = 'claude-sonnet-4-6';
const DEFAULT_JUDGE_MODEL = 'claude-haiku-4-5';

function runClaude(args, timeout = 120_000) {
  return new Promise((resolve, reject) => {
    execFile('claude', args, { timeout, maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) {
        if (err.killed) reject(new Error('CLI call timed out'));
        else reject(new Error(stderr || err.message));
        return;
      }
      resolve(stdout);
    });
  });
}

function createBackend(config) {
  return {
    async generate(skillPath, prompt) {
      const skillMdPath = join(ROOT, skillPath, 'SKILL.md');
      const skillContent = readFileSync(skillMdPath, 'utf-8');
      const fullPrompt = `Use the following skill as context for answering:\n\n${skillContent}\n\n---\n\n${prompt}`;
      const args = ['-p', fullPrompt, '--output-format', 'text'];
      if (config.generateModel) args.push('--model', config.generateModel);
      return runClaude(args);
    },
    async judge(prompt) {
      const args = ['-p', prompt, '--output-format', 'text'];
      if (config.judgeModel) args.push('--model', config.judgeModel);
      return runClaude(args);
    },
  };
}

const HELP_TEXT = `Usage: node scripts/evaluate-skills.js [options]

Runs skill evaluations locally using the Claude CLI.
For CI evaluations, see the skill-evals.yml GitHub Actions workflow.

Options:
  --skill <name>        Evaluate a specific skill by name
  --deps                Also evaluate the skill's dependencies (requires --skill)
  --threshold <N>       Pass threshold 0-100 (default: 80)
  --generate-model <m>  Model for generating responses (default: ${DEFAULT_GENERATE_MODEL})
  --judge-model <m>     Model for judging assertions (default: ${DEFAULT_JUDGE_MODEL})
  --verbose             Show detailed progress logging
  --help                Show help`;

const CASE_TIMEOUT_MS = 120_000;

function parseArgs(argv) {
  const args = argv.slice(2);
  const opts = {
    skill: null,
    deps: false,
    threshold: null,
    generateModel: null,
    judgeModel: null,
    verbose: false,
    help: false,
  };
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--skill':
        i++;
        if (!args[i]) {
          console.error('Error: --skill requires a skill name');
          process.exit(2);
        }
        opts.skill = args[i];
        break;
      case '--deps':
        opts.deps = true;
        break;
      case '--threshold': {
        i++;
        const val = Number(args[i]);
        if (isNaN(val) || val < 0 || val > 100) {
          console.error('Error: --threshold must be a number between 0 and 100');
          process.exit(2);
        }
        opts.threshold = val;
        break;
      }
      case '--generate-model':
        i++;
        if (!args[i]) {
          console.error('Error: --generate-model requires a model name');
          process.exit(2);
        }
        opts.generateModel = args[i];
        break;
      case '--judge-model':
        i++;
        if (!args[i]) {
          console.error('Error: --judge-model requires a model name');
          process.exit(2);
        }
        opts.judgeModel = args[i];
        break;
      case '--verbose':
        opts.verbose = true;
        break;
      case '--help':
        opts.help = true;
        break;
      default:
        console.error(`Error: unknown flag "${args[i]}"\n\n${HELP_TEXT}`);
        process.exit(2);
    }
  }
  if (opts.deps && !opts.skill) {
    console.error('Error: --deps requires --skill\n\n' + HELP_TEXT);
    process.exit(2);
  }
  return opts;
}

/**
 * @typedef {Object} EvalConfig
 * @property {number} threshold
 * @property {string} generateModel
 * @property {string} judgeModel
 * @property {boolean} verbose
 */

/** @returns {EvalConfig} */
function resolveConfig(opts) {
  return {
    threshold: opts.threshold ?? 80,
    generateModel: opts.generateModel || process.env.EVAL_GENERATE_MODEL || DEFAULT_GENERATE_MODEL,
    judgeModel: opts.judgeModel || process.env.EVAL_JUDGE_MODEL || DEFAULT_JUDGE_MODEL,
    verbose: opts.verbose,
  };
}

function log(config, ...args) {
  if (!config.verbose) return;
  const msg = args.map(String).join(' ');
  if (msg.length > 100) {
    console.error(msg.slice(0, 97) + '...');
  } else {
    console.error(msg);
  }
}

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('TIMEOUT')), ms);
    promise.then(
      (val) => { clearTimeout(timer); resolve(val); },
      (err) => { clearTimeout(timer); reject(err); },
    );
  });
}

async function evaluateCase(evalCase, skillPath, backend, config) {
  log(config, `  Case ${evalCase.id}: generating response...`);
  log(config, `    Prompt: "${evalCase.prompt.slice(0, 80)}${evalCase.prompt.length > 80 ? '...' : ''}"`);
  let response;
  try {
    response = await withTimeout(backend.generate(skillPath, evalCase.prompt), CASE_TIMEOUT_MS);
  } catch (err) {
    if (err.message === 'TIMEOUT') {
      log(config, `  Case ${evalCase.id}: TIMED OUT after ${CASE_TIMEOUT_MS / 1000}s`);
      return { id: evalCase.id, prompt: evalCase.prompt, timedOut: true, error: null, assertionResults: [], score: 0 };
    }
    log(config, `  Case ${evalCase.id}: ERROR — ${err.message}`);
    return { id: evalCase.id, prompt: evalCase.prompt, timedOut: false, error: err.message, assertionResults: [], score: 0 };
  }

  log(config, `  Case ${evalCase.id}: got response (${response.length} chars), judging...`);

  const assertionResults = [];

  if (evalCase.assertions && evalCase.assertions.length > 0) {
    for (let i = 0; i < evalCase.assertions.length; i++) {
      const assertion = evalCase.assertions[i];
      log(config, `    Assertion ${i + 1}/${evalCase.assertions.length}: "${assertion.check.slice(0, 60)}..."`);
      const result = await judgeAssertion(response, assertion, backend);
      log(config, `    -> ${result.passed ? 'PASS' : 'FAIL'}: ${result.reason}`);
      assertionResults.push(result);
    }
  } else if (evalCase.expected_output) {
    log(config, `    Judging against expected_output: "${evalCase.expected_output.slice(0, 60)}..."`);
    const result = await judgeExpectedOutput(response, evalCase.expected_output, backend);
    log(config, `    -> ${result.passed ? 'PASS' : 'FAIL'}: ${result.reason}`);
    assertionResults.push(result);
  }

  const total = assertionResults.length;
  const passed = assertionResults.filter((a) => a.passed).length;
  const score = total > 0 ? (passed / total) * 100 : 100;

  log(config, `  Case ${evalCase.id}: score ${score.toFixed(0)}% (${passed}/${total})`);
  return { id: evalCase.id, prompt: evalCase.prompt, timedOut: false, error: null, assertionResults, score };
}

async function evaluateSkill(skill, backend, config) {
  log(config, `\n${'─'.repeat(60)}`);
  log(config, `▶ ${skill.name}`);
  log(config, `${'─'.repeat(60)}`);
  log(config, `  Path: ${skill.path}`);
  const suite = loadEvalSuite(skill.path);
  if (!suite || !suite.evals || suite.evals.length === 0) {
    log(config, `  No eval cases found, skipping`);
    return { skill: skill.name, cases: [], score: 100, passed: true };
  }

  log(config, `  ${suite.evals.length} eval case(s) to run`);
  const cases = [];
  for (const evalCase of suite.evals) {
    const result = await evaluateCase(evalCase, skill.path, backend, config);
    cases.push(result);
  }

  const totalScore = cases.length > 0
    ? cases.reduce((sum, c) => sum + c.score, 0) / cases.length
    : 100;

  log(config, `  Result: ${totalScore.toFixed(1)}% (threshold: ${config.threshold}%) — ${totalScore >= config.threshold ? 'PASSED' : 'FAILED'}`);
  return {
    skill: skill.name,
    cases,
    score: Math.round(totalScore * 100) / 100,
    passed: totalScore >= config.threshold,
  };
}

const opts = parseArgs(process.argv);

if (opts.help) {
  console.log(HELP_TEXT);
  process.exit(0);
}

const config = resolveConfig(opts);
log(config, `Config: threshold=${config.threshold}%, generate=${config.generateModel}, judge=${config.judgeModel}`);

const manifest = loadManifest();
if (!manifest) {
  console.error('Error: skill-deps.json not found. Run "npm run update-hashes" first.');
  process.exit(2);
}

const pluginSkills = loadPluginSkills();
const targets = resolveTargetSkills(opts, manifest, pluginSkills);
log(config, `Resolved ${targets.length} skill(s) to evaluate: ${targets.map((t) => t.name).join(', ')}`);
const backend = createBackend(config);
const semaphore = createSemaphore(5);

const promises = targets.map(async (skill) => {
  const release = await semaphore.acquire();
  try {
    return await evaluateSkill(skill, backend, config);
  } catch (err) {
    return { skill: skill.name, cases: [], score: 0, passed: false, error: err.message };
  } finally {
    release();
  }
});

const settled = await Promise.allSettled(promises);
const results = settled.map((s) => {
  if (s.status === 'fulfilled') return s.value;
  return { skill: 'unknown', cases: [], score: 0, passed: false, error: s.reason?.message || 'Unknown error' };
});

console.log(formatEvalConsole(results, config));

const allPassed = results.every((r) => r.passed);
process.exit(allPassed ? 0 : 1);
