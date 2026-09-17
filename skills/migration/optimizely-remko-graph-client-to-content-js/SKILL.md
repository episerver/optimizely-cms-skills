---
name: optimizely-remko-graph-client-to-content-js
description: >-
  This skill should be used when the user asks to migrate off
  "@remkoj/optimizely-graph-client", replace ChannelRepository,
  swap the Remko GraphClient / ContentGraphClient for the official
  "@optimizely/cms-sdk", "migrate optimizely-graph-client", convert
  createDefinition to the official SDK, move OPTIMIZELY_CONTENTGRAPH_*
  / OPTIMIZELY_GRAPH_* env vars to the Content JS SDK, or fix Graph
  auth (Single Key vs App Key + Secret) after switching SDKs.
---

# Migrate @remkoj/optimizely-graph-client to @optimizely/cms-sdk

Guide the user through migrating from the community **Remko SDK**
(`@remkoj/optimizely-graph-client`) to the official **Content JS SDK**
(`@optimizely/cms-sdk`), covering package replacement, client initialization,
channel definition migration, environment-variable renames, and per-symbol API
swaps.

This is the **foundational migration skill** — it handles the Graph client and
core fetching surface that every other Remko package depends on. Complete this
migration before tackling `@remkoj/optimizely-cms-react`,
`@remkoj/optimizely-cms-nextjs`, or other Remko packages.

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

- User wants to migrate from `@remkoj/optimizely-graph-client` to the official
  `@optimizely/cms-sdk`
- User asks to replace `ChannelRepository`, `ChannelDefinition`, or
  `createDefinition()` with the official SDK
- User asks to swap `ContentGraphClient` or `createClient()` for the official
  Graph client
- User asks to migrate Graph environment variables
  (`OPTIMIZELY_CONTENTGRAPH_*`, `OPTIMIZELY_GRAPH_*`)
- User encounters empty content renders after switching SDKs (CMS-55679
  credential gotcha)
- User asks about Single Key vs App Key + Secret authentication after
  switching SDKs
- User asks how to fetch content by path or key with the official SDK
- User asks how to migrate routing (`RouteResolver`) to the official SDK
- User wants a pre-migration assessment of `@remkoj/optimizely-graph-client`
  usage before starting the migration
- User asks about HMAC authentication or `createHmacFetch()` in the official
  SDK

## Steps

### Step 1: Assess Current Usage

Before making changes, scan the project to understand migration scope.

1. **Detect `@remkoj/optimizely-graph-client` imports**:
   ```bash
   grep -r "from '@remkoj/optimizely-graph-client" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" .
   ```

2. **Scan for key symbols**:
   - `ChannelRepository` / `createDefinition()` — channel definition usage
   - `ContentGraphClient` / `createClient()` — client creation
   - `RouteResolver` — routing usage
   - `createHmacFetch()` — HMAC auth usage
   - `readEnvironmentVariables()` / `validateConfig()` — config helpers
   - Utility functions: `localeToGraphLocale()`, `contentLinkIsEqual()`,
     `normalizeContentLink()`, `isContentLink()`

3. **Check environment variables** (`.env`, `.env.local`, CI secrets):
   - `OPTIMIZELY_CONTENTGRAPH_GATEWAY` / `OPTIMIZELY_GRAPH_GATEWAY`
   - `OPTIMIZELY_CONTENTGRAPH_SINGLE_KEY` / `OPTIMIZELY_GRAPH_SINGLE_KEY`
   - `OPTIMIZELY_CONTENTGRAPH_APP_KEY` / `OPTIMIZELY_GRAPH_APP_KEY`
   - `OPTIMIZELY_CONTENTGRAPH_SECRET` / `OPTIMIZELY_GRAPH_SECRET`

4. **Categorize migration effort**:
   - **Minimal**: Only `createClient()` + basic fetching (no channel
     definitions, no utils, no admin API, no codegen)
   - **Moderate**: Uses `ChannelRepository` or `RouteResolver` (need to
     replace with `buildConfig()` + `config()` + Next.js routing)
   - **Significant**: Uses admin API, codegen, or many utility functions (may
     require custom implementations or stopping to document use cases)

**If the user only asked for assessment, stop here and report.** Do not
proceed to migration steps.

### Step 2: Swap Packages

Remove the Remko package and add the official SDK.

**See `../_shared-references/package-and-import-mapping.md` for the complete
package mapping.**

```bash
# Remove community SDK
yarn remove @remkoj/optimizely-graph-client

# Add official SDK
yarn add @optimizely/cms-sdk
```

If the project also uses other `@remkoj` packages (`optimizely-cms-react`,
`optimizely-cms-nextjs`, `optimizely-graph-functions`, etc.), those will be
migrated in separate steps — see the related skills below. For now, only
remove `optimizely-graph-client`.

### Step 3: Migrate Environment Variables and Auth

**See `../_shared-references/auth-and-env-mapping.md` for the complete
env-var mapping and the CMS-55679 empty-render gotcha.**

The official SDK reads the same env-var **names** but interprets them
differently. Two critical changes:

1. **Legacy `CONTENTGRAPH_*` aliases are not supported** — use the canonical
   `GRAPH_*` names.
2. **The runtime client needs only the Single Key.** The target `GraphClient`
   authenticates with EITHER `epi-single <apiKey>` (the public Single Key) OR
   `Bearer <preview_token>` (a per-request preview token). It has **no App Key +
   Secret HMAC path** — `GraphOptions` has no `secret` field. App Key + Secret
   survive only for **codegen / CLI** (schema pull/push), not runtime reads and
   not preview.

**Before — Remko `.env`:**

```ini
# Legacy Remko aliases (both sets work)
OPTIMIZELY_CONTENTGRAPH_GATEWAY=https://cg.optimizely.com
OPTIMIZELY_CONTENTGRAPH_SINGLE_KEY=<your-single-key>

OPTIMIZELY_GRAPH_APP_KEY=<your-app-key>
OPTIMIZELY_GRAPH_SECRET=<your-app-secret>
```

**After — Content JS SDK `.env`:**

```ini
# --- Graph delivery (public, read-only) — all the runtime client needs ---
OPTIMIZELY_GRAPH_GATEWAY=https://cg.optimizely.com
OPTIMIZELY_GRAPH_SINGLE_KEY=<your-single-key>

# --- Graph HMAC (codegen / CLI only — NOT used by the runtime client or preview) ---
# Preview reads use a per-request Bearer preview_token from the CMS preview URL,
# not these keys. Include them only if a codegen/CLI step actually needs HMAC.
OPTIMIZELY_GRAPH_APP_KEY=<your-app-key>
OPTIMIZELY_GRAPH_SECRET=<your-app-secret>

# --- CMS instance (CLI: login / config push,pull) ---
OPTIMIZELY_CMS_URL=https://<your-instance>.cms.optimizely.com
```

**CRITICAL: CMS-55679 gotcha (CMS-instance creds, not the frontend `.env`).**
If content renders are empty after migration — blank content, not an auth error
— the usual root cause is the **Graph credentials configured on the CMS instance
itself** (the keys the CMS uses to publish its schema to Graph), NOT your
frontend Single Key or the frontend `.env`. When those instance credentials are
invalid/rotated, the CMS `EnsureSchemaInitializationModule` aborts at startup →
the `_Content` type is never published → **every** Graph render returns empty.
Verify and re-sync the CMS instance's own Graph credentials first. Only after the
instance is confirmed to publish `_Content` should you debug SDK/query code.

### Step 4: Migrate Channel and Client Setup

**See `../_shared-references/setup-and-di.md` for the complete before/after
wiring.**

The Remko `ChannelRepository.createDefinition(...)` has **no direct
equivalent** in the official SDK. Channel identity (name, domains, locales,
CMS URL) is replaced by:

1. `buildConfig()` in `optimizely.config.mjs` (CLI-facing, for component
   discovery)
2. A single `config()` call in the Next.js **root layout** (runtime Graph
   credentials)
3. Next.js routing for host/locale (e.g., `[locale]` route segment)

**Before — Remko (`channel.ts`):**

```ts
import ChannelRepository from '@remkoj/optimizely-graph-client/channels';

const cms_url = process.env.OPTIMIZELY_CMS_URL ?? 'https://example.cms.optimizely.com';

export const channel = ChannelRepository.createDefinition(
  'Basic Project',
  'http://localhost:3000',
  ['en', 'en-US', 'en-UK'],
  cms_url
);
export default channel;
```

**Before — Remko (`api.ts`), the shared client:**

```ts
import { createClient } from '@remkoj/optimizely-cms-nextjs';
export const client = createClient();
export default client;
```

**After — `optimizely.config.mjs` (CLI-facing):**

```ts
import { buildConfig } from '@optimizely/cms-sdk';

export default buildConfig({
  components: ['./src/components/**/*.tsx'],
});
```

**After — configure the Graph client once (root `layout.tsx`):**

```ts
import { config } from '@optimizely/cms-sdk';

// Configure the client once for the whole app.
config({
  apiKey: process.env.OPTIMIZELY_GRAPH_SINGLE_KEY,
  graphUrl: process.env.OPTIMIZELY_GRAPH_GATEWAY,
});
```

**After — get the shared client anywhere (replaces `api.ts` / `createClient()`):**

```ts
import { getClient } from '@optimizely/cms-sdk';

const client = getClient(); // no env vars passed around
const content = await client.getContentByPath('/en/');
```

> Locales/host from `createDefinition(...)` move to Next.js route segments
> (e.g., `[locale]` / `[...slug]`), not an SDK object. Publish/preview host
> wiring is app-owned — see the `optimizely-remko-cms-nextjs-to-content-js`
> skill.

> **G5 — the 3-arg `createClient` signature has no positional analogue.**
> Remko's real-world call is `createClient(config?, token?, flags?)`, e.g.
> `createClient(undefined, undefined, { nextJsFetchDirectives: true, cache: true, queryCache: true })`.
> The **third arg is `flags`** (`queryCache`, `cache`, `nextJsFetchDirectives`,
> `omitEmpty`, `includeDeleted`) — do NOT map it positionally onto
> `new GraphClient(apiKey, options)`. In the target, caching and fetch
> behavior are expressed through `config()` / `GraphOptions` and Next.js fetch
> settings (`fetchCache`, `revalidate`), not a flags bag. If the source passes
> flags, translate each one to its `config()`/route-segment equivalent rather
> than searching for a matching argument.

### Step 5: Migrate Per-Symbol API Calls

**See `references/graph-client-api-mapping.md` for the complete symbol
mapping.**

The most common migrations:

#### (a) `ContentGraphClient` → `GraphClient`

**Before — Remko:**

```ts
import { ContentGraphClient } from '@remkoj/optimizely-graph-client/client';

const client = new ContentGraphClient({
  single_key: process.env.OPTIMIZELY_GRAPH_SINGLE_KEY!,
  gateway: process.env.OPTIMIZELY_GRAPH_GATEWAY,
});
```

**After — Content JS SDK (inline, NOT recommended):**

```ts
import { GraphClient } from '@optimizely/cms-sdk';

const client = new GraphClient(process.env.OPTIMIZELY_GRAPH_SINGLE_KEY!, {
  graphUrl: process.env.OPTIMIZELY_GRAPH_GATEWAY,
});
```

**After — Content JS SDK (recommended: `config()` + `getClient()`):**

```ts
// In root layout.tsx (once):
import { config } from '@optimizely/cms-sdk';
config({
  apiKey: process.env.OPTIMIZELY_GRAPH_SINGLE_KEY,
  graphUrl: process.env.OPTIMIZELY_GRAPH_GATEWAY,
});

// Anywhere else:
import { getClient } from '@optimizely/cms-sdk';
const client = getClient();
```

#### (b) `RouteResolver` → `getContentByPath()`

**Before — Remko:**

```ts
import RouteResolver from '@remkoj/optimizely-graph-client/router';
import { client } from './api'; // shared client
import { channel } from './channel';

const router = new RouteResolver(client, channel);
const content = await router.resolve('/en/about/');
```

**After — Content JS SDK:**

```ts
import { getClient } from '@optimizely/cms-sdk';

const client = getClient();
const content = await client.getContentByPath('/en/about/');
// Returns an array; Remko returned a single item or null.
// Access content[0] for the first match.
```

#### (c) Low-level `request()` → typed methods

**Before — Remko (raw GraphQL):**

```ts
import { client } from './api';

const result = await client.request(
  `query GetPage($key: String!) { Content(where: { _metadata: { key: { eq: $key } } }) { items { ... } } }`,
  { key: 'abc123' }
);
```

**After — Content JS SDK (typed method):**

```ts
import { getClient } from '@optimizely/cms-sdk';

const client = getClient();
const content = await client.getContent({ key: 'abc123' });
// Or for path-based:
// const content = await client.getContentByPath('/en/about/');
```

#### (d) Navigation helpers (NEW in target)

The official SDK adds `getItems()` (child pages) and `getPath()` (breadcrumb
ancestors) that Remko did not have:

```ts
import { getClient } from '@optimizely/cms-sdk';

const client = getClient();

// Get direct children of a page (for navigation menus)
const navLinks = (await client.getItems('/en/')) ?? [];

// Get ancestors of a page (for breadcrumbs)
const ancestors = (await client.getPath('/en/about/team')) ?? [];
```

See `references/graph-client-api-mapping.md` for the complete list.

### Step 6: Verify Migration

1. **TypeScript compilation check**:
   ```bash
   npx tsc --noEmit
   ```
   Fix any remaining import errors or type mismatches.

2. **Build the app**:
   ```bash
   yarn build
   ```

3. **Runtime smoke test** — start the app and verify content renders:
   ```bash
   yarn dev
   ```

4. **Critical verification: empty render check (CMS-55679)**  
   Navigate to a page that should show content. If you see blank/empty
   content arrays (content renders empty, NOT an auth error):
   - **First**, verify the **CMS instance's own** Graph sync credentials are
     valid — this is a server-side configuration on the CMS, NOT the frontend
     `.env`. Rotated/invalid HMAC credentials on the instance make the CMS
     `EnsureSchemaInitializationModule` abort at startup, so the `_Content`
     type is never published to Graph and every query returns empty.
   - **Second**, check the CMS startup logs for
     `EnsureSchemaInitializationModule` errors and confirm the types endpoint
     (`/api/episerver/v3.0/site/...` schema) is populated.
   - **Only then** debug the SDK/query code. The frontend Single Key being
     valid does not help if the CMS never published its schema.

5. **Preview/OPE test** (if the project uses preview):
   - Verify preview mode renders draft content correctly.
   - Confirm preview tokens work (see
     `optimizely-remko-cms-nextjs-to-content-js` for preview route migration).

CRITICAL: Do not report migration complete until `yarn build` succeeds and
the runtime smoke test confirms content renders.

## Common Pitfalls

1. **Empty content renders after migration (CMS-55679)** — This presents as
   content rendering empty (empty arrays), NOT as an auth error. The root
   cause is invalid/rotated Graph HMAC credentials **on the CMS instance
   itself** (a server-side config), which makes the CMS
   `EnsureSchemaInitializationModule` abort at startup. The `_Content` type is
   never published to Graph, so **every Graph query returns empty** even
   though the frontend Single Key is valid and the SDK code is correct. This
   is a CMS-instance configuration problem, **not** a frontend `.env` problem
   and **not** a preview-auth bug. First verify the instance's Graph sync
   credentials before debugging any SDK/query code. This is the #1 support
   case blocker.

2. **Single Key vs App Key + Secret confusion** — The runtime `GraphClient`
   uses EITHER `epi-single <apiKey>` (the public Single Key, for published
   delivery) OR `Bearer <preview_token>` (for preview). It has **no HMAC
   path** — `GraphOptions` has no `secret` field, so passing one is a type
   error. The App Key + Secret pair (HMAC) survives **only** for codegen and
   the CLI (schema sync / `config push`), never at runtime and never for
   preview. If preview doesn't work, check the preview token in the preview
   URL — not an App Key + Secret.

3. **`ChannelRepository` has no drop-in replacement** — Do not try to build a
   compatibility shim. The channel pattern (name, domains, locales) is
   replaced by `buildConfig()` (CLI), `config()` (runtime), and Next.js
   routing. See `setup-and-di.md`.

4. **`getContentByPath()` returns an array, not a single item** — Remko's
   `RouteResolver.resolve()` returned `Content | null`. The target's
   `getContentByPath()` returns `Content[]` (empty array if not found).
   Access `content[0]` for the first match. Do not assume the array has
   exactly one item.

5. **Locale handling moved to Next.js routing** — Remko's
   `localeToGraphLocale()` / `graphLocaleToLocale()` have no public
   equivalent. Locales are handled by Next.js route segments (e.g.,
   `[locale]`) and the `_metadata.locale` field on fetched content. If you
   have custom locale normalization logic, stop and document the use case
   rather than reimplementing Remko's private helpers.

6. **HMAC fetch does not carry to the runtime client** —
   `createHmacFetch()` has no public equivalent, and the target runtime
   `GraphClient` has **no HMAC path at all**. It signs nothing: published
   reads use the `epi-single` Single Key header and preview uses a per-request
   `Bearer <preview_token>`. Do not try to build a custom HMAC fetch wrapper
   or pass a `secret`. HMAC signing lives only in codegen/CLI tooling.

7. **Admin API / codegen symbols have no runtime equivalent** — The
   `OptimizelyGraphAdminApi` class and `getGraphQLCodegenSchema()` are
   replaced by the CLI (`optimizely-cms-cli config push/pull`). Admin
   operations are not part of the runtime SDK. See the
   `optimizely-remko-graph-cli-to-content-js` and
   `optimizely-remko-graph-functions-to-content-js` skills for those
   migrations.

8. **`ContentLink` type does not exist in the target** — Remko's
   `ContentLink`, `isContentLink()`, `normalizeContentLink()`,
   `contentLinkIsEqual()` have no equivalent. Content is fetched by key/path
   and returned as typed objects with `_metadata.key` / `_metadata.id`. If
   you need to compare content identity, use `_metadata.key`.

9. **Environment-variable casing matters** — The official SDK reads
   `OPTIMIZELY_GRAPH_GATEWAY` and `OPTIMIZELY_GRAPH_SINGLE_KEY` (not
   `CONTENTGRAPH_*`). Legacy aliases are not supported. Update `.env` and CI
   secrets.

10. **`config()` should be called once, in the root layout** — Do not call
    `config()` multiple times or in every component. Call it once in
    `app/layout.tsx`, then use `getClient()` everywhere else. Multiple
    `config()` calls can cause credential conflicts.

## Related Skills

- `optimizely-remko-cms-react-to-content-js` — Migrate `@remkoj/optimizely-cms-react` (component factory, rich-text)
- `optimizely-remko-cms-nextjs-to-content-js` — Migrate `@remkoj/optimizely-cms-nextjs` (Next.js integration, preview/OPE)
- `optimizely-remko-graph-functions-to-content-js` — Migrate `@remkoj/optimizely-graph-functions` (codegen)
- `optimizely-remko-cms-cli-to-content-js` — Migrate `@remkoj/optimizely-cms-cli` (`opti-cms` → `optimizely-cms-cli`)
- `optimizely-remko-graph-cli-to-content-js` — Migrate `@remkoj/optimizely-graph-cli` (`opti-graph` → `optimizely-cms-cli`)
- `optimizely-remko-cms-api-to-content-js` — Migrate `@remkoj/optimizely-cms-api` (Integration API client; straddle skill, do last)

**Shared references (read first)**:

- `../_shared-references/package-and-import-mapping.md` — Package/import subpath mapping
- `../_shared-references/auth-and-env-mapping.md` — Environment variables + CMS-55679 gotcha
- `../_shared-references/setup-and-di.md` — Channel/client init + factory registration + context wiring
