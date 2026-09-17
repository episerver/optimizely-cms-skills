---
name: optimizely-remko-cms-cli-to-content-js
description: >-
  This skill should be used when the user asks to migrate off
  "@remkoj/optimizely-cms-cli", replace "opti-cms", swap the Remko CLI for the
  official "@optimizely/cms-cli", "migrate optimizely-cms-cli", convert
  "types:push" or "types:pull" to the official config sync commands, remove
  "styles:*" or "nextjs:*" scaffold commands, "migrate opti-cms", fix CI
  scripts after switching CLIs, or replace package.json scripts that call
  opti-cms commands.
---

# Migrate @remkoj/optimizely-cms-cli to @optimizely/cms-cli

Guide the user through migrating from the community **Remko CLI**
(`@remkoj/optimizely-cms-cli`, bin `opti-cms`) to the official **Content JS SDK
CLI** (`@optimizely/cms-cli`, bin `optimizely-cms-cli`), covering command
syntax changes (yargs colon-separated → oclif space-separated), the direct maps
(content-type sync), and the honest gaps (Visual Builder styles and Next.js
scaffolding commands).

This skill handles the **CLI migration** — command rewrites, auth/env changes,
and script updates. The official CLI **does not have Visual Builder styles
commands or Next.js scaffolding/codegen** — those workflows are replaced by
code-first patterns in the SDK.

## Scope & Teardown Order (applies to every skill in this suite)

Three cross-cutting rules govern the whole migration:

- **Optimizely One is out of scope (carve-out).**
  `@remkoj/optimizely-one-nextjs` (ODP + Recs + visitor-group personalization +
  site search) has **no target mapping** and is a **known residual**: it is
  explicitly permitted to remain installed after migration. "Remove all
  `@remkoj/*`" does **not** apply to it — do not strip it, and do not treat its
  presence as an incomplete migration.
- **`@remkoj/optimizely-cms-api` is a conditional residual.** Most of it
  migrates (management → `@optimizely/cms-cli`; published reads →
  `@optimizely/cms-sdk` `getClient()`), but content write/CRUD, changesets, and
  runtime OAuth are **honest gaps** with no official equivalent. Keep the
  package installed (or rewrite those paths to raw Integration API REST) **if**
  the project uses any of them; strip it only after confirming it does not.
- **Do not global-delete the `@remkoj/*` packages.** They are interdependent;
  removing them in the wrong order transiently breaks the build. Follow the
  staged teardown: client → codegen/functions → content-type registry →
  display-template + React registries → components → pages/preview → remove
  packages.

All three are specified in full — including the exact `yarn remove` command that
omits `optimizely-one-nextjs` unconditionally and stages `optimizely-cms-api`
conditionally — in the **"Scope carve-out"**, **"Conditional residual"**, and
**"Removal order"** sections of
`../_shared-references/package-and-import-mapping.md`. Read them before removing
any package.

## When to Use This Skill

- User wants to migrate from `@remkoj/optimizely-cms-cli` to the official
  `@optimizely/cms-cli`
- User asks to replace `opti-cms` or the "Remko CLI" with the official CLI
- User asks what the `@optimizely/cms-cli` equivalent of `types:push` /
  `types:pull` is
- User asks about migrating `cms:reset`, `cms:version`, or content-type sync
  commands
- User asks to migrate `styles:*` commands (styles:list, styles:push,
  styles:pull, styles:delete, style:create) to the official CLI
- User asks to migrate `nextjs:*` commands (nextjs:create, nextjs:components,
  nextjs:factory, nextjs:fragments, nextjs:queries, nextjs:visualbuilder) to
  the official CLI
- User wants a pre-migration assessment of `opti-cms` usage before starting the
  migration
- User encounters CLI errors (`command not found`, `unknown command`) after
  switching to the official CLI
- User asks how to migrate `package.json` scripts that invoke `opti-cms`

## Steps

### Step 1: Assess Current Usage

Before making changes, scan the project to understand migration scope.

1. **Detect `opti-cms` usage in `package.json` scripts**:
   ```bash
   grep -E "opti-cms|types:|nextjs:|styles:" package.json
   ```

2. **Scan for key artifacts**:
   - `package.json` `scripts` section — commands invoking `opti-cms` (e.g.,
     `yarn types:push`, `npm run nextjs:components`)
   - `.env` / `.env.local` — environment variables for CMS auth
     (`OPTIMIZELY_CMS_CLIENT_ID`, `OPTIMIZELY_CMS_CLIENT_SECRET`,
     `OPTIMIZELY_CMS_URL`)
   - `devDependencies` — `@remkoj/optimizely-cms-cli` version

3. **Check command usage** — common patterns:
   - **Content-type sync**: `opti-cms types:push`, `opti-cms types:pull` →
     direct map to `config push` / `config pull`
   - **Schema reset**: `opti-cms cms:reset` → direct map to
     `danger delete-all-content-types`
   - **Visual Builder styles**: `opti-cms styles:*` → **no equivalent** (see
     gaps below)
   - **Next.js scaffolding**: `opti-cms nextjs:*` → **no equivalent** (see gaps
     below)
   - **CMS version check**: `opti-cms cms:version` → **no equivalent** (use
     `login` to verify connectivity)

4. **Categorize migration effort**:
   - **Minimal**: Only `types:push` / `types:pull` usage, standard `.env` setup
   - **Moderate**: `cms:reset` or `cms:version` usage, CI scripts invoking CLI
   - **Significant**: `styles:*` or `nextjs:*` commands (no direct replacements;
     requires switching to code-first workflows)

**If the user only asked for assessment, stop here and report.** Do not proceed
to migration steps.

### Step 2: Swap the Dev Dependency

Remove the Remko CLI package and ensure the official CLI is installed.

**See `../_shared-references/package-and-import-mapping.md` for the complete
package mapping.**

```bash
# Remove community CLI
yarn remove @remkoj/optimizely-cms-cli

# Add official CLI
yarn add -D @optimizely/cms-cli
```

If the project also uses other `@remkoj` packages (`optimizely-graph-client`,
`optimizely-cms-react`, etc.), those will be migrated in separate steps — see
the related skills below. For now, only remove `optimizely-cms-cli`.

**Binary rename**: The bin name changes `opti-cms` → `optimizely-cms-cli`.
Update all `package.json` script invocations.

### Step 3: Migrate Each Command

Rewrite `package.json` scripts, CI commands, and local shell aliases. The
official CLI uses **oclif** (space-separated subcommands like `config push`)
instead of yargs (colon-separated like `types:push`).

**Before — Remko (`package.json`):**

```json
{
  "scripts": {
    "types:push": "opti-cms types:push",
    "types:pull": "opti-cms types:pull",
    "cms:reset": "opti-cms cms:reset",
    "cms:version": "opti-cms cms:version",
    "styles:list": "opti-cms styles:list",
    "styles:push": "opti-cms styles:push",
    "nextjs:components": "opti-cms nextjs:components",
    "nextjs:factory": "opti-cms nextjs:factory"
  }
}
```

**After — Content JS SDK CLI (`package.json`):**

```json
{
  "scripts": {
    "config:push": "optimizely-cms-cli config push",
    "config:pull": "optimizely-cms-cli config pull --group",
    "danger:reset": "optimizely-cms-cli danger delete-all-content-types",
    "cms:login": "optimizely-cms-cli login"
  }
}
```

**Critical migration notes:**

| Remko command (`opti-cms`) | Official CLI command (`optimizely-cms-cli`) | migration note |
|---|---|---|
| `types:push` | `config push` | Direct map. Add `--config <path>` if not using the default (`./optimizely.config.mjs`). Add `--force` to skip interactive confirm. Add `--host <url>` to override `OPTIMIZELY_CMS_URL`. |
| `types:pull` | `config pull` | Direct map. Official adds `--group`/`--individual`/`--single-file`/`--json`/`--include-read-only` output format flags (see reference doc). Default is `--group` (one file per base type). |
| `cms:reset` | `danger delete-all-content-types` | Direct map. **DESTRUCTIVE** — deletes ALL user-defined content types. Official CLI requires interactive confirm (no `--force` bypass). |
| `cms:version` | — no direct equivalent | Official `--version` shows CLI version only, not CMS/API version. Use `login` to verify CMS connectivity and auth. |
| `styles:list` | — **no equivalent** | See capability gaps below. |
| `styles:push` | — **no equivalent** | See capability gaps below. |
| `styles:pull` | — **no equivalent** | See capability gaps below. |
| `styles:delete` | — **no equivalent** | See capability gaps below. |
| `style:create` | — **no equivalent** | See capability gaps below. |
| `nextjs:create` | — **no equivalent** | See capability gaps below. |
| `nextjs:components` | — **no equivalent** | See capability gaps below. |
| `nextjs:factory` | — **no equivalent** | See capability gaps below. |
| `nextjs:fragments` | — **no equivalent** | See capability gaps below. |
| `nextjs:queries` | — **no equivalent** | See capability gaps below. |
| `nextjs:visualbuilder` | — **no equivalent** | See capability gaps below. |

**Capability gaps — Visual Builder styles (`styles:*`, `style:create`)**

The official CLI **does NOT have Visual Builder "styles" commands**. The Remko
`styles:*` commands (list, push, pull, delete) and `style:create` scaffolding
have no direct equivalent in `@optimizely/cms-cli`.

The closest code-first replacement is defining **display templates** in code via
`displayTemplate()` + `initDisplayTemplateRegistry()` (ROOT exports of
`@optimizely/cms-sdk`) and pushing them with `config push`. Note this is
**display-template management**, not a 1:1 replacement for Visual Builder node
styles — if the customer's use case depends on VB node-style sync, flag it as
needing verification against their requirements.

**Before — Remko (Visual Builder styles workflow):**

```bash
# List Visual Builder styles in CMS
opti-cms styles:list

# Push local styles to CMS
opti-cms styles:push

# Pull CMS styles to local
opti-cms styles:pull

# Scaffold a new style
opti-cms style:create
```

**After — Content JS SDK (display templates, code-first):**

```tsx
import { displayTemplate } from '@optimizely/cms-sdk';

export const HeroDisplayTemplate = displayTemplate({
  key: 'HeroDisplayTemplate',
  displayName: 'Hero Display Template',
  isDefault: false,
  baseType: '_component',
  settings: {
    textAlignment: {
      editor: 'select',
      displayName: 'Text Alignment',
      sortOrder: 0,
      choices: {
        left: { displayName: 'Left', sortOrder: 1 },
        center: { displayName: 'Center', sortOrder: 2 },
      },
    },
  },
});
```

```tsx
import { initDisplayTemplateRegistry } from '@optimizely/cms-sdk';
import { HeroDisplayTemplate } from '@/components/HeroDisplayTemplate';

// Register display templates (in root layout.tsx)
initDisplayTemplateRegistry([HeroDisplayTemplate]);
```

```bash
# Push display templates to CMS
npx optimizely-cms-cli config push
```

**Net migration for `styles:*` commands:**

- **DELETE**: `styles:*` scripts from `package.json`. The official CLI has no
  `styles` topic.

- **REPLACE WITH**: Code-first display templates registered via
  `initDisplayTemplateRegistry()` and pushed with `config push`. Verify this
  meets the customer's use case before removing the Remko workflow.

**Capability gaps — Next.js scaffolding (`nextjs:*`)**

The official CLI **does NOT have Next.js scaffolding or codegen commands**. The
Remko `nextjs:*` commands (create, components, factory, fragments, queries,
visualbuilder) have no direct equivalent in `@optimizely/cms-cli`.

**Before — Remko (Next.js scaffolding workflow):**

```bash
# Scaffold Next.js integration
opti-cms nextjs:create

# Generate React components from CMS types
opti-cms nextjs:components

# Generate component factory
opti-cms nextjs:factory

# Generate GraphQL fragments
opti-cms nextjs:fragments

# Generate GraphQL queries
opti-cms nextjs:queries

# Generate Visual Builder wiring
opti-cms nextjs:visualbuilder
```

**After — Content JS SDK (manual authoring, code-first):**

Component/factory generation is **not part of the official toolchain**. You
author React components by hand (covered by the `optimizely-remko-cms-react-to-content-js`
and `optimizely-remko-cms-nextjs-to-content-js` skills). Type definitions are
generated by `config pull`. GraphQL fragments/queries are **NOT generated at
all** — the official SDK does runtime query generation from `contentType()`
schemas (covered by the `optimizely-remko-graph-functions-to-content-js` skill).

**Net migration for `nextjs:*` commands:**

- **DELETE**: `nextjs:*` scripts from `package.json`. The official CLI has no
  `nextjs` topic.

- **REPLACE WITH**: Manual React component authoring (cms-react skill) + runtime
  query generation (graph-functions skill) + `config pull` for type definitions.

### Step 4: Migrate Auth and Environment Variables

The CLI uses the same CMS Integration API credentials as the Remko CLI, but the
official CLI also respects `OPTIMIZELY_CMS_API_URL` for non-production
environments.

**See `../_shared-references/auth-and-env-mapping.md` for complete env-var
mapping.**

**Before — Remko (`.env`):**

```ini
OPTIMIZELY_CMS_CLIENT_ID=<your-cms-client-id>
OPTIMIZELY_CMS_CLIENT_SECRET=<your-cms-client-secret>
OPTIMIZELY_CMS_URL=https://<your-instance>.cms.optimizely.com
```

**After — Content JS SDK CLI (`.env`, unchanged):**

```ini
# Same names — no migration needed
OPTIMIZELY_CMS_CLIENT_ID=<your-cms-client-id>
OPTIMIZELY_CMS_CLIENT_SECRET=<your-cms-client-secret>
OPTIMIZELY_CMS_URL=https://<your-instance>.cms.optimizely.com

# Optional: non-production CMS API base (new in official CLI)
# OPTIMIZELY_CMS_API_URL=https://api.cmstest.optimizely.com

# Optional: local self-signed certs (new in official CLI)
# NODE_TLS_REJECT_UNAUTHORIZED="0"
```

**Critical migration notes:**

1. **Env var names are unchanged** — `OPTIMIZELY_CMS_CLIENT_ID`,
   `OPTIMIZELY_CMS_CLIENT_SECRET`, `OPTIMIZELY_CMS_URL` have the same names in
   the target CLI.

2. **`OPTIMIZELY_CMS_API_URL` is new** — optional override for the CMS API base
   (defaults to `https://api.cms.optimizely.com`). Use for non-production
   instances (e.g., `https://api.cmstest.optimizely.com`).

3. **`NODE_TLS_REJECT_UNAUTHORIZED="0"` is for local dev only** — bypasses
   self-signed cert validation. Never set in production.

4. **`--host` flag overrides `OPTIMIZELY_CMS_URL`** — all commands accept
   `--host <url>` to override the env var.

### Step 5: Verify Migration

1. **Confirm the official CLI is installed and executable**:
   ```bash
   npx optimizely-cms-cli --help
   ```
   Expect: help output showing `config push`, `config pull`, `login`,
   `content delete`, `danger delete-all-content-types`.

2. **Test authentication**:
   ```bash
   npx optimizely-cms-cli login
   ```
   Expect: "Login successful" or similar confirmation (uses
   `OPTIMIZELY_CMS_CLIENT_ID`, `OPTIMIZELY_CMS_CLIENT_SECRET`,
   `OPTIMIZELY_CMS_URL`).

3. **Test content-type sync** (dry-run if possible, or in a non-production
   instance):
   ```bash
   # Push content types from code to CMS
   npx optimizely-cms-cli config push --config ./optimizely.config.mjs

   # Pull content types from CMS to code
   npx optimizely-cms-cli config pull --group --output ./src/cms-types
   ```

4. **Confirm no dangling `opti-cms` invocations**:
   ```bash
   grep -r "opti-cms" --include="*.json" --include="*.yml" --include="*.sh" .
   ```
   Fix any remaining references.

5. **Confirm `package.json` scripts are updated**:
   ```bash
   grep -E "opti-cms|types:|nextjs:|styles:" package.json
   ```
   Remove or rename any stale scripts.

CRITICAL: Do not report migration complete until the official CLI is verified
working (`login` succeeds) and all `opti-cms` references are removed.

## Common Pitfalls

1. **Colon → space syntax change** — Remko used yargs colon-separated commands
   (`types:push`). The official CLI uses oclif space-separated commands
   (`config push`). Do NOT try `optimizely-cms-cli types:push` — it will fail
   with "unknown command".

2. **Scaffolding/styles commands have no replacement** — The official CLI has
   NO `styles:*` or `nextjs:*` commands. CI/build steps invoking these commands
   must be **deleted**, not renamed. Replace with code-first workflows (display
   templates, manual component authoring).

3. **Env var names are unchanged, but new vars are added** —
   `OPTIMIZELY_CMS_CLIENT_ID`, `OPTIMIZELY_CMS_CLIENT_SECRET`,
   `OPTIMIZELY_CMS_URL` keep the same names. The official CLI adds
   `OPTIMIZELY_CMS_API_URL` (optional) and `NODE_TLS_REJECT_UNAUTHORIZED`
   (local dev only).

4. **Oclif interactive prompts break non-TTY CI** — The official CLI uses oclif,
   which has interactive confirms for destructive operations (e.g.,
   `danger delete-all-content-types`). Use flags like `--json` / `--output` to
   make commands non-interactive in CI.

5. **`--force` and `danger delete-all-content-types` are destructive** —
   `config push --force` skips interactive confirm and overwrites CMS types.
   `danger delete-all-content-types` **deletes ALL user-defined content types**
   (interactive confirm required, no `--force` bypass). Do NOT run these in
   production without a backup.

6. **`cms:version` has no equivalent** — The Remko `opti-cms cms:version` showed
   CMS/API version info. The official CLI's `--version` shows CLI version only,
   not CMS version. Use `login` to verify CMS connectivity and auth instead.

7. **Binary name change breaks shell aliases and CI** — If you have shell
   aliases (`alias opti="opti-cms"`) or CI scripts that invoke `opti-cms`
   directly, update them to `optimizely-cms-cli`.

8. **`config pull` format flags are required in some workflows** — The Remko
   `types:pull` had one output mode. The official `config pull` has
   `--group`/`--individual`/`--single-file`/`--json`. Choose the right flag for
   your workflow (default is `--group`).

9. **`config push` requires `optimizely.config.mjs`** — The official CLI reads
   `buildConfig({ components: [...] })` from `./optimizely.config.mjs` to
   discover content types. If this file is missing, `config push` will fail. See
   docs `2-setup.md` and the cms-nextjs skill.

10. **Leaving stale scripts in `package.json`** — After removing `opti-cms`
    invocations, confirm no scripts remain with `types:`, `nextjs:`, or
    `styles:` prefixes. Rename or delete them.

## Related Skills

- `optimizely-remko-graph-client-to-content-js` — Migrate `@remkoj/optimizely-graph-client` (Graph client, fetching)
- `optimizely-remko-cms-react-to-content-js` — Migrate `@remkoj/optimizely-cms-react` (React rendering, component factory)
- `optimizely-remko-cms-nextjs-to-content-js` — Migrate `@remkoj/optimizely-cms-nextjs` (Next.js integration, preview/OPE)
- `optimizely-remko-graph-functions-to-content-js` — Migrate `@remkoj/optimizely-graph-functions` (GraphQL codegen) — **complete this first if you use codegen**
- `optimizely-remko-graph-cli-to-content-js` — Migrate `@remkoj/optimizely-graph-cli` (`opti-graph` → `optimizely-cms-cli`) — **shares the same target CLI (`@optimizely/cms-cli`) with this skill**
- `optimizely-remko-cms-api-to-content-js` — Migrate `@remkoj/optimizely-cms-api` (Integration API client; straddle skill, do last)

**Shared references (read first)**:

- `../_shared-references/package-and-import-mapping.md` — Package/import subpath mapping
- `../_shared-references/auth-and-env-mapping.md` — Environment variables + CMS-55679 gotcha
- `../_shared-references/setup-and-di.md` — Channel/client init + factory registration + context wiring
