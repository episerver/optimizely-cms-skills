---
name: optimizely-remko-cms-nextjs-to-content-js
description: >-
  This skill should be used when the user asks to migrate off
  "@remkoj/optimizely-cms-nextjs", replace Remko Next.js helpers like
  createPage / createEditPageComponent / createPublishApi, swap the Remko
  catch-all page / preview route / publish handler for the official
  "@optimizely/cms-sdk" Next.js integration, migrate ".well-known" routes,
  "migrate optimizely-cms-nextjs", convert Remko page factory to app-owned
  Next.js pages, or fix Next.js routing / preview after switching SDKs.
---

# Migrate @remkoj/optimizely-cms-nextjs to @optimizely/cms-sdk

Guide the user through migrating from the community **Remko SDK**
(`@remkoj/optimizely-cms-nextjs`) to the official **Content JS SDK**
(`@optimizely/cms-sdk`), covering package replacement, catch-all page migration,
preview route migration, publish/revalidate handler migration, and `.well-known`
route wiring.

This skill handles the **Next.js integration surface** — page routing,
preview/OPE wiring, and publish/revalidate handlers. Complete the
`optimizely-remko-graph-client-to-content-js` and
`optimizely-remko-cms-react-to-content-js` migrations first (the Graph client
and React rendering surface are the foundation for Next.js pages).

## Discovery: customer artifacts

Before opening this skill's steps, run the shared discovery in
`../_shared-references/customer-artifacts-and-coexistence.md`. Real Next.js
migrations regularly stumble on artifacts the mapping tables below do not
cover: patches on `@remkoj/optimizely-cms-nextjs`, customer-authored
catch-all factory-option builders (`sharedCreatePageOptions.paramsToLocale`,
`propsToCmsPath`), custom `previewHeaders`-style middleware, and multi-brand
per-host channel selection. Catalogue these before touching the catch-all —
each is a Retain candidate that must be re-hosted app-side, not deleted.

## Replace / Retain / Remove

Before rewriting the catch-all, preview route, or publish handler, classify
every symbol in your Remko Next.js surface into one of three buckets (from
the official Optimizely-produced guide — see the shared reference):

- **Replace** — Standard responsibilities the SDK now owns:
  `createPage` / `createEditPageComponent` / `createPublishApi` factories,
  Remko's `.well-known/publish` handler wiring, the "escalate to HMAC on
  `draftMode()`" pattern on the catch-all, generated master queries.
- **Retain** — Application-specific behaviour that happens to live inside a
  Remko factory: `generateMetadata` shape, per-host channel resolution,
  multi-brand fallback loops, customer-authored `paramsToLocale` /
  vanity-URL rewrites, `optimizePublish` payload interpretation, custom
  `previewHeaders` middleware, additional `revalidatePath` targets
  (`sitemap.xml`, `robots.txt`).
- **Remove** — Infrastructure that only existed because Remko needed it:
  the `client: (_, scope) => …` two-arg draft-escalation callback,
  `updateAuthentication` / `enablePreview` calls, `AuthMode` imports,
  `refreshTimeout` factory option (subsumed by `NextPreviewComponent`
  props).

Only Replace items follow Steps 3–5 mechanically. Retain items get
re-hosted in app-owned code with their behaviour preserved; Remove items
get deleted with no target. See
`../_shared-references/customer-artifacts-and-coexistence.md` for the full
framework.

## Coexistence with other Remko surfaces

**This skill BLOCKS on the `cms-react` skill completing.** The catch-all
retype in Step 3 — swapping `OptimizelyNextPage as CmsComponent` type
imports (the reference project counted **61 files** across
`components/cms/{page,experience}/*`) — is a **hard compile gate**: every
such file must land in the same commit AND every corresponding
`contentType()` factory must already exist. Attempting Step 3 before the
cms-react migration has landed those factories will fail `pnpm typecheck`
across the whole app.

Order of operations, non-negotiable:

1. Complete `optimizely-remko-graph-client-to-content-js` (Step 1 —
   `getClient()` and `config()` exist).
2. Complete `optimizely-remko-cms-react-to-content-js` in full — every
   `contentType()` factory + `ContentProps<>` typing exists for every
   block, page, and experience.
3. Then run this skill. Catch-all rewrite (Step 3), preview rewrite
   (Step 4), publish handler rewrite (Step 5), and the 61-file type
   import cascade can now compile together.

Do **not** attempt a partial Next.js migration while cms-react is
mid-flight; the type-import cascade will not compile and rollback is
harder than sequencing correctly the first time. See
`../_shared-references/customer-artifacts-and-coexistence.md` "Coexistence"
rules 5 and 6.

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

- User wants to migrate from `@remkoj/optimizely-cms-nextjs` to the official
  `@optimizely/cms-sdk` Next.js integration
- User asks to replace `createPage`, `createLayout`, or
  `createEditPageComponent` with the official SDK
- User asks to swap the Remko catch-all page (`[[...path]]/page.tsx`) for the
  official SDK pattern
- User asks to migrate the preview route (`app/preview/page.tsx`) from Remko to
  the official SDK
- User asks to migrate publish/revalidate handlers (`createPublishApi`,
  `.well-known` routes) from Remko to the official SDK
- User asks about Next.js App Router vs Pages Router differences after migrating
  to the official SDK
- User asks about preview token shape or how preview auth works in the official
  SDK
- User wants a pre-migration assessment of `@remkoj/optimizely-cms-nextjs`
  usage before starting the migration
- User asks why preview is blank after migrating to the official SDK (CMS-55679
  gotcha: invalid/rotated Graph credentials **on the CMS instance**, which stops
  the CMS from publishing its schema to Graph — not a frontend preview-auth bug)

## Steps

### Step 1: Assess Current Usage

Before making changes, scan the project to understand migration scope.

1. **Detect `@remkoj/optimizely-cms-nextjs` imports**:
   ```bash
   grep -r "from '@remkoj/optimizely-cms-nextjs" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" .
   ```

2. **Scan for key symbols**:
   - `createPage` — catch-all page factory (generates `generateMetadata`,
     `generateStaticParams`, `CmsPage`)
   - `createLayout` — layout factory
   - `createEditPageComponent` — preview route factory
   - `createPublishApi` — publish/revalidate handler factory
   - `createClient` / `createAuthorizedClient` — root client factories
     (`createClient` is also the package `default` export; `getServerClient` /
     `getAuthorizedServerClient` are deprecated aliases). Commonly used in a
     central `src/api.ts` (`export const client = createClient()`).
   - `.well-known` route handlers (`channel`, `drafts`, `publish`) — CMS
     callback endpoints

3. **Check catch-all page usage** — find `app/[[...path]]/page.tsx` (or similar
   catch-all route) and confirm it uses `createPage(factory, options)`.

4. **Check preview route usage** — find `app/preview/page.tsx` and confirm it
   uses `createEditPageComponent(factory, options)`.

5. **Check publish handler usage** — find the publish route (path is app-owned:
   older starters use `.well-known/publish/route.ts`, newer ones use
   `app/api/content/publish/route.ts`) and confirm it uses
   `createPublishApi(options)`.

6. **Categorize migration effort**:
   - **Minimal**: Standard catch-all page + preview route + publish handler,
     no custom factory options
   - **Moderate**: Custom metadata generation, custom static params, or custom
     revalidation logic
   - **Significant**: Custom factory functions, advanced composition, or
     non-standard routing patterns

**If the user only asked for assessment, stop here and report.** Do not proceed
to migration steps.

### Step 2: Swap Packages

Remove the Remko package and add the official SDK.

**See `../_shared-references/package-and-import-mapping.md` for the complete
package mapping.**

```bash
# Remove community SDK
yarn remove @remkoj/optimizely-cms-nextjs

# Add official SDK (if not already present from graph-client/cms-react migrations)
yarn add @optimizely/cms-sdk
```

If the project also uses other `@remkoj` packages (`optimizely-graph-functions`,
`optimizely-cms-cli`, etc.), those will be migrated in separate steps — see the
related skills below. For now, only remove `optimizely-cms-nextjs`.

### Step 3: Migrate Catch-All Page Handler

**See `references/cms-nextjs-api-mapping.md` for the complete before/after
wiring.**

The Remko `createPage(factory, options)` pattern is replaced by an app-owned
catch-all page that fetches content via `getClient().getContentByPath(path)` and
renders with `OptimizelyComponent`.

**Before — Remko (`app/[[...path]]/page.tsx`):**

Note the **two-arg** `client` callback `(_, scope) => …`. On the standard
catch-all route, Remko escalated to draft auth in-place when Next.js draft mode
was on — flipping the shared client to HMAC and enabling preview:

```tsx
import { createPage } from '@remkoj/optimizely-cms-nextjs/page';
import { factory } from '@/components/factory';
import { createClient, AuthMode } from '@remkoj/optimizely-graph-client';
import { draftMode } from 'next/headers';

const { generateMetadata, generateStaticParams, CmsPage: Page } = createPage(factory, {
  client: (_, scope) => {
    const client = createClient();
    // Remko draft escalation — the catch-all served BOTH published and draft.
    if (draftMode().isEnabled) {
      client.updateAuthentication(AuthMode.HMAC);
      client.enablePreview();
    }
    return client;
  },
});

export { generateMetadata, generateStaticParams };
export default Page;
```

**After — Content JS SDK (app-owned):**

```tsx
import { getClient } from '@optimizely/cms-sdk';
import { OptimizelyComponent, withAppContext } from '@optimizely/cms-sdk/react/server';

// Route-segment config (G14): the catch-all serves PUBLISHED content only.
// Error (don't silently fall back) on unknown dynamic params, allow new paths
// at request time, and never time-based-revalidate (publish webhook drives it).
export const dynamic = 'error';
export const dynamicParams = true;
export const revalidate = false;

type Props = {
  params: Promise<{ path?: string[] }>;
};

export async function Page({ params }: Props) {
  const { path } = await params;
  const client = getClient();
  const content = await client.getContentByPath(`/${(path ?? []).join('/')}/`);

  return <OptimizelyComponent content={content[0]} />;
}

export default withAppContext(Page);
```

**Critical migration notes:**

1. **No factory function.** The target has no `createPage` helper. Author the
   page component directly.

2. **Fetch content yourself.** Call `getClient().getContentByPath(path)` in the
   page. It returns an **ARRAY** — access `[0]` for the first match.

3. **Wrap in `withAppContext`.** The target requires `withAppContext(Page)` to
   provide request-scoped context for preview and rendering.

4. **`generateMetadata` / `generateStaticParams` are app-owned.** The target
   does NOT generate these for you. If you need them, implement them yourself:
   ```tsx
   export async function generateMetadata({ params }: Props): Promise<Metadata> {
     const { path } = await params;
     const content = await getClient().getContentByPath(`/${(path ?? []).join('/')}/`);
     return { title: content[0]?.heading || 'Untitled' };
   }
   ```

5. **Draft escalation does NOT carry to the catch-all (G12).** Remko's two-arg
   `client` callback flipped the shared client to HMAC + preview when
   `draftMode().isEnabled` (see the "before"), so the *same* catch-all served
   drafts. The target has **no equivalent**:
   `getContentByPath` is **published-only** (it hard-codes an `undefined`
   preview token internally), and `updateAuthentication` / `enablePreview` /
   `AuthMode` do not exist in the target. **Do not** try to reproduce the
   draftMode escalation here. All draft / on-page-edit traffic goes through the
   dedicated `/preview` route + `getPreviewContent` (Step 4). Delete any
   `draftMode()` branch you find on the catch-all.

6. **Generated master queries evaporate (G13).** Remko's `createPage` /
   `getContentByPath` relied on the master query generated by
   `@gql/functions` codegen (from `@remkoj/optimizely-graph-functions`). Once
   that codegen is removed (see the graph-functions skill), those generated
   queries are gone. The target does **not** need them — `getContentByPath`
   builds its query generically from the **content-type registry** you wired in
   the root layout (`initContentTypeRegistry`, see cms-react skill). If content
   renders empty after migration, confirm the content types are registered, not
   that a master query is missing.

7. **Multi-site metadata fallback is app-owned (G16).** Real customers rarely
   have a single `getContentByPath` — they walk **channels** for
   `generateMetadata` and fall back site → global. A reference multi-brand
   catch-all iterates channels per request and calls `createPage` **three**
   times per request: `baseCmsPage` for `generateStaticParams`, per-channel
   for `generateMetadata`, per-channel for `CmsPage` render. The single
   `getContentByPath` above collapses that. For multi-brand customers you
   must port the per-channel loop into an app-owned `generateMetadata`
   yourself:

   ```tsx
   export async function generateMetadata({ params }: Props): Promise<Metadata> {
     const { path } = await params;
     const channels = await getChannelsForRequest(); // app-owned
     for (const channel of channels) {
       // app-owned per-channel client factory — see "channel option gap" below
       const client = getClientForChannel(channel);
       const content = await client.getContentByPath(`/${(path ?? []).join('/')}/`);
       if (content[0]) return buildMetadata(content[0], channel);
     }
     return buildMetadata(await getGlobalFallback(), null);
   }
   ```

   If your project doesn't do multi-brand, ignore this note. If it does, the
   number of `createPage` sites in your existing catch-all is the number of
   loop iterations you must reproduce in app code.

8. **`dynamic` mode is a semantic behaviour shift (G17).** A typical
   existing catch-all uses `export const dynamic = 'force-dynamic'`; this
   skill's target uses `dynamic = 'error'`. These are not equivalent:

   - `'force-dynamic'` opts the route in to per-request rendering — reading
     `cookies()`, `headers()`, `searchParams`, or any dynamic API renders
     fine at request time.
   - `'error'` **prevents any dynamic behaviour** from silently rendering
     statically — reading a dynamic API throws at build time.

   Before switching a mature catch-all from `'force-dynamic'` to `'error'`,
   audit whether it (or components it renders) call `cookies()`,
   `headers()`, `draftMode()`, `searchParams`, or fetches with `cache:
   'no-store'`. If it does, either (a) keep `'force-dynamic'`, or (b) move
   those calls into a dedicated dynamic route and leave the catch-all as
   `'error'`. Do not switch blind.

9. **`channel` option has no `getClient()` equivalent (G18).** Remko's
   `createPage(factory, { channel, … })` per-request pattern accepts a
   `channel` factory option; a `sharedCreatePageOptions` helper commonly
   uses this to select a brand-specific channel per host. `getClient()` in
   the target takes no `channel` argument. Two workarounds:

   - **Multi-tenant per-host:** call `config({ channel })` scoped by
     request host at the top of your `generateMetadata`/page function.
     `config()` mutates a module-level singleton, so this is only safe if
     every downstream call in the request completes before the next
     request arrives — verify your Next.js runtime does not interleave.
   - **Per-request client factory (safer):** keep an app-layer
     `getClientForChannel(channel)` helper that instantiates a fresh
     `GraphClient` per channel and passes it down explicitly instead of
     relying on the singleton. This is the canonical pattern used by
     projects with a `content.ts` module; port it forward.

   Neither is a one-line change. Add the workaround decision to your
   migration plan before touching the catch-all.

### Step 4: Migrate Preview Route

**See `references/cms-nextjs-api-mapping.md` for the complete before/after
wiring, and see `../_shared-references/auth-and-env-mapping.md` for preview
auth (a per-request Bearer `preview_token` — NOT App Key + Secret).**

The Remko `createEditPageComponent(factory, options)` pattern is replaced by an
app-owned preview route that uses `getClient().getPreviewContent(await searchParams)`
+ `NextPreviewComponent` + `OptimizelyComponent`. The preview client is the
**same single-key `getClient()`** as the published route — the draft
authorization is the `preview_token` the CMS puts in the preview-URL
`searchParams`, which `getPreviewContent` reads and sends as `Bearer`.

**Before — Remko (`app/preview/page.tsx`):**

```tsx
import { createEditPageComponent } from '@remkoj/optimizely-cms-nextjs/preview';
import { factory } from '@/components/factory';
import { getContentById } from '@/gql/functions';
import { createClient } from '@remkoj/optimizely-graph-client';

export default createEditPageComponent(factory, {
  loader: getContentById,
  clientFactory: (token?: string) => createClient(undefined, token),
  refreshTimeout: 500,
});

export const dynamic = 'force-dynamic';
```

**After — Content JS SDK (app-owned):**

```tsx
import { getClient } from '@optimizely/cms-sdk';
import { OptimizelyComponent, withAppContext } from '@optimizely/cms-sdk/react/server';
import { NextPreviewComponent } from '@optimizely/cms-sdk/react/nextjs';
import Script from 'next/script';

// Route-segment config (G14/G15): preview must always run fresh on the server.
// Force dynamic rendering, never cache the fetch, never revalidate, and pin the
// Node.js runtime (the SDK server surface is not edge-safe).
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;
export const runtime = 'nodejs';

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function Page({ searchParams }: Props) {
  // Same single-key client as the published route. The draft authorization is
  // the preview_token inside searchParams, which getPreviewContent sends as Bearer.
  const client = getClient();
  const response = await client.getPreviewContent(await searchParams);

  return (
    <>
      <Script
        src={
          new URL(
            '/util/javascript/communicationinjector.js',
            process.env.OPTIMIZELY_CMS_URL
          ).href
        }
      ></Script>
      <NextPreviewComponent refreshTimeout={50} />
      <OptimizelyComponent content={response} />
    </>
  );
}

export default withAppContext(Page);
```

**Critical migration notes:**

1. **No factory function.** The target has no `createEditPageComponent` helper.
   Author the preview route directly.

2. **No HMAC, no secret, no second client.** Use the same single-key
   `getClient()` as the published route — do **not** call
   `new GraphClient(appKey, { secret })`. `GraphOptions` has **no `secret`
   field** (it is a type error), and the target client never signs HMAC. Draft
   authorization is the per-request Bearer `preview_token` that
   `getPreviewContent` reads from `searchParams`. See
   `../_shared-references/auth-and-env-mapping.md` for the full model.

3. **`getPreviewContent(searchParams)` auto-populates context.** The target's
   `getPreviewContent` method automatically populates the request-scoped context
   with preview parameters (`preview_token`, `locale`, `key`, `version`, `mode`).
   No need to extract them manually.

4. **`NextPreviewComponent` for live updates.** The target ships a Next.js
   optimized preview component (`@optimizely/cms-sdk/react/nextjs`) that handles
   soft refresh (`router.refresh()`) for same-URL updates and navigation for
   different URLs. Use it instead of the generic `PreviewComponent`.

5. **`<Script>` loads the communication injector.** The CMS needs the injector
   script to enable two-way communication between the preview window and the
   editor. Use Next.js `Script` (or a plain `<script>` tag in other frameworks).

6. **Registries live in the root layout, not the preview route (G15).** Remko
   passed `factory` into `createEditPageComponent`. The target initializes the
   three registries once in the root `layout.tsx`
   (`initContentTypeRegistry` / `initReactComponentRegistry` /
   `initDisplayTemplateRegistry` — see the cms-react skill and
   `../_shared-references/setup-and-di.md`). The preview route does **not**
   re-register anything and does **not** receive a `setupFactory()` argument —
   it just calls `getClient()` and renders `OptimizelyComponent`. If your Remko
   preview passed a factory, drop that argument; the layout already wired it.

7. **CMS-55679 gotcha (CMS-instance credentials).** If preview renders blank,
   the usual root cause is **not** the frontend preview auth — it is
   invalid/rotated Graph credentials **on the CMS instance**, which make the CMS
   `EnsureSchemaInitializationModule` abort at startup → `_Content` type never
   published → Graph returns empty/404 for *both* published and preview. Verify
   the CMS instance's Graph credentials before debugging the preview route. See
   `../_shared-references/auth-and-env-mapping.md`.

8. **Preview acceptance checklist (from the official Optimizely guide).**
   The guide explicitly states that "preview must be treated as a separate
   acceptance criterion" and enumerates eight scenarios that must be
   verified against the migrated preview route. Do not mark preview
   migration complete until every applicable box is checked:

   - [ ] **Drafts / unpublished content** load in preview (not just
         published)
   - [ ] **Site / channel context** — the correct site or channel is
         resolved in preview (matches the editor's active site)
   - [ ] **Multilingual preview** — locale routing works and preview
         reflects the editor's selected language
   - [ ] **Global / shared content** — shared blocks / global settings
         render correctly inside the preview
   - [ ] **Authentication** — preview auth (Bearer `preview_token` in the
         target) accepts editor sessions without extra prompts
   - [ ] **Visual Builder** — VB compositions render and mutate correctly
         in preview (`OptimizelyComposition` receives `nodes={x.nodes}`,
         not `node={x}`)
   - [ ] **Editor iframe behaviour** — the CMS iframe correctly boots the
         communication injector, receives soft-refresh signals, and does
         not double-render
   - [ ] **Nested editable content** — nested / content-area editable
         fields respect `data-epi-*` attributes injected by
         `OptimizelyComponent`

   Assumed-working preview is the #1 migration regression. Test each
   scenario against a real CMS instance before signing off. The list comes
   directly from the guide's "Migrate preview/editing deliberately"
   section.

9. **Header-based preview must reconcile with `searchParams` (G19).** A
   typical `previewHeaders` middleware sets a project-prefixed preview
   token (e.g., `X_<PROJECT>_PREVIEW_TOKEN`) plus a handful of companion
   headers on requests to `/…/preview`; the target's
   `getPreviewContent(searchParams)` reads from **URL searchParams**, not
   headers. If your project has a middleware-set header-based preview
   pipeline, pick one:

   - **(a) Promote header → query string in middleware.** Rewrite the
     `previewHeaders` middleware to append the token as a `?preview_token=…`
     query param before the request hits `/preview`. Cleanest — the SDK's
     `getPreviewContent(await searchParams)` then works unmodified.
   - **(b) Bypass `getPreviewContent` and call `getContentByPath` with
     an explicit preview token.** In the preview route body, read the
     header directly and pass it as an option to a per-call fetch:
     `getContentByPath(path, { previewToken })`. Loses `getPreviewContent`'s
     auto-context population — you must manually push `locale`, `key`,
     `version`, `mode` into the SDK context yourself.

   Option (a) is preferred; (b) is only worth it if you have header-only
   deployment constraints. Either way, do not leave the header-set
   `previewHeaders` middleware live alongside an unmodified
   `getPreviewContent(await searchParams)` call — the token will silently
   be missing and preview will render as published.

### Step 5: Migrate Publish/Revalidate + `.well-known` Routes

**See `references/cms-nextjs-api-mapping.md` for the complete before/after
wiring.**

The Remko `createPublishApi(options)` pattern has **no direct equivalent** — the
target does NOT provide a publish/revalidate helper. Revalidation and publish
wiring is app-owned. You implement the `.well-known` route handlers yourself and
call Next.js `revalidatePath` / `revalidateTag`.

**Before — Remko (`app/.well-known/publish/route.ts`):**

```tsx
import createPublishApi from '@remkoj/optimizely-cms-nextjs/publish';

const handler = createPublishApi({ optimizePublish: true });

export const dynamic = 'force-dynamic';
export const GET = handler;
export const POST = handler;
```

**After — Content JS SDK (app-owned, using Next.js revalidation):**

```tsx
import { revalidatePath, revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const body = await request.json();

  // Example: revalidate by path (adjust based on your CMS publish webhook payload)
  if (body.path) {
    await revalidatePath(body.path);
  }

  // Example: revalidate by tag (if you use cache tags)
  if (body.tags) {
    for (const tag of body.tags) {
      await revalidateTag(tag);
    }
  }

  return NextResponse.json({ revalidated: true, now: Date.now() });
}

export const dynamic = 'force-dynamic';
export const GET = POST; // Some CMS webhooks use GET for verification
```

**Critical migration notes:**

1. **No helper function.** The target has **no direct equivalent** to
   `createPublishApi`. Revalidation and publish wiring is app-owned.

2. **Next.js revalidation is app-owned.** Call Next.js `revalidatePath` or
   `revalidateTag` yourself when the CMS publishes content. The payload shape
   depends on your CMS publish webhook configuration.

3. **`.well-known` routes are app-owned.** Implement the
   `.well-known/{channel,drafts,publish}` route handlers yourself. The Remko
   package provided these; the target does not.

4. **Optimizely CMS publish webhooks.** Configure the CMS to POST to your
   `.well-known/publish` route (e.g.,
   `https://yourdomain.com/.well-known/publish`) when content is published. The
   payload typically includes the content key/path. Parse it and call
   `revalidatePath` / `revalidateTag` accordingly.

5. **`optimizePublish: true` semantics must be re-derived (G20).** Remko's
   `optimizePublish` factory option quietly implemented a specific
   revalidation policy — typically only the changed path plus its parents,
   not the whole app. The skill's minimal example above only handles the
   single-path case (`revalidatePath(body.path)`). To reimplement the
   `optimizePublish: true` semantics faithfully you must know Remko's
   webhook **payload contract** — typically `{ key, path, locale, action }`
   in reference setups, but verify against your customer's actual Graph
   webhook configuration (inspect one live payload from the CMS's publish
   event log, or read the Remko source at
   `@remkoj/optimizely-cms-nextjs/publish` to derive the exact shape).
   Common fields to handle:

   - `path` — pass to `revalidatePath(path)` (and optionally
     `revalidatePath(path, 'layout')` to invalidate segment layouts).
   - `key` — content key; useful for tag-based revalidation
     (`revalidateTag(\`content:${key}\`)`) if your fetches use tags.
   - `locale` — for multi-locale apps, revalidate only the matching
     locale's path (`/${locale}${path}`).
   - `action` — `'publish' | 'delete' | 'revert'`; delete/revert should
     also revalidate the parent to remove stale nav entries.

6. **`additionalPaths` is a trivial addendum but must run on every
   webhook.** A typical Remko handler passes `additionalPaths:
   ['/sitemap.xml', '/robots.txt']`. Port this as an unconditional call
   at the top or bottom of the POST handler:

   ```tsx
   const ADDITIONAL_PATHS = ['/sitemap.xml', '/robots.txt'];
   for (const p of ADDITIONAL_PATHS) revalidatePath(p);
   ```

   Do not gate it on `body.path` — the sitemap must invalidate on every
   publish regardless of which content triggered it.

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

3. **Runtime smoke test** — start the app and verify pages render:
   ```bash
   yarn dev
   ```
   Navigate to a catch-all page (e.g., `/about/`) and confirm it fetches and
   renders content correctly.

4. **Preview smoke test** — open the preview route (`http://localhost:3000/preview`)
   from the CMS and confirm:
   - Content loads (not blank)
   - Live updates work (edit content in the CMS and watch the preview refresh)
   - The communication injector loads (check the network tab for
     `communicationinjector.js`)

5. **Publish smoke test** — publish content in the CMS and confirm:
   - The `.well-known/publish` route receives the webhook POST
   - `revalidatePath` / `revalidateTag` is called
   - The page cache is invalidated (visit the page and confirm the new content
     appears)

6. **Check for dual-React issues** — if you see errors like "invalid hook call"
   or "multiple copies of React", ensure the project has only one React version
   installed:
   ```bash
   yarn why react
   ```
   Remove duplicate React installs if found.

CRITICAL: Do not report migration complete until `yarn build` succeeds, the
runtime smoke test confirms pages render, AND the preview smoke test confirms
live preview works.

## Common Pitfalls

1. **Preview token shape** — Remko's `getContentById(ref, token)` takes the
   token as a positional arg. The target's `getContent(reference, options)`
   takes it as `options.previewToken`. Do not pass the token as a second
   positional arg.

2. **Revalidate wiring is app-owned** — The target has **no helper function**
   for publish/revalidate handlers. You must implement the `.well-known` routes
   yourself and call Next.js `revalidatePath` / `revalidateTag`. Do not try to
   import a `createPublishApi` equivalent from the target SDK.

3. **App Router vs Pages Router** — The target is designed for Next.js 14+ App
   Router (`app/` directory). If your project uses the Pages Router (`pages/`
   directory), the migration is more complex — you'll need to convert to App
   Router first or adapt the examples to the Pages Router conventions (e.g.,
   `getServerSideProps` instead of `async function Page({ params })`).

4. **CMS-55679 blank preview gotcha** — If preview renders blank, the root cause
   is usually invalid/rotated Graph credentials **on the CMS instance** (not the
   frontend). The CMS `EnsureSchemaInitializationModule` aborts at startup →
   `_Content` type never published → Graph returns empty/404 for published *and*
   preview. **Verify the CMS instance's Graph credentials before debugging the
   frontend.** See `../_shared-references/auth-and-env-mapping.md` for the
   complete auth mapping and CMS-55679 details.

5. **Server-only import boundary** — The target's
   `@optimizely/cms-sdk/react/server` exports are server-only (they import
   `'server-only'`). Client components must import from
   `@optimizely/cms-sdk/react/client`. If you see errors like "server-only
   module imported into client component", move the import to a server component
   or use the client subpath.

6. **Dual-React duplication** — If you see "invalid hook call" or "multiple
   copies of React" errors, the project has duplicate React installs. Run
   `yarn why react` and remove duplicates. This is common when migrating from
   Remko because the Remko packages pin a specific React version.

7. **`getContentByPath` returns an ARRAY** — The target's
   `getClient().getContentByPath(path)` returns an **ARRAY** of matches, not a
   single content object. Access `[0]` for the first match. If you forget this,
   `content` will be an array and `OptimizelyComponent` will render nothing.

8. **`generateMetadata` / `generateStaticParams` are app-owned** — The target
   does NOT generate these for you. If you need them, implement them yourself in
   the catch-all page. Do not expect `createPage` to generate them.

9. **Preview `searchParams` are async in Next.js 15+** — If you see errors like
   "searchParams is a promise", upgrade your code to `await searchParams` (Next.js
   15+ made `searchParams` async). The examples above use `await searchParams`.

10. **`NextPreviewComponent` is from `./react/nextjs`, not `./react/client`** —
    The target ships a Next.js optimized preview component at
    `@optimizely/cms-sdk/react/nextjs`. Do not import `PreviewComponent` from
    `./react/client` unless you're using a non-Next.js framework.

11. **No `secret` on the preview client** — `GraphOptions` has **no `secret`
    field**. `new GraphClient(appKey, { secret })` is a type error and reflects
    the Remko HMAC model, which the target does not use. The preview route uses
    the same single-key `getClient()`; the draft authorization is the Bearer
    `preview_token` from `searchParams`, read by `getPreviewContent`.

12. **Draft escalation does not carry to the catch-all** — If your Remko
    catch-all had a two-arg `client: (_, scope) => …` callback that called
    `updateAuthentication(AuthMode.HMAC)` / `enablePreview()` under
    `draftMode().isEnabled`, do **not** port it. Those symbols don't exist in
    the target and `getContentByPath` is published-only. Drafts flow only
    through the `/preview` route + `getPreviewContent`. Remove `draftMode()`
    branches from the catch-all.

13. **Missing route-segment config** — The catch-all needs `dynamic = 'error'`,
    `dynamicParams = true`, `revalidate = false`; the preview route needs
    `dynamic = 'force-dynamic'`, `fetchCache = 'force-no-store'`,
    `revalidate = 0`, `runtime = 'nodejs'`. Remko's `createPage` /
    `createEditPageComponent` set these internally; app-owned pages must export
    them explicitly or preview will serve stale/cached content and the catch-all
    may silently cache drafts.

## Related Skills

This is skill **3 of 3** in the migration sequence. Complete these in order:

1. `optimizely-remko-graph-client-to-content-js` — Migrate `@remkoj/optimizely-graph-client` (Graph client, fetching) — **complete this first**
2. `optimizely-remko-cms-react-to-content-js` — Migrate `@remkoj/optimizely-cms-react` (React rendering surface, component factory) — **complete this second**
3. **This skill** (`optimizely-remko-cms-nextjs-to-content-js`) — Migrate `@remkoj/optimizely-cms-nextjs` (Next.js integration, preview/OPE, publish/revalidate)

Additional related skills:

- `optimizely-remko-graph-functions-to-content-js` — Migrate `@remkoj/optimizely-graph-functions` (codegen)
- `optimizely-remko-cms-cli-to-content-js` — Migrate `@remkoj/optimizely-cms-cli` (`opti-cms` → `optimizely-cms-cli`)
- `optimizely-remko-graph-cli-to-content-js` — Migrate `@remkoj/optimizely-graph-cli` (`opti-graph` → `optimizely-cms-cli`)
- `optimizely-remko-cms-api-to-content-js` — Migrate `@remkoj/optimizely-cms-api` (Integration API client; straddle skill, do last)

**Shared references (read first)**:

- `../_shared-references/package-and-import-mapping.md` — Package/import subpath mapping
- `../_shared-references/auth-and-env-mapping.md` — Environment variables + CMS-55679 gotcha
- `../_shared-references/setup-and-di.md` — Channel/client init + factory registration + context wiring
- `../_shared-references/customer-artifacts-and-coexistence.md` — Patched packages, wrappers, Replace/Retain/Remove framework, coexistence rules

## References

- **Official Optimizely migration guide** — *Migrating from Remko.J to
  the Optimizely CMS JavaScript SDK* (Confluence). Source of the
  Replace/Retain/Remove framework and the eight preview acceptance
  criteria (Step 4, note 8).
- **Optimizely CMS JavaScript SDK repo** —
  https://github.com/episerver/content-js-sdk. Read
  `packages/cms-sdk/src/react/nextjs` for `NextPreviewComponent` internals
  and `packages/cms-sdk/src/client` for `getPreviewContent` /
  `getContentByPath` semantics.
- **Optimizely CMS SDK + Next.js 16 starter** (primary practical
  reference) — https://github.com/episerver/content-js-sdk/tree/main/samples/nextjs-template. The
  minimal working shape of every route this skill covers: catch-all,
  preview, publish handler, root layout registry init. Diff your project
  against it during Step 6 verification.
- **Direct-Graph Next.js 15 starter (Szymon Uryga)** — supplementary
  reference. https://github.com/SzymonUryga/optimizely-graph-nextjs-starter.
  Useful for deciding what does **not** need to become SDK-specific code
  (Draft Mode, Visual Builder, multi-language, webhook-driven cache
  revalidation without Remko).
- **Shared discovery reference** —
  `../_shared-references/customer-artifacts-and-coexistence.md`. Read
  before Step 1 assessment.
