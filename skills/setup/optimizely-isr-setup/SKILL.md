---
name: optimizely-isr-setup
description: This skill should be used when the user asks to "set up ISR", "add incremental static regeneration", "configure revalidation", "how long should I cache pages", "content is stale after publishing", "set up a revalidation webhook", "invalidate the cache when content is published", "add on-demand revalidation", "configure the Next.js cache handler", "purge the CDN after publish", or mentions ISR, revalidate, cache tags, Graph webhooks, stale content, or cache invalidation in a Next.js app backed by Optimizely CMS. Use this skill whenever a Next.js + Optimizely project needs caching or freshness decisions, even if the user only says "my site is slow" or "editors publish but nothing changes on the site" without naming ISR.
---

# Next.js ISR for Optimizely CMS

Set up Incremental Static Regeneration in a Next.js app backed by Optimizely CMS: pick a revalidation strategy per content type, tag cached fetches so publishes invalidate exactly what they should, and wire an Optimizely Graph webhook that revalidates on demand.

## The problem this solves

Editors publish in the CMS and expect the site to change. Two failure modes dominate:

- **Too much caching, no invalidation** — the page is fast but shows content from an hour ago, and editors lose trust in the CMS.
- **No caching** — every request hits Optimizely Graph, so the site is slow and the Graph quota burns.

The fix is not a single `revalidate` number. It's a *pairing*: a long time-based interval as a self-healing safety net, plus an on-demand webhook that invalidates precisely the affected content the moment it's published. The time interval exists only for when the webhook is missed (deploy in progress, transient network error). If you find yourself tuning the interval down to 30 seconds to keep content fresh, the webhook isn't working — fix that instead.

## Step 1: Establish the deployment target

The invalidation mechanics differ substantially by host, so determine this before writing any code. Ask the user if it isn't obvious from the repo.

| Signal in the repo | Target | Read next |
|---|---|---|
| `OPTIMIZELY_DXP_DEPLOYMENT_ID`, `REDIS_URL`, or `.head.app.zip` packaging | Optimizely frontend hosting (DXP) | `references/optimizely-frontend-hosting.md` |
| `vercel.json`, `.vercel/`, Vercel env vars | Vercel | `references/portable-hosting.md` |
| `Dockerfile`, k8s manifests, `next start` behind a load balancer | Self-hosted, multi-instance | `references/portable-hosting.md` |
| Nothing conclusive, single Node process | Self-hosted, single instance | `references/portable-hosting.md` |

The decision that actually matters: **does the app run as more than one instance?** Next.js's default ISR cache lives on the local filesystem, so `revalidateTag()` on instance A leaves instance B serving stale HTML. Optimizely frontend hosting and most Kubernetes deployments run multiple instances and need a shared (Redis) cache handler. Vercel handles this for you. A single container does not need one.

Also confirm the Next.js major version (`package.json`). This picks the caching API *and* changes which of the steps below apply at all:

| Version | Caching API | Opt-in flag | Route segment `revalidate` / `dynamic` | Shared cache config |
|---|---|---|---|---|
| 14 / 15.x | `unstable_cache()` | none | Supported — use them | `cacheHandler` |
| 15.x with `'use cache'` | `'use cache'` + `unstable_cacheTag` / `unstable_cacheLife` | `experimental.useCache: true` | Supported | `cacheHandler` |
| 16 | `'use cache'` + `cacheTag` / `cacheLife` | `cacheComponents: true` | **Build error** — must be removed | `cacheHandlers` (different interface) |

Two traps live in that table:

- **`'use cache'` does nothing without its opt-in flag.** Writing the directive without enabling `experimental.useCache` (15.x) or `cacheComponents` (16) fails the build.
- **On Next.js 16 with `cacheComponents`, a route that still exports `revalidate`, `dynamic`, or `fetchCache` errors at build.** The page-level fallback shown in Step 3 is for the legacy path only; on 16 that role is played by `cacheLife()` inside the cached function.

Next.js 16 also changed `revalidateTag`: it takes a `cacheLife` profile as a second argument (`revalidateTag('posts', 'max')`) and the single-argument form is deprecated.

If the project is on Next.js 16, read `references/nextjs-16-cache-components.md` alongside this file — the tagging strategy is identical but the configuration, the route-level setup, and the cache handler all differ. Use whichever API the codebase already uses rather than introducing a new caching paradigm mid-codebase.

## Step 2: Choose a revalidation strategy per content type

Different content has different freshness requirements and different blast radius when it changes. Setting one global interval means either over-fetching stable content or under-refreshing volatile content.

Work through the project's content types (see the `optimizely-model` skill for where these live) and place each into one of these buckets:

| Content shape | Time-based `revalidate` | `cacheLife` profile | Invalidated on publish by |
|---|---|---|---|
| Landing / campaign pages, news articles | 1 hour (`3600`) | `hours` | Its own content-key tag |
| Evergreen pages (about, contact, legal) | 1 day (`86400`) | `days` | Its own content-key tag |
| Navigation, header, footer, global settings | 1 day (`86400`) | `days` | A shared tag, e.g. `optimizely:nav` |
| Shared blocks embedded across many pages | 1 hour (`3600`) | `hours` | Content-key tag + the type tag |
| Listing / index pages (blog index, search) | 15 minutes (`900`) | `default` | A type tag, e.g. `optimizely:type:ArticlePage` |
| Personalized or experiment-driven pages | Not cacheable | N/A | N/A — render dynamically |

The third column applies only on the `'use cache'` path. The built-in profiles are coarser than raw seconds — `hours` revalidates every hour, `days` every day, and `default` every 15 minutes, which is why the listing row lands on `default` rather than a number. If you need an interval the built-ins don't cover, define a named profile in `next.config` rather than reaching back for `export const revalidate`:

```typescript
// next.config.ts — custom profiles are declared once and referenced by name
cacheLife: {
  listing: { stale: 300, revalidate: 900, expire: 86400 },
}
```

These are starting points, not rules. Tell the user what you picked and why so they can adjust; a newsroom publishing hourly wants different numbers than a corporate site publishing monthly.

The important insight is the right-hand column. **Time-based intervals are the fallback; tags are the mechanism.** Getting the intervals slightly wrong is harmless once tagging is correct.

## Step 3: Tag every cached content fetch

Tags are what let a single publish invalidate exactly the pages affected. Without them, the webhook can only invalidate the URL of the changed content — which misses every *other* page that embeds it. A footer edit changes every page on the site; `revalidatePath('/site-settings')` fixes none of them.

Adopt a consistent tag vocabulary so the webhook can construct tags without a lookup table:

```
optimizely:content:{contentKey}     // the specific item that changed
optimizely:type:{ContentTypeName}   // all pages that list or embed this type
optimizely:path:{urlPath}           // the cached data behind one route
optimizely:nav                      // navigation, breadcrumbs, site structure
```

Which of these a given fetch can apply depends on the API, because `unstable_cache` needs its tags up front while `cacheTag()` can be called after the fetch resolves. Keep this coverage table honest as you write the code — every row needs a writer *and* a reader, and the ones that differ by branch are where the loop usually breaks:

| Tag | Written by (14 / 15) | Written by (`'use cache'`) | Revalidated by the webhook when |
|---|---|---|---|
| `optimizely:path:{path}` | Page fetches, keyed by the path they were called with | Not needed — tag by key instead | The changed content resolves to a path |
| `optimizely:content:{key}` | Only fetches that already know the key (blocks, settings singletons) | Every cached content fetch | Always — the key comes straight from the payload |
| `optimizely:type:{Type}` | Listing fetches, which know the type they query | Every cached content fetch | The resolved content's type |
| `optimizely:nav` | The navigation fetch | The navigation fetch | The changed type is in `NAVIGATION_TYPES` |

On the 14 / 15 branch `optimizely:content:{key}` covers blocks and settings but *not* pages, which is why the webhook revalidates the path tag as well. On the `'use cache'` branch the path tag is redundant — every fetch can tag by real content key — so drop it rather than maintaining both.

### Next.js 14 / 15 — `unstable_cache`

```typescript
// lib/content.ts
import { unstable_cache } from 'next/cache';
import { client } from './optimizely';

/** Pages are fetched by path, so that's the only tag available up front. */
export const getPage = (path: string, locale: string) =>
  unstable_cache(
    async () => client.getContentByPath(path, { locales: [locale] }),
    ['optimizely-page', path, locale],
    {
      revalidate: 3600,
      tags: [`optimizely:path:${path}`],
    },
  )();

/** Blocks and singletons are fetched by key, so they can carry the content tag. */
export const getBlock = (contentKey: string, locale: string) =>
  unstable_cache(
    async () => client.getContent(contentKey, { locales: [locale] }),
    ['optimizely-block', contentKey, locale],
    {
      revalidate: 3600,
      tags: [`optimizely:content:${contentKey}`],
    },
  )();

/** Listings know the type they query, so they carry the type tag. */
export const getArticleIndex = () =>
  unstable_cache(async () => client.getItems('/blog'), ['optimizely-article-index'], {
    revalidate: 900,
    tags: ['optimizely:type:ArticlePage'],
  })();
```

`unstable_cache` needs its tags before the fetch runs, and the content key usually isn't known until after — hence the split above. Pages get the path tag, and the webhook resolves key → path before revalidating (this is what the official Optimizely sample does). Anything already fetched by key gets the content tag directly. The alternative, fetching once uncached to learn the key and caching the render step by key, costs a Graph round trip on every request and is rarely worth it.

Tag navigation the same way — `getNavigation()` wraps its fetch with `tags: ['optimizely:nav']`.

### Next.js 15.5+ / 16 — `'use cache'`

Enable the directive first, or the build fails before any of this runs:

```typescript
// next.config.ts — Next.js 16
export default { cacheComponents: true };

// next.config.ts — Next.js 15.x, where the flag is still experimental
export default { experimental: { useCache: true } };
```

On Next.js 16 the helpers are stable exports (`cacheTag`, `cacheLife`); on 15.x they are still `unstable_cacheTag` / `unstable_cacheLife`. The example below uses the 16 names.

```typescript
// lib/content.ts
import { cacheTag, cacheLife } from 'next/cache';
import { client } from './optimizely';

export async function getPage(path: string, locale: string) {
  'use cache';
  cacheLife('hours');

  const page = await client.getContentByPath(path, { locales: [locale] });

  // Tags can be set after the fetch, so tag by the real content key.
  // Guard both — an unguarded template literal happily writes 'optimizely:type:undefined',
  // a tag the webhook will never emit.
  if (page?._metadata?.key) cacheTag(`optimizely:content:${page._metadata.key}`);
  if (page?._metadata?.types?.[0]) cacheTag(`optimizely:type:${page._metadata.types[0]}`);

  return page;
}
```

`'use cache'` is the better fit for Optimizely because `cacheTag()` can be called *after* the fetch resolves, so you can tag by the content key the CMS actually returns rather than guessing from the URL. That removes the path tag from the vocabulary entirely.

Tag shared fetches the same way — navigation gets `optimizely:nav`, a header block gets its own content key.

On Next.js 16 this choice has consequences beyond this file: the route-level exports below become build errors, and a multi-instance deployment needs a `cacheHandlers` implementation rather than the `cacheHandler` shown in the hosting references. Both are covered in `references/nextjs-16-cache-components.md`.

**Tags only exist if the fetch goes through a cache primitive.** `revalidateTag` reaches data cached by `unstable_cache`, `'use cache'`, or `fetch(..., { next: { tags } })` — nothing else. If content is fetched with the SDK client, Axios, or a GraphQL client that doesn't use `fetch` under the hood, calling `revalidateTag` is a silent no-op no matter how correct the webhook is. That's the main reason to route every content read through a wrapper like the ones above rather than calling the client directly from components.

### Set the page-level fallback (Next.js 14 / 15 only)

```typescript
// app/[...slug]/page.tsx
export const revalidate = 3600;
export const dynamic = 'error';

export async function generateStaticParams() {
  // Pre-render high-traffic routes at build time; the rest generate on first request.
  return [];
}
```

`dynamic = 'error'` is a guard rail, and worth explaining because the obvious-looking alternative is a trap. If any part of the page reads `headers()`, `cookies()`, or `searchParams`, Next.js silently opts the whole route out of static generation and ISR quietly stops working. `dynamic = 'error'` turns that silent downgrade into a build failure, so you find out immediately. `dynamic = 'force-static'` looks like it does the same thing but doesn't — it forces static rendering and makes those APIs return empty values, so the page builds fine and renders subtly wrong content forever.

If the page genuinely needs request data (multi-site host resolution, for example), isolate that in a component wrapped in `<Suspense>` so the rest of the page stays static — see the `optimizely-multisite-locale` skill for the host-resolution pattern.

**Do not add these exports on Next.js 16 with `cacheComponents` enabled** — `revalidate`, `dynamic`, and `fetchCache` all error at build time there. The freshness interval moves into `cacheLife()` inside the cached function, and the guard rail that `dynamic = 'error'` provided is built in: under `cacheComponents`, reading `headers()`, `cookies()`, or `searchParams` outside `<Suspense>` is itself a build error rather than a silent downgrade to dynamic rendering.

## Step 4: Build the webhook receiver

Optimizely Graph POSTs to your endpoint when published content syncs. Create `app/api/revalidate/route.ts` (or `app/hooks/graph/route.ts` to match Optimizely's samples — the path is arbitrary as long as registration and route agree).

```typescript
import { revalidateTag, revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

// Webhooks must never be cached or statically analyzed.
export const dynamic = 'force-dynamic';

type GraphWebhookPayload = {
  subject?: string;   // 'doc' for content documents
  action?: string;    // 'updated' | 'expired' | 'deleted'
  data?: { docId?: string };
};

// Content types that participate in site structure. Which types belong here is
// project-specific, so declare it explicitly rather than trying to infer it.
const NAVIGATION_TYPES = new Set(['NavigationSettings', 'SiteSettings']);

// revalidatePath('/about/') and revalidatePath('/about') are different entries.
// Graph returns the trailing slash; the route does not. Keep '/' intact.
const stripTrailingSlash = (path: string) =>
  path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path;

export async function POST(request: NextRequest) {
  // Optimizely sends the shared secret in the header configured at registration.
  if (request.headers.get('x-api-key') !== process.env.OPTIMIZELY_GRAPH_CALLBACK_APIKEY)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const payload = (await request.json()) as GraphWebhookPayload;
  if (payload.subject !== 'doc') return NextResponse.json({ skipped: true });
  if (!['updated', 'expired', 'deleted'].includes(payload.action ?? ''))
    return NextResponse.json({ skipped: true });

  // docId format: {contentKey}_{locale}_{status}, e.g. "a1b2c3_en_Published"
  const [contentKey, locale] = (payload.data?.docId ?? '').split('_');
  if (!contentKey) return NextResponse.json({ error: 'Missing docId' }, { status: 400 });

  const content = await resolveContent(contentKey, locale);

  // Reaches blocks and singletons on the unstable_cache branch, and everything
  // on the 'use cache' branch. See the tag coverage table in Step 3.
  revalidateTag(`optimizely:content:${contentKey}`);

  // Resolution returning null is the normal shape for a hard delete: the document
  // is gone from Graph, so there is no path to purge and no type to match listings
  // against. Every targeted call below is therefore unreachable, and skipping this
  // branch leaves the deleted page serving 200 and listings still showing it.
  // Deletes are rare next to publishes, so purge broadly rather than guess.
  if (!content) {
    console.warn('[isr] unresolvable, purging site-wide:', contentKey);
    revalidatePath('/', 'layout');
    return NextResponse.json({ revalidated: true, contentKey, scope: 'site', now: Date.now() });
  }

  if (content.type) revalidateTag(`optimizely:type:${content.type}`);

  if (content.path) {
    const path = stripTrailingSlash(content.path);
    // Both are needed: revalidatePath drops the rendered route, the path tag drops
    // the cached data behind it. On the unstable_cache branch, where pages are keyed
    // by path, revalidatePath alone re-renders the route from still-cached data.
    revalidateTag(`optimizely:path:${path}`);
    revalidatePath(path);
  }

  // Navigation has no URL of its own, so neither revalidatePath nor the content-key
  // tag can reach the pages that render it. This is the case tags exist for.
  if (NAVIGATION_TYPES.has(content.type)) revalidateTag('optimizely:nav');

  return NextResponse.json({ revalidated: true, contentKey, now: Date.now() });
}
```

**Every tag you write in Step 3 needs a matching call here.** A tag with a writer and no reader is the failure mode this whole design is meant to prevent, and it is invisible: the webhook still returns `revalidated: true`, the logs are clean, and the content simply never updates until the time-based fallback expires. Before you finish, list the tags the app applies and check each one appears in this handler. `optimizely:nav` is the one most often missed, because it is the only tag not derivable from the payload.

Note for **Next.js 16**: `revalidateTag` requires a `cacheLife` profile as its second argument — `revalidateTag(tag, 'max')` for stale-while-revalidate behaviour. The single-argument form is deprecated, so check the installed version before writing these calls.

### Resolving the changed content to a URL

The webhook payload gives you a content key, not a URL. Query Graph to resolve it — and read it *uncached*, since the whole point is that the cached copy is stale:

```typescript
// lib/graph-endpoints.ts
// The rest of this skill set sets OPTIMIZELY_GRAPH_GATEWAY to the full query endpoint
// (https://cg.optimizely.com/content/v2, the SDK default), while some environments set
// the bare origin. Deriving both URLs from the origin works with either form, and the
// webhook management API only ever lives at the origin.
const graphOrigin = () =>
  new URL(process.env.OPTIMIZELY_GRAPH_GATEWAY ?? 'https://cg.optimizely.com').origin;

export const graphQueryUrl = () => `${graphOrigin()}/content/v2`;
export const graphWebhooksUrl = () => `${graphOrigin()}/api/webhooks`;
```

```typescript
const RESOLVE_QUERY = `query ResolveContent($key: String!, $locale: [Locales]) {
  _Content(where: { _metadata: { key: { eq: $key } } }, locale: $locale) {
    items {
      _metadata { key types url { hierarchical default } }
    }
  }
}`;

async function queryContent(contentKey: string, locale?: string) {
  const response = await fetch(graphQueryUrl(), {
    method: 'POST',
    cache: 'no-store',
    // Without a timeout, a slow Graph turns into a webhook timeout and Graph retries —
    // the retry storm the "always return 200" rule below exists to avoid.
    signal: AbortSignal.timeout(5_000),
    headers: {
      'Content-Type': 'application/json',
      Authorization: `epi-single ${process.env.OPTIMIZELY_GRAPH_SINGLE_KEY}`,
    },
    body: JSON.stringify({
      query: RESOLVE_QUERY,
      variables: { key: contentKey, locale: locale ? [locale.replace('-', '_')] : undefined },
    }),
  });

  const metadata = (await response.json())?.data?._Content?.items?.[0]?._metadata;
  if (!metadata) return null;

  return {
    // `hierarchical` is the site-relative path revalidatePath needs;
    // `default` is the absolute URL a CDN purge needs.
    path: metadata.url?.hierarchical,
    url: metadata.url?.default,
    type: metadata.types?.[0],
  };
}

async function resolveContent(contentKey: string, locale?: string) {
  try {
    // Graph is eventually consistent — the webhook can fire fractionally before the
    // published document is queryable, so one retry covers the common near-miss.
    const first = await queryContent(contentKey, locale);
    if (first) return first;

    await new Promise((resolve) => setTimeout(resolve, 500));
    return await queryContent(contentKey, locale);
  } catch (error) {
    // Tag revalidation still runs without this; don't take the webhook down for it.
    console.error('[isr] content resolution failed', contentKey, error);
    return null;
  }
}
```

Filtering on `_metadata.key` rather than the `ids` argument is deliberate: the webhook's `docId` is the full `{key}_{locale}_{status}` triple while `_metadata.key` is the bare content key, and matching on the field you actually parsed avoids guessing which form the `ids` filter expects. It also matches the query style used across the other skills in this set.

Log when resolution comes back empty — a webhook that silently resolves nothing on every publish looks identical to no webhook at all, and this is the single most common way this setup fails quietly.

### Handling deletes and unpublishes

Deletes break the resolve-then-purge design, and it is worth being precise about why. Every targeted invalidation depends on resolving the content key to a path and a type — but for a hard delete the document is already gone from Graph by the time the webhook arrives, so resolution correctly returns null and every `content.…` branch is skipped. The result is a webhook that answers `revalidated: true` while the deleted page keeps serving 200 at its old URL and every listing keeps showing it. Nothing in the logs looks wrong.

You cannot resolve your way out of this: the information you need was destroyed by the event you are reacting to. So handle it structurally, with the null-resolution branch in the handler above — `revalidatePath('/', 'layout')` purges the whole tree, which is heavy-handed but correct, and deletes are orders of magnitude rarer than publishes. Verify it rather than assuming: request the page so it is genuinely cached, delete it, fire the webhook, then request it again and expect a 404. A URL that 404s because it was never cached in the first place proves nothing.

Two refinements worth knowing:

- **Unpublishes (`expired`) usually still resolve.** The document remains in Graph with a non-`Published` status, so if your resolve query does not filter on status you get the path and type back and take the targeted path instead of the sledgehammer. That is the better outcome — keep the resolve query status-agnostic.
- **If site-wide purges are too expensive at your volume**, record a key → path mapping when you render a page (KV, Redis, a database column) and read it in the null branch. That turns a delete back into a targeted purge. Reach for it when the broad purge actually hurts, not before.

On **Next.js 16 with `cacheComponents`**, `revalidatePath` still works — the docs describe it as unchanged — but `'use cache'` entries are addressed by tag, and Next's own guidance is to prefer tag-based invalidation there. Give every cached read a coarse `cacheTag('optimizely:all')` alongside its specific tags and revalidate that in the null branch, so the fallback rests on the mechanism that branch is actually built around. See `references/nextjs-16-cache-components.md`.

### Always return 200 for handled events

Graph retries on non-2xx. If a malformed payload returns 500, you get a retry storm. Return 200 with `{ skipped: true }` for anything you deliberately ignore, and reserve error codes for genuine auth failures.

## Step 5: Register the webhook

Registration happens against the Graph API, not the CMS UI. Note the URL: the webhook management API sits at the Graph *origin*, next to `/content/v2` rather than under it, so build it with the `graphWebhooksUrl()` helper above instead of appending to `OPTIMIZELY_GRAPH_GATEWAY`.

```
POST https://cg.optimizely.com/api/webhooks
Authorization: Basic base64({OPTIMIZELY_GRAPH_APP_KEY}:{OPTIMIZELY_GRAPH_SECRET})
```

```json
{
  "disabled": false,
  "request": {
    "url": "https://{your-hostname}/api/revalidate",
    "method": "post",
    "headers": { "x-api-key": "{OPTIMIZELY_GRAPH_CALLBACK_APIKEY}" }
  },
  "topic": ["*.*"],
  "filters": [
    { "status": { "eq": "Published" } },
    { "status": { "eq": "Expired" } },
    { "status": { "eq": "Deleted" } }
  ]
}
```

The `filters` clause matters — without it you'll receive draft-save traffic and revalidate constantly for content no visitor can see. Filters combine as you'd hope: separate objects in the array are OR'd, multiple keys inside one object are AND'd.

Some published OpenAPI versions name the field `topics` rather than `topic`. If registration returns a 400, try the other spelling before assuming the payload is wrong.

On Optimizely frontend hosting, register automatically at startup from `instrumentation.ts` so every deployment self-configures; that requires deduplication logic, covered in `references/optimizely-frontend-hosting.md`. Elsewhere, a one-time `curl` or a small `scripts/register-webhook.mjs` is simpler and easier to reason about.

`OPTIMIZELY_GRAPH_CALLBACK_APIKEY` is a secret you invent — generate a long random string (`openssl rand -hex 32`) and store it in both the app's environment and the webhook registration.

## Step 6: Verify it actually works

ISR failures are quiet, so verify explicitly rather than assuming. Walk the user through this:

1. **The route is static.** Run `next build` and confirm the content route is marked `●` (SSG) or `ISR`, not `ƒ` (Dynamic). A dynamic route means `revalidate` is doing nothing.
2. **The webhook endpoint responds.** POST a synthetic payload with the correct `x-api-key` and confirm a 200 with `revalidated: true`. Then POST without the key and confirm a 401.
3. **The webhook is registered.** `GET https://cg.optimizely.com/api/webhooks` with Basic auth and confirm exactly one entry pointing at your URL. Duplicates mean repeated revalidation of the same content.
4. **End to end.** Publish a change in the CMS, then reload the page. It should update within a few seconds. If it takes exactly as long as your `revalidate` interval, the webhook path is broken and the time-based fallback is silently covering for it.
5. **A shared fragment invalidates.** Edit navigation (or the footer) and confirm the change appears on a page you did *not* publish. This is the check worth doing by hand, because it's the one that fails while everything else looks healthy — a page edit invalidates through `revalidatePath` whether or not tags work, so testing only page edits will pass even when the entire tag mechanism is dead.
6. **A delete actually disappears.** Request the page first so it is genuinely in the cache, then delete or unpublish it in the CMS, then request it again — expect a 404 — and check any listing that included it. Warming the cache first is the whole point of the test: a URL that 404s because nothing ever cached it tells you nothing, and this arm fails independently of everything above, since deletes are the one event the resolve-then-purge design cannot resolve.
7. **Multi-instance.** Reload several times to hit different instances. If some show new content and some show old, the shared cache handler is missing or misconfigured.

One caveat that wastes a lot of debugging time: time-based ISR is stale-while-revalidate, so the first request after the interval expires still serves the *old* page and only kicks off regeneration in the background. A single reload showing stale content therefore proves nothing. Reload twice before concluding anything is broken.

## Common pitfalls

**A stale page that never refreshes on multi-instance hosting.** The default filesystem cache is per-instance. Add the Redis cache handler.

**Page edits invalidate but block edits don't, on a project that has a custom cache handler.** The handler is almost certainly discarding application tags — it handles Next.js's internal `_N_T_`-prefixed path tags but never persists `context.tags` in `set()`, so `revalidateTag('optimizely:nav')` has nothing to look up. Both reference files show a handler that indexes tags correctly.

**`revalidateTag` returns cleanly but nothing changes.** The data probably isn't in a tagged cache at all. Tags only attach through `unstable_cache`, `'use cache'`, or `fetch` with `next.tags`; a direct SDK or Axios call isn't covered by any of them.

**The CDN serves stale HTML even after ISR revalidates.** Revalidating Next.js's cache does nothing to an edge cache in front of it. Vercel purges automatically; DXP and Cloudflare/Fastly/CloudFront require an explicit purge call in the webhook handler.

**`revalidatePath()` with a rewritten path.** Middleware and rewrites do not run for on-demand revalidation. Pass the real filesystem route (`/blog/[slug]` resolves to `/blog/my-post`), not the public vanity URL, if they differ.

**Nothing invalidates after a block edit.** Blocks don't have their own URLs. This is exactly why tags exist — if you only wired `revalidatePath`, block edits will never propagate.

**Page edits work, navigation and footer edits don't.** The webhook is emitting tags the app never applies, or the app is applying tags the webhook never emits — most often `optimizely:nav`, which can't be derived from the payload and has to be triggered from the changed content's *type*. Page edits keep working throughout because `revalidatePath` covers them independently of tags, which is what makes this so easy to ship.

**Everything updates correctly, but deleted pages stay live.** The handler resolves the content key to a path before purging, and a deleted document no longer exists in Graph to resolve — so every targeted call is skipped and the webhook still reports success. The old URL keeps serving 200 and listings keep showing the entry. Handle the null resolution explicitly rather than treating it as a logging concern.

**Draft/preview content leaking into the ISR cache.** Preview requests must never populate the static cache. Keep preview routes fully dynamic and separate from the published routes; see the `optimizely-preview` skill.

**Nothing happens at all and there are no logs.** Check whether the deployed hostname in the webhook registration matches the current environment — a webhook registered against a preview URL keeps firing at the dead preview.

**Registration or resolution 404s with a doubled path in the URL.** `OPTIMIZELY_GRAPH_GATEWAY` normally already includes `/content/v2` — that's the SDK default and what `optimizely-setup` configures. Appending `/content/v2` or `/api/webhooks` to it produces `.../content/v2/content/v2`. Derive the origin instead.

**`'use cache'` builds fail or the directive appears to be ignored.** The opt-in flag is missing: `cacheComponents: true` on Next.js 16, `experimental.useCache: true` on 15.x.

**Next.js 16 build fails on a route you just added `revalidate` to.** Under `cacheComponents`, route segment `revalidate` / `dynamic` / `fetchCache` exports are errors. Move the interval into `cacheLife()` inside the cached function.

## References

- `references/optimizely-frontend-hosting.md` — Redis cache handler with managed identity, deployment-slot cache namespacing, auto-registration from `instrumentation.ts`, and Cloud Platform CDN purge. Read this when deploying to Optimizely frontend hosting (DXP).
- `references/portable-hosting.md` — Vercel, self-hosted single instance, and self-hosted multi-instance setups, including a plain Redis cache handler without Azure dependencies. Read this for any non-DXP target.
- `references/nextjs-16-cache-components.md` — the `cacheComponents` configuration, what it forbids, and the `cacheHandlers` Redis implementation that replaces `cacheHandler`. Read this whenever the project is on Next.js 16, in addition to the hosting reference.

## Related Skills

- **`optimizely-setup`** — SDK installation and environment variables; do this first, and note how it defines `OPTIMIZELY_GRAPH_GATEWAY`
- **`optimizely-content-fetching`** — the fetch calls you'll be wrapping in cached functions
- **`optimizely-model`** — where the content types you're bucketing in Step 2 are defined
- **`optimizely-content-navigation`** — navigation and breadcrumbs, the classic shared-tag case
- **`optimizely-multisite-locale`** — host resolution, the usual reason a route turns dynamic
- **`optimizely-preview`** — preview routes, which must stay outside the ISR cache
- **`optimizely-observability`** — spans carry a `cache: hit|miss` attribute, useful for confirming ISR is working
- **`optimizely-troubleshoot-graph`** — debugging the Graph queries the webhook makes
