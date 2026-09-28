# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Project Is

A Claude Code plugin containing 20 Agent Skills that teach AI coding agents how to build websites with Optimizely CMS. **This project ships no runtime code** — the output is documentation (`SKILL.md` files) that agents read to generate correct code. Skills are consumed by Claude Code, Cursor, GitHub Copilot, and 40+ other agents.

## Commands

```bash
# Regenerate skill-deps.json dependency graph
npm run update-deps
npm run update-deps -- --scan-deps  # also rescan inter-skill dependencies

# Report which skills need eval runs (dry-run, no LLM calls)
npm run affected-evals
npm run affected-evals -- --skills <name1>,<name2>  # specific skills only

# Structural validation (frontmatter, evals schema, deps)
npm run validate                        # all skills, console output
npm run validate -- --skill <name>      # one skill
npm run validate -- --skill <name> --deps  # one skill + its dependencies
npm run validate -- --ci                # JSON output for CI

# LLM evaluation — local (runs skill prompts through Claude CLI, judges output)
npm run evaluate                        # all skills
npm run evaluate -- --skill <name>      # one skill
npm run evaluate -- --skill <name> --deps  # one skill + its dependencies
npm run evaluate -- --threshold 90      # custom pass threshold (default: 80)
npm run evaluate -- --generate-model <m> --judge-model <m>  # override models

# LLM evaluation — CI (GitHub Actions workflow using Copilot CLI)
# Trigger via: Actions → Skill Evaluations → Run workflow
# Uses matrix strategy (max-parallel: 5) with GITHUB_TOKEN auth
# CI scripts: scripts/ci/eval-manifest.js, eval-prompts.js, eval-score.js, eval-aggregate.js
```

No build step, no linter. Node.js >= 18.

## Architecture

### Skill Structure

Each skill is a directory under `skills/<category>/`:
```
skills/<category>/<skill-name>/
├── SKILL.md              # YAML frontmatter (name, description) + markdown guidance
├── evals/evals.json      # Test cases: {skill_name, evals: [{id, prompt, expected_output, files, assertions?}]}
└── references/           # (optional) Supplementary docs
```

Six categories: `setup/`, `modeling/`, `rendering/`, `data/`, `editing/`, `migration/`.

### Dependency Graph

`skill-deps.json` is the manifest — it tracks:
- **Inter-skill dependency graph** (which skills reference which)

The CI workflow (`skill-compat.yml`) uses `git diff` to detect changed skill files, computes transitive impact using the dependency graph, and re-evaluates affected skills. It also supports `workflow_dispatch` for manual runs — requires a `pr_number` input and optionally toggles `post_comment` (defaults to true). CI validates that `skill-deps.json` is up to date and that all skills on disk are registered in `plugin.json`. If either is stale, run the **Update Skill Dependencies** workflow for the PR to fix automatically.

The **Version Bump** workflow (`version-bump.yml`) creates a PR that updates the version in `package.json` and `plugin.json`. After merging, the **Release** workflow (`release.yml`) verifies both files contain the target version, then tags the commit and creates a draft GitHub Release.

### Core Library: `scripts/lib/manifest.js`

All scripts share this module. Key exports:
- `loadPluginSkills()` — reads skill paths from `.claude-plugin/plugin.json`
- `extractSkillName(skillPath)` — parses the `name:` field from YAML frontmatter
- `scanSkillDependencies(skillPath, allNames)` — regex-based detection of skill references in markdown
- `computeAffectedSkills(skills, changed)` — BFS on the reverse dependency graph
- `findSkillNameByPath(manifest, skillPath)` — maps a skill path to its name
- `loadEvalSuite(skillPath)` — loads `evals/evals.json` for a skill (returns null if missing)
- `countAssertions(cases, filter?)` — counts assertion results across eval cases with optional filter
- `ROOT` / `MANIFEST_PATH` — resolved paths to repo root and `skill-deps.json`

### Plugin Manifests

- `.claude-plugin/plugin.json` — registers all 20 skill paths, version, metadata
- `.claude-plugin/marketplace.json` — marketplace distribution config (pulls from `latest` tag)

### Dependency Graph

Skills reference each other in their markdown content. `scanSkillDependencies` detects references via backtick mentions, bold mentions, and bare-word patterns. The graph is stored in `skill-deps.json` and used for transitive impact analysis — changing `optimizely-setup` (depended on by many) triggers re-evaluation of all downstream skills.

## Editing Skills

When modifying a `SKILL.md`:
1. Edit the skill content
2. If you added/removed skill cross-references, run `npm run update-deps -- --scan-deps`
3. CI will automatically detect changes via `git diff` and re-evaluate affected skills

When adding a new skill:
1. Create `skills/<category>/<name>/SKILL.md` with `name` and `description` in frontmatter
2. Create `skills/<category>/<name>/evals/evals.json`
3. Add the path to `.claude-plugin/plugin.json` `skills` array
4. Run `npm run update-deps -- --scan-deps`

## Eval Format

Each eval case tests whether the skill produces correct guidance:
```json
{
  "id": 1,
  "prompt": "User's question or scenario",
  "expected_output": "What the skill should produce (natural language description)",
  "files": [],
  "assertions": [
    {"name": "Check name", "check": "Natural language assertion to verify"}
  ]
}
```
`assertions` is optional. `files` is reserved for future fixture support.

## Releases

Releases are manual — not every merge is a release. Trigger via GitHub Actions → Release workflow. See `RELEASING.md` for the full process. Commit messages use conventional commits (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`).
