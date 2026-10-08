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

## Discovery: customer artifacts

Before applying this skill, read
`../_shared-references/customer-artifacts-and-coexistence.md` and check for
patches on `@remkoj/optimizely-cms-cli`, customer-invented schema extensions
(e.g. `_contract` base types), and wrapper scripts around `opti-cms`
(`cms-push.mjs`, `cms-pull.mjs`, `resolve-opti-cms-entry.mjs`,
`normalize-cms-component-paths.mjs` style post-processors). CI wrappers on
this CLI carry deploy-gate behaviour (fail-closed exit codes, three-phase
push orchestration, sequential push, data-loss acknowledgment headers).
Ignoring them silently ships broken schemas.

**Reference case (2026-09):** a project patched
`@remkoj/optimizely-cms-cli@6.0.0-rc.5` with **8 behaviour changes / 9 code
paths** and a **702-line normalizer**, plus a **three-phase push
orchestrator** (`cms-push.mjs`) driving `types:push` per key. The patch,
orchestrator, and normalizer are what this skill's "spike against the
official CLI" work item calls out — see the two new sections below
(**Customer artifact: `_contract` base types** and **Patch reproduction**).

## Replace / Retain / Remove framework

Classify each `opti-cms` usage BEFORE opening the migration steps:

| Bucket | What this looks like for cms-cli | Migration action |
|--------|----------------------------------|------------------|
| **Replace** | `types:push` / `types:pull` / `cms:reset` invocations from `package.json`, CI scripts, or shell aliases | Rewrite to `config push` / `config pull` / `danger delete-all-content-types` per Step 3 |
| **Retain** | Wrapper-script pure logic (env assertion, path construction, bin resolution) AND customer patch behaviours that guard real defects (fail-closed exit code, `createdBy` stripping, `_section` exclusion, `_contract` routing, Ajv defect relaxations) | Preserve script scaffolding; reproduce patch behaviour against the target CLI (spike per **Patch reproduction** section) or keep the patched Remko CLI alongside the new one |
| **Remove** | `styles:*` + `style:create`, `nextjs:*`, `cms:version`, `schema:vscode` (`sdk:update`) | Delete outright — no target equivalent; replace with code-first display templates, manual React authoring, or nothing |

Nearly every `opti-cms` command is Replace or Remove. The Retain column is
where the migration is genuinely load-bearing: **customer patch behaviours and
wrapper-script orchestration must be reproduced or deliberately abandoned** —
they do not survive a bare package swap.

## Coexistence

The CLI is **standalone** — no runtime type surface leaks into application
code, so it migrates in isolation from client/react/nextjs skills. Two
facts drive planning:

1. **Both CLIs can be installed side-by-side.** Bins (`opti-cms` vs
   `optimizely-cms-cli`) do not collide; both read the same
   `OPTIMIZELY_CMS_CLIENT_ID/_SECRET/_URL`. This is the **only supported
   mode when a patched Remko CLI is in play** — keep the patched CLI while
   spiking the official one, cut over once patch reproduction is confirmed.
2. **Wrapper scripts can call either bin.** During coexistence a push
   orchestrator can invoke `opti-cms types:push` for phases that need
   patched behaviour and `optimizely-cms-cli config push` for phases that
   don't.

Do **not** remove `@remkoj/optimizely-cms-cli` until every `opti-cms`
invocation is migrated AND patch reproduction is confirmed. In the reference
migration, Phase 4 deliberately skipped `4.1/4.2/4.5` because `_contract`
support in the official CLI is unconfirmed (decision D2). Full coexistence
rules in `../_shared-references/customer-artifacts-and-coexistence.md`.

## Customer artifact: `_contract` base types

Some customers extend the CMS schema with an invented base type — commonly
named `_contract` — used as an abstract interface for content-type
inheritance. This is **not part of the standard CMS schema**; the Remko CLI
had to be patched to support it, and the official CLI's support is
**unconfirmed**.

**Detection:**

```bash
# 1. Look in the config file
grep -n 'isContract' apps/*/optimizely.config.mjs 2>/dev/null

# 2. Look in generated type sidecars (Remko convention)
grep -rn 'isContract' apps/*/src --include='*.opti-type.json' 2>/dev/null

# 3. Look in patches for _contract handling
grep -n '_contract\|isContract\|allowNullBaseContract' apps/*/patches/@remkoj__* 2>/dev/null
```

**Signal:** In the reference patch
(`@remkoj__optimizely-cms-cli@6.0.0-rc.5.patch`), `_contract` support
required **three separate patch hunks**:

- L20–24: `getContentTypePaths` routes contracts to a `_contract` folder
  instead of using `baseType` (which is `null` for contracts).
- L40–51: `getContentTypes` bypasses the base-type filter with
  `allowNullBaseContract` so contracts with `baseType: null` are pullable.
- The three-phase push orchestrator (`cms-push.mjs`) pushes contracts **after**
  implementers, because implementers must exist before they can be linked to
  their contract.

**Blocker:** `@optimizely/cms-cli` may reject content types with
`isContract: true` or `baseType: null`. Until this is confirmed empirically,
`config push` cannot proceed against a schema that uses contracts. This is
the same blocker captured as decision D2 in the reference migration.

**Options (customer decision, not a skill prescription):**

1. **Keep the patched Remko CLI** for `_contract` types only (side-by-side
   with `@optimizely/cms-cli` for everything else — see **Coexistence**).
2. **Contribute `_contract` support upstream** to `@optimizely/cms-cli`
   (open an issue at https://github.com/episerver/content-js-sdk).
3. **Restructure the schema away from contracts** — flatten abstract
   inheritance into concrete types. Expensive; changes the CMS content
   model, not just the CLI plumbing.

**Verification spike (afternoon effort):** install `@optimizely/cms-cli`,
define a type with `isContract: true` in `optimizely.config.mjs`, run
`config push`. If it errors, option (1) or (2) is unavoidable.

## Patch reproduction

If a customer patches `@remkoj/optimizely-cms-cli` (detect per **Discovery**
above), each patched behaviour must be spike-tested against the official CLI
before removing the Remko package. The reference patch modifies **8 distinct
behaviours across 9 code paths** — some are likely upstream, others are
customer-specific:

| # | Patch behaviour | Patch location | Likely upstream? | If not upstream, action |
|---|-----------------|---------------|------------------|-------------------------|
| 1 | **Fail-closed exit code** — `createOptiCmsApp` `.fail()` sets `process.exitCode = 1` so Vercel builds don't ship green after a silent push failure | L9–13 | **High** — generic quality fix, expected in official CLI | Confirm via a deliberately broken push; if not upstream, wrap `optimizely-cms-cli config push` in a script that checks exit code |
| 2 | **`_contract` path routing** — `getContentTypePaths` writes contracts to a `_contract` folder | L20–24 | **Low** — customer-specific schema extension | See **Customer artifact: `_contract` base types** section |
| 3 | **`_section` exclusion default** — added to `excludeBaseTypes` in **two places** (`ContentTypesArgsDefaults` L31–32, `TypesPushCommand` builder L263–264) | L27–35, L262–264 | **Medium** — reasonable default; may or may not be upstream | If not upstream, pass `--excludeBaseTypes _section` (or equivalent flag) on every invocation |
| 4 | **Null-baseType contract bypass** — `getContentTypes` `allowNullBaseContract` lets contracts with `baseType: null` through the filter | L40–51 | **Low** — customer-specific | Bundle with (2) — `_contract` decision drives this |
| 5 | **`createdBy` stripping (both push and pull)** — pull command strips `createdBy` on serialize (L58–60); push command strips it before request (L285–287) | L58–60, L285–287 | **Medium** — audit-field noise, likely upstream | Empirical: pull an existing type twice; diff for `createdBy`. Push a type with `createdBy` set; check whether CLI silently strips or errors. |
| 6 | **`relaxSpecDefects` — three Ajv/OpenAPI defect relaxations**: scalar `oneOf` → `anyOf`, `null` property definitions for JSON Merge Patch deletes, wildcard `mayContainTypes` `minLength` drop | L75–144 | **High** — spec-side defects Optimizely likely fixed upstream in CLI or CMS OpenAPI spec | Spike: push a type with `minimum: 0`, a property set to `null`, `mayContainTypes: ["*"]`. If any rejects, the defect persists; port the relaxation OR pass `--force` (loses other validation — same trade-off Remko's patch documents) |
| 7 | **`$ref` + annotation-key handling** — `processSchema` treats `$ref` with sibling annotations (`description`, `title`, `example`, ...) as still a plain ref, not a merged object; without this, `types:push` fails Ajv compile before any request | L240, L248–255 | **High** — spec-side defect | Same spike strategy as (6) |
| 8 | **TypesPushCommand overhaul** — sequential push (`for` loop instead of `Promise.all`); `cms-ignore-data-loss-warnings` header on remove/tighten operations (L312–334); structured `formatPushError`/`formatPushRequest` output with request URL + property counts; **process.exit(1) on any failure** (L372–384); wider `colWidths` + `wordWrap` for the results table | L268–350, L358–384 | **Mixed** — sequential push + fail-nonzero are likely upstream; data-loss ack header + structured errors may not be | Spike each: run a push with parallel type edits (does official CLI serialize?); run a push that removes a property (does it send the data-loss header, or require `--force`?); observe error output shape |

**Recommended workflow:**

1. Install `@optimizely/cms-cli` in a scratch repo alongside the patched
   Remko CLI (they coexist — see **Coexistence**).
2. Sort the 8 behaviours by "likely upstream" — start with (1), (5), (6),
   (7), (8-sequential/exit), because these are generic quality fixes.
3. Spike each empirically: run `optimizely-cms-cli config push` against a
   type that would trigger the patched behaviour; observe.
4. For behaviours that persist, decide: reproduce in a wrapper script,
   upstream the fix, or keep the patched Remko CLI for affected operations
   (via side-by-side coexistence).

**The reference execution deferred all of Phase 4.1/4.2/4.5 for exactly this
reason** — empirical spike work is required and cannot be resolved from
docs alone (decisions D2/D3).

## Three-phase orchestrator pattern

The reference `cms-push.mjs` drives `opti-cms types:push` in **three
sequential phases** using per-key selection:

1. **Retirements** — types being retired, pushed first so their references
   are cleared before implementers change.
2. **Implementers** — concrete types (blocks, pages, sections). Must exist
   before contracts can be linked.
3. **Contracts** — abstract `_contract` types linked to already-created
   implementers.

Each phase invokes `types:push -t <key1> -t <key2> ...` (positive selection)
or `--excludeTypes <k>` (negative). The `-t` (`--types`) flag repeated per
key is load-bearing.

**Migration risk:** if `@optimizely/cms-cli config push` does NOT support
per-key `-t` / `--excludeTypes` filters, the three-phase model breaks. Skill
recommendations, in order of preference:

**Option A — split `optimizely.config.mjs` per phase.** One config file per
phase (retirements/implementers/contracts). Wrapper invokes `config push
--config ./optimizely.<phase>.config.mjs` three times. Cleanest option if
the official CLI honours `--config`.

**Option B — serialize with a wrapper script.** Keep one
`optimizely.config.mjs`; the wrapper filters `components` per phase and
writes a temp config file per invocation, then runs `config push --config
<temp>`. Preserves the existing `cms-push.mjs` shape but replaces
`spawnSync('opti-cms', ['types:push', '-t', ...])` with per-phase temp
files.

**Option C — upstream `--types` / `--excludeTypes` filter support.** If
this is a genuinely missing feature, opening an issue against
`@optimizely/cms-cli` is the durable fix. Ties the migration to upstream
release cadence.

A companion `cms-push.spec.ts` (typically ~360 lines in a project of this
shape) locks the argv shape and needs rewriting whichever option is chosen.
Do not skip the test port.

## Wrapper-script migration

Customers commonly wrap `opti-cms` with scripts. Two categories, different
migration effort:

**Bin-resolution wrappers (trivial rename).** Scripts following the
`resolve-opti-cms-entry.mjs` pattern read
`node_modules/@remkoj/optimizely-cms-cli/package.json` `bin['opti-cms']` and
invoke the resolved entry directly, bypassing `.bin/*.cmd` shims
(Windows/Vercel parity). Migration: single-line rename to
`@optimizely/cms-cli` `bin['optimizely-cms-cli']`. Preserve the wrapper —
dropping it reintroduces `.bin` shim dependency.

**Behaviour wrappers (real re-authoring).** Scripts like `cms-push.mjs` that
implement phased orchestration, per-key selection, or output post-processing.
Migration = re-author, not rename. See **Three-phase orchestrator pattern**
and **`normalize-cms-component-paths.mjs` decision pattern**.

**Pull wrappers.** `cms-pull.mjs`-style scripts invoking `types:pull -t
<keys...>` or `--all` migrate to `config pull --group` (or `--individual` /
`--single-file` — see `references/cms-cli-command-mapping.md`). Re-evaluate the
attached normalizer per the next section.

**Test coverage travels with the wrapper.** A `cms-push.spec.ts` (typically
~360 lines) with argv-shape assertions breaks on any re-author — include
spec rewrite in the estimate.

## `normalize-cms-component-paths.mjs` decision pattern

A reference ~700-line normalizer post-processes Remko-CLI pull output. It
fixes three categories of defect: (1) contracts under the wrong folder (a
Remko side-effect of the project's own `_contract` patch — see **Patch
reproduction** #2); (2) slugified folder names when the code convention is
PascalCase (`my-hero-block/` vs `MyHeroBlock/`); (3) Windows backslashes in
generated import statements.

**Decision procedure (empirical, do NOT skip):**

1. Run `optimizely-cms-cli config pull --group --output <scratch>` against
   the customer's CMS.
2. Inspect: contracts in the expected folder? PascalCase folders? Forward
   slashes on Windows? Each "yes" retires one category.
3. Retain only surviving categories. A 700-line normalizer is almost
   certainly reducible to <100 lines after `config pull` output is
   inspected — often to nothing.

If all three retire, delete the script + its 4 call sites (`format:fix`,
`cms:normalize-paths`, `compile`, `cms-pull.mjs:170`) and the 105-line
spec.

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

- `../_shared-references/customer-artifacts-and-coexistence.md` — Patch/wrapper/fork detection + Replace/Retain/Remove framework + coexistence rules
- `../_shared-references/package-and-import-mapping.md` — Package/import subpath mapping
- `../_shared-references/auth-and-env-mapping.md` — Environment variables + CMS-55679 gotcha
- `../_shared-references/setup-and-di.md` — Channel/client init + factory registration + context wiring

## References

- **Official Optimizely migration guide**: *Migrating from Remko.J to the
  Optimizely CMS JavaScript SDK* (Confluence). Source of the
  Replace/Retain/Remove framework.
- **Optimizely CMS JavaScript SDK repo**: https://github.com/episerver/content-js-sdk
- **Official CLI package**: https://www.npmjs.com/package/@optimizely/cms-cli
- **Optimizely CMS SDK + Next.js starter** (canonical config-push target):
  https://github.com/episerver/content-js-sdk/tree/main/samples/nextjs-template
- **Reference artifact shapes** typically found in projects with a patched
  Remko CLI:
  - A patch file in `apps/cms/patches/@remkoj__optimizely-cms-cli@*.patch`
    (reference case: 8 behaviours / 9 code paths, ~390 lines)
  - A three-phase push orchestrator at `apps/cms/scripts/cms-push.mjs`
  - A pull wrapper at `apps/cms/scripts/cms-pull.mjs`
  - A bin-resolution wrapper at `apps/cms/scripts/resolve-opti-cms-entry.mjs`
  - An output normalizer at
    `apps/cms/scripts/normalize-cms-component-paths.mjs`
- **`references/cms-cli-command-mapping.md`** (in-skill) — full command
  mapping table with flag detail for `config push` / `config pull` /
  `danger delete-all-content-types` / `login`
