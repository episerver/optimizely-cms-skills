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

## Discovery: customer artifacts BEFORE migration

Read `../_shared-references/customer-artifacts-and-coexistence.md` first.
This skill is **more retention-heavy than any other in the suite** — most
real customers who use `@remkoj/optimizely-cms-api` at runtime will KEEP the
package installed indefinitely because content write/CRUD, changesets, and
runtime OAuth have no official SDK equivalent. Detect these three classes
of artifact before proposing removal:

1. **Patches on `@remkoj/optimizely-cms-api`** — check `patches/` and
   `pnpm.patchedDependencies`. Patches on this package usually encode
   Integration-API defect workarounds; carry them forward.
2. **Custom wrappers around Remko generated types** — files that import
   from `@remkoj/optimizely-cms-api/dist/client` and re-export augmented
   shapes usually carry retry, DAM sync, or 409-recovery logic. Preserve
   the WHY, not the type substrate.
3. **Editor Save / draft write clients** — files that call
   `contentPatchVersion`, `contentCreateVersion`, `contentCreate`,
   `contentDelete`. These are **honest-gap** clients and should be
   retained (see the Retain matrix below).

## Replace / Retain / Remove framework

From the official Optimizely migration guide. Classify every touched surface
before opening this skill's Steps. This skill is unusual in that the Retain
column dominates — plan accordingly.

| Bucket | What it means for `@remkoj/optimizely-cms-api` |
|--------|------------------------------------------------|
| **Replace** | Content-type / display-template / property-format management via `ContentTypesService`, `DisplayTemplatesService`, `PropertyFormatsService`, `PropertyGroupsService` → move to `@optimizely/cms-cli` `config push`/`config pull` + code-first `contentType()`/`displayTemplate()`. Published-content READS via `ContentService.get*()` where drafts are not required → move to `getClient()` (Graph). |
| **Retain** | Editor draft writes (`contentPatchVersion`, `contentCreateVersion`, `contentCreate`, `contentDelete`). Changesets (`ChangesetsService.*`). Runtime OAuth (`getAccessToken`, `getCmsIntegrationApiConfigFromEnvironment`). Migration tooling built on `@remkoj/optimizely-cms-api/dist/client` generated types (rate limiting, 401 retry, DAM sync retry, 409 recovery). All of these stay on Remko; the package remains installed. |
| **Remove** | Only the imports that correspond to Replace-bucket surfaces above. Do NOT `yarn remove @remkoj/optimizely-cms-api` unless the whole Retain column is empty. |

**Rule of thumb**: If any file in the project imports from
`@remkoj/optimizely-cms-api/dist/client` for its generated types, or calls
any of the four editor-write methods above, the package is a **permanent
resident** — plan indefinite coexistence, not phase-out.

## Coexistence with other Remko surfaces

`@remkoj/optimizely-cms-api` is the source package most likely to remain
installed after the rest of the Remko surface has migrated. Coexistence
rules for this specific package (in addition to the general rules in
`../_shared-references/customer-artifacts-and-coexistence.md`):

1. **Retention does NOT block other skills.** You can complete the
   `cms-cli`, `graph-client`, `cms-react`, `cms-nextjs`,
   `graph-functions`, and `graph-cli` migrations to 100% while
   `@remkoj/optimizely-cms-api` stays installed for editor-writes and
   migration tooling. That is the intended end state for most customers.
2. **Generated types are the retention anchor.** Files that use
   `ContentItem`, `ContentVersion`, `ContentVersionPatch`,
   `ContentMetadata`, `ContentReference`, `ContentComponent`,
   `ContentItemPage`, `ApiError` etc. from
   `@remkoj/optimizely-cms-api/dist/client` will continue to work — the
   Remko package still ships them. Do not invent shims.
3. **Env-var reuse is safe across coexistence.**
   `OPTIMIZELY_CMS_CLIENT_ID`, `OPTIMIZELY_CMS_CLIENT_SECRET`,
   `OPTIMIZELY_CMS_URL` are consumed by BOTH the retained Remko client
   AND the new `@optimizely/cms-cli`. No duplication needed.
4. **Do not migrate migration tooling to raw REST as a first step.** For
   customers with `cms-migrator`-style adapter packages (30+ adapter
   files consuming `@remkoj/optimizely-cms-api/dist/client` types PLUS
   rate limiting / 401 retry / DAM sync retry / 409 recovery), migrating
   to raw REST **erases four load-bearing safety nets** the Remko client
   already handles. Retain the package unless a concrete SDK
   migration-tooling story lands.

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

### Step 2.5: Retain / Remove Decision Matrix

Because `@remkoj/optimizely-cms-api` straddles the entire management +
runtime-write + auth surface, its per-surface decisions do not collapse
into one action. Use this matrix to decide surface by surface. The
default is deliberately conservative — most customers land on Retain for
half the rows.

| Surface | Default action | Skip / Route elsewhere if... |
|---------|----------------|------------------------------|
| `contentPatchVersion` / `contentCreateVersion` / editor draft writes | **Retain** (keep package indefinitely) | Project has NO editor UI that writes back to CMS. A project-owned `CmsClient.ts` wrapping Remko's integration client is the canonical Retain case. |
| `contentCreate` / `contentDelete` (programmatic content lifecycle) | **Retain** | Only used by a one-off seed/migration script scheduled for deletion. |
| `ChangesetsService.*` | **Retain** | Manual admin-UI changeset management is acceptable AND no CI/CD depends on changesets. |
| `OauthService` / `getAccessToken` / `getCmsIntegrationApiConfigFromEnvironment` | **Retain** | No custom client instantiation is needed after Retain rows are removed — auth then lives inside the retained Remko client's own bootstrap. |
| `ContentService.get*()` / `.list()` READS (published only) | **Replace** with `getClient()` (Graph) from `@optimizely/cms-sdk` | Reads require drafts/versions (then this row is Retain). |
| `ContentTypesService` push/pull | **Replace** — route to the `optimizely-remko-cms-cli-to-content-js` skill (`config push`/`config pull` + code-first `contentType()`) | No content-type management done from code; all authored in admin UI. |
| `DisplayTemplatesService` push/pull | **Replace** — route to the `optimizely-remko-cms-cli-to-content-js` skill (`config push` + code-first `displayTemplate()`) | No display templates in use. |
| `PropertyFormatsService` / `PropertyGroupsService` | **Replace** — route to the `optimizely-remko-cms-cli-to-content-js` skill (declare in `buildConfig()`; no dedicated code-first factory) | No custom property formats/groups. |
| Generated types from `@remkoj/optimizely-cms-api/dist/client` (`ContentItem`, `ContentVersion`, `ContentVersionPatch`, `ContentMetadata`, `ContentReference`, `ContentComponent`, `ContentItemPage`, `ApiError`) | **Retain** — no direct SDK equivalent unless doing a full write→read split | Every consumer file has already been migrated to `ContentProps<typeof XxxContentType>` (from the cms-react/code-first schemas). |
| `cms-migrator`-style adapter tooling using `/dist/client` generated types + custom rate limit / 401 retry / DAM sync retry / 409 recovery | **Retain** (safety nets outweigh the dependency cost) | Migration tool is being retired entirely. |

**Practical rule**: If any row above lands on Retain, the
`@remkoj/optimizely-cms-api` package stays installed and **you do NOT
plan a phase-out for that surface**. Only propose full package removal
when every row lands on Replace or Remove.

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
   `.delete()`, draft management, version management (including
   `contentPatchVersion`, `contentCreateVersion`, `contentCreate`,
   `contentDelete`)
2. **Changesets** — `ChangesetsService.*` (create, update, delete, list, apply)
3. **Runtime OAuth** — `getAccessToken`,
   `getCmsIntegrationApiConfigFromEnvironment` (CLI handles auth internally; no
   runtime helpers in SDK)

**Recommended path for editor-UI writes: RETAIN the Remko package
indefinitely.**

For customers whose editor UI depends on `contentPatchVersion` /
`contentCreateVersion` / `contentCreate` / `contentDelete` (a project-owned
`CmsClient.ts` adapter — typically ~180 lines calling 6 Integration-API
methods — is the canonical shape), **the recommended path is keeping
`@remkoj/optimizely-cms-api` installed indefinitely** — do NOT plan a
phase-out for these calls unless there is a concrete SDK feature landing.
The Remko client is the smallest-surface option and requires no
authentication or retry code to reimplement. Ask Optimizely product whether
`contentPatchVersion` / `contentCreateVersion` are on the SDK roadmap before
proposing any alternative.

**Recommended path for migration tooling: RETAIN.**

For customers with substantial migration tooling built around Remko's
generated types — a dedicated migration-tooling package (e.g.,
`packages/cms-migrator`) with 30+ adapter files consuming
`@remkoj/optimizely-cms-api/dist/client` types plus custom rate limiting,
401 retry with re-auth, DAM sync retry, and 409 recovery behaviour is the
canonical shape — migrating to raw REST **erases these safety nets**.
Recommend keeping the Remko package for the migrator alongside any other
retention decision.

**Options (in order of preference for retained surfaces):**

- **KEEP the source package** (`@remkoj/optimizely-cms-api`) for
  programmatic write/changeset access. This is the recommended default for
  editor writes and migration tooling. If you keep the source package, you
  can still remove only the management/tooling usage (content types,
  display templates) and migrate those to the official CLI (Step 3),
  keeping write/changeset code unchanged.

- **Use raw Integration API REST calls** — Replace
  `@remkoj/optimizely-cms-api` with direct `fetch()` calls to the Integration
  API endpoints (`/api/episerver/v3.0/content`, `/api/episerver/v3.0/oauth`,
  etc.). This avoids the dependency on the community package but adds an
  **authentication + retry + error-handling burden** the Remko client
  already carries. Only choose this if you have a specific reason to drop
  the Remko dependency (e.g., patch-triangle removal, security policy).

- **Use the CMS admin UI** for manual content authoring, draft/version
  management, and changeset management — only viable if writes are
  infrequent enough that a human can do them.

- **DELETE** code paths that are no longer needed (e.g., automated content
  creation workflows that can be replaced with manual admin UI authoring
  or a one-off script scheduled for deletion).

**Net migration for content WRITE/CRUD:**

- **DEFAULT — KEEP**: Retain `@remkoj/optimizely-cms-api` for editor draft
  writes, `contentPatchVersion` / `contentCreateVersion` / `contentCreate`
  / `contentDelete`, and content lifecycle scripts. Plan indefinite
  coexistence.

- **DELETE (only if applicable)**: Code paths that create/update/delete
  content via `ContentService` methods that can be replaced with admin-UI
  authoring.

- **RAW REST (rare)**: Only if the Remko dependency itself must go — pay
  the auth + retry cost knowingly.

**Net migration for changesets:**

- **DEFAULT — KEEP**: Retain `@remkoj/optimizely-cms-api` for changeset
  access unless changesets are unused.

- **DELETE (only if applicable)**: Code paths that manage changesets via
  `ChangesetsService` if manual admin-UI changeset management is
  acceptable.

**Net migration for runtime OAuth:**

- **DEFAULT — KEEP**: If the Remko package is retained for writes or
  changesets, retain the OAuth helpers alongside — they exist to
  bootstrap that same client.

- **REPLACE WITH**: If you need programmatic token exchange without the
  Remko client (e.g., for a custom Integration API caller), use raw
  Integration API OAuth endpoints (`/oauth/token`). The CLI's `login`
  command is for verification only, not runtime use.

- **DELETE (only if applicable)**: Code paths that call `getAccessToken`
  or `getCmsIntegrationApiConfigFromEnvironment` only after the Retain
  column above is empty.

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
   write/CRUD, changeset, or migration-tooling usage, you should KEEP the
   `@remkoj/optimizely-cms-api` package (this is the recommended default,
   not a fallback). Raw REST is a valid alternative but adds an
   authentication + retry burden the Remko client already handles. Do not
   propose full package removal without confirming every row in the
   Step 2.5 Retain/Remove matrix lands on Replace or Remove.

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

- `../_shared-references/customer-artifacts-and-coexistence.md` —
  Pre-migration discovery (patches, wrappers, forked codegen) + coexistence
  rules for leaving Remko installed while migrating around it
- `../_shared-references/package-and-import-mapping.md` — Package/import subpath
  mapping
- `../_shared-references/auth-and-env-mapping.md` — Environment variables +
  CMS-55679 gotcha
- `../_shared-references/setup-and-di.md` — Channel/client init + factory
  registration + context wiring

## References

**Official Optimizely material**

- *Migrating from Remko.J to the Optimizely CMS JavaScript SDK* — Optimizely
  Confluence guide. Source of the Replace/Retain/Remove framework and the
  "assess, don't rebuild" positioning. Notes that content modelling +
  runtime CMS reads move to the SDK, but does not prescribe a target for
  content writes, changesets, or runtime OAuth — this skill's Step 5 fills
  that gap.
- Optimizely CMS JavaScript SDK repo:
  https://github.com/episerver/content-js-sdk
- Optimizely CMS SDK + Next.js 16 starter (primary practical reference):
  https://github.com/episerver/content-js-sdk/tree/main/samples/nextjs-template — demonstrates
  `getClient().getContentByPath()`, `initContentTypeRegistry()`,
  `initReactComponentRegistry()`, `OptimizelyComponent`, code-first
  `contentType()`. Does NOT demonstrate any content-write pattern; the
  absence is a data point supporting the Retain-writes-on-Remko default.

**Reference patterns from real migrations**

- **Editor Save retention.** A project-owned `CmsClient.ts` (~180 lines)
  wrapping 6 Integration-API methods — including `contentPatchVersion`
  and `contentCreateVersion` — is the canonical Retain case. The right
  decision is to KEEP the Remko package rather than attempt an SDK swap.
- **Migration-tooling retention.** A dedicated migration-tooling package
  (e.g., `packages/cms-migrator`) with rate limiting, 401 retry with
  re-auth, DAM sync retry, and 409 recovery behaviours built on top of
  `@remkoj/optimizely-cms-api/dist/client` types across 30+ adapter
  files is a canonical Retain. The safety nets are load-bearing, not
  decorative — raw REST loses them all.
- **Generated-type inventory most commonly in use** — `ContentItem`,
  `ContentVersion`, `ContentVersionPatch`, `ContentMetadata`,
  `ContentReference`, `ContentComponent`, `ContentItemPage`, `ApiError`.
  All eight remain valid imports from
  `@remkoj/optimizely-cms-api/dist/client` while the package is
  retained. None have a direct SDK equivalent unless the entire
  write→read split completes.
