---
name: optimizely-remko-cms-api-to-content-js
description: >-
  This skill should be used when the user asks to migrate off
  "@remkoj/optimizely-cms-api", replace the Remko CMS REST API client, swap the
  community Integration API client for the official Content JS SDK, "migrate
  optimizely-cms-api", convert "ContentService" / "ContentTypesService" /
  "DisplayTemplatesService" / "ChangesetsService" usage, replace
  "CmsIntegrationApiClient" calls, migrate content types API or content CRUD
  from the Remko IntegrationApi package, or replace "createClient" from
  optimizely-cms-api.
---

# Migrate @remkoj/optimizely-cms-api to Content JS SDK

Guide the user through migrating from the community **Remko CMS API client**
(`@remkoj/optimizely-cms-api`, a generated OpenAPI REST client for the CMS
Integration/Management API) to the official **Content JS SDK** packages
(`@optimizely/cms-sdk` for runtime + `@optimizely/cms-cli` for tooling).

The `@remkoj/optimizely-cms-api` package is a **library (NOT a CLI)** that
provides a **generated OpenAPI REST client for the CMS Integration/Management
API** (management plane: content types, content CRUD including drafts/versions,
changesets, property formats/groups, OAuth). This migration **straddles TWO
target packages** because the source covers both:

1. **Management/tooling** (content types, display templates, property
   formats/groups) → `@optimizely/cms-cli` `config push`/`config pull` +
   code-first `contentType()`/`displayTemplate()` in `@optimizely/cms-sdk`

2. **Runtime published-content READ** → `@optimizely/cms-sdk` `getClient()`
   (Graph delivery, published content only)

3. **Content WRITE/CRUD** (drafts, versions, changesets) + **runtime OAuth** →
   **HONEST GAPS** (no public SDK/CLI equivalent — use admin UI or raw
   Integration API REST)

**CRITICAL**: The Integration API client reads **draft/all versions**. The
Graph client (`getClient()` from `@optimizely/cms-sdk`) reads **published
content only**. This is a **semantic difference** — `getClient()` is NOT a
drop-in replacement for `ContentService` reads.

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
  the project uses any of them; strip it only after confirming it does not
  (this skill's Step 5 owns that decision).
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

- User wants to migrate from `@remkoj/optimizely-cms-api` to the official
  Content JS SDK
- User asks to replace the "Remko CMS API client" or "Remko Integration API
  client" with the official SDK
- User asks what the official SDK equivalent of `CmsIntegrationApiClient` /
  `createClient` is
- User asks to migrate `ContentTypesService` / `DisplayTemplatesService` /
  `PropertyFormatsService` / `PropertyGroupsService` to the official SDK or CLI
- User asks to migrate `ContentService` (content CRUD, reads, drafts) to the
  official SDK
- User asks to migrate `ChangesetsService` (changeset management) to the
  official SDK
- User asks to migrate `OauthService` / `getAccessToken` /
  `getCmsIntegrationApiConfigFromEnvironment` to the official SDK
- User wants a pre-migration assessment of `@remkoj/optimizely-cms-api` usage
  before starting the migration
- User asks how to replace Integration API content reads/writes with the
  official SDK
- User encounters errors importing from `@remkoj/optimizely-cms-api` after
  swapping packages

## Steps

### Step 1: Assess Current Usage

Before making changes, scan the project to understand migration scope and
categorize usage by concern (management/tooling vs runtime reads vs
writes/changesets).

1. **Detect `@remkoj/optimizely-cms-api` imports**:
   ```bash
   grep -r "from '@remkoj/optimizely-cms-api'" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" .
   ```

2. **Scan for key patterns**:
   - **Management services** — `ContentTypesService`, `DisplayTemplatesService`,
     `PropertyFormatsService`, `PropertyGroupsService` → migrate to
     `@optimizely/cms-cli` `config push`/`config pull` + code-first
     `contentType()`/`displayTemplate()` (property formats/groups sync through
     the CLI config — there is no dedicated code-first factory for them)
   - **Content reads (runtime)** — `ContentService.get*()` / `.list()` → migrate
     to `getClient()` (Graph) from `@optimizely/cms-sdk` if reading published
     content; note semantic difference (draft/version vs published-only)
   - **Content writes (runtime)** — `ContentService.create()` / `.update()` /
     `.delete()` → **honest gap** (no SDK equivalent — use admin UI or raw
     Integration API REST)
   - **Changesets** — `ChangesetsService.*` → **honest gap** (no SDK equivalent)
   - **OAuth/auth helpers** — `getAccessToken`,
     `getCmsIntegrationApiConfigFromEnvironment` → **honest gap** (CLI handles
     auth, no runtime OAuth helper in SDK)
   - **Client factory** — `CmsIntegrationApiClient`, `createClient` → straddles
     all concerns above
   - **Generated types** — `ContentItem`, `ContentType`, `ContentReference`,
     `Changeset`, etc. → migrate to code-first schemas
     (`contentType()`/`displayTemplate()`) + `config pull` (generates TS types
     from CMS)

3. **Check for `.env` credentials**:
   ```bash
   grep -E "OPTIMIZELY_CMS_CLIENT_ID|OPTIMIZELY_CMS_CLIENT_SECRET|OPTIMIZELY_CMS_URL" .env .env.local
   ```
   These env vars are **reused** (same names) by the official CLI.

4. **Categorize migration effort**:
   - **Minimal**: Only content-type/display-template management usage (maps to
     `config push`/`config pull` + code-first schemas)
   - **Moderate**: Runtime published-content reads via `ContentService` (maps to
     `getClient()` with semantic difference)
   - **Significant**: Content WRITE/CRUD or changesets (honest gaps — requires
     admin UI or raw Integration API REST; may need to keep the source package
     or rewrite to raw REST calls)

**If the user only asked for assessment, stop here and report.** Do not proceed
to migration steps.

### Step 2: Decide the Split (Runtime vs Management/Tooling vs Gaps)

Based on Step 1 findings, categorize each usage by concern:

1. **Management/tooling** (content types, display templates, property
   formats/groups) → migrate to `@optimizely/cms-cli` `config push`/`config pull`
   + code-first `contentType()`/`displayTemplate()` in `@optimizely/cms-sdk`.
   Property formats/groups sync through the CLI config (property groups are
   declared via the `PropertyGroupType` type in `buildConfig()`); there is **no
   dedicated code-first factory** for them. See the
   `optimizely-remko-cms-cli-to-content-js` skill (Task 6) and
   `optimizely-remko-graph-client-to-content-js` skill (Task 2) for code-first
   schema patterns.

2. **Runtime published-content READ** → migrate to `getClient()` (Graph
   delivery, published content only) from `@optimizely/cms-sdk`. See the
   `optimizely-remko-graph-client-to-content-js` skill (Task 2) for Graph client
   init and fetching patterns.

   **CRITICAL semantic difference**: Integration API reads (via
   `ContentService`) return **draft/all versions**. Graph reads (via
   `getClient()`) return **published content only**. If your code depends on
   draft/version access, `getClient()` is NOT a drop-in replacement.

3. **Honest gaps** (content WRITE/CRUD, changesets, runtime OAuth) → **no
   public SDK/CLI equivalent**. Options:
   - Use the CMS admin UI for manual content authoring/changeset management.
   - Keep the `@remkoj/optimizely-cms-api` package (or raw Integration API REST
     calls) for programmatic write/changeset access.
   - **DELETE** code paths that are no longer needed (e.g., automated content
     creation workflows that can be replaced with admin UI).

### Step 3: Migrate Management/Tooling Usage

Replace `ContentTypesService`, `DisplayTemplatesService`,
`PropertyFormatsService`, `PropertyGroupsService` usage with code-first schemas
and the official CLI.

**See `../_shared-references/package-and-import-mapping.md` for the complete
package mapping.**

#### Swap the package (if removing all runtime usage)

If you're migrating ONLY management/tooling usage (no runtime content reads),
you can remove the source package and add the CLI:

```bash
# Remove community Integration API client
yarn remove @remkoj/optimizely-cms-api

# Add official CLI
yarn add -D @optimizely/cms-cli
```

If you're also migrating runtime reads (Step 4) or keeping the source package
for write/changesets (Step 5), add `@optimizely/cms-sdk` instead:

```bash
yarn add @optimizely/cms-sdk
```

#### Code-first content types (ContentTypesService)

**Before — Remko (programmatic content-type management via Integration API):**

```ts
import { createClient } from '@remkoj/optimizely-cms-api';

const client = createClient();

// List content types
const types = await client.contentTypes.list();

// Create a content type
await client.contentTypes.create({
  key: 'HeroBlock',
  displayName: 'Hero Block',
  baseType: '_component',
  properties: [
    {
      name: 'heading',
      displayName: 'Heading',
      dataType: 'string',
    },
  ],
});
```

**After — Content JS SDK (code-first content types + CLI sync):**

```tsx
import { contentType } from '@optimizely/cms-sdk';

export const HeroBlock = contentType({
  key: 'HeroBlock',
  displayName: 'Hero Block',
  baseType: '_component',
  properties: {
    heading: {
      displayName: 'Heading',
      type: 'string',
    },
  },
});
```

```bash
# Push content types from code to CMS
npx optimizely-cms-cli config push

# Pull content types from CMS to code (generates TS types)
npx optimizely-cms-cli config pull --group --output ./src/cms-types
```

**See the `optimizely-remko-cms-cli-to-content-js` skill (Task 6) for complete
`config push`/`config pull` patterns and the
`optimizely-remko-graph-client-to-content-js` skill (Task 2) for code-first
content-type schemas.**

#### Code-first display templates (DisplayTemplatesService)

**Before — Remko (programmatic display-template management via Integration
API):**

```ts
import { createClient } from '@remkoj/optimizely-cms-api';

const client = createClient();

// Create a display template
await client.displayTemplates.create({
  key: 'HeroDisplayTemplate',
  displayName: 'Hero Display Template',
  baseType: '_component',
  settings: [
    {
      name: 'textAlignment',
      displayName: 'Text Alignment',
      dataType: 'string',
    },
  ],
});
```

**After — Content JS SDK (code-first display templates + CLI sync):**

```tsx
import { displayTemplate } from '@optimizely/cms-sdk';

export const HeroDisplayTemplate = displayTemplate({
  key: 'HeroDisplayTemplate',
  displayName: 'Hero Display Template',
  baseType: '_component',
  settings: {
    textAlignment: {
      editor: 'select',
      displayName: 'Text Alignment',
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

**See the `optimizely-remko-cms-cli-to-content-js` skill (Task 6) for display
templates and the `optimizely-remko-graph-client-to-content-js` skill (Task 2)
for code-first schemas.**

### Step 4: Migrate Runtime Published-Content READ Usage

Replace `ContentService` read methods (get, list) with the Graph client
(`getClient()` from `@optimizely/cms-sdk`) for **published content only**.

**CRITICAL**: The Integration API client reads **draft/all versions**. The
Graph client reads **published content only**. If your code depends on
draft/version access, `getClient()` is NOT a drop-in replacement.

**Before — Remko (Integration API read, drafts/versions included):**

```ts
import { createClient } from '@remkoj/optimizely-cms-api';

const client = createClient();

// Get content by ID (draft/published/version)
const content = await client.content.getContentById({
  id: '123',
  version: 'draft', // or 'published', or specific version number
});

// List content by type
const items = await client.content.listContentByType({
  contentType: 'HeroBlock',
});
```

**After — Content JS SDK (Graph delivery, published content only):**

```tsx
// One-time config in the root layout (reads OPTIMIZELY_GRAPH_* env vars)
import { config, buildConfig } from '@optimizely/cms-sdk';

config(buildConfig()); // call once, at app startup
```

```tsx
import { getClient } from '@optimizely/cms-sdk';

const client = getClient();

// Get published content by key (no draft/version access)
const content = await client.getContent({
  key: 'abc123',
  locale: 'en',
});

// Get published content by path (returns an array — take [0])
const [page] = await client.getContentByPath('/en/about/');
```

**No single "list by content type" method exists** on the Graph client. Typed
collection queries (e.g., "all `HeroBlock` items") are generated at runtime from
`contentType()` schemas — see the
`optimizely-remko-graph-functions-to-content-js` skill for that pattern.

**CRITICAL notes:**

1. **Draft/version access is LOST** — `getClient()` (Graph) reads published
   content only. If you need draft/version access, this is an **honest gap**
   (see Step 5).

2. **Auth credentials are DIFFERENT** — The Integration API client uses
   `OPTIMIZELY_CMS_CLIENT_ID` / `_CLIENT_SECRET` / `_URL`. The Graph client
   uses `OPTIMIZELY_GRAPH_SINGLE_KEY` (public queries) or
   `OPTIMIZELY_GRAPH_APP_KEY` + `_SECRET` (authenticated queries). See
   `../_shared-references/auth-and-env-mapping.md`.

3. **API shape differs** — The Integration API and Graph API have different
   request/response shapes. Review the Graph client docs and the
   `optimizely-remko-graph-client-to-content-js` skill (Task 2) for complete
   fetching patterns.

**See the `optimizely-remko-graph-client-to-content-js` skill (Task 2) for
complete Graph client init and fetching patterns.**

### Step 5: Handle Honest Gaps (Content Write/CRUD, Changesets, Runtime OAuth)

The official SDK and CLI **have NO equivalents** for:

1. **Content write/CRUD** — `ContentService.create()`, `.update()`,
   `.delete()`, draft management, version management
2. **Changesets** — `ChangesetsService.*` (create, update, delete, list, apply)
3. **Runtime OAuth** — `getAccessToken`,
   `getCmsIntegrationApiConfigFromEnvironment` (CLI handles auth internally; no
   runtime helpers in SDK)

**Options:**

- **Use the CMS admin UI** for manual content authoring, draft/version
  management, and changeset management.

- **Keep the source package** (`@remkoj/optimizely-cms-api`) for programmatic
  write/changeset access. If you keep the source package, you can remove only
  the management/tooling usage (content types, display templates) and migrate
  those to the official CLI (Step 3), while keeping content write/changeset
  code unchanged.

- **Use raw Integration API REST calls** — Replace
  `@remkoj/optimizely-cms-api` with direct `fetch()` calls to the Integration
  API endpoints (`/api/episerver/v3.0/content`, `/api/episerver/v3.0/oauth`,
  etc.). This avoids the dependency on the community package but requires
  manual request/response handling.

- **DELETE** code paths that are no longer needed (e.g., automated content
  creation workflows that can be replaced with manual admin UI authoring).

**Net migration for content WRITE/CRUD:**

- **DELETE**: Code paths that create/update/delete content via
  `ContentService.create()` / `.update()` / `.delete()` (if manual admin UI
  authoring is acceptable).

- **KEEP**: Keep the `@remkoj/optimizely-cms-api` package (or rewrite to raw
  Integration API REST calls) if programmatic content write/CRUD is required.

**Net migration for changesets:**

- **DELETE**: Code paths that manage changesets via `ChangesetsService` (if
  manual admin UI changeset management is acceptable).

- **KEEP**: Keep the `@remkoj/optimizely-cms-api` package (or rewrite to raw
  Integration API REST calls) if programmatic changeset access is required.

**Net migration for runtime OAuth:**

- **DELETE**: Code paths that call `getAccessToken` or
  `getCmsIntegrationApiConfigFromEnvironment`.

- **REPLACE WITH**: If you need programmatic token exchange (e.g., for a custom
  Integration API client), use raw Integration API OAuth endpoints
  (`/oauth/token`). The CLI's `login` command is for verification only, not
  runtime use.

### Step 6: Verify Migration

1. **Confirm the official CLI is installed and executable** (if you migrated
   management/tooling usage):
   ```bash
   npx optimizely-cms-cli --help
   ```
   Expect: help output showing `config push`, `config pull`, `login`,
   `content delete`, `danger delete-all-content-types`.

2. **Test CMS authentication** (if you migrated management/tooling usage):
   ```bash
   npx optimizely-cms-cli login
   ```
   Expect: "Login successful" or similar confirmation (uses
   `OPTIMIZELY_CMS_CLIENT_ID`, `OPTIMIZELY_CMS_CLIENT_SECRET`,
   `OPTIMIZELY_CMS_URL`).

3. **Test content-type sync** (if you migrated management/tooling usage):
   ```bash
   # Push content types from code to CMS
   npx optimizely-cms-cli config push

   # Pull content types from CMS to code
   npx optimizely-cms-cli config pull --group --output ./src/cms-types
   ```

4. **Test runtime Graph client** (if you migrated runtime read usage):
   ```tsx
   import { getClient } from '@optimizely/cms-sdk';
   const client = getClient();
   const content = await client.getContent({ key: 'abc123', locale: 'en' });
   console.log(content);
   ```
   Expect: Published content returned (no draft/version access).

5. **Confirm no dangling `@remkoj/optimizely-cms-api` imports** (if you removed
   the package):
   ```bash
   grep -r "from '@remkoj/optimizely-cms-api'" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" .
   ```
   Fix or remove any remaining imports (or keep them if you're retaining the
   package for write/changeset access).

CRITICAL: Do not report migration complete until you've verified that:

- Management/tooling usage (content types, display templates) is migrated to
  `config push`/`config pull` + code-first schemas.
- Runtime read usage (if applicable) is migrated to `getClient()` (Graph) AND
  the draft-vs-published semantic difference is acknowledged.
- Honest gaps (content write/CRUD, changesets) are either deleted (if no longer
  needed) or explicitly retained (with the source package or raw REST calls).

## Common Pitfalls

1. **Confusing the straddle** — `@remkoj/optimizely-cms-api` is ONE source
   package that straddles TWO target packages (`@optimizely/cms-cli` for
   management/tooling + `@optimizely/cms-sdk` for runtime reads) PLUS honest
   gaps (write/changesets). Do NOT assume the whole package maps to one target.

2. **`getClient()` (Graph) is NOT a drop-in for `ContentService` reads** — The
   Integration API client reads **draft/all versions**. The Graph client reads
   **published content only**. This is a **semantic difference**. If your code
   depends on draft/version access, you CANNOT migrate those reads to
   `getClient()`.

3. **Content write/changesets have no equivalent** — The official SDK and CLI
   have NO content write/CRUD or changeset management APIs. Do NOT fabricate an
   equivalent — state plainly that these are honest gaps (use admin UI or raw
   Integration API REST).

4. **Auth env vars are reused (same names)** — `OPTIMIZELY_CMS_CLIENT_ID`,
   `OPTIMIZELY_CMS_CLIENT_SECRET`, `OPTIMIZELY_CMS_URL` have the same names in
   the source package and target CLI. Do NOT rename or duplicate them. However,
   the runtime Graph client (`getClient()`) uses DIFFERENT credentials
   (`OPTIMIZELY_GRAPH_SINGLE_KEY` or `OPTIMIZELY_GRAPH_APP_KEY` +
   `OPTIMIZELY_GRAPH_SECRET`).

5. **Deleting the source package too early** — If the project has content
   write/CRUD or changeset usage, you may need to KEEP the
   `@remkoj/optimizely-cms-api` package (or rewrite to raw Integration API REST
   calls) even after migrating management/tooling and read usage to the
   official packages.

6. **Assuming the CLI has runtime OAuth helpers** — The official CLI's `login`
   command verifies CMS credentials, but there is NO runtime OAuth helper in
   `@optimizely/cms-sdk`. If you need programmatic token exchange, use raw
   Integration API OAuth endpoints.

7. **Generated types confusion** — The source package exports generated TS types
   (`ContentItem`, `ContentType`, etc.) from the Integration API OpenAPI spec.
   The official SDK uses code-first schemas (`contentType()`,
   `displayTemplate()`) and `config pull` (generates TS types from CMS). Do NOT
   try to import the source package's generated types into the official SDK —
   they are different shapes.

8. **Missing `optimizely.config.mjs`** — The official CLI reads
   `buildConfig({ components: [...] })` from `./optimizely.config.mjs` to
   discover content types for `config push`. If this file is missing,
   `config push` will fail. See the `optimizely-remko-graph-client-to-content-js`
   skill (Task 2) for config file patterns.

9. **Forgetting to call `config(buildConfig())`** — The official SDK requires a
   one-time client init at app startup: `config(buildConfig())`. If this is
   missing, `getClient()` will fail. See
   `../_shared-references/setup-and-di.md`.

10. **Not acknowledging the honest gaps** — Content write/CRUD, changesets, and
    runtime OAuth are honest gaps. Do NOT state "there is no direct equivalent"
    without ALSO providing the migration options (admin UI, keep source package,
    raw REST calls, or delete code paths).

## Related Skills

- `optimizely-remko-graph-client-to-content-js` — Migrate
  `@remkoj/optimizely-graph-client` (Graph client, fetching, runtime channel
  init, code-first schemas) — **complete this skill alongside or before
  cms-api, as it covers code-first content-type patterns and runtime Graph
  client init**
- `optimizely-remko-cms-cli-to-content-js` — Migrate
  `@remkoj/optimizely-cms-cli` (`opti-cms` → `optimizely-cms-cli`) — **shares
  the same target CLI (`@optimizely/cms-cli`) with this skill**
- `optimizely-remko-cms-react-to-content-js` — Migrate
  `@remkoj/optimizely-cms-react` (React rendering, component factory)
- `optimizely-remko-cms-nextjs-to-content-js` — Migrate
  `@remkoj/optimizely-cms-nextjs` (Next.js integration, preview/OPE)
- `optimizely-remko-graph-functions-to-content-js` — Migrate
  `@remkoj/optimizely-graph-functions` (GraphQL codegen → runtime query
  generation)
- `optimizely-remko-graph-cli-to-content-js` — Migrate
  `@remkoj/optimizely-graph-cli` (`opti-graph` → Graph infrastructure, no CLI
  replacement)

**Shared references (read first)**:

- `../_shared-references/package-and-import-mapping.md` — Package/import subpath
  mapping
- `../_shared-references/auth-and-env-mapping.md` — Environment variables +
  CMS-55679 gotcha
- `../_shared-references/setup-and-di.md` — Channel/client init + factory
  registration + context wiring
