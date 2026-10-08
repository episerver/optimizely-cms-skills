# Contributing

Thanks for your interest in contributing. This project is a collection of [Agent Skills](https://agentskills.io) that teach AI coding agents how to work with Optimizely CMS. It ships no runtime code — every skill is a `SKILL.md` an agent reads to generate code into the user's project.

## Before You Start

- **For significant changes** (new skill, major restructure of an existing skill), open an issue first so we can discuss scope before you invest time in the writing.
- **For small changes** (fix a typo, correct a code snippet, clarify a step, update a link), open a PR directly.
- All contributions are licensed under the repository's [Apache-2.0 license](LICENSE).

## Dev Setup

```bash
git clone https://github.com/episerver/optimizely-cms-skills.git
cd optimizely-cms-skills
```

Requirements:

- Node.js ≥ 18
- No build step and no `node_modules` to install — all scripts are plain Node.

## Skill Structure

Each skill lives under one of six category directories:

```
skills/<category>/<skill-name>/
├── SKILL.md              # YAML frontmatter (name, description) + Markdown guidance
├── evals/evals.json      # Test cases
└── references/           # (optional) Supplementary docs
```

Categories: `setup/`, `modeling/`, `rendering/`, `data/`, `editing/`, `migration/`.

### SKILL.md frontmatter

```yaml
---
name: optimizely-example
description: One-line description — this is what the orchestrator reads to decide when to invoke the skill
---
```

Keep the `description` tight and specific — it is the only signal most agents use to route work to the skill.

## Editing an Existing Skill

1. Edit the `SKILL.md`.
2. If you added or removed cross-references to other skills, update the dependency graph:
   ```bash
   npm run update-deps -- --scan-deps
   ```
3. Validate structure:
   ```bash
   npm run validate
   ```
4. (Optional, requires Claude CLI locally) Run the LLM eval for the skill(s) you touched:
   ```bash
   npm run evaluate -- --skill <skill-name>
   ```

## Adding a New Skill

1. Create `skills/<category>/<name>/SKILL.md` with `name` and `description` in frontmatter.
2. Create `skills/<category>/<name>/evals/evals.json` with at least a handful of test cases.
3. Register the path in `.claude-plugin/plugin.json`'s `skills` array.
4. Run `npm run update-deps -- --scan-deps` to update the dependency graph.
5. Run `npm run validate` and confirm all checks pass.

## Eval Format

Each eval case tests whether the skill produces correct guidance when an agent reads it:

```json
{
  "id": 1,
  "prompt": "User's question or scenario",
  "expected_output": "What the skill should produce (natural-language description)",
  "files": [],
  "assertions": [
    {"name": "Check name", "check": "Natural-language assertion to verify"}
  ]
}
```

`assertions` is optional. `files` is reserved for future fixture support.

## Pull Requests

- Use the PR template that appears when you open a PR.
- Use [conventional-commit](https://www.conventionalcommits.org/) prefixes on commit messages: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`.
- CI runs `scripts/validate-skills.js` on every PR and the skill-evaluations workflow on affected skills — both should pass before review.
- Keep PRs focused. One skill or one topic per PR makes review manageable.

## Writing Guidance Agents Will Actually Read

A few conventions that keep the skills useful:

- **Specify versions.** When pinning a behaviour to a specific `@optimizely/*` or Remko version, say so explicitly — SDK semantics drift.
- **Prefer concrete recipes over abstract principles.** Agents are better at copying a correct snippet than at reasoning from a rule.
- **Call out gaps honestly.** If the SDK does not yet cover a pattern, say so. Fake symmetry misleads agents into inventing APIs.
- **No customer-identifying content.** Case studies should be anonymised (file-path shapes and line counts are fine; customer names, specific internal repos, and absolute local paths are not).
- **No ticket references in the content itself.** Internal Jira / Linear keys belong in commits and PR descriptions, not in `SKILL.md` files that outside readers will consume.

## Code of Conduct

Be respectful. Assume good intent. Review others' work the way you would want yours reviewed.

## Reporting Security Issues

See [SECURITY.md](SECURITY.md). Do not open public issues for security concerns.
