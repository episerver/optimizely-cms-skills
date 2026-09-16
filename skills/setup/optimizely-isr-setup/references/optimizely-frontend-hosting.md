# ISR on Optimizely Frontend Hosting (DXP)

Everything specific to running ISR on Optimizely's managed frontend hosting. Read this after `SKILL.md`; it assumes the tagging strategy and webhook receiver from there are already in place.

## Contents

- [What the platform gives you](#what-the-platform-gives-you)
- [Deployment requirements](#deployment-requirements)
- [Redis cache handler](#redis-cache-handler)
- [Auto-registering the webhook](#auto-registering-the-webhook)
- [CDN cache purge](#cdn-cache-purge)
- [Wiring purge into the webhook](#wiring-purge-into-the-webhook)
- [Local development](#local-development)
- [Troubleshooting](#troubleshooting)

## What the platform gives you

Optimizely frontend hosting supports SSG, SSR, and ISR for Next.js. These environment variables are provisioned for you at build and runtime — do not define them in `.env` for deployed environments, only locally:

| Variable | Purpose |
|---|---|
| `OPTIMIZELY_GRAPH_GATEWAY` | Graph query endpoint, e.g. `https://cg.optimizely.com/content/v2` |
| `OPTIMIZELY_GRAPH_SINGLE_KEY` | Read-only query key |
| `OPTIMIZELY_GRAPH_APP_KEY` | Webhook management, Basic auth username |
| `OPTIMIZELY_GRAPH_SECRET` | Webhook management, Basic auth password (Key Vault) |
| `OPTIMIZELY_GRAPH_CALLBACK_APIKEY` | Shared secret validating inbound webhooks (Key Vault) |
| `OPTIMIZELY_CMS_URL` | CMS instance URL |
| `OPTIMIZELY_SITE_HOSTNAME` | Public hostname, e.g. `mysite.example.com` |
| `REDIS_URL` | Redis host:port, e.g. `myredis.redis.azure.net:10000` |
| `AZURE_CLIENT_ID` | Managed identity used for Redis and CDN auth |
| `OPTIMIZELY_DXP_DEPLOYMENT_ID` | Deployment slot identifier, used to namespace cache keys |
| `OPTIMIZELY_CLOUDPLATFORM_API_URL` | Cloud Platform Services API base |
| `OPTIMIZELY_CLOUDPLATFORM_API_RESOURCE_ID` | Resource ID used to scope the CDN purge token |

Only `OPTIMIZELY_GRAPH_CALLBACK_APIKEY` is one you may need to create yourself if it isn't provisioned in your environment. Everything else comes from the platform.

## Deployment requirements

ISR requires a running Node.js server, so the deployment package must launch one:

```json
{
  "scripts": {
    "build": "next build",
    "start": "next start"
  }
}
```

- `package.json` must be at the package root.
- Exactly one lock file (`package-lock.json` or `yarn.lock`). Two lock files, or none, fails the container build with `Failed to prepare container in repository 'frontend' on ACR`.
- Exclude `node_modules` and `.next` from the zip.
- Name the package `<name>.head.app.<version>.zip`.
- Static Export (`output: 'export'`) is incompatible with ISR. If `next.config` sets it, ISR cannot work at all.

## Redis cache handler

Frontend hosting runs multiple instances, so the default filesystem ISR cache must be replaced with a shared one. Without this, `revalidateTag()` only clears the cache on whichever instance received the webhook and the others keep serving stale HTML indefinitely.

**This handler is for the `cacheHandler` API**, which backs `unstable_cache`, the fetch cache, and the full-route ISR cache. If the project is on Next.js 16 with `cacheComponents` enabled, `'use cache'` entries bypass it entirely and need a `cacheHandlers.default` implementation instead — see `nextjs-16-cache-components.md`, then come back here for the managed-identity connection and the deployment-slot namespacing, which apply to both.

Install:

```bash
npm install redis @redis/entraid @azure/identity
```

Point Next.js at the handler and disable the in-process LRU so instances can't diverge:

```javascript
// next.config.mjs
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default {
  cacheHandler: resolve(__dirname, 'cache-handler.mjs'),
  cacheMaxMemorySize: 0,
};
```

`cacheHandler` must be an absolute path, and it is only honoured in production builds — `next dev` always uses the in-memory cache, which is why ISR bugs so often appear only after deploying.

### The handler

```javascript
// cache-handler.mjs
import { createClient } from 'redis';
import { EntraIdCredentialsProviderFactory } from '@redis/entraid';
import { ManagedIdentityCredential } from '@azure/identity';

// Every deployment slot shares one Redis instance. Without this prefix, revalidating
// in the staging slot would wipe production's cache.
const CACHE_PREFIX = `nextjs:${process.env.OPTIMIZELY_DXP_DEPLOYMENT_ID ?? 'local'}`;

// Fallback store used when Redis is unreachable: entries plus a tag -> keys index.
const memoryEntries = new Map();
const memoryTags = new Map();

let clientPromise = null;
let unavailableUntil = 0;

/** DXP supplies REDIS_URL as bare `host:port`, but tolerate a full URL too. */
function redisUrl() {
  const value = process.env.REDIS_URL;
  if (!value) return null;
  if (value.includes('://')) return value;

  const [host, port] = value.split(':');
  return `rediss://${host}:${port ?? 10000}`;
}

async function connect() {
  const url = redisUrl();
  if (!url) return null;

  const client = createClient({
    // TLS is mandatory on Azure Managed Redis.
    url,
    credentialsProvider: EntraIdCredentialsProviderFactory.createForDefaultAzureCredential({
      credential: new ManagedIdentityCredential({ clientId: process.env.AZURE_CLIENT_ID }),
      tokenManagerConfig: { expirationRefreshRatio: 0.8 },
    }),
    socket: { connectTimeout: 10_000 },
  });

  client.on('error', () => {});
  await client.connect();
  return client;
}

async function getClient() {
  // Back off after a failure so every cache read doesn't pay a 10s timeout.
  if (Date.now() < unavailableUntil) return null;
  if (!clientPromise) {
    clientPromise = connect().catch(() => {
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
      // Next.js emits `_N_T_/layout` alongside every revalidatePath() call. Acting on
      // it would flush the entire site on any single-page publish.
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

Three details are easy to get wrong and expensive to debug:

- **Persist `context.tags` and index them.** This is the part that most hand-written handlers omit, and the failure is invisible: `revalidatePath` keeps working, so publishes appear to invalidate correctly for page edits, while every `optimizely:content:*` / `optimizely:nav` tag is silently dropped and shared-block edits never propagate. If you only handle `_N_T_`-prefixed tags, the entire tag vocabulary from Step 3 of `SKILL.md` does nothing.
- **Filtering `_N_T_/layout`.** Next.js sends it alongside every path revalidation. A handler that treats it as "invalidate everything" turns each publish into a full-site cache flush and a Graph traffic spike.
- **Never let a Redis failure throw.** A cache handler that rejects takes the page render down with it. Degrading to the in-memory maps means a Redis outage costs you cache coherency, not availability.

Cache keys already include the build ID via Next.js's own key derivation, but if you customize key generation, keep the build ID in it — entries from an old build deserialized into a new one cause hydration errors that look nothing like a caching problem.

If your Redis is a cluster, the client resolves nodes to IPs, which breaks TLS hostname validation. Map node addresses back to the original hostname in the client's node-address configuration.

## Auto-registering the webhook

Register at startup so every deployment self-configures. Because instances start concurrently, registration must be idempotent or you'll accumulate duplicate webhooks and revalidate the same content many times per publish.

```typescript
// src/instrumentation.ts
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const gateway = process.env.OPTIMIZELY_GRAPH_GATEWAY;
  const hostname = process.env.OPTIMIZELY_SITE_HOSTNAME;
  if (!gateway || !hostname) return;

  // OPTIMIZELY_GRAPH_GATEWAY points at the query endpoint (.../content/v2). The
  // webhook management API lives at the origin, so derive it rather than appending.
  const webhooksUrl = `${new URL(gateway).origin}/api/webhooks`;
  const callbackUrl = `https://${hostname}/api/revalidate`;
  const auth = Buffer.from(
    `${process.env.OPTIMIZELY_GRAPH_APP_KEY}:${process.env.OPTIMIZELY_GRAPH_SECRET}`,
  ).toString('base64');
  const headers = { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' };

  try {
    const existing = await fetch(webhooksUrl, { headers, cache: 'no-store' })
      .then((response) => response.json())
      .then((hooks) => (hooks ?? []).filter((hook) => hook?.request?.url === callbackUrl));

    if (existing.length > 0) {
      // Concurrent instance starts race. Keep one deterministically, drop the rest.
      const [keep, ...duplicates] = [...existing].sort((a, b) => String(b.id).localeCompare(String(a.id)));
      await Promise.all(
        duplicates.map((hook) => fetch(`${webhooksUrl}/${hook.id}`, { method: 'DELETE', headers })),
      );
      console.info(`[isr] webhook already registered (${keep.id})`);
      return;
    }

    await fetch(webhooksUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        disabled: false,
        request: {
          url: callbackUrl,
          method: 'post',
          headers: { 'x-api-key': process.env.OPTIMIZELY_GRAPH_CALLBACK_APIKEY },
        },
        topic: ['*.*'],
        filters: [
          { status: { eq: 'Published' } },
          { status: { eq: 'Expired' } },
          { status: { eq: 'Deleted' } },
        ],
      }),
    });
    console.info('[isr] webhook registered');
  } catch (error) {
    // A registration failure must not prevent the app from serving traffic.
    console.error('[isr] webhook registration failed', error);
  }
}
```

For Next.js versions before 15, enable `experimental.instrumentationHook` in `next.config.mjs` or the file won't load.

The registration is scoped to a hostname, so each deployment slot registers its own webhook. Preview and integration slots will each fire revalidations — expected, but worth knowing when you see more traffic than one publish should generate.

## CDN cache purge

Revalidating the Next.js cache does nothing to the CDN sitting in front of it. On DXP you must purge explicitly, or visitors keep receiving edge-cached HTML until it expires on its own.

```typescript
// src/lib/cdn-cache.ts
import { ManagedIdentityCredential } from '@azure/identity';

const credential = new ManagedIdentityCredential({ clientId: process.env.AZURE_CLIENT_ID });
let cachedToken: { token: string; expiresOnTimestamp: number } | null = null;

async function getToken() {
  // Reuse until five minutes before expiry; token acquisition is slow relative to a purge.
  if (cachedToken && cachedToken.expiresOnTimestamp - Date.now() > 5 * 60_000)
    return cachedToken.token;

  const scope = `${process.env.OPTIMIZELY_CLOUDPLATFORM_API_RESOURCE_ID}/.default`;
  const token = await credential.getToken(scope);
  if (!token) throw new Error('Failed to acquire managed identity token');

  cachedToken = token;
  return token.token;
}

/** Purge one or more absolute URLs from the DXP edge cache. Returns silently on failure. */
export async function purgeCdnCache(urls: string[]) {
  if (!process.env.OPTIMIZELY_CLOUDPLATFORM_API_URL || urls.length === 0) return;

  try {
    const response = await fetch(
      `${process.env.OPTIMIZELY_CLOUDPLATFORM_API_URL}/v1/edge-cache/purge`,
      {
        method: 'POST',
        cache: 'no-store',
        headers: {
          Authorization: `Bearer ${await getToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ urls }),
      },
    );

    // 202 Accepted: the purge is queued and completes within seconds.
    if (!response.ok) console.error('[isr] cdn purge failed', response.status);
  } catch (error) {
    console.error('[isr] cdn purge error', error);
  }
}
```

Purge the **public-facing** hostname (`OPTIMIZELY_SITE_HOSTNAME`). Purging an internal container URL succeeds and accomplishes nothing, which is a genuinely hard bug to spot.

## Wiring purge into the webhook

Extend the handler from `SKILL.md` so cache invalidation and edge purge happen together:

```typescript
import { purgeCdnCache } from '@/lib/cdn-cache';

// ...after resolving the changed content:
const path = stripTrailingSlash(content.path);

revalidateTag(`optimizely:content:${contentKey}`);
if (content.type) revalidateTag(`optimizely:type:${content.type}`);
if (content.type && NAVIGATION_TYPES.has(content.type)) revalidateTag('optimizely:nav');
revalidateTag(`optimizely:path:${path}`);
revalidatePath(path);

// Always purge the public hostname, not the resolved absolute URL from Graph —
// Graph may return an internal or CMS-side host that the CDN knows nothing about.
await purgeCdnCache([`https://${process.env.OPTIMIZELY_SITE_HOSTNAME}${path}`]);
```

Only the changed page is revalidated and purged; other cached pages are untouched. If a change should affect many URLs (a footer edit), collect them and pass the whole array — the purge endpoint accepts multiple URLs in one call, which is far cheaper than one request per URL.

The delete branch needs its own purge. When resolution returns null there is no path to build a URL from, so the CDN keeps serving the deleted page even after `revalidatePath('/', 'layout')` has cleared the origin — which looks exactly like ISR being broken. Cloud Platform's purge endpoint accepts a wildcard, so pair the site-wide revalidation with a site-wide purge:

```typescript
if (!content) {
  revalidatePath('/', 'layout');
  await purgeCdnCache([`https://${process.env.OPTIMIZELY_SITE_HOSTNAME}/*`]);
  return NextResponse.json({ revalidated: true, contentKey, scope: 'site' });
}
```

This is expensive — it costs you the entire edge cache — which is the price of not knowing the URL. If deletes are frequent enough for that to matter, keep the key → path index described in `SKILL.md` and purge precisely instead.

## Local development

Locally you have no Redis, no managed identity, and no CDN, and the handler above degrades to the in-memory map automatically. Two things to remember:

- `next dev` ignores `cacheHandler` entirely. To exercise the real cache path, run `next build && next start`.
- To test the webhook without a public hostname, expose your local server via a tunnel and register a temporary webhook against the tunnel URL — then **delete it** when you're done, or Graph keeps retrying against a dead endpoint.

## Troubleshooting

**Some requests show new content, some show old.** Instances aren't sharing a cache. Confirm `cacheHandler` resolves to an absolute path, that `cacheMaxMemorySize: 0` is set, and that Redis is actually connecting rather than silently falling back to the in-memory map — log the fallback so it's visible.

**Publishing one page clears the whole site.** The `_N_T_/layout` tag isn't being filtered.

**Staging publishes invalidate production.** `CACHE_PREFIX` isn't including `OPTIMIZELY_DXP_DEPLOYMENT_ID`.

**Webhook fires, ISR updates, browser still shows old page.** The CDN wasn't purged, or was purged for the wrong hostname. Confirm with a hard reload or by requesting the origin directly.

**Many revalidations per publish.** Duplicate webhook registrations. `GET https://cg.optimizely.com/api/webhooks` and delete the extras; verify the dedup logic runs before the POST.

**Redis connection errors at startup, then the app is slow.** The failure backoff isn't in place, so every cache read waits for the full connect timeout.
