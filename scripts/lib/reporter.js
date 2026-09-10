export function formatValidationConsole(results) {
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

  return lines.join('\n');
}

export function formatValidationJson(results) {
  const passed = results.every((r) => r.passed);
  return JSON.stringify(
    {
      command: 'validate',
      timestamp: new Date().toISOString(),
      skills: results.map((r) => ({
        skill: r.skill,
        checks: r.checks,
        passed: r.passed,
      })),
      summary: {
        total: results.length,
        passed: results.filter((r) => r.passed).length,
        failed: results.filter((r) => !r.passed).length,
      },
      passed,
    },
    null,
    2,
  );
}

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
  let totalAssertions = 0;
  let passedAssertions = 0;
  for (const r of results) {
    for (const c of r.cases) {
      for (const a of c.assertionResults || []) {
        totalAssertions++;
        if (a.passed) passedAssertions++;
      }
    }
  }

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

export function formatEvalJson(results, config) {
  let totalAssertions = 0;
  let passedAssertions = 0;
  for (const r of results) {
    for (const c of r.cases) {
      for (const a of c.assertionResults || []) {
        totalAssertions++;
        if (a.passed) passedAssertions++;
      }
    }
  }

  return JSON.stringify(
    {
      command: 'evaluate',
      timestamp: new Date().toISOString(),
      config: {
        generateModel: config.generateModel,
        judgeModel: config.judgeModel,
        threshold: config.threshold,
        backend: config.ci ? 'api' : 'cli',
      },
      skills: results.map((r) => ({
        skill: r.skill,
        cases: r.cases,
        score: Math.round(r.score),
        passed: r.passed,
      })),
      summary: {
        total: results.length,
        passed: results.filter((r) => r.passed).length,
        failed: results.filter((r) => !r.passed).length,
        totalAssertions,
        passedAssertions,
      },
      passed: results.every((r) => r.passed),
    },
    null,
    2,
  );
}
