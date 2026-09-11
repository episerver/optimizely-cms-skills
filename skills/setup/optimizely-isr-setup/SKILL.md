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

Also confirm the Next.js major version (`package.json`). The caching API changed meaningfully:

- **Next.js 14 / 15** — `unstable_cache()` for tagging, `revalidateTag(tag)` with one argument.
- **Next.js 15.5+ / 16** — `'use cache'` with `cacheTag()` / `cacheLife()`. In Next.js 16 `revalidateTag` requires a `cacheLife` profile as its second argument (`revalidateTag('posts', 'max')`); the single-argument form is deprecated.

Both are shown below. Use the one matching the project rather than introducing a new caching paradigm mid-codebase.

## Step 2: Choose a revalidation strategy per content type

Different content has different freshness requirements and different blast radius when it changes. Setting one global interval means either over-fetching stable content or under-refreshing volatile content.

Work through the project's content types (see the `optimizely-model` skill for where these live) and place each into one of these buckets:

| Content shape | Time-based `revalidate` | Invalidated on publish by |
|---|---|---|
| Landing / campaign pages, news articles | 1 hour (`3600`) | Its own content-key tag |
| Evergreen pages (about, contact, legal) | 1 day (`86400`) | Its own content-key tag |
| Navigation, header, footer, global settings | 1 day (`86400`) | A shared tag, e.g. `optimizely:nav` |
| Shared blocks embedded across many pages | 1 hour (`3600`) | Content-key tag + the type tag |
| Listing / index pages (blog index, search) | 15 minutes (`900`) | A type tag, e.g. `optimizely:type:ArticlePage` |
| Personalized or experiment-driven pages | Not cacheable | N/A — render dynamically |

These are starting points, not rules. Tell the user what you picked and why so they can adjust; a newsroom publishing hourly wants different numbers than a corporate site publishing monthly.

The important insight is the right-hand column. **Time-based intervals are the fallback; tags are the mechanism.** Getting the intervals slightly wrong is harmless once tagging is correct.

## Step 3: Tag every cached content fetch

Tags are what let a single publish invalidate exactly the pages affected. Without them, the webhook can only invalidate the URL of the changed content — which misses every *other* page that embeds it. A footer edit changes every page on the site; `revalidatePath('/site-settings')` fixes none of them.

Adopt a consistent tag vocabulary so the webhook can construct tags without a lookup table:

```
optimizely:content:{contentKey}     // the specific item that changed
optimizely:type:{ContentTypeName}   // all pages that list or embed this type
optimizely:nav                      // navigation, breadcrumbs, site structure
```

### Next.js 14 / 15 — `unstable_cache`

```typescript
// lib/content.ts
import { unstable_cache } from 'next/cache';
import { client } from './optimizely';

export const getPage = (path: string, locale: string) =>
  unstable_cache(
    async () => client.getContentByPath(path, { locales: [locale] }),
    ['optimizely-page', path, locale],
    {
      revalidate: 3600,
      tags: [`optimizely:path:${path}`],
    },
  )();
```

The content key usually isn't known until after the fetch, which is awkward with `unstable_cache`. Two workable options: tag by path here and let the webhook resolve key → path before revalidating (this is what the official Optimizely sample does), or fetch once uncached to learn the key and cache the render step by key. Prefer tagging by path for pages and by key for blocks fetched by key.

### Next.js 15.5+ / 16 — `'use cache'`

```typescript
// lib/content.ts
import { unstable_cacheTag as cacheTag, unstable_cacheLife as cacheLife } from 'next/cache';
import { client } from './optimizely';

export async function getPage(path: string, locale: string) {
  'use cache';
  cacheLife('hours');

  const page = await client.getContentByPath(path, { locales: [locale] });

  // Tags can be set after the fetch, so tag by the real content key.
  if (page?._metadata?.key) cacheTag(`optimizely:content:${page._metadata.key}`);
  cacheTag(`optimizely:type:${page?._metadata?.types?.[0]}`);

  return page;
}
```

`'use cache'` is the better fit for Optimizely because `cacheTag()` can be called *after* the fetch resolves, so you can tag by the content key the CMS actually returns rather than guessing from the URL.

Tag shared fetches the same way — navigation gets `optimizely:nav`, a header block gets its own content key.

**Tags only exist if the fetch goes through a cache primitive.** `revalidateTag` reaches data cached by `unstable_cache`, `'use cache'`, or `fetch(..., { next: { tags } })` — nothing else. If content is fetched with the SDK client, Axios, or a GraphQL client that doesn't use `fetch` under the hood, calling `revalidateTag` is a silent no-op no matter how correct the webhook is. That's the main reason to route every content read through a wrapper like the ones above rather than calling the client directly from components.

### Set the page-level fallback

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

  revalidateTag(`optimizely:content:${contentKey}`);
  if (content?.type) revalidateTag(`optimizely:type:${content.type}`);

  if (content?.path) {
    const path = stripTrailingSlash(content.path);
    // Both are needed: revalidatePath drops the rendered route, the path tag drops
    // the cached data behind it. On the unstable_cache branch, where pages are keyed
    // by path, revalidatePath alone re-renders the route from still-cached data.
    revalidateTag(`optimizely:path:${path}`);
    revalidatePath(path);
  }

  // Navigation has no URL of its own, so neither revalidatePath nor the content-key
  // tag can reach the pages that render it. This is the case tags exist for.
  if (content?.type && NAVIGATION_TYPES.has(content.type)) revalidateTag('optimizely:nav');

  return NextResponse.json({ revalidated: true, contentKey, now: Date.now() });
}
```

**Every tag you write in Step 3 needs a matching call here.** A tag with a writer and no reader is the failure mode this whole design is meant to prevent, and it is invisible: the webhook still returns `revalidated: true`, the logs are clean, and the content simply never updates until the time-based fallback expires. Before you finish, list the tags the app applies and check each one appears in this handler. `optimizely:nav` is the one most often missed, because it is the only tag not derivable from the payload.

Note for **Next.js 16**: `revalidateTag` requires a `cacheLife` profile as its second argument — `revalidateTag(tag, 'max')` for stale-while-revalidate behaviour. The single-argument form is deprecated, so check the installed version before writing these calls.

### Resolving the changed content to a URL

The webhook payload gives you a content key, not a URL. Query Graph to resolve it — and read it *uncached*, since the whole point is that the cached copy is stale:

```typescript
async function resolveContent(contentKey: string, locale?: string) {
  const response = await fetch(`${process.env.OPTIMIZELY_GRAPH_GATEWAY}/content/v2`, {
    method: 'POST',
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `epi-single ${process.env.OPTIMIZELY_GRAPH_SINGLE_KEY}`,
    },
    body: JSON.stringify({
      query: `query ResolveContent($key: String!, $locale: [Locales]) {
        _Content(where: { _metadata: { key: { eq: $key } } }, locale: $locale) {
          items {
            _metadata { key types url { hierarchical default } }
          }
        }
      }`,
      variables: { key: contentKey, locale: locale ? [locale.replace('-', '_')] : undefined },
    }),
  });

  const metadata = (await response.json())?.data?._Content?.items?.[0]?._metadata;
  return {
    // `hierarchical` is the site-relative path revalidatePath needs;
    // `default` is the absolute URL a CDN purge needs.
    path: metadata?.url?.hierarchical,
    url: metadata?.url?.default,
    type: metadata?.types?.[0],
  };
}
```

Filtering on `_metadata.key` rather than the `ids` argument is deliberate: the webhook's `docId` is the full `{key}_{locale}_{status}` triple while `_metadata.key` is the bare content key, and matching on the field you actually parsed avoids guessing which form the `ids` filter expects. It also matches the query style used across the other skills in this set.

Graph is eventually consistent: the webhook can fire fractionally before the published document is queryable. If resolution intermittently returns nothing, retry once after a short delay rather than treating it as an error. Log when resolution comes back empty — a webhook that silently resolves nothing on every publish looks identical to no webhook at all, and this is the single most common way this setup fails quietly.

### Handling deletes and unpublishes

A deleted page has no URL to resolve. Revalidate its content tag and its type tag (so listings drop it), and revalidate the parent path so navigation updates. Don't fail the request when resolution returns null for a `deleted` action — that's the expected shape.

### Always return 200 for handled events

Graph retries on non-2xx. If a malformed payload returns 500, you get a retry storm. Return 200 with `{ skipped: true }` for anything you deliberately ignore, and reserve error codes for genuine auth failures.

## Step 5: Register the webhook

Registration happens against the Graph API, not the CMS UI:

```
POST {OPTIMIZELY_GRAPH_GATEWAY}/api/webhooks
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
  "filters": [{ "status": { "eq": "Published" } }]
}
```

The `filters` clause matters — without it you'll receive draft-save traffic and revalidate constantly for content no visitor can see.

On Optimizely frontend hosting, register automatically at startup from `instrumentation.ts` so every deployment self-configures; that requires deduplication logic, covered in `references/optimizely-frontend-hosting.md`. Elsewhere, a one-time `curl` or a small `scripts/register-webhook.mjs` is simpler and easier to reason about.

`OPTIMIZELY_GRAPH_CALLBACK_APIKEY` is a secret you invent — generate a long random string (`openssl rand -hex 32`) and store it in both the app's environment and the webhook registration.

## Step 6: Verify it actually works

ISR failures are quiet, so verify explicitly rather than assuming. Walk the user through this:

1. **The route is static.** Run `next build` and confirm the content route is marked `●` (SSG) or `ISR`, not `ƒ` (Dynamic). A dynamic route means `revalidate` is doing nothing.
2. **The webhook endpoint responds.** POST a synthetic payload with the correct `x-api-key` and confirm a 200 with `revalidated: true`. Then POST without the key and confirm a 401.
3. **The webhook is registered.** `GET {gateway}/api/webhooks` with Basic auth and confirm exactly one entry pointing at your URL. Duplicates mean repeated revalidation of the same content.
4. **End to end.** Publish a change in the CMS, then reload the page. It should update within a few seconds. If it takes exactly as long as your `revalidate` interval, the webhook path is broken and the time-based fallback is silently covering for it.
5. **A shared fragment invalidates.** Edit navigation (or the footer) and confirm the change appears on a page you did *not* publish. This is the check worth doing by hand, because it's the one that fails while everything else looks healthy — a page edit invalidates through `revalidatePath` whether or not tags work, so testing only page edits will pass even when the entire tag mechanism is dead.
6. **Multi-instance.** Reload several times to hit different instances. If some show new content and some show old, the shared cache handler is missing or misconfigured.

One caveat that wastes a lot of debugging time: time-based ISR is stale-while-revalidate, so the first request after the interval expires still serves the *old* page and only kicks off regeneration in the background. A single reload showing stale content therefore proves nothing. Reload twice before concluding anything is broken.

## Common pitfalls

**A stale page that never refreshes on multi-instance hosting.** The default filesystem cache is per-instance. Add the Redis cache handler.

**Page edits invalidate but block edits don't, on a project that has a custom cache handler.** The handler is almost certainly discarding application tags — it handles Next.js's internal `_N_T_`-prefixed path tags but never persists `context.tags` in `set()`, so `revalidateTag('optimizely:nav')` has nothing to look up. Both reference files show a handler that indexes tags correctly.

**`revalidateTag` returns cleanly but nothing changes.** The data probably isn't in a tagged cache at all. Tags only attach through `unstable_cache`, `'use cache'`, or `fetch` with `next.tags`; a direct SDK or Axios call isn't covered by any of them.

**The CDN serves stale HTML even after ISR revalidates.** Revalidating Next.js's cache does nothing to an edge cache in front of it. Vercel purges automatically; DXP and Cloudflare/Fastly/CloudFront require an explicit purge call in the webhook handler.

**`revalidatePath()` with a rewritten path.** Middleware and rewrites do not run for on-demand revalidation. Pass the real filesystem route (`/blog/[slug]` resolves to `/blog/my-post`), not the public vanity URL, if they differ.

**Nothing invalidates after a block edit.** Blocks don't have their own URLs. This is exactly why tags exist — if you only wired `revalidatePath`, block edits will never propagate.

**Page edits work, navigation and footer edits don't.** The webhook is emitting tags the app never applies, or the app is applying tags the webhook never emits — most often `optimizely:nav`, which can't be derived from the payload and has to be triggered from the changed content's *type*. Page edits keep working throughout because `revalidatePath` covers them independently of tags, which is what makes this so easy to ship.

**Draft/preview content leaking into the ISR cache.** Preview requests must never populate the static cache. Keep preview routes fully dynamic and separate from the published routes; see the `optimizely-preview` skill.

**Nothing happens at all and there are no logs.** Check whether the deployed hostname in the webhook registration matches the current environment — a webhook registered against a preview URL keeps firing at the dead preview.

## References

- `references/optimizely-frontend-hosting.md` — Redis cache handler with managed identity, deployment-slot cache namespacing, auto-registration from `instrumentation.ts`, and Cloud Platform CDN purge. Read this when deploying to Optimizely frontend hosting (DXP).
- `references/portable-hosting.md` — Vercel, self-hosted single instance, and self-hosted multi-instance setups, including a plain Redis cache handler without Azure dependencies. Read this for any non-DXP target.

## Related Skills

- **`optimizely-setup`** — SDK installation and environment variables; do this first
- **`optimizely-content-fetching`** — the fetch calls you'll be wrapping in cached functions
- **`optimizely-content-navigation`** — navigation and breadcrumbs, the classic shared-tag case
- **`optimizely-preview`** — preview routes, which must stay outside the ISR cache
- **`optimizely-observability`** — spans carry a `cache: hit|miss` attribute, useful for confirming ISR is working
- **`optimizely-troubleshoot-graph`** — debugging the Graph queries the webhook makes
