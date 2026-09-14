# Optimizely ISR Setup

Configure Incremental Static Regeneration in a Next.js app backed by Optimizely CMS: pick revalidation intervals per content type, tag cached fetches so a publish invalidates exactly the right pages, and wire an Optimizely Graph webhook for on-demand revalidation.

## When to Use

Use this skill when you want to:
- Set up ISR in a Next.js app that fetches from Optimizely CMS
- Decide how long each content type should be cached
- Stop editors seeing stale content after they publish
- Add a Graph webhook that revalidates pages on demand
- Configure a shared cache handler for multi-instance deployments
- Purge the CDN after content changes
- Debug ISR that appears to do nothing

## Trigger Phrases

Say any of these to activate the skill:
- "Set up ISR"
- "Add incremental static regeneration"
- "Configure revalidation"
- "How long should I cache pages"
- "Content is stale after publishing"
- "Set up a revalidation webhook"
- "Invalidate the cache when content is published"
- "Configure the Next.js cache handler"
- "Purge the CDN after publish"

## Usage Example

```
You: "Editors publish and the site doesn't update for 20 minutes. Next.js 15 on
      Optimizely frontend hosting, three instances."

Agent: [Uses optimizely-isr-setup skill]
- Identifies the missing on-demand path rather than lowering the revalidate interval
- Adds a Redis cache handler so all three instances share one ISR cache
- Tags cached content fetches by content key, type, and navigation
- Creates a webhook route that validates x-api-key, resolves the changed content
  key to a URL via Graph, and revalidates tags plus the path
- Registers the Graph webhook idempotently from instrumentation.ts
- Purges the DXP edge cache for the changed URL
```

```
You: "What revalidate values should I use for my content types?"

Agent: [Uses optimizely-isr-setup skill]
- Gives a per-type table instead of one global number
- Explains that intervals are a fallback and cache tags are the real mechanism
- Points out that reusable blocks have no URL, so only tags can invalidate the
  pages that embed them
```

## What It Generates

- **Tagged content fetches** -- `unstable_cache` (Next.js 14/15) or `'use cache'` with `cacheTag` (Next.js 15.5+/16) wrapping the SDK calls
- **Page-level revalidation** -- `export const revalidate` and `dynamic = 'error'` on content routes, or `cacheLife()` profiles on Next.js 16
- **Webhook receiver** -- an authenticated `POST` route that parses the Graph payload, resolves the changed content, and revalidates
- **Webhook registration** -- idempotent startup registration via `instrumentation.ts`, or a one-time `curl` / script
- **Cache handler** -- a Redis-backed handler for multi-instance deployments, with an in-memory fallback, for both the legacy `cacheHandler` and the Next.js 16 `cacheHandlers` interface
- **CDN purge** -- DXP Cloud Platform Services purge, or Cloudflare/Fastly/CloudFront equivalents

## Revalidation Strategy

The skill treats time-based intervals as a self-healing safety net and cache tags as the actual invalidation mechanism. Starting points it suggests:

| Content shape | Interval | Invalidated by |
|---|---|---|
| Landing pages, articles | 1 hour | Its own content-key tag |
| Evergreen pages | 1 day | Its own content-key tag |
| Navigation, header, footer | 1 day | A shared `optimizely:nav` tag |
| Shared blocks | 1 hour | Content-key tag plus type tag |
| Listing / index pages | 15 minutes | A type tag |
| Personalized pages | Not cached | Rendered dynamically |

If content only refreshes after exactly the interval you configured, the webhook path is broken and the fallback is quietly covering for it.

## Hosting Targets

The skill branches on where the app runs, because the invalidation mechanics differ:

- **Optimizely frontend hosting (DXP)** -- Redis cache handler with managed identity, deployment-slot cache namespacing, auto-registered webhooks, and explicit edge-cache purge
- **Vercel / Netlify** -- no cache handler and no purge call; the platform handles both
- **Self-hosted, single instance** -- the default filesystem cache is sufficient
- **Self-hosted, multiple instances** -- a shared Redis cache handler is required

It also branches on the Next.js version, because Next.js 16 with Cache Components changes the configuration, the route-level setup, and the cache handler interface even though the tagging strategy stays the same.

## Key Considerations

- The default Next.js ISR cache is **per-instance**. Anything horizontally scaled needs a shared cache handler, or some requests stay stale indefinitely.
- `next dev` **ignores** `cacheHandler`. Verify caching behaviour with `next build && next start`.
- Reading `headers()`, `cookies()`, or `searchParams` silently makes a route dynamic, and ISR stops applying.
- Reusable blocks have no URL, so `revalidatePath` cannot reach the pages embedding them -- tags can.
- Every tag the app applies needs a matching `revalidateTag` in the webhook. A tag with no reader fails silently: the webhook still reports success and content just never updates.
- Hard deletes cannot be resolved -- the document is gone from Graph before the webhook arrives, so path *and* type are both unavailable and every targeted invalidation is skipped while the webhook still reports success. The handler needs an explicit branch for this.
- Revalidating Next.js does nothing to a CDN in front of it, except on Vercel and Netlify.
- `OPTIMIZELY_GRAPH_GATEWAY` already includes `/content/v2`. The webhook management API sits at the origin, so derive it rather than appending.
- `'use cache'` requires an opt-in flag: `cacheComponents: true` on Next.js 16, `experimental.useCache: true` on 15.x.
- Under `cacheComponents`, route segment exports of `revalidate`, `dynamic`, and `fetchCache` are build errors; the interval moves into `cacheLife()`.
- Next.js 16 `'use cache'` entries bypass the legacy `cacheHandler` and need a `cacheHandlers` implementation, which is a different five-method interface.
- In Next.js 16, `revalidateTag` takes a `cacheLife` profile as its second argument; the single-argument form is deprecated.

## Related Skills

- [`optimizely-setup`](optimizely-setup.md) -- Install the SDK and configure environment variables first
- [`optimizely-content-fetching`](optimizely-content-fetching.md) -- The fetch calls that get wrapped in cached functions
- [`optimizely-model`](optimizely-model.md) -- Where the content types being bucketed into revalidation strategies are defined
- [`optimizely-content-navigation`](optimizely-content-navigation.md) -- Navigation and breadcrumbs, the classic shared-tag case
- [`optimizely-multisite-locale`](optimizely-multisite-locale.md) -- Host resolution, the usual reason a route turns dynamic
- [`optimizely-preview`](optimizely-preview.md) -- Preview routes, which must stay outside the ISR cache
- [`optimizely-observability`](optimizely-observability.md) -- Spans carry a `cache: hit|miss` attribute for confirming ISR works
- [`optimizely-troubleshoot-graph`](optimizely-troubleshoot-graph.md) -- Debugging the Graph queries the webhook makes
