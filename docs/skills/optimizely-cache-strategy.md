# Optimizely Cache Strategy

Configure the caching layer that sits in front of a Next.js app backed by Optimizely CMS: the `Cache-Control` header the origin puts on the wire, what the CDN keys on, which responses carry edge cache tags, and how a publish purges the edge.

This skill covers the HTTP and CDN layers. The Next.js server cache -- `revalidate`, `cacheLife`, `unstable_cache`, `'use cache'`, `revalidateTag`, the publish webhook, and the shared cache handler -- belongs to [`optimizely-isr-setup`](optimizely-isr-setup.md).

## When to Use

Use this skill when you want to:
- Fix content that stays stale at the CDN after an editor publishes, even though ISR works
- Decide the `s-maxage` and `stale-while-revalidate` values for each class of route
- Stop the browser from caching HTML you have no way to purge
- Set cache headers on route handlers, middleware, or `next.config.js`
- Get the CDN cache key right for multisite, locales, tracking parameters, and RSC requests
- Add edge cache tags (`Cache-Tag`, `Surrogate-Key`, `Edge-Cache-Tag`) and purge them on publish
- Work out which of the five caches in the request path is actually serving stale content

## Trigger Phrases

Say any of these to activate the skill:
- "Cache-Control headers"
- "s-maxage"
- "stale-while-revalidate"
- "CDN-Cache-Control"
- "Surrogate-Key" / "Cache-Tag"
- "purge the CDN" / "edge cache"
- "cache key" / "Vary header"
- "the CDN still serves stale content after publishing"
- "browser is caching the old page"
- "how long should the edge cache my pages"

## Usage Example

```
You: "ISR works and revalidateTag fires, but visitors still see the old page
      for an hour after publishing. We're behind Cloudflare."

Agent: [Uses optimizely-cache-strategy skill]
- Identifies that revalidateTag clears only the Next.js server cache, never the CDN
- Confirms with curl that the staleness window matches the emitted s-maxage
- Adds a Cache-Tag header reusing the optimizely:* vocabulary the ISR webhook uses
- Extends the existing webhook to purge by tag, ordered after revalidateTag
- Flags that the RSC payload is a separate cache object needing its own purge
- Verifies Age resets and both the HTML and RSC variants return new content
```

## What It Generates

- `Cache-Control` / `CDN-Cache-Control` / `Surrogate-Control` header sets, split so the edge holds a long TTL and the browser holds none
- Route handlers that emit explicit cache headers and edge cache tags
- Middleware that attaches content- or path-derived cache tags to rendered pages
- CDN purge calls wired into the existing publish webhook, in the correct order
- Cache-key configuration: tracking-parameter normalization, `_rsc` allow-listing, cookie and host handling
- Bypass rules for preview, draft mode, personalized, and authenticated routes
- `curl`-based verification recipes for each layer

## Key Concepts

### Five caches, not three

A request for a CMS page passes through the Client Router Cache, the browser HTTP cache, the CDN, the Next.js server cache, and Graph. TTLs multiply down the stack -- a `revalidate` of 60s behind an edge `s-maxage` of 300s is a 360-second worst case. Diagnosing which layer is stale comes before configuring any of them.

### revalidateTag does not touch the CDN

`revalidateTag()` and `revalidatePath()` clear the Next.js server cache only. An edge cache in front keeps serving its copy until `s-maxage` expires or something purges it. This is the root cause of most "ISR is set up correctly and editors still see old content" reports.

### Purge ordering

Clear the Next.js cache first, purge the edge second. Purging first lets the repopulating request refill the edge from the still-stale origin, pinning it for another full TTL. For the same reason, warming the public hostname before a purge is a no-op -- the unpurged edge answers it.

### Long at the edge, zero in the browser

You can purge a CDN; you cannot purge a browser. Send `max-age=0, must-revalidate` to the browser and push the real TTL into the CDN-targeted header. The header name is provider-specific and sending the wrong one fails silently, falling back to `Cache-Control`.

### The cache key

App Router serves HTML and RSC payloads from the same URL, distinguished by the `rsc` header and `_rsc` parameter. The CDN must forward the header and include `_rsc` in the key. Tracking parameters must be normalized out, or every campaign link is a cold object.

### Tag purge versus URL purge

Tag purge (Fastly `Surrogate-Key`, Cloudflare `Cache-Tag`, Akamai `Edge-Cache-Tag`) is the only mechanism that handles the shared-block case, where one content item affects every page. URL purge handles the changed page and misses everything that embeds it.

## Related Skills

- [`optimizely-isr-setup`](optimizely-isr-setup.md) -- the Next.js server cache, cache tags, and the publish webhook this skill extends
- [`optimizely-preview`](optimizely-preview.md) -- preview and draft routes, which must bypass every cache
- [`optimizely-multisite-locale`](optimizely-multisite-locale.md) -- host and locale resolution, which determines the cache key
- [`optimizely-graphql-optimization`](optimizely-graphql-optimization.md) -- the SDK-level query cache behind the Next.js cache
- [`optimizely-observability`](optimizely-observability.md) -- cache hit/miss attributes for measuring the effect of these changes
