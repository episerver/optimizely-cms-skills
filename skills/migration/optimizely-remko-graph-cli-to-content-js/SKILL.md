---
name: optimizely-remko-graph-cli-to-content-js
description: >-
  This skill should be used when the user asks to migrate off
  "@remkoj/optimizely-graph-cli", replace "opti-graph", swap the Remko Graph CLI
  for the official "@optimizely/cms-cli", "migrate optimizely-graph-cli",
  convert "webhook:*" / "source:*" / "config:create" / "patches:apply" commands,
  "migrate opti-graph", fix CI scripts after switching Graph CLIs, replace
  package.json scripts that call opti-graph commands, or migrate "graph source
  config", "push graph source", "site config", "Graph webhooks", or
  "patches:apply" workflows.
---

# Migrate @remkoj/optimizely-graph-cli to @optimizely/cms-cli

Guide the user through migrating from the community **Remko Graph CLI**
(`@remkoj/optimizely-graph-cli`, bin `opti-graph`) to the official **Content JS
SDK CLI** (`@optimizely/cms-cli`, bin `optimizely-cms-cli`).

The Remko Graph CLI manages **Optimizely GRAPH infrastructure** (webhooks,
content sources, site/channel config generation, GraphQL-codegen patches). The
official `@optimizely/cms-cli` manages **CMS content-TYPE definitions + auth**.
These are **fundamentally different concerns** with **near-zero command
overlap** — there is essentially NO `opti-graph` command that maps 1:1 to an
`optimizely-cms-cli` command. This migration is ALMOST ENTIRELY honest gaps:
most operations move to different surfaces (Graph/CMS admin UI, runtime channel
config, or are deleted entirely with codegen).

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

- User wants to migrate from `@remkoj/optimizely-graph-cli` to the official
  `@optimizely/cms-cli`
- User asks to replace `opti-graph` or the "Remko Graph CLI" with the official
  CLI
- User asks what the `@optimizely/cms-cli` equivalent of `config:create` /
  `webhook:*` / `source:*` / `patches:apply` is
- User asks to migrate `config:create` (Graph site-config generation) to the
  official CLI
- User asks to migrate `webhook:list` / `webhook:create` / `webhook:delete`
  (Graph webhook management) to the official CLI
- User asks to migrate `source:list` / `source:clear` / `source:delete` (Graph
  content-source management) to the official CLI
- User asks to migrate `patches:apply` (GraphQL-codegen patches) to the
  official CLI
- User wants a pre-migration assessment of `opti-graph` usage before starting
  the migration
- User encounters CLI errors (`command not found`, `unknown command`) after
  switching to the official CLI
- User asks how to migrate `package.json` scripts that invoke `opti-graph`

## Steps

### Step 1: Assess Current Usage

Before making changes, scan the project to understand migration scope.

1. **Detect `opti-graph` usage in `package.json` scripts**:
   ```bash
   grep -E "opti-graph|config:create|webhook:|source:|patches:" package.json
   ```

2. **Scan for key artifacts**:
   - `package.json` `scripts` section — commands invoking `opti-graph` (e.g.,
     `yarn site-config`, `npm run webhook:create`)
   - `.env` / `.env.local` — environment variables for Graph auth
     (`OPTIMIZELY_GRAPH_APP_KEY`, `OPTIMIZELY_GRAPH_SECRET`,
     `OPTIMIZELY_GRAPH_SINGLE_KEY`, `OPTIMIZELY_GRAPH_GATEWAY`)
   - `devDependencies` — `@remkoj/optimizely-graph-cli` version
   - Generated site-config files (e.g., `src/site-config.ts` containing
     `SiteConfig` / `ChannelDefinition` imports from
     `@remkoj/optimizely-graph-client`)

3. **Check command usage** — common patterns:
   - **Site config generation**: `opti-graph config:create` → **no equivalent**
     (see gaps below)
   - **Webhook management**: `opti-graph webhook:list` / `webhook:create` /
     `webhook:delete` → **no equivalent** (see gaps below)
   - **Content-source management**: `opti-graph source:list` (default command)
     / `source:clear` / `source:delete` → **no equivalent** (see gaps below)
   - **GraphQL-codegen patches**: `opti-graph patches:apply` → **no
     equivalent** (see gaps below)

4. **Categorize migration effort**:
   - **Minimal**: Only `source:list` usage (default command when running bare
     `opti-graph`), no active webhooks/sources, no site-config generation
   - **Moderate**: `webhook:*` or `config:create` usage, CI scripts invoking
     `opti-graph`
   - **Significant**: Active `patches:apply` (tied to GraphQL-codegen workflow;
     requires migrating to runtime query generation via the
     `optimizely-remko-graph-functions-to-content-js` skill)

**If the user only asked for assessment, stop here and report.** Do not proceed
to migration steps.

### Step 2: Swap / Remove the Dev Dependency

Remove the Remko Graph CLI package. Note that `@optimizely/cms-cli` is NOT a
drop-in replacement — it manages CMS content-TYPE definitions, not Graph
infrastructure. It may already be installed for the cms-cli migration, but it
does not replace `opti-graph`'s functions.

**See `../_shared-references/package-and-import-mapping.md` for the complete
package mapping.**

```bash
# Remove community Graph CLI
yarn remove @remkoj/optimizely-graph-cli
```

If the project also uses other `@remkoj` packages (`optimizely-graph-client`,
`optimizely-cms-react`, etc.), those will be migrated in separate steps — see
the related skills below. For now, only remove `optimizely-graph-cli`.

### Step 3: Migrate Commands (mostly removals)

Rewrite `package.json` scripts, CI commands, and local shell aliases. The
official CLI uses **oclif** (space-separated subcommands like `config push`)
instead of yargs (colon-separated like `config:create`), AND it manages CMS
content types, NOT Graph infrastructure.

#### Site config generation (`config:create`)

**Before — Remko (`package.json`):**

```json
{
  "scripts": {
    "site-config": "opti-graph config:create src/site-config.ts"
  }
}
```

**After — Content JS SDK (code-first channel init, no CLI):**

The official SDK **does NOT generate a `ChannelDefinition` / `SiteConfig` file
from a CLI**. Channel/site config is defined in code and the client is
initialized at runtime.

**Do NOT confuse `opti-graph config:create` (Graph site-config generation) with
`optimizely-cms-cli config push/pull` (CMS content-TYPE sync) — they are
COMPLETELY DIFFERENT.** The official CLI's `config` topic is about content
types, not Graph channel config.

**Code-first replacement:**

```tsx
// One-time config in the root layout (reads OPTIMIZELY_GRAPH_* env vars)
import { config, buildConfig } from '@optimizely/cms-sdk';

config(buildConfig()); // call once, at app startup
```

```tsx
// Get the shared runtime client anywhere (replaces the generated SiteConfig)
import { getClient } from '@optimizely/cms-sdk';

const client = getClient();

// Channel routing at runtime (not a static generated file)
export function getChannelForHost(hostname: string) {
  // Your domain → channel mapping logic
  if (hostname === 'www.example.com') return 'example-channel';
  return 'default-channel';
}
```

**Net migration for `config:create`:**

- **DELETE**: `config:create` / `site-config` scripts from `package.json`. The
  official CLI has no site-config generator.

- **REPLACE WITH**: Code-first channel/client initialization at runtime (see
  `../_shared-references/setup-and-di.md` and the
  `optimizely-remko-graph-client-to-content-js` skill for client init).

- **DELETE**: Generated site-config files (e.g., `src/site-config.ts` importing
  `SiteConfig` / `ChannelDefinition` from `@remkoj/optimizely-graph-client`).

#### Webhook management (`webhook:list`, `webhook:create`, `webhook:delete`)

**Before — Remko (`package.json`):**

```json
{
  "scripts": {
    "webhook:list": "opti-graph webhook:list",
    "webhook:create": "opti-graph webhook:create /api/content/publish POST",
    "webhook:delete": "opti-graph webhook:delete /api/content/publish"
  }
}
```

**After — Content JS SDK (no CLI equivalent):**

The official `@optimizely/cms-cli` **has NO webhook topic**. Graph webhook
management has no CLI equivalent.

**Net migration for `webhook:*`:**

- **DELETE**: `webhook:*` scripts from `package.json`. The official CLI has no
  webhook management.

- **REPLACE WITH**: Manage webhooks via the Graph/CMS admin UI (or the Graph
  Management API if programmatic access is required). Publish/webhook wiring is
  handled outside this CLI.

#### GraphQL-codegen patches (`patches:apply`)

**Before — Remko (`package.json`):**

```json
{
  "scripts": {
    "postinstall": "opti-patch && opti-graph patches:apply"
  }
}
```

**After — Content JS SDK (no CLI equivalent, no codegen):**

The official SDK **does NOT have GraphQL codegen** (no fragments, no queries, no
patches). Runtime query generation replaces codegen (covered by the
`optimizely-remko-graph-functions-to-content-js` skill).

**Net migration for `patches:apply`:**

- **DELETE**: `patches:apply` scripts from `package.json`. The official CLI has
  no `patches` topic.

- **REPLACE WITH**: Runtime query generation from `contentType()` schemas (see
  the `optimizely-remko-graph-functions-to-content-js` skill). Delete codegen
  workflows entirely.

#### Content-source management (`source:list`, `source:clear`, `source:delete`)

**Before — Remko (`package.json`):**

```json
{
  "scripts": {
    "sources": "opti-graph source:list",
    "source:clear": "opti-graph source:clear <sourceId>",
    "source:delete": "opti-graph source:delete <sourceId>"
  }
}
```

**Note:** `source:list` is the **DEFAULT command** when you run bare
`opti-graph` with no arguments. CI that runs `opti-graph` with no args was
listing sources.

**After — Content JS SDK (no CLI equivalent):**

The official `@optimizely/cms-cli` **has NO source topic**. Graph content-source
management has no CLI equivalent.

**Net migration for `source:*`:**

- **DELETE**: `source:*` scripts from `package.json`. The official CLI has no
  content-source management.

- **REPLACE WITH**: Manage content sources via the Graph/CMS admin UI (or the
  Graph Management API if programmatic access is required).

- **CI WARNING**: If CI runs bare `opti-graph` (no args), it was running
  `source:list` by default. Remove these invocations.

### Step 4: Migrate Credentials/Env

The Remko Graph CLI uses **Optimizely GRAPH App Key + Secret** (+ Single Key).
The official `@optimizely/cms-cli` uses **CMS Integration API Client ID +
Secret**. These are **DIFFERENT credentials** for **DIFFERENT services** (Graph
vs CMS).

**See `../_shared-references/auth-and-env-mapping.md` for complete env-var
mapping.**

**Before — Remko Graph CLI (`.env`):**

```ini
# GRAPH credentials (used by opti-graph)
OPTIMIZELY_GRAPH_APP_KEY=<your-graph-app-key>
OPTIMIZELY_GRAPH_SECRET=<your-graph-secret>
OPTIMIZELY_GRAPH_SINGLE_KEY=<your-graph-single-key>
OPTIMIZELY_GRAPH_GATEWAY=https://cg.optimizely.com
```

**After — Content JS SDK CLI (`.env`):**

```ini
# CMS credentials (used by optimizely-cms-cli)
OPTIMIZELY_CMS_CLIENT_ID=<your-cms-client-id>
OPTIMIZELY_CMS_CLIENT_SECRET=<your-cms-client-secret>
OPTIMIZELY_CMS_URL=https://<your-instance>.cms.optimizely.com

# Optional: non-production CMS API base
# OPTIMIZELY_CMS_API_URL=https://api.cmstest.optimizely.com

# Optional: local self-signed certs
# NODE_TLS_REJECT_UNAUTHORIZED="0"
```

**Critical migration notes:**

1. **GRAPH creds (App Key/Secret/Single Key) ≠ CMS creds (Client ID/Secret)** —
   These are different credentials for different services. The official CLI uses
   CMS creds only.

2. **GRAPH creds are still needed at runtime** — The runtime Graph client
   (`getClient()` from `@optimizely/cms-sdk`) still reads GRAPH credentials
   (Single Key for public queries, App Key + Secret for authenticated queries)
   when fetching content. Only the CLI's credentials change.

3. **Env var name changes**: `OPTIMIZELY_GRAPH_APP_KEY` / `_SECRET` /
   `_SINGLE_KEY` (Graph) → `OPTIMIZELY_CMS_CLIENT_ID` / `_CLIENT_SECRET` (CMS).

### Step 5: Verify

1. **Confirm the official CLI is installed and executable** (if needed for CMS
   content-type sync):
   ```bash
   npx optimizely-cms-cli --help
   ```
   Expect: help output showing `config push`, `config pull`, `login`,
   `content delete`, `danger delete-all-content-types`.

2. **Test CMS authentication** (if using the official CLI):
   ```bash
   npx optimizely-cms-cli login
   ```
   Expect: "Login successful" or similar confirmation (uses
   `OPTIMIZELY_CMS_CLIENT_ID`, `OPTIMIZELY_CMS_CLIENT_SECRET`,
   `OPTIMIZELY_CMS_URL`).

3. **Confirm no dangling `opti-graph` invocations**:
   ```bash
   grep -r "opti-graph" --include="*.json" --include="*.yml" --include="*.sh" .
   ```
   Fix any remaining references.

4. **Confirm `package.json` scripts are updated**:
   ```bash
   grep -E "opti-graph|config:create|webhook:|source:|patches:" package.json
   ```
   Remove or rename any stale scripts.

5. **Confirm generated site-config files are deleted** (if applicable):
   ```bash
   grep -r "SiteConfig\|ChannelDefinition" --include="*.ts" --include="*.tsx" src/
   ```
   Remove imports from `@remkoj/optimizely-graph-client` and replace with
   code-first channel init.

CRITICAL: Do not report migration complete until all `opti-graph` references are
removed and any runtime Graph client usage is verified with the new SDK.

## Common Pitfalls

1. **Confusing `config:create` (Graph site-config) with `config push/pull` (CMS
   content types)** — `opti-graph config:create` generates a static
   `SiteConfig` / `ChannelDefinition` file from Graph channel data. The official
   CLI's `config push/pull` manages CMS content-TYPE definitions. They are
   COMPLETELY UNRELATED. Do NOT try to replace `config:create` with
   `config push`.

2. **Assuming webhooks/sources have a CLI equivalent** — The official CLI has NO
   `webhook:*` or `source:*` commands. These workflows move to the Graph/CMS
   admin UI or Graph Management API.

3. **Bare `opti-graph` invocations in CI** — `source:list` is the DEFAULT
   command when you run `opti-graph` with no arguments. CI that runs
   `opti-graph` with no args was listing sources. Remove these invocations.

4. **GRAPH creds vs CMS creds mixup** — The Remko Graph CLI uses
   `OPTIMIZELY_GRAPH_APP_KEY` / `_SECRET` / `_SINGLE_KEY` (for Graph). The
   official CLI uses `OPTIMIZELY_CMS_CLIENT_ID` / `_CLIENT_SECRET` (for CMS).
   These are DIFFERENT credentials for DIFFERENT services.

5. **`patches:apply` tied to deleted codegen** — `patches:apply` patches the
   GraphQL-codegen packages. The official SDK has NO codegen (runtime query
   generation replaces it). Delete `patches:apply` and migrate to runtime
   queries (see `optimizely-remko-graph-functions-to-content-js`).

6. **Leaving stale site-config imports** — If the project has a generated
   `src/site-config.ts` importing `SiteConfig` / `ChannelDefinition` from
   `@remkoj/optimizely-graph-client`, delete it and replace with code-first
   channel/client init.

7. **Binary name change breaks shell aliases and CI** — If you have shell
   aliases (`alias opti="opti-graph"`) or CI scripts that invoke `opti-graph`
   directly, remove them (there is no drop-in replacement for Graph
   infrastructure commands).

8. **Assuming the official CLI replaces ALL opti-graph functions** — The
   official CLI manages CMS content types only, NOT Graph infrastructure. Most
   `opti-graph` commands have NO CLI replacement.

9. **GRAPH credentials still needed at runtime** — Even after removing
   `opti-graph`, the project still needs GRAPH credentials (Single Key or App
   Key + Secret) because the runtime Graph client (`getClient()` from
   `@optimizely/cms-sdk`) uses them to fetch content. Only the CLI's credentials
   change.

10. **CI/build scripts invoking `opti-graph` without package.json** — Check
    shell scripts, Dockerfiles, and CI configs for direct `opti-graph`
    invocations (not via `npm run`). Remove or replace these.

## Related Skills

- `optimizely-remko-graph-client-to-content-js` — Migrate
  `@remkoj/optimizely-graph-client` (Graph client, fetching, runtime channel
  init)
- `optimizely-remko-cms-react-to-content-js` — Migrate
  `@remkoj/optimizely-cms-react` (React rendering, component factory)
- `optimizely-remko-cms-nextjs-to-content-js` — Migrate
  `@remkoj/optimizely-cms-nextjs` (Next.js integration, preview/OPE)
- `optimizely-remko-graph-functions-to-content-js` — Migrate
  `@remkoj/optimizely-graph-functions` (GraphQL codegen → runtime query
  generation) — **complete this first if you use `patches:apply`**
- `optimizely-remko-cms-cli-to-content-js` — Migrate
  `@remkoj/optimizely-cms-cli` (`opti-cms` → `optimizely-cms-cli`) — **shares
  the same target CLI (`@optimizely/cms-cli`) with this skill**
- `optimizely-remko-cms-api-to-content-js` — Migrate
  `@remkoj/optimizely-cms-api` (Integration API client; straddle skill, do last)

**Shared references (read first)**:

- `../_shared-references/package-and-import-mapping.md` — Package/import subpath
  mapping
- `../_shared-references/auth-and-env-mapping.md` — Environment variables + CMS-55679 gotcha
- `../_shared-references/setup-and-di.md` — Channel/client init + factory
  registration + context wiring
