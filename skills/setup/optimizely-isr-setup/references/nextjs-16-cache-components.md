# ISR on Next.js 16 with Cache Components

Everything that changes when the project is on Next.js 16 and uses `'use cache'`. Read this after `SKILL.md` and alongside the hosting reference for your target — the tagging strategy and the webhook receiver are unchanged, but the configuration, the route-level setup, and the shared cache handler are all different.

## Contents

- [What actually changes](#what-actually-changes)
- [Enabling cacheComponents](#enabling-cachecomponents)
- [What cacheComponents forbids](#what-cachecomponents-forbids)
- [Cache profiles](#cache-profiles)
- [Tagging content fetches](#tagging-content-fetches)
- [Revalidating from the webhook](#revalidating-from-the-webhook)
- [Shared cache handler](#shared-cache-handler)
- [Verification](#verification)
- [Troubleshooting](#troubleshooting)

## What actually changes

| | Next.js 14 / 15 | Next.js 16 with `cacheComponents` |
|---|---|---|
| Caching primitive | `unstable_cache()` | `'use cache'` |
| Tagging | `tags: []` option, set before the fetch | `cacheTag()`, callable after the fetch |
| Freshness | `revalidate` option and route export | `cacheLife()` inside the cached function |
| Route segment config | `export const revalidate` / `dynamic` | **Build error** |
| Invalidation call | `revalidateTag(tag)` | `revalidateTag(tag, profile)` |
| Shared cache | `cacheHandler` | `cacheHandlers.default` |

Only the last three rows cause real trouble. The tag vocabulary from Step 3 of `SKILL.md`, the webhook receiver, the Graph registration, and the CDN purge are all identical.

Note that `cacheHandler` (singular) has not been removed. If a Next.js 16 project does *not* enable `cacheComponents`, it keeps using `unstable_cache` and the legacy handler from the hosting references, and nothing in this file applies.

## Enabling cacheComponents

```typescript
// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  cacheComponents: true,
};

export default nextConfig;
```

Without this, `'use cache'` fails the build. On Next.js 15.x the equivalent flag is `experimental.useCache: true`, and the helpers are exported as `unstable_cacheTag` / `unstable_cacheLife`; `cacheComponents` replaces both `experimental.useCache` and `experimental.dynamicIO`.

## What cacheComponents forbids

Once the flag is on, route segments that export `revalidate`, `dynamic`, or `fetchCache` **error at build time**. This matters because it makes the standard ISR page setup illegal:

```typescript
// app/[...slug]/page.tsx — this no longer builds under cacheComponents
export const revalidate = 3600;
export const dynamic = 'error';
```

Delete both. The interval moves into the cached function, and the guard rail is now enforced by the framework: under `cacheComponents`, reading `headers()`, `cookies()`, or `searchParams` outside a `<Suspense>` boundary is a build error rather than a silent downgrade to dynamic rendering. That is exactly what `dynamic = 'error'` was there to catch, so nothing is lost.

```typescript
// app/[...slug]/page.tsx
import { Suspense } from 'react';
import { getPage } from '@/lib/content';

export async function generateStaticParams() {
  // Pre-render high-traffic routes at build time; the rest generate on first request.
  return [];
}

export default async function Page({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const page = await getPage(`/${slug.join('/')}`);

  return (
    <>
      <PageBody page={page} />
      {/* Anything request-dependent lives behind Suspense so the shell stays static. */}
      <Suspense fallback={null}>
        <HostAwareRegionBanner />
      </Suspense>
    </>
  );
}
```

Migrating an existing project is mostly deletion: remove the route exports, then move each interval into the `cacheLife()` call of the function that fetches that content.

## Cache profiles

`cacheLife()` takes a named profile, not a number. The built-ins:

| Profile | `stale` | `revalidate` | `expire` |
|---|---|---|---|
| `default` | 5 min | 15 min | never |
| `seconds` | 30 s | 1 s | 1 min |
| `minutes` | 5 min | 1 min | 1 hour |
| `hours` | 5 min | 1 hour | 1 day |
| `days` | 5 min | 1 day | 1 week |
| `weeks` | 5 min | 1 week | 1 month |
| `max` | 5 min | 1 month | 1 year |

`revalidate` is the one that corresponds to the interval column in Step 2 of `SKILL.md`. Mapping the recommended buckets: pages and shared blocks use `hours`, navigation and evergreen pages use `days`, listings use `default` (15 minutes). Define a named profile when the built-ins are too coarse:

```typescript
// next.config.ts
const nextConfig: NextConfig = {
  cacheComponents: true,
  cacheLife: {
    listing: { stale: 300, revalidate: 900, expire: 86400 },
  },
};
```

Then `cacheLife('listing')`. Keep `expire` comfortably longer than `revalidate` — once an entry passes `expire` it is discarded rather than served stale, so the next request blocks on a full Graph round trip instead of serving instantly and refreshing behind the scenes.

## Tagging content fetches

The reason `'use cache'` suits Optimizely better than `unstable_cache`: `cacheTag()` can be called *after* the fetch resolves, so every fetch can tag by the real content key rather than guessing from the URL. The `optimizely:path:` tag becomes unnecessary — don't carry it over.

```typescript
// lib/content.ts
import { cacheTag, cacheLife } from 'next/cache';
import { client } from './optimizely';

export async function getPage(path: string, locale: string) {
  'use cache';
  cacheLife('hours');
  // Coarse escape hatch. A hard delete leaves the webhook with nothing to resolve,
  // so no specific tag can reach this entry — see "Handling deletes" in SKILL.md.
  cacheTag('optimizely:all');

  const page = await client.getContentByPath(path, { locales: [locale] });

  // Tags set after the fetch, from what the CMS actually returned.
  if (page?._metadata?.key) cacheTag(`optimizely:content:${page._metadata.key}`);
  if (page?._metadata?.types?.[0]) cacheTag(`optimizely:type:${page._metadata.types[0]}`);

  return page;
}

export async function getNavigation(locale: string) {
  'use cache';
  cacheLife('days');
  cacheTag('optimizely:nav', 'optimizely:all');

  return client.getItems('/', { locales: [locale] });
}
```

A cached function must not close over request data. Pass everything it depends on as an argument — `locale` above — because the arguments are part of the cache key and anything read from the request inside a `'use cache'` scope is a build error.

## Revalidating from the webhook

The receiver in `SKILL.md` works as written except for the `revalidateTag` calls, which need a profile as the second argument:

```typescript
revalidateTag(`optimizely:content:${contentKey}`, 'max');

// Hard deletes resolve to nothing, so nothing below can reach the stale entries.
if (!content) {
  revalidateTag('optimizely:all', 'max');
  return NextResponse.json({ revalidated: true, contentKey, scope: 'site' });
}

if (content.type) revalidateTag(`optimizely:type:${content.type}`, 'max');
if (NAVIGATION_TYPES.has(content.type)) revalidateTag('optimizely:nav', 'max');
if (content.path) revalidatePath(stripTrailingSlash(content.path));
```

`'max'` gives stale-while-revalidate: the entry is marked stale and refreshed in the background, so no visitor waits on a Graph round trip. Use `revalidateTag(tag, { expire: 0 })` only when a page must never be served stale after a publish — a legal or pricing correction, say — because it makes the next request block on the re-render.

The single-argument form is deprecated in 16, and the path tag drops out because nothing writes it any more.

`updateTag()` is a Server Action-only sibling that invalidates immediately for the current user. It throws outside a Server Action, so it has no place in a webhook route.

## Shared cache handler

This is the part most likely to be missed on a multi-instance deployment. `'use cache'` entries do **not** go through the `cacheHandler` shown in the hosting references — that handler continues to serve the legacy ISR and fetch caches, and a project that has one and enables `cacheComponents` ends up with a shared cache that no longer holds the data it is caching. `'use cache'` uses `cacheHandlers` instead, which is a different config key and a different interface.

```typescript
// next.config.ts
const nextConfig: NextConfig = {
  cacheComponents: true,
  cacheHandlers: {
    default: require.resolve('./cache-handlers/redis-handler.js'),
  },
};
```

The interface has five methods rather than three:

| Method | Signature | Responsibility |
|---|---|---|
| `get` | `(cacheKey, softTags) => Promise<CacheEntry \| undefined>` | Return the entry, or `undefined` if missing, expired, or tag-invalidated |
| `set` | `(cacheKey, pendingEntry) => Promise<void>` | Await the promise, then store |
| `refreshTags` | `() => Promise<void>` | Called before the first read of each request; sync invalidations from shared storage |
| `getExpiration` | `(tags) => Promise<number>` | Most recent invalidation timestamp across those tags, or `0` |
| `updateTags` | `(tags, durations) => Promise<void>` | Record an invalidation, called by `revalidateTag` |

Two structural differences from the legacy handler drive the implementation. `CacheEntry.value` is a `ReadableStream<Uint8Array>`, so it must be drained on write and reconstructed on read. And invalidation is timestamp-based rather than delete-based: `updateTags` records *when* a tag was invalidated, and `get` compares that against the entry's own `timestamp`. That is what makes it work across instances — the webhook reaches one instance, and the others learn about it through `refreshTags`.

```javascript
// cache-handlers/redis-handler.js
const { createClient } = require('redis');

// Namespace per deployment so a staging revalidation can't wipe production's cache.
const PREFIX = `nextjs16:${process.env.CACHE_NAMESPACE ?? 'default'}`;
const entryKey = (key) => `${PREFIX}:entry:${key}`;
const tagKey = (tag) => `${PREFIX}:tag:${tag}`;
const TAG_INDEX = `${PREFIX}:tags`;

// Tag invalidation timestamps, refreshed once per request rather than per lookup.
const tagTimestamps = new Map();

let clientPromise = null;
let unavailableUntil = 0;

async function getClient() {
  if (!process.env.REDIS_URL) return null;
  if (Date.now() < unavailableUntil) return null;

  if (!clientPromise) {
    clientPromise = createClient({ url: process.env.REDIS_URL, socket: { connectTimeout: 10_000 } })
      .on('error', () => {})
      .connect()
      .catch(() => {
        // Back off so every cache read doesn't pay the full connect timeout.
        unavailableUntil = Date.now() + 60_000;
        clientPromise = null;
        return null;
      });
  }
  return clientPromise;
}

const invalidatedAt = (tags) =>
  Math.max(0, ...tags.map((tag) => tagTimestamps.get(tag) ?? 0));

module.exports = {
  async get(cacheKey, softTags) {
    try {
      const client = await getClient();
      if (!client) return undefined;

      const stored = await client.get(entryKey(cacheKey));
      if (!stored) return undefined;

      const data = JSON.parse(stored);

      // Two independent reasons to treat the entry as gone: its own revalidate
      // window elapsed, or a tag it carries was invalidated after it was written.
      if (Date.now() > data.timestamp + data.revalidate * 1000) return undefined;
      if (invalidatedAt([...data.tags, ...softTags]) > data.timestamp) return undefined;

      return {
        value: new ReadableStream({
          start(controller) {
            controller.enqueue(Buffer.from(data.value, 'base64'));
            controller.close();
          },
        }),
        tags: data.tags,
        stale: data.stale,
        timestamp: data.timestamp,
        expire: data.expire,
        revalidate: data.revalidate,
      };
    } catch {
      // Next.js does not wrap get() in a try/catch — throwing here fails the render.
      return undefined;
    }
  },

  async set(cacheKey, pendingEntry) {
    try {
      // The entry may still be rendering when set() is called.
      const entry = await pendingEntry;
      const client = await getClient();
      if (!client) return;

      const reader = entry.value.getReader();
      const chunks = [];
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(Buffer.from(value));
        }
      } finally {
        reader.releaseLock();
      }

      await client.set(
        entryKey(cacheKey),
        JSON.stringify({
          value: Buffer.concat(chunks).toString('base64'),
          tags: entry.tags,
          stale: entry.stale,
          timestamp: entry.timestamp,
          expire: entry.expire,
          revalidate: entry.revalidate,
        }),
        { EX: Math.max(1, Math.ceil(entry.expire)) },
      );
    } catch (error) {
      // A failed write costs one cache miss; the response is already streaming.
      console.error('[isr] cache set failed', error);
    }
  },

  async refreshTags() {
    // This is what makes invalidation cross-instance: the webhook wrote a timestamp
    // on whichever instance it hit, and every other instance reads it here.
    try {
      const client = await getClient();
      if (!client) return;

      const tags = await client.sMembers(TAG_INDEX);
      if (tags.length === 0) return;

      const values = await client.mGet(tags.map(tagKey));
      tags.forEach((tag, index) => tagTimestamps.set(tag, Number(values[index]) || 0));
    } catch (error) {
      console.error('[isr] refreshTags failed', error);
    }
  },

  async getExpiration(tags) {
    return invalidatedAt(tags);
  },

  async updateTags(tags) {
    const now = Date.now();
    tags.forEach((tag) => tagTimestamps.set(tag, now));

    try {
      const client = await getClient();
      if (!client) return;

      const pipeline = client.multi();
      for (const tag of tags) {
        pipeline.set(tagKey(tag), String(now));
        pipeline.sAdd(TAG_INDEX, tag);
      }
      await pipeline.exec();
    } catch (error) {
      console.error('[isr] updateTags failed', error);
    }
  },
};
```

Details worth keeping when you adapt this:

- **Never throw out of `get()`.** Next.js does not wrap it, so an unhandled Redis error becomes a render error. Returning `undefined` degrades to a cache miss instead.
- **`refreshTags` runs once per request**, before the first read — not per lookup. Keep it to one round trip; the `TAG_INDEX` set exists so it never has to scan the keyspace.
- **The tag index grows without bound.** Every tag ever invalidated stays in it, and `optimizely:content:{key}` is high-cardinality. Put a TTL on the tag keys (longer than your longest `expire`) and prune the index periodically, or `refreshTags` gets slower every week.
- **Instance-local `tagTimestamps` is a cache of a cache.** An instance that has not called `refreshTags` since an invalidation can serve one stale response. That window is a single request, not the `revalidate` interval.
- **On DXP**, swap the `createClient` call for the managed-identity version in `optimizely-frontend-hosting.md` and use `OPTIMIZELY_DXP_DEPLOYMENT_ID` as the namespace. Everything else here is unchanged.

## Verification

The Step 6 checklist in `SKILL.md` applies, with two changes:

- The build output reports cache behaviour as `Revalidate` and `Expire` columns per route rather than only the `●` / `ƒ` markers. A route showing `15m` when you configured `hours` means the fetch is picking up the `default` profile — the `cacheLife()` call isn't in the scope you think it is.
- Test invalidation against a *deployed* build. `next dev` does not use `cacheHandlers`, so multi-instance behaviour cannot be reproduced locally at all.

## Troubleshooting

**`revalidateTag` works locally but not in production.** Local runs use the in-memory handler; production uses Redis. Check `refreshTags` is actually reading — log the tag count it syncs.

**Every publish invalidates the whole site.** Log the tags arriving in `updateTags`. `revalidatePath` expires the route's soft tags, which include a layout tag per path segment; if a bare `/layout` tag is coming through on every call, skip it the way the legacy handler skips `_N_T_/layout`.

**Content updates on one instance only.** `refreshTags` is failing silently, or the instances have different `CACHE_NAMESPACE` values and are writing to disjoint key spaces.

**Pages go blank or render partially after a cache hit.** The stream was stored partially. Discard entries on a read error in `set()` rather than storing what you have.

**Build error: "Route used `headers`/`cookies` without a Suspense boundary".** This is `cacheComponents` doing its job — the request-dependent part needs to move behind `<Suspense>`. See the `optimizely-multisite-locale` skill for the host-resolution pattern.

**Build error on `export const revalidate`.** Route segment config is not allowed under `cacheComponents`. Move the interval into `cacheLife()`.
