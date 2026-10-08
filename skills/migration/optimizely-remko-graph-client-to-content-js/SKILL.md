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

## Replace / Retain / Remove (classify before touching code)

Before running Step 1, classify every Remko-touching surface into one of three
buckets from the official Optimizely migration guide:

| Bucket | Definition | Migration action |
|--------|------------|------------------|
| **Replace** | Standard CMS retrieval/rendering currently done by Remko | Follow this skill's Step 5 mappings |
| **Retain** | Genuine application-specific behaviour that happens to use Remko helpers | Preserve behaviour; port to app-owned code without a Remko import |
| **Remove** | Infrastructure that exists only because the previous integration required it | Delete outright; do not port |

**This skill's Step 5 API mappings assume Replace.** For Retain items (e.g.,
a multi-brand `channelDefs.ts`, custom sitemap crawls, business-specific
query composition), the correct move is to keep the logic and swap only the
type substrate (see channel-model preservation pattern in Step 5). For
Remove items
(e.g., helpers that only exist to work around Remko-specific quirks), delete
without a replacement.

See `../_shared-references/customer-artifacts-and-coexistence.md` for the full
framework and worked examples.

## Coexistence with other Remko surfaces

This skill handles Graph client only. When it lands but sibling Remko packages
(`optimizely-cms-react`, `optimizely-cms-nextjs`, `optimizely-graph-functions`,
`optimizely-cms-api`) remain installed, the migration is partial by design —
that is the intended flow, not a failure state.

Expect these coexistence effects after this skill's changes land:

- **Mixed clients coexist.** `getClient()` (SDK) and `createClient(...)` (Remko)
  can both be instantiated in the same runtime; they read the same Graph. Do
  not force every `createClient(...)` call site to migrate in this pass.
- **`ctx.client` from `GenericContext` stays typed as `IOptiGraphClient`** until
  the `optimizely-remko-cms-react-to-content-js` skill runs. Do not retype it
  early — `@remkoj/optimizely-cms-react` still owns that type.
- **Codegen output remains valid.** `@/gql/*` typed imports keep resolving as
  long as `graphql-codegen` still runs — a partially migrated project can call
  SDK typed methods and codegen'd fragments in the same file.
- **Expect `pnpm typecheck` errors between phases.** Files that call methods
  only on Remko's client (`.query()`, `.updateAuthentication()`,
  `.enablePreview()`) will fail typecheck after `graph.ts` moves to `GraphClient`.
  Use those errors as a scope map for the next surface, not as a blocker for
  this one.

Full rules — including what NOT to remove between phases — in
`../_shared-references/customer-artifacts-and-coexistence.md`.

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

**Discovery: customer artifacts (do this BEFORE the symbol scan).** Real
customer repos rarely have a clean Remko install. Check for these three
artifact classes first — they change the migration plan, not just the scope:

- **Patches on Remko packages** — `patches/@remkoj+*.patch`,
  `pnpm.patchedDependencies`, or `resolutions`/`overrides` blocks. Every patch
  encodes a behaviour the customer's team believed was important enough to
  fork. Catalogue what each patch changes BEFORE removing the package.
- **Custom wrappers around Remko types** — files that import a Remko type
  and re-export an augmented one (e.g., a `remkojExt.ts` wrapper). The
  wrapper's business logic must survive the migration; the Remko type
  substrate is what moves.
- **Forked / patched codegen tooling** — `file:` protocol deps, tarball
  overrides, and patches on `graphql-codegen*` packages. These usually travel
  as a set; deciding to keep or abandon codegen determines whether all of them
  move forward.

If any of these exist, read
`../_shared-references/customer-artifacts-and-coexistence.md` fully before
proceeding — otherwise you will silently drop customer-specific behaviour.

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

**Flag translation table (per-flag, concrete):**

| Remko flag | Remko behaviour | Content JS SDK translation |
|---|---|---|
| `nextJsFetchDirectives: true` | Emit Next.js-specific `fetch` cache directives on every Graph request | **Default in Next.js 14+ App Router.** No explicit config needed unless overriding — the SDK's underlying `fetch()` respects Next's request cache automatically. Delete the flag; do not search for an equivalent option. |
| `cache: false` (or `cache: 'no-store'`) | Disable Next.js data cache for Graph responses | Set at the **route segment** that must be uncached: `export const fetchCache = 'force-no-store'` OR `export const revalidate = 0`. If only some fetches must be uncached, use `fetch(..., { cache: 'no-store' })` at the call site (SDK methods pass through Next fetch options). |
| `cache: true` (default) | Use Next.js data cache | No action needed — this is the default. |
| `queryCache: false` | Disable Remko's in-memory query dedupe within a single request | **No direct equivalent.** Next.js's built-in `fetch` cache already dedupes identical requests per render. To force a fresh request per call (e.g., different preview tokens), vary something in the request — the SDK's preview flow already varies by `previewToken`, so passing different tokens per call is enough to defeat dedupe. Do not build a custom in-memory cache. |
| `queryCache: true` (default) | Enable in-memory dedupe | No action needed — Next.js dedupes by default. |
| `omitEmpty` / `includeDeleted` | Query-shape flags | No direct equivalent. Apply at the fetch call site as filter options where the SDK method exposes them; otherwise drop. |

**Reference case (2026-09):** a project's `apps/cms/src/lib/graph.ts`
called `createClient(undefined, undefined, { nextJsFetchDirectives: true, cache: true, queryCache: true })`
at 11+ sites. The migration deleted all three flags from the client
construction and let Next.js defaults handle caching; no route-segment
`fetchCache`/`revalidate` was needed because default behaviour matched
production intent. Only routes that must bypass caching (preview, publish
handlers) got explicit `fetchCache = 'force-no-store'`.

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

#### (b′) `RouteResolver.getRoutes()` → direct GraphQL against `_Content`

`RouteResolver` also exposes `.getRoutes(baseUrl?, includeDefaultLocale?)` for
sitemap generation — the "give me every routable page" call. **The SDK has no
`getClient().getRoutes()` equivalent.** The recommended pattern is a paged
direct GraphQL query against `_Content` using `graphql-request` (already in
most Next.js starter deps).

**Before — Remko (`app/sitemap.ts`):**

```ts
import RouteResolver from '@remkoj/optimizely-graph-client/router';
import { client } from '@/lib/api';

export default async function sitemap() {
  const resolver = new RouteResolver(client);
  return (await resolver.getRoutes(process.env.SITE_URL, true))
    .map((r) => ({ url: r.url, lastModified: r.changed }));
}
```

**After — Content JS SDK (direct GraphQL):**

```ts
import { GraphQLClient, gql } from 'graphql-request';

const query = gql`
  query GetSitemapRoutes($skip: Int!, $limit: Int!) {
    _Content(skip: $skip, limit: $limit) {
      items {
        _metadata {
          url { hierarchical default }
          locale
          lastModified
        }
      }
      total
    }
  }
`;

export default async function sitemap() {
  const gateway = process.env.OPTIMIZELY_GRAPH_GATEWAY;
  const key = process.env.OPTIMIZELY_GRAPH_SINGLE_KEY;
  if (!gateway || !key) return []; // fail soft

  const graph = new GraphQLClient(`${gateway}/content/v2`, {
    headers: { 'epi-single': key },
  });

  const routes = [];
  let skip = 0;
  const limit = 100;
  while (true) {
    const { _Content } = await graph.request(query, { skip, limit });
    routes.push(...(_Content.items ?? []));
    if (routes.length >= _Content.total) break;
    skip += limit;
  }
  return routes.map((r) => ({
    url: r._metadata.url.hierarchical ?? r._metadata.url.default,
    lastModified: r._metadata.lastModified,
  }));
}
```

A production version of `apps/cms/src/app/sitemap.ts` typically also strips
the default-locale slug and rewrites the base URL — port that logic
verbatim once the paged query above is in place.

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

#### (e) Channel-model preservation (customer-owned channel type)

Step 4 above says `ChannelRepository.createDefinition(...)` has **no direct
equivalent** and channel identity moves to `buildConfig()` + `config()` +
Next.js routing. That is correct for greenfield / starter-shaped apps. For
customers with a **substantive multi-site channel model keyed to Remko's
`ChannelDefinition`** (many brands, per-locale metadata, per-brand
document-type overrides), do **not** try to shoehorn the model into the SDK's
`config()` / `buildConfig()` shape — the SDK does not model per-channel data.

**Recommended pattern: preserve the channel model, swap only the type
substrate.** Define an app-owned type file (e.g., `channelTypes.ts`) that
exports `ChannelDefinition`, `ChannelDefinitionData`, `ChannelDomain`,
`ChannelLocale` with structurally-identical shape to Remko's exports, then
switch the app's channel-registry file (e.g., `channelDefs.ts`) to import
from the app-owned module. This is a **Retain** classification (see
Replace/Retain/Remove above): the channel data itself is customer business
logic, and only the type substrate migrates.

**Reference case (2026-09):** a multi-brand
`apps/cms/src/config/channelDefs.ts` of ~470 lines defining ~30
brand-specific `ChannelDefinition` instances plus `docConfigurationTypeName`,
`additionalLocales`, and a `globalChannel()` helper. The migration created a
~65-line `apps/cms/src/config/channelTypes.ts` re-exporting the four types
with the same shape previously consumed from `@remkoj/optimizely-graph-client`.
The data file was untouched except for the import; the 25+ downstream files
reading `ChannelDefinition` recompiled without changes.

#### (f) Preview auth: header → searchParam sub-decision

The skill's main preview guidance says HMAC has no target — preview uses a
per-request `Bearer <preview_token>`. That is complete for greenfield
projects, but customers with an established custom preview flow face a second
decision: **how does the preview token get from the request into the SDK
call?**

The SDK's canonical preview entry point is
`getClient().getPreviewContent(searchParams)`, which reads the token from
**URL search params** (the shape the CMS preview UI sends by default).
Customers with a header-based preview envelope (e.g., a project-prefixed
`X_<PROJECT>_PREVIEW_TOKEN` custom header set by middleware) must choose
between:

| Option | How the token reaches the SDK | Best for |
|---|---|---|
| **(a) Middleware promotes header → query param** | Middleware on `/preview` reads the custom header and rewrites the request URL to include `?preview_token=...`; page uses `getPreviewContent(searchParams)` unchanged | Projects that want to keep the SDK's canonical preview path and only touch middleware |
| **(b) Helper bypasses `getPreviewContent`** | Route handler reads the header directly and calls `getClient().getContent(path, { previewToken })` or `getContentByPath(path, { previewToken })` — bypassing `getPreviewContent` entirely | Projects with a multi-header preview envelope (chrome mode, edit mode, channel id) that already flows through app-owned code |

Neither option is wrong; the choice is driven by how many other preview
headers the customer sends alongside the token. The reference project — a
5-header envelope (token, chrome mode, edit mode, channel id, path) —
picked option (b): the existing `previewHeaders` middleware keeps firing,
and the Phase 1 `graph.ts` exposes a `getPreviewToken(ctx)` helper that
callers pass into per-call `{ previewToken }` options.

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
- `../_shared-references/customer-artifacts-and-coexistence.md` — Patch/wrapper/fork discovery + Replace-Retain-Remove framework + coexistence rules

## References

- **Official Optimizely migration guide** — *Migrating from Remko.J to the
  Optimizely CMS JavaScript SDK* (Confluence). Source-of-truth for the
  Replace/Retain/Remove classification and the "assess, don't rebuild"
  positioning. Cited in
  `../_shared-references/customer-artifacts-and-coexistence.md`.
- **Optimizely CMS JavaScript SDK repo** —
  https://github.com/episerver/content-js-sdk
- **Optimizely CMS SDK + Next.js 16 starter** (primary practical reference) —
  https://github.com/episerver/content-js-sdk/tree/main/samples/nextjs-template
- **Direct-Graph Next.js 15 starter** (supplementary reference, by Szymon
  Uryga — useful for what does NOT need to become SDK-specific code, e.g.,
  sitemap crawls, direct GraphQL for `_Content`) —
  https://github.com/SzymonUryga/optimizely-graph-nextjs-starter
- **Customer artifacts & coexistence shared reference** —
  `../_shared-references/customer-artifacts-and-coexistence.md`
