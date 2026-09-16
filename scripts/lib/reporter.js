export function formatValidationConsole(results, unregistered = []) {
  const lines = ['=== Skill Validation ===\n'];

  for (const r of results) {
    lines.push(`  ${r.skill}`);
    for (const c of r.checks) {
      const mark = c.passed ? '✓' : '✗';
      const detail = c.passed ? '' : ` — ${c.message}`;
      lines.push(`    ${mark} ${c.name}${detail}`);
    }
    lines.push('');
  }

  if (unregistered.length > 0) {
    lines.push('=== Unregistered Skills ===\n');
    for (const path of unregistered) {
      lines.push(`  ✗ ${path} — not in plugin.json`);
    }
    lines.push('');
  }

  const passed = results.filter((r) => r.passed).length;
  const failed = results.length - passed;

  lines.push('=== Results ===\n');
  lines.push(`  Passed: ${passed}/${results.length} skills`);
  if (failed > 0) {
    const failedNames = results
      .filter((r) => !r.passed)
      .map((r) => r.skill)
      .join(', ');
    lines.push(`  Failed: ${failed} skill(s) (${failedNames})`);
  }
  if (unregistered.length > 0) {
    lines.push(`  Unregistered: ${unregistered.length} skill(s) found on disk but not in plugin.json`);
  }

  return lines.join('\n');
}

export function formatValidationJson(results, unregistered = []) {
  const passed = results.every((r) => r.passed) && unregistered.length === 0;
  return JSON.stringify(
    {
      command: 'validate',
      timestamp: new Date().toISOString(),
      skills: results.map((r) => ({
        skill: r.skill,
        checks: r.checks,
        passed: r.passed,
      })),
      unregistered,
      summary: {
        total: results.length,
        passed: results.filter((r) => r.passed).length,
        failed: results.filter((r) => !r.passed).length,
        unregistered: unregistered.length,
      },
      passed,
    },
    null,
    2,
  );
}

import { countAssertions } from './manifest.js';

export function formatEvalConsole(results, config) {
  const lines = ['=== Skill Evaluation ===\n'];

  for (const r of results) {
    const caseCount = r.cases.length;
    lines.push(`  ${r.skill} (${caseCount} case${caseCount === 1 ? '' : 's'})`);

    for (const c of r.cases) {
      if (c.error) {
        lines.push(`    Case ${c.id}: ERROR — ${c.error}`);
        continue;
      }
      if (c.timedOut) {
        lines.push(`    Case ${c.id}: TIMED OUT ✗`);
        continue;
      }

      const total = c.assertionResults.length;
      const passed = c.assertionResults.filter((a) => a.passed).length;

      if (total === 0) {
        lines.push(`    Case ${c.id}: no assertions ✓`);
        continue;
      }

      const mark = passed === total ? '✓' : '✗';
      const label =
        total === 1 && !c.assertionResults[0].name
          ? `expected output match: ${mark}`
          : `${passed}/${total} assertions passed ${mark}`;
      lines.push(`    Case ${c.id}: ${label}`);

      for (const a of c.assertionResults.filter((a) => !a.passed)) {
        const name = a.name || 'expected output';
        lines.push(`      ✗ "${name}" — ${a.reason}`);
      }
    }

    const scoreMark = r.passed ? '✓' : '✗';
    lines.push(
      `    Score: ${Math.round(r.score)}% ${scoreMark} (threshold: ${config.threshold}%)`,
    );
    lines.push('');
  }

  const passed = results.filter((r) => r.passed).length;
  const failed = results.length - passed;
  const allCases = results.flatMap((r) => r.cases);
  const totalAssertions = countAssertions(allCases);
  const passedAssertions = countAssertions(allCases, (a) => a.passed);

  lines.push('=== Results ===\n');
  lines.push(`  Passed: ${passed}/${results.length} skills`);
  if (failed > 0) {
    const failedNames = results
      .filter((r) => !r.passed)
      .map((r) => `${r.skill} — ${Math.round(r.score)}%`)
      .join(', ');
    lines.push(`  Failed: ${failed} skill(s) (${failedNames})`);
  }
  lines.push(
    `  Total assertions: ${passedAssertions} passed / ${totalAssertions} total (${totalAssertions > 0 ? Math.round((passedAssertions / totalAssertions) * 100) : 0}%)`,
  );

  return lines.join('\n');
}

