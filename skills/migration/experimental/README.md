# Experimental Skills

> ⚠️ **The skills in this folder are experimental and provided as-is.** They are **not registered in the plugin** (`.claude-plugin/plugin.json`) and will **not** be loaded automatically when the plugin is installed via `/plugin install optimizely-cms-skills@optimizely-cms`.
>
> **Use at your own discretion.** They may be incomplete, out of date, or inaccurate against the current state of Optimizely CMS, the SDK, or the CLI. They have not been through the plugin's normal validation and evaluation gates. Treat the guidance as a starting point to be verified against the official documentation and tested against your own CMS instance before acting on it.

## What's in here

| Skill | Topic |
|-------|-------|
| [`optimizely-cms11-to-12`](./optimizely-cms11-to-12/) | Migrating from Optimizely CMS 11 (ASP.NET Framework) to CMS 12 (ASP.NET Core) |
| [`optimizely-cms12-to-13-assessment`](./optimizely-cms12-to-13-assessment/) | Pre-migration assessment for CMS 12 → 13 (effort, scope, risk) |
| [`optimizely-cms12-to-13`](./optimizely-cms12-to-13/) | Migrating from CMS 12 to CMS 13 (.NET 10, breaking API changes) |
| [`optimizely-find-to-graph`](./optimizely-find-to-graph/) | Migrating from Optimizely Find to Content Graph |

## Why these are experimental

These skills target older or more volatile migration paths — ASP.NET-era CMS versions, .NET runtime jumps, product-area replacements. The APIs, package versions, and breaking-change lists they describe shift frequently, and the skills here have not been maintained on the same cadence as the SDK itself. Rather than remove them (they still contain useful signal — breaking-change inventories, package maps, assessment heuristics), we're keeping them in the repo under this clearly-marked folder.

If you want to invest in making one of these production-grade, open an issue or PR — the structure is standard (`SKILL.md` + `evals/evals.json` + `references/`) so promoting one back to a registered skill is a matter of (a) verifying content against the current SDK/CMS, (b) adding it back to `.claude-plugin/plugin.json`, and (c) running `npm run update-deps -- --scan-deps` + `npm run validate`.

## How to use one manually

The skill files are plain Markdown with YAML frontmatter — any agent that can read a file can consume them.

**Direct file read (any agent):**

```
Read: skills/migration/experimental/<skill-name>/SKILL.md
```

**Clone and copy into your local agent's skill directory:**

```bash
git clone https://github.com/episerver/optimizely-cms-skills.git
cp -r optimizely-cms-skills/skills/migration/experimental/<skill-name> ~/.claude/skills/
```

Either way, verify the guidance against current docs before acting on it.
