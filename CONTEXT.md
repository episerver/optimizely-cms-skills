# Optimizely CMS Skills

A collection of Agent Skills that teach AI coding agents how to build websites with Optimizely CMS. Skills are the unit of knowledge — each one covers a specific capability (setting up the SDK, modeling content types, fetching content, etc.) and is consumed by 40+ compatible agents including Claude Code, Cursor, and GitHub Copilot.

This is not a library or framework. It ships no runtime code. The output is documentation (SKILL.md files) that agents read to generate correct code for the user's project.

## Repo Structure

```
skills/
  setup/          — SDK installation, project scaffolding, CLI, observability
  modeling/       — Content type definitions, display templates
  rendering/      — React components, rich text, DAM assets, experiences
  data/           — Content fetching, navigation, GraphQL, multi-site/locale
  editing/        — Live preview, Content Graph debugging
  migration/      — CMS 11→12, 12→13, Find→Graph
```

Each skill is a directory containing:
- `SKILL.md` — the skill content, with YAML frontmatter (`name`, `description`)
- `evals/evals.json` — evaluation test cases (prompt + expected output)
- `references/` (optional) — supplementary guides and checklists

## Integrity and Releases

Skills are tracked in `skill-deps.json`, which records the inter-skill dependency graph. Change detection uses `git diff` to identify modified files under each skill directory and the dependency graph for transitive impact analysis.

Releases are gated — tagged with semver versions and distributed via the `latest` git tag. See `RELEASING.md` for the full process.
