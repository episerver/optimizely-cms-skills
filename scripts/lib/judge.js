export const ASSERTION_PROMPT = `You are evaluating whether an AI-generated response satisfies a specific assertion.

## Response to evaluate
{response}

## Assertion
{check}

Does the response satisfy the assertion? Answer with exactly one of:
PASS: <one-line reason>
FAIL: <one-line reason>`;

export const EXPECTED_OUTPUT_PROMPT = `You are evaluating whether an AI-generated response matches the expected output description.

## Response to evaluate
{response}

## Expected output description
{expectedOutput}

Does the response adequately match the expected output description? Answer with exactly one of:
PASS: <one-line reason>
FAIL: <one-line reason>`;

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './manifest.js';

export function buildSkillPrompt(skillPath, userPrompt) {
  const skillMdPath = join(ROOT, skillPath, 'SKILL.md');
  const skillContent = readFileSync(skillMdPath, 'utf-8');
  return `Use the following skill as context for answering:\n\n${skillContent}\n\n---\n\n${userPrompt}`;
}

export function parseJudgment(text) {
  const trimmed = text.trim();
  const passMatch = trimmed.match(/^PASS:\s*(.+)/i);
  if (passMatch) {
    return { passed: true, reason: passMatch[1].trim() };
  }
  const failMatch = trimmed.match(/^FAIL:\s*(.+)/i);
  if (failMatch) {
    return { passed: false, reason: failMatch[1].trim() };
  }
  const preview = trimmed.length > 200 ? trimmed.slice(0, 200) + '...' : trimmed;
  return { passed: false, reason: `Judge returned unparseable response: ${preview}` };
}

export async function judgeAssertion(response, assertion, backend) {
  const prompt = ASSERTION_PROMPT.replace('{response}', response).replace(
    '{check}',
    assertion.check,
  );
  const judgeResponse = await backend.judge(prompt);
  const result = parseJudgment(judgeResponse);
  return {
    name: assertion.name,
    check: assertion.check,
    ...result,
  };
}

export async function judgeExpectedOutput(response, expectedOutput, backend) {
  const prompt = EXPECTED_OUTPUT_PROMPT.replace('{response}', response).replace(
    '{expectedOutput}',
    expectedOutput,
  );
  const judgeResponse = await backend.judge(prompt);
  const result = parseJudgment(judgeResponse);
  return {
    name: '',
    check: expectedOutput,
    ...result,
  };
}
