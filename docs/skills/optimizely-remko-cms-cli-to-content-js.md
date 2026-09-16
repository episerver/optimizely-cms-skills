# Remko CMS CLI to Content JS SDK CLI Migration

Migrate the community **Remko CLI** (`@remkoj/optimizely-cms-cli`, bin `opti-cms`) to the official **Content JS SDK CLI** (`@optimizely/cms-cli`, bin `optimizely-cms-cli`). This skill owns the **CLI migration surface** — command-syntax rewrites (yargs colon-separated → oclif space-separated), auth/env changes, and `package.json` / CI script updates. Content-type sync maps directly; Visual Builder styles and Next.js scaffolding are honest gaps replaced by code-first patterns.

## When to Use

Use this skill when you want to:
- Replace `@remkoj/optimizely-cms-cli` / `opti-cms` with the official `@optimizely/cms-cli`
- Convert `types:push` / `types:pull` to `config push` / `config pull`
- Migrate `cms:reset` to `danger delete-all-content-types`
- Remove `styles:*` / `style:create` (Visual Builder) commands — no equivalent
- Remove `nextjs:*` scaffolding/codegen commands — no equivalent
- Fix CI scripts or shell aliases after switching CLIs
- Get a pre-migration assessment of `opti-cms` usage before starting

## Trigger Phrases

Say any of these to activate the skill:
- "Migrate optimizely-cms-cli"
- "Replace opti-cms / the Remko CLI"
- "Convert types:push / types:pull to the official config commands"
- "Migrate cms:reset / cms:version"
- "Remove styles:* / nextjs:* scaffold commands"
- "Fix CI scripts after switching CLIs"
- "Migrate package.json scripts that call opti-cms"

## Usage Example

```
You: "Migrate our @remkoj/optimizely-cms-cli scripts to the official CLI"

Agent: [Uses optimizely-remko-cms-cli-to-content-js skill]
- Scans package.json / CI / .env for opti-cms usage and categorizes effort
- Swaps @remkoj/optimizely-cms-cli for @optimizely/cms-cli (bin
  opti-cms → optimizely-cms-cli)
- Rewrites types:push → config push, types:pull → config pull --group,
  cms:reset → danger delete-all-content-types (colon → space syntax)
- Deletes styles:* and nextjs:* scripts (no equivalent) and points them at
  code-first display templates / manual authoring
- Keeps the CMS auth env vars unchanged; notes the new optional vars
```

```
You: "What's the official CLI equivalent of opti-cms styles:push?"

Agent: [Uses optimizely-remko-cms-cli-to-content-js skill]
- Explains there is NO styles topic in the official CLI (styles:list/push/pull/
  delete and style:create all have no equivalent)
- Closest is code-first displayTemplate() + initDisplayTemplateRegistry() pushed
  with config push — but this is display-template management, NOT a 1:1 replace
  for Visual Builder node-style sync; flag it for verification against the
  customer's requirements
- Net: delete the styles:* scripts, replace with the code-first workflow
```

## What It Handles

- **Usage assessment** — Scans `package.json` scripts, CI, `.env`, and `devDependencies` for `opti-cms`; categorizes effort (minimal / moderate / significant)
- **Package + binary swap** — Removes `@remkoj/optimizely-cms-cli`, adds `@optimizely/cms-cli`; renames `opti-cms` → `optimizely-cms-cli`
- **Command rewrites** — `types:push` → `config push`, `types:pull` → `config pull` (with output-format flags), `cms:reset` → `danger delete-all-content-types`
- **Auth/env migration** — Same CMS credential names; documents the new optional `OPTIMIZELY_CMS_API_URL` and `NODE_TLS_REJECT_UNAUTHORIZED`
- **Honest gaps** — `styles:*` / `style:create` (Visual Builder) and `nextjs:*` (scaffolding/codegen) have no equivalent; `cms:version` has no equivalent
- **Verification** — Confirms `login` succeeds and no dangling `opti-cms` references remain

## Method Mapping Quick Reference

| Remko (`@remkoj/optimizely-cms-cli`, `opti-cms`) | Content JS SDK CLI (`@optimizely/cms-cli`, `optimizely-cms-cli`) |
|---------------------------------------------------|------------------------------------------------------------------|
| `types:push` | `config push` (`--config`, `--force`, `--host`) |
| `types:pull` | `config pull` (`--group` default / `--individual` / `--single-file` / `--json`) |
| `cms:reset` | `danger delete-all-content-types` (destructive, no `--force` bypass) |
| `cms:version` | — no equivalent (use `login` to verify connectivity) |
| `styles:list` / `styles:push` / `styles:pull` / `styles:delete` | — no equivalent (code-first `displayTemplate()` + `config push`) |
| `style:create` | — no equivalent (author `displayTemplate()` by hand) |
| `nextjs:create` / `nextjs:components` / `nextjs:factory` | — no equivalent (manual React authoring) |
| `nextjs:fragments` / `nextjs:queries` | — no equivalent (runtime query generation) |
| `nextjs:visualbuilder` | — no equivalent (manual wiring) |
| `OPTIMIZELY_CMS_CLIENT_ID` / `_CLIENT_SECRET` / `_URL` | **reused** (same names) |

## Important Notes

- **Colon → space is the core syntax change.** Remko is yargs (`types:push`); the official CLI is oclif (`config push`). `optimizely-cms-cli types:push` fails with "unknown command" — rewrite every invocation, don't just swap the binary name.
- **Scaffolding and styles commands are deleted, not renamed.** The official CLI has NO `styles` topic and NO `nextjs` topic. CI/build steps invoking them must be removed. Replace with code-first workflows: display templates for styles, manual component authoring + runtime queries for `nextjs:*`.
- **`styles:*` → display templates is not 1:1.** The closest replacement is `displayTemplate()` + `initDisplayTemplateRegistry()` (ROOT exports) pushed via `config push`. That is display-template *management*, not Visual Builder node-style sync — if the customer depends on VB node styles, flag it for verification before removing the Remko workflow.
- **Env var names are unchanged; new vars are added.** `OPTIMIZELY_CMS_CLIENT_ID` / `_CLIENT_SECRET` / `_URL` keep the same names. The official CLI adds optional `OPTIMIZELY_CMS_API_URL` (non-prod API base) and `NODE_TLS_REJECT_UNAUTHORIZED="0"` (local self-signed certs only — never in production). `--host` overrides `OPTIMIZELY_CMS_URL`.
- **Destructive commands need care.** `config push --force` skips the interactive confirm and overwrites CMS types; `danger delete-all-content-types` deletes ALL user-defined content types (interactive confirm required, no `--force` bypass). Never run in production without a backup.
- **Oclif interactive prompts break non-TTY CI.** Use `--json` / `--force` / output flags to make commands non-interactive in pipelines.
- **`config push` requires `optimizely.config.mjs`.** The CLI reads `buildConfig({ components: [...] })` from `./optimizely.config.mjs` to discover content types. Missing that file makes `config push` fail.
- **`cms:version` has no equivalent.** The official `--version` shows the CLI version only, not the CMS/API version. Use `login` to verify CMS connectivity instead.
- **Don't leave stale scripts.** After migrating, confirm no `types:` / `nextjs:` / `styles:` prefixed scripts and no `opti-cms` invocations remain in `package.json`, CI YAML, or shell aliases.

## Related Skills

- [`optimizely-remko-graph-cli-to-content-js`](optimizely-remko-graph-cli-to-content-js.md) — Shares the same target CLI (`@optimizely/cms-cli`)
- [`optimizely-remko-cms-api-to-content-js`](optimizely-remko-cms-api-to-content-js.md) — Also targets the CLI for management (straddle skill, do last)
- [`optimizely-remko-cms-react-to-content-js`](optimizely-remko-cms-react-to-content-js.md) — Manual React authoring that replaces `nextjs:components` / `nextjs:factory`
- [`optimizely-remko-graph-functions-to-content-js`](optimizely-remko-graph-functions-to-content-js.md) — Runtime query generation that replaces `nextjs:fragments` / `nextjs:queries`
- [`optimizely-remko-cms-nextjs-to-content-js`](optimizely-remko-cms-nextjs-to-content-js.md) — Next.js integration that replaces `nextjs:create` / `nextjs:visualbuilder`
