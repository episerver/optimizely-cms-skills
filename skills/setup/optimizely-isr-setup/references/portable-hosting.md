# ISR on Non-DXP Hosting

Deployment-specific setup for Vercel, single-instance self-hosting, and multi-instance self-hosting. Read this after `SKILL.md`; the tagging strategy and webhook receiver there apply unchanged. What differs is the cache backend and who purges the CDN.

## Contents

- [Choosing your setup](#choosing-your-setup)
- [Vercel](#vercel)
- [Self-hosted, single instance](#self-hosted-single-instance)
- [Self-hosted, multiple instances](#self-hosted-multiple-instances)
- [Netlify](#netlify)
- [Registering the webhook manually](#registering-the-webhook-manually)
- [Purging a third-party CDN](#purging-a-third-party-cdn)
- [Troubleshooting](#troubleshooting)

## Choosing your setup

| | Shared cache handler | CDN purge in webhook |
|---|---|---|
| Vercel | Not needed — handled by the platform | Not needed — automatic on revalidate |
| Self-hosted, one instance | Not needed — filesystem cache is fine | Only if a CDN sits in front |
| Self-hosted, multiple instances | **Required** — Redis | Only if a CDN sits in front |
| Netlify | Not needed — handled by the platform | Not needed |

"Multiple instances" includes anything horizontally scaled: a Kubernetes Deployment with `replicas > 1`, an autoscaling ECS service, several containers behind a load balancer. If instance count can ever exceed one — including transiently during a rolling deploy — treat it as multi-instance.

## Vercel

The least work. Vercel's ISR cache is shared across all regions and functions, and `revalidateTag()` / `revalidatePath()` propagate to the Edge Network automatically, so no cache handler and no purge call are needed.

Environment variables to configure in the project settings:

```
# The query endpoint, matching the SDK default and the optimizely-setup skill.
# The webhook management API is at the origin, so derive it: new URL(gateway).origin
OPTIMIZELY_GRAPH_GATEWAY=https://cg.optimizely.com/content/v2
OPTIMIZELY_GRAPH_SINGLE_KEY=...
OPTIMIZELY_GRAPH_APP_KEY=...
OPTIMIZELY_GRAPH_SECRET=...
OPTIMIZELY_GRAPH_CALLBACK_APIKEY=<generate: openssl rand -hex 32>
```

Two Vercel-specific traps:

- **Preview deployments have unique URLs.** Register the webhook against the stable production domain, not a deployment URL, or it stops firing the moment that deployment is superseded.
- **Deployment Protection blocks webhooks.** If enabled, Optimizely's POST is rejected before it reaches your route. Add the revalidation path to the protection bypass, or use a Protection Bypass token.

## Self-hosted, single instance

The default filesystem cache under `.next/cache` works, so no handler is required. Two things to get right:

- **Persist `.next/cache` across restarts** if you want the cache to survive a deploy. In Docker this means a volume; without one, every restart is a cold cache and the first request to each page pays a full Graph round trip.
- **`next start`, not `next export`.** ISR needs a Node.js server. `output: 'export'` in `next.config` makes ISR impossible; `output: 'standalone'` is fine and is the usual choice for containers.

## Self-hosted, multiple instances

You need a shared cache. Below is a plain Redis handler with no cloud-provider dependencies — the same shape as the DXP one in `optimizely-frontend-hosting.md`, minus managed identity.

**This is the `cacheHandler` API**, which backs `unstable_cache`, the fetch cache, and full-route ISR. On Next.js 16 with `cacheComponents` enabled, `'use cache'` entries do not pass through it and need a `cacheHandlers.default` implementation instead — see `nextjs-16-cache-components.md`.

```bash
npm install redis
```

```javascript
// next.config.mjs
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default {
  output: 'standalone',
  cacheHandler: resolve(__dirname, 'cache-handler.mjs'),
  cacheMaxMemorySize: 0,
};
```

```javascript
// cache-handler.mjs
import { createClient } from 'redis';

// Namespace per deployment so a staging revalidation can't wipe production's cache
// when both share a Redis instance.
const CACHE_PREFIX = `nextjs:${process.env.CACHE_NAMESPACE ?? 'default'}`;

// Fallback store used when Redis is unreachable: entries plus a tag -> keys index.
const memoryEntries = new Map();
const memoryTags = new Map();

let clientPromise = null;
let unavailableUntil = 0;

async function getClient() {
  if (!process.env.REDIS_URL) return null;
  if (Date.now() < unavailableUntil) return null;

  if (!clientPromise) {
    clientPromise = createClient({
      url: process.env.REDIS_URL,
      socket: { connectTimeout: 10_000 },
    })
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

const entryKey = (key) => `${CACHE_PREFIX}:entry:${key}`;
const tagKey = (tag) => `${CACHE_PREFIX}:tag:${tag}`;

/** Next.js encodes revalidatePath() as an internal `_N_T_`-prefixed tag. */
function pathTagToKey(tag) {
  const path = tag.slice('_N_T_'.length);
  return path === '/' ? '/index' : path;
}

export default class CacheHandler {
  async get(key) {
    const client = await getClient();
    if (!client) return memoryEntries.get(key) ?? null;

    const raw = await client.get(entryKey(key));
    return raw ? JSON.parse(raw) : null;
  }

  async set(key, value, context) {
    // Persisting context.tags is what makes tag invalidation possible at all —
    // without this index, revalidateTag has no way to find the entries to drop.
    const tags = context?.tags ?? [];
    const entry = { value, lastModified: Date.now(), tags };
    const client = await getClient();

    if (!client) {
      memoryEntries.set(key, entry);
      for (const tag of tags) {
        if (!memoryTags.has(tag)) memoryTags.set(tag, new Set());
        memoryTags.get(tag).add(key);
      }
      return;
    }

    const ttl = typeof context?.revalidate === 'number' ? context.revalidate : undefined;
    await client.set(entryKey(key), JSON.stringify(entry), ttl ? { EX: ttl } : undefined);
    for (const tag of tags) await client.sAdd(tagKey(tag), key);
  }

  async revalidateTag(tags) {
    const list = Array.isArray(tags) ? tags : [tags];
    const client = await getClient();

    for (const tag of list) {
      // `_N_T_/layout` accompanies every revalidatePath() call. Acting on it would
      // flush the whole site on any single-page publish.
      if (tag === '_N_T_/layout') continue;

      // Path tags name their cache entry directly; application tags
      // (optimizely:content:*, optimizely:type:*, optimizely:nav) need the index.
      const keys = tag.startsWith('_N_T_')
        ? [pathTagToKey(tag)]
        : client
          ? await client.sMembers(tagKey(tag))
          : [...(memoryTags.get(tag) ?? [])];

      for (const key of keys) {
        if (client) await client.del(entryKey(key));
        else memoryEntries.delete(key);
      }

      if (!tag.startsWith('_N_T_')) {
        if (client) await client.del(tagKey(tag));
        else memoryTags.delete(tag);
      }
    }
  }
}
```

Notes that save debugging time later:

- **`set()` must persist `context.tags` and index them.** A handler that only understands `_N_T_`-prefixed path tags looks like it works — page edits still invalidate via `revalidatePath` — while every `optimizely:content:*` and `optimizely:nav` tag is silently discarded, so shared-block edits never propagate. This is the most common bug in hand-rolled handlers.
- `cacheHandler` is **ignored by `next dev`**. Verify with `next build && next start`.
- Never let a Redis failure throw out of the handler — an unavailable cache should cost cache coherency, not availability. The in-memory fallback does that.
- The webhook only reaches one instance, and that's fine: it deletes the shared Redis key, so all instances miss and re-render on the next request.
- Keep the build ID in the cache key (Next.js does this by default). Entries written by one build and read by another produce hydration errors that look nothing like a caching problem.

### Kubernetes specifics

Route the webhook to any single pod (a normal Service does this). Don't fan it out to all pods — the shared cache makes that redundant, and it multiplies Graph traffic on every publish.

## Netlify

The Next.js runtime maps ISR onto Netlify's durable cache, and `revalidateTag()` / `revalidatePath()` invalidate the CDN automatically. No cache handler, no purge call. Register the webhook against the production domain for the same reason as Vercel.

## Registering the webhook manually

Off DXP, a one-time registration is simpler and more predictable than startup auto-registration. Run this once per environment.

The management API lives at the Graph origin, while `OPTIMIZELY_GRAPH_GATEWAY` points at the query endpoint underneath it, so derive one from the other rather than appending:

```bash
GRAPH_ORIGIN=$(node -p "new URL(process.env.OPTIMIZELY_GRAPH_GATEWAY).origin")
```

```bash
curl -X POST "$GRAPH_ORIGIN/api/webhooks" \
  -u "$OPTIMIZELY_GRAPH_APP_KEY:$OPTIMIZELY_GRAPH_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "disabled": false,
    "request": {
      "url": "https://www.example.com/api/revalidate",
      "method": "post",
      "headers": { "x-api-key": "'"$OPTIMIZELY_GRAPH_CALLBACK_APIKEY"'" }
    },
    "topic": ["*.*"],
    "filters": [
      { "status": { "eq": "Published" } },
      { "status": { "eq": "Expired" } },
      { "status": { "eq": "Deleted" } }
    ]
  }'
```

List what's registered, so you can spot leftovers pointing at dead preview URLs:

```bash
curl "$GRAPH_ORIGIN/api/webhooks" \
  -u "$OPTIMIZELY_GRAPH_APP_KEY:$OPTIMIZELY_GRAPH_SECRET"
```

Delete one:

```bash
curl -X DELETE "$GRAPH_ORIGIN/api/webhooks/{id}" \
  -u "$OPTIMIZELY_GRAPH_APP_KEY:$OPTIMIZELY_GRAPH_SECRET"
```

Committing the registration as `scripts/register-webhook.mjs` and running it in the deploy pipeline is a reasonable middle ground — just make it idempotent (list first, skip if present) so repeated deploys don't accumulate duplicates.

### Testing without a public URL

Expose the local server through a tunnel, register a webhook against the tunnel URL, and delete it afterwards. A forgotten tunnel webhook leaves Graph retrying against a dead endpoint indefinitely.

You can also skip Graph entirely and POST a synthetic payload:

```bash
curl -X POST http://localhost:3000/api/revalidate \
  -H "x-api-key: $OPTIMIZELY_GRAPH_CALLBACK_APIKEY" \
  -H "Content-Type: application/json" \
  -d '{"subject":"doc","action":"updated","data":{"docId":"<contentKey>_en_Published"}}'
```

## Purging a third-party CDN

If Cloudflare, Fastly, or CloudFront fronts a self-hosted app, revalidating Next.js is not enough — the edge keeps serving its own copy. Add a purge call to the webhook handler alongside the revalidation:

```typescript
/** Purge a path from Cloudflare's edge cache. Failures are logged, not thrown. */
async function purgeCloudflare(urls: string[]) {
  if (!process.env.CLOUDFLARE_ZONE_ID) return;

  try {
    await fetch(
      `https://api.cloudflare.com/client/v4/zones/${process.env.CLOUDFLARE_ZONE_ID}/purge_cache`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ files: urls }),
      },
    );
  } catch (error) {
    console.error('[isr] cdn purge failed', error);
  }
}
```

Fastly uses `PURGE` against the URL or a surrogate-key purge; CloudFront uses `CreateInvalidation`. In all three cases, purge the **public** URL, and batch multiple paths into one call rather than issuing a request per URL.

A cleaner alternative for Fastly and Cloudflare Enterprise: emit `Surrogate-Key` / `Cache-Tag` response headers carrying the same `optimizely:content:{key}` tags used in the app, then purge by tag. The CDN then mirrors the app's invalidation model exactly, and shared blocks purge correctly without enumerating affected URLs.

## Troubleshooting

**Content updates only after the `revalidate` interval elapses.** The webhook isn't reaching the app. Check registration, then check that the deployed route returns 200 for a synthetic POST, then check platform-level protection (Vercel Deployment Protection, WAF, IP allowlists).

**Works locally, not in production.** `next dev` ignores `cacheHandler` and behaves differently from `next start`. Reproduce with a production build before concluding the code is wrong.

**Some requests are fresh, some stale.** Multiple instances without a shared cache handler, or Redis silently falling back to the in-memory map. Log when the fallback engages.

**One publish flushes everything.** The `_N_T_/layout` tag isn't being filtered in `revalidateTag`.

**Webhook returns 401 in production but works locally.** `OPTIMIZELY_GRAPH_CALLBACK_APIKEY` differs between the app's environment and the value baked into the webhook registration. Re-register with the deployed value.

**Webhook returns 405.** The route file exports `GET` instead of `POST`, or a rewrite is intercepting the path. Middleware and rewrites don't run for on-demand revalidation, but they do run for the inbound webhook request itself.
