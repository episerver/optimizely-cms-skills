# CMS Next.js API Mapping: Remko SDK → Content JS SDK

Complete mapping of `@remkoj/optimizely-cms-nextjs` symbols to their
`@optimizely/cms-sdk` equivalents. Every row is grounded in the real exports
of each package (source: `@remkoj/optimizely-cms-nextjs`, target:
`@optimizely/cms-sdk`), read 2026-09-11.

## Prerequisite — React 19 / Next 14 (do this first)

> **`@optimizely/cms-sdk` requires React ≥19 and Next ≥14.** The target declares
> `peerDependencies: { react: ">=19.0.0", next: ">=14.0.0" }` in its
> `package.json`. This requirement is **not** stated in the target's prose docs —
> it lives only in the manifest, so it is easy to miss. The community demo
> (`cms-saas-vercel-demo`) runs **React 18.3.1**, so migration is **blocked at
> step 0** until the framework is upgraded. Before touching any Next.js page:
> upgrade `react`/`react-dom` to `^19`, `@types/react`/`@types/react-dom` to
> `^19`, and `next` to `≥14`, then resolve React-19 breaking changes (e.g.
> `useRef` now requires an initial argument, stricter ref/`use()` semantics).
> Only then apply the mappings below. This mirrors the prerequisite in the
> `optimizely-remko-cms-react-to-content-js` skill — the two upgrades are the
> same one; do it once for the whole app.

## Root exports (`.`)

The Remko root exports are **utility functions** (link helpers, locale helpers)
and **type guards**. Most have no direct equivalent in the target because the
target delegates link/path logic to the framework (Next.js) and uses typed
content keys/paths instead of `ContentLink` structures.

| Remko symbol (subpath) | signature | @optimizely equivalent | migration note |
|---|---|---|---|
| `createClient` (`.`, also the **`default` export**) | `function createClient(): IOptiGraphClient` — thin wrapper over `@remkoj/optimizely-graph-client`'s `createClient()` | `getClient()` (published reads) / `new GraphClient(singleKey, { … })` | **Primary client factory** and the package `default` export, so it appears as both `import { createClient } from '@remkoj/optimizely-cms-nextjs'` and `import client from '@remkoj/optimizely-cms-nextjs'`. This is what the canonical starter's `src/api.ts` uses (`export const client = createClient()`). Both forms map to the target's single-key client: call `config()` once in the root layout, then `getClient()` everywhere. See `setup-and-di.md`. |
| `createAuthorizedClient` (`.`) | `function createAuthorizedClient(token?: string, config?: OptimizelyGraphConfig): IOptiGraphClient` | `getClient()` (+ Bearer `preview_token` on preview reads) | **Primary authorized-client factory.** Remko applied HMAC for preview; the target has **no HMAC path** — the same single-key `getClient()` serves published + preview, and draft auth is the per-request Bearer `preview_token` read by `getPreviewContent(searchParams)`. There is **no `secret` option** on `GraphOptions`. See `auth-and-env-mapping.md`. |
| `getAuthorizedServerClient` (`.`) | `const getAuthorizedServerClient = createAuthorizedClient` | `getClient()` (+ Bearer `preview_token` on preview reads) | **Deprecated alias of `createAuthorizedClient`** — same migration. Remko's "authorized" client used HMAC for preview. The target has **no HMAC path**: the same single-key `getClient()` serves both published and preview, and draft authorization is the per-request Bearer `preview_token` that `getPreviewContent` reads from the preview-URL `searchParams`. There is **no `secret` option** on `GraphOptions`. See `auth-and-env-mapping.md`. |
| `getServerClient` (`.`) | `const getServerClient = createClient` (source marks it `@deprecated use createClient`) | `new GraphClient(singleKey, { … })` or `getClient()` | **Deprecated alias of `createClient`** — same migration. Remko's "server" client is public (single key). The target initializes with `singleKey`. Use `config()` in the root layout + `getClient()` everywhere else. See `setup-and-di.md`. |
| `urlToPath()` / `linkDataToUrl()` / `linkItemDataToHref()` (`.`) | link/path conversion helpers | — no direct equivalent (app-owned) | The target delegates URL/path logic to Next.js. Use Next.js `Link` with `href={…}` directly. If you need custom link conversion, implement it in your app. |
| `linkDataToHref()` (`.`) | `function linkDataToHref(link?: LinkData): string` — Graph `LinkData` → href string (relative when the base matches the site, absolute otherwise, `'#'` fallback) | — no direct equivalent (app-owned) | **No target helper.** The target returns typed content, not Graph `LinkData` structs, so this function has no drop-in. Where the source called `linkDataToHref(link)`, read the URL off the typed content (`content._metadata?.url?.default ?? '#'`) or the link property directly, and pass it to Next.js `Link href={…}`. If several call sites need the relative-vs-absolute logic, port the ~5-line helper into your app once. |
| `localeToGraphLocale()` / `slugToGraphLocale()` / `localeToSlug()` / `slugToLocale()` (`.`) | locale conversion helpers | — no direct equivalent (app-owned) | The target does not provide locale conversion utilities. If you need locale mapping (e.g., `en-US` ↔ `en`), implement it in your app based on your CMS locale config. |
| `iContentDataToHref()` / `iContentInfoToHref()` (`.`) | `IContentData`/`IContentInfo` → href helpers | — no direct equivalent | The target uses typed content objects, not `IContentData`/`IContentInfo` structures. Access the content's path via `content._metadata?.url` or `content._metadata?.key` and construct the href yourself. |
| `IsLinkItemData` / `isLinkData` / `isIContentData` / `isIContentInfo` (`.`) | type guards for Remko link/content structures | — no direct equivalent | The target uses typed content objects (`ContentProps<typeof YourContentType>`), not duck-typed `IContentData` / `IContentInfo`. Type guards are unnecessary. |
| `readValue()` / `readValueAsInt()` (`.`) | value extraction helpers (from Remko `Property` structures) | — no direct equivalent | The target content properties are plain JSON fields. Access them directly (e.g., `content.heading`, not `readValue(content, 'heading')`). |
| `MetaDataResolver` (`.`) | `class MetaDataResolver` (metadata extraction) | — no direct equivalent | Metadata is available in `content._metadata` (a plain object). Access it directly (e.g., `content._metadata?.locale`, `content._metadata?.key`). |

## Components (./components)

The Remko `./components` subpath exports **client components** (`CmsContentLink`,
`CmsLink`, `OnPageEdit`). The target does not ship client link components — link
rendering is app-owned (use Next.js `Link`). On-page-edit (OPE) wiring is
covered in the preview section below.

| Remko symbol (subpath) | signature | @optimizely equivalent | migration note |
|---|---|---|---|
| `CmsContentLink` (`./components`) | `function CmsContentLink({ … })` (client link component) | — no direct equivalent (app-owned) | The target does not provide a client link component. Use Next.js `Link` with `href={…}` directly. If you need custom link rendering, implement it in your app. |
| `CmsLink` (`./components`) | `function CmsLink({ … })` (client link component) | — no direct equivalent (app-owned) | Same as `CmsContentLink`. Use Next.js `Link` or implement a custom link component. |
| `OnPageEdit` (`./components`) | `function OnPageEdit({ … })` (OPE wrapper) | `getPreviewUtils(content).pa(property?)` (`./react/server`) | On-page-edit (OPE) data attributes are provided by `getPreviewUtils(content).pa(property)`, which returns `{ 'data-epi-edit': property }` when in edit mode. See `7-live-preview.md` for preview integration. The target does NOT ship an `OnPageEdit` wrapper component — add the attributes directly to your elements. |

## Page (./page)

The Remko `./page` subpath exports **page factory helpers** (`createPage`,
`createLayout`) that generate Next.js metadata + static params + page
components. The target does **not** provide factory functions — you author
Next.js page components directly and fetch content yourself via
`getClient().getContentByPath(path)`.

| Remko symbol (subpath) | signature | @optimizely equivalent | migration note |
|---|---|---|---|
| `createPage` (`./page`) | `function createPage(factory, options)` → `{ generateMetadata, generateStaticParams, CmsPage }` | — no direct equivalent (app-owned) | **No factory function.** Author your catch-all page directly (`app/[[...path]]/page.tsx`). Fetch content via `getClient().getContentByPath(path)` (returns an ARRAY — access `[0]` for the first match), then render with `OptimizelyComponent`. See "Catch-all page migration" below. |
| `createLayout` (`./page`) | `function createLayout(factory, options)` → Next.js layout + metadata | — no direct equivalent (app-owned) | **No factory function.** Author your root layout directly (`app/layout.tsx`). Call `config()` + `initContentTypeRegistry` + `initReactComponentRegistry` there. See `setup-and-di.md`. |
| `getContentByPath` (`./page`, Remko option) | `getContentByPath(path, ctx)` (fetch helper passed to `createPage`) | `GraphClient.getContentByPath(path)` (root export) | The target's `getContentByPath` is a **GraphClient method** (`getClient().getContentByPath(path)`), not a factory option. Call it yourself in the page. Import from `@optimizely/cms-sdk` (root). Returns an ARRAY — access `[0]` for the first match. |
| `getContentById` (`./page`, Remko option) | `getContentById(id, ctx)` (fetch helper passed to `createPage`) | `GraphClient.getContent(reference, options?)` (root export) | The target's `getContent` is a **GraphClient method** (`getClient().getContent(reference)`). Call it yourself. Import from `@optimizely/cms-sdk` (root). Preview is via `options.previewToken`, not a positional arg. |

## Preview (./preview)

The Remko `./preview` subpath exports **preview factory helpers**
(`createEditPageComponent`) that generate a preview route component. The target
does **not** provide a factory function — you author the preview route directly
(`app/preview/page.tsx`) and use helpers from `./react/nextjs` and
`./react/server`.

| Remko symbol (subpath) | signature | @optimizely equivalent | migration note |
|---|---|---|---|
| `createEditPageComponent` (`./preview`) | `function createEditPageComponent(factory, options)` → preview page component | — no direct equivalent (app-owned) | **No factory function.** Author the preview route directly (`app/preview/page.tsx`). Use `GraphClient.getPreviewContent(searchParams)` to fetch + `NextPreviewComponent` (from `./react/nextjs`) for live updates + `OptimizelyComponent` to render. See "Preview route migration" below. |

## Publish (./publish)

The Remko `./publish` subpath exports **publish/revalidate handler factory**
(`createPublishApi`). The target has **no direct equivalent** — revalidation and
publish wiring is app-owned. You implement the `.well-known` route handlers
yourself and call Next.js `revalidatePath` / `revalidateTag`.

| Remko symbol (subpath) | signature | @optimizely equivalent | migration note |
|---|---|---|---|
| `createPublishApi` (`./publish`) | `function createPublishApi(options)` → route handler (GET/POST) | — no direct equivalent (app-owned) | **No helper function.** Implement the `.well-known/{channel,drafts,publish}` route handlers yourself (`app/.well-known/publish/route.ts`, etc.). Call Next.js `revalidatePath` or `revalidateTag` to invalidate the cache when the CMS publishes content. See "Publish/revalidate migration" below. |

## RSC (./rsc)

The Remko `./rsc` subpath exports **server component helpers** (`getContentById`,
`getContentRequest`, `getChannelId`, etc.). Most are **deprecated** or replaced
by the target's `GraphClient` methods (root exports) and preview utilities
(`./react/server`).

| Remko symbol (subpath) | signature | @optimizely equivalent | migration note |
|---|---|---|---|
| `getContentById` (`./rsc`) | `function getContentById(ref, token?, client?)` | `GraphClient.getContent(reference, options?)` (root export) | The target's `getContent` is a **GraphClient method** (`getClient().getContent(reference)`). Preview is via `options.previewToken`, not a positional arg. Import from `@optimizely/cms-sdk` (root). |
| `getContentRequest` (`./rsc`) | `function getContentRequest()` → content request from search params | — no direct equivalent (app-owned) | The target does NOT parse search params for you. Access `searchParams` directly in the page and pass them to `getPreviewContent(searchParams)` in preview mode. See "Preview route migration" below. |
| `getChannelId` (`./rsc`) | `function getChannelId()` → channel ID from request | — no direct equivalent (app-owned) | The target does NOT extract channel ID from the request. If you need the channel ID, access it from your env vars or CMS config. |
| `isValidRequest` (`./rsc`) | `function isValidRequest(req)` → boolean | — no direct equivalent (app-owned) | The target does NOT provide request validation. If you need to validate requests (e.g., check for a preview token), implement it yourself. |

## Types (./types)

The Remko `./types` subpath exports **type definitions** for Remko structures
(`IContentData`, `LinkData`, `ContentRequest`, etc.). The target uses **typed
content objects** (`ContentProps<typeof YourContentType>`), not duck-typed
Remko structures. Most Remko types have no direct equivalent.

| Remko type | purpose | recommended migration |
|---|---|---|
| `IContentData` / `IContentInfo` | Remko content structure | `ContentProps<typeof YourContentType>` (typed content from `contentType()`) |
| `LinkData` / `LinkItemData` | Remko link structures | — no direct equivalent (app-owned). Access `content._metadata?.url` or `content._metadata?.key` and construct links yourself. |
| `ContentRequest` | Remko request shape (path, locale, channel, etc.) | — no direct equivalent. Access `searchParams` directly in the page and pass to `getPreviewContent(searchParams)`. |
| `OptimizelyNextPage<T>` / `OptiCmsNextJsPage<T>` | **CMS component type**, not a Next.js page-function type. Defined as `CmsComponent<T> & { getMetaData?: (contentLink, locale, client) => Promise<Metadata> }` — i.e. a component authored like any other `CmsComponent`, plus an optional static `getMetaData` used by Remko's `createPage` to build the route's metadata. Commonly imported aliased as `CmsComponent`. | **Split into two target concepts.** (1) The component body migrates exactly like `CmsComponent<T>` → a component typed `{ content: ContentProps<typeof YourContentType> }` (see the worked example in the `optimizely-remko-cms-react-to-content-js` skill). (2) The `getMetaData` member has no target equivalent as a component property — move that logic into a Next.js `export async function generateMetadata({ params })` in the catch-all page (see "Catch-all page migration" below). Do **not** type your Next.js page function as `OptimizelyNextPage`; that was the Remko convention. |
| `CmsPageLayout` | Remko layout type | — no direct equivalent. Type your layout as `function Layout({ children }: { children: React.ReactNode })`. |

## Catch-all page migration (Remko `createPage` → target app-owned)

**Before — Remko (`app/[[...path]]/page.tsx`):**

```tsx
import { createPage } from '@remkoj/optimizely-cms-nextjs/page';
import { AuthMode, createClient } from '@remkoj/optimizely-graph-client';
import { draftMode } from 'next/headers';
import { factory } from '@/components/factory';

const { generateMetadata, generateStaticParams, CmsPage: Page } = createPage(factory, {
  client: (_, scope) => {
    const client = createClient();
    // Remko escalated draft auth on the catch-all when draft mode was on.
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

// Route-segment config — the target no longer sets these for you.
export const dynamic = 'error';
export const dynamicParams = true;
export const revalidate = false;
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
   `client: (_, scope) => {…}` callback escalated draft auth
   (`client.updateAuthentication(AuthMode.HMAC)` + `client.enablePreview()`) when
   `draftMode().isEnabled`. Those symbols are **Remko-only** and have no target
   equivalent. `getContentByPath` is **published-only** — it hard-codes an
   `undefined` preview token internally and can never read drafts. Drafts flow
   **only** through the dedicated `/preview` route + `getPreviewContent`. Do not
   attempt to port the escalation onto this page.

6. **Master queries evaporate (G13).** Remko relied on generated per-type master
   queries from `@gql/functions` codegen. The target builds queries generically
   from the content-type registry — you register types with
   `initContentTypeRegistry([...])` in the root layout (see
   `../_shared-references/setup-and-di.md`), and `getContentByPath` composes the
   query from that registry. There is no master-query file to migrate.

## Preview route migration (Remko `createEditPageComponent` → target app-owned)

**Before — Remko (`app/preview/page.tsx`):**

```tsx
import { createEditPageComponent } from '@remkoj/optimizely-cms-nextjs/preview';
import { factory } from '@/components/factory';
import { getContentById } from '@/gql/functions';

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

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function Page({ searchParams }: Props) {
  // Same single-key client as the published route. The Bearer preview_token
  // comes from the preview URL's searchParams — NOT from a standing secret.
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

// Preview route-segment config — never cache a preview render.
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;
export const runtime = 'nodejs';
```

**Critical migration notes:**

1. **No factory function.** The target has no `createEditPageComponent` helper.
   Author the preview route directly.

2. **No HMAC, no `secret` — preview uses a Bearer token from the URL.** The
   target `GraphClient` authenticates with EITHER `epi-single <apiKey>` (public
   single key) OR `Bearer <preview_token>`. There is **no** App Key + Secret HMAC
   path, and `GraphOptions` has **no `secret` field** (passing one is a type
   error). Use the same `getClient()` single-key client as the published route;
   `getPreviewContent` extracts `preview_token` from the parsed `searchParams`
   and sends it as the Bearer token for that one request. See
   `../_shared-references/auth-and-env-mapping.md`.

3. **`getPreviewContent(searchParams)` auto-populates context.** The target's
   `getPreviewContent` method automatically calls `setContext({ previewToken,
   version, locale, type, key, mode })` from the parsed preview parameters
   (`preview_token`, `loc`, `key`, `ver`, `ctx`). No need to extract them
   manually.

4. **`NextPreviewComponent` for live updates.** The target ships a Next.js
   optimized preview component (`./react/nextjs`) that handles soft refresh
   (`router.refresh()`) for same-URL updates and navigation for different URLs.
   Use it instead of the generic `PreviewComponent`.

5. **`<Script>` loads the communication injector.** The CMS needs the injector
   script to enable two-way communication between the preview window and the
   editor. Use Next.js `Script` (or a plain `<script>` tag in other frameworks).

6. **CMS-55679 gotcha (CMS-instance creds, not the frontend).** If preview (or
   published) renders blank — empty content, not an auth error — the root cause is
   usually the **Graph credentials configured on the CMS instance itself** (the
   keys the CMS uses to publish its schema to Graph), not your frontend Single
   Key or preview token. If those are invalid/rotated, the CMS
   `EnsureSchemaInitializationModule` aborts at startup → the `_Content` type is
   never published → **every** Graph render returns empty. Verify and re-sync the
   CMS instance's Graph credentials before debugging the SDK, the query, or this
   route. See `../_shared-references/auth-and-env-mapping.md`.

## Publish/revalidate migration (Remko `createPublishApi` → target app-owned)

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

## No direct equivalent

The following Remko symbols have **no public equivalent** in `@optimizely/cms-sdk`.
Stop and document usage; do not invent a replacement.

### Page/layout factory functions

| Remko symbol | purpose | recommended migration |
|---|---|---|
| `createPage` | Factory function for Next.js pages (metadata, static params, page component) | **No direct equivalent.** Author the catch-all page directly (`app/[[...path]]/page.tsx`). Fetch content via `getClient().getContentByPath(path)` (returns an ARRAY — access `[0]`), then render with `OptimizelyComponent`. Wrap in `withAppContext(Page)`. See "Catch-all page migration" above. |
| `createLayout` | Factory function for Next.js layouts | **No direct equivalent.** Author the root layout directly (`app/layout.tsx`). Call `config()` + `initContentTypeRegistry` + `initReactComponentRegistry` there. See `setup-and-di.md`. |
| `createEditPageComponent` | Factory function for preview routes | **No direct equivalent.** Author the preview route directly (`app/preview/page.tsx`). Use `GraphClient.getPreviewContent(searchParams)` + `NextPreviewComponent` + `OptimizelyComponent`. See "Preview route migration" above. |

### Publish/revalidate helpers

| Remko symbol | purpose | recommended migration |
|---|---|---|
| `createPublishApi` | Factory function for publish/revalidate handlers | **No direct equivalent.** Implement the `.well-known/{channel,drafts,publish}` route handlers yourself. Call Next.js `revalidatePath` / `revalidateTag` to invalidate the cache when the CMS publishes content. See "Publish/revalidate migration" above. |

### Utility functions

| Remko symbol | purpose | recommended migration |
|---|---|---|
| `urlToPath()` / `linkDataToUrl()` / `linkItemDataToHref()` | Link/path conversion helpers | **No direct equivalent.** The target delegates URL/path logic to Next.js. Use Next.js `Link` with `href={…}` directly. If you need custom link conversion, implement it in your app. |
| `localeToGraphLocale()` / `slugToGraphLocale()` / `localeToSlug()` / `slugToLocale()` | Locale conversion helpers | **No direct equivalent.** The target does not provide locale conversion utilities. If you need locale mapping (e.g., `en-US` ↔ `en`), implement it in your app based on your CMS locale config. |
| `iContentDataToHref()` / `iContentInfoToHref()` | `IContentData`/`IContentInfo` → href helpers | **No direct equivalent.** The target uses typed content objects. Access the content's path via `content._metadata?.url` or `content._metadata?.key` and construct the href yourself. |
| `readValue()` / `readValueAsInt()` | Value extraction helpers (from Remko `Property` structures) | **No direct equivalent.** The target content properties are plain JSON fields. Access them directly (e.g., `content.heading`, not `readValue(content, 'heading')`). |
| `getContentRequest` (`./rsc`) | Search params → content request | **No direct equivalent.** Access `searchParams` directly in the page and pass to `getPreviewContent(searchParams)`. |
| `getChannelId` (`./rsc`) | Extract channel ID from request | **No direct equivalent.** If you need the channel ID, access it from your env vars or CMS config. |
| `isValidRequest` (`./rsc`) | Request validation | **No direct equivalent.** If you need to validate requests (e.g., check for a preview token), implement it yourself. |
| `MetaDataResolver` | Metadata extraction class | **No direct equivalent.** Metadata is available in `content._metadata` (a plain object). Access it directly (e.g., `content._metadata?.locale`, `content._metadata?.key`). |

### Next.js middleware

| Remko symbol | purpose | recommended migration |
|---|---|---|
| `withEditFallback` | Wraps a Next.js `middleware` to rewrite legacy on-page-edit / preview URLs so old editor deep-links still resolve | **No direct equivalent (app-owned).** The target does not ship a middleware wrapper. If the source used `export default withEditFallback(middleware)` in `middleware.ts`, drop the wrapper. Preview routing in the target is handled by the dedicated preview route (`app/preview/page.tsx`) + `getPreviewContent(searchParams)` (see "Preview route migration" above). Only reimplement URL-rewrite middleware if you must keep serving legacy editor links; otherwise delete it. |

### Client components

| Remko symbol | purpose | recommended migration |
|---|---|---|
| `CmsContentLink` / `CmsContentLinkProps` / `CmsLink` | Client link components (and the `CmsContentLinkProps` prop type) | **No direct equivalent.** The target does not provide client link components. Use Next.js `Link` with `href={…}` directly. If you need custom link rendering, implement it (and its props type) in your app. |
| `OnPageEdit` | OPE wrapper component | **No direct equivalent (replaced by `getPreviewUtils`).** On-page-edit (OPE) data attributes are provided by `getPreviewUtils(content).pa(property)`, which returns `{ 'data-epi-edit': property }` when in edit mode. Add the attributes directly to your elements — no wrapper component. See `7-live-preview.md`. |

### Type guards and Remko structures

| Remko symbol | purpose | recommended migration |
|---|---|---|
| `IsLinkItemData` / `isLinkData` / `isIContentData` / `isIContentInfo` | Type guards for Remko link/content structures | **No direct equivalent.** The target uses typed content objects (`ContentProps<typeof YourContentType>`), not duck-typed structures. Type guards are unnecessary. |
| `IContentData` / `IContentInfo` / `LinkData` / `LinkItemData` / `ContentRequest` | Remko type definitions | **No direct equivalent.** The target uses typed content objects (`ContentProps<typeof YourContentType>`) from `contentType()`. Remko's duck-typed structures are not used. |

## Related references

- Package/import mapping: `../_shared-references/package-and-import-mapping.md`
- Setup, channel init, and DI/registration: `../_shared-references/setup-and-di.md`
- Auth & environment variables (includes CMS-55679 preview gotcha): `../_shared-references/auth-and-env-mapping.md`
