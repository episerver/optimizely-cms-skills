# CDN provider specifics

Per-provider header names, cache-key configuration, and purge APIs for a Next.js + Optimizely CMS site. Read `SKILL.md` first — this file assumes the layer model, the tag vocabulary (`optimizely:content:{key}`, `optimizely:type:{Type}`, `optimizely:nav`), and the purge-on-publish flow from there.

## Contents

- [Quick comparison](#quick-comparison)
- [Optimizely frontend hosting (DXP)](#optimizely-frontend-hosting-dxp)
- [Vercel](#vercel)
- [Cloudflare](#cloudflare)
- [Fastly](#fastly)
- [Akamai](#akamai)
- [AWS CloudFront](#aws-cloudfront)
- [Nginx or Varnish as a reverse proxy](#nginx-or-varnish-as-a-reverse-proxy)
- [Verifying any provider](#verifying-any-provider)

## Quick comparison

| Provider | CDN-targeted TTL header | Tag header | Purge model | Hit/miss header |
|---|---|---|---|---|
| Optimizely frontend hosting | `Cache-Control` | — | URL + wildcard | varies |
| Vercel | `Vercel-CDN-Cache-Control`, `CDN-Cache-Control` | — (automatic) | automatic on revalidate | `x-vercel-cache` |
| Cloudflare | `Cloudflare-CDN-Cache-Control`, `CDN-Cache-Control` | `Cache-Tag` | tag, URL, prefix, host (all plans) | `cf-cache-status` |
| Fastly | `Surrogate-Control` | `Surrogate-Key` | tag (`soft`), URL, all | `x-served-by`, `x-cache` |
| Akamai | `Edge-Control` | `Edge-Cache-Tag` | tag, URL, CP code | `x-cache` |
| CloudFront | `Cache-Control` | configurable (`CacheTagConfig`) | tag + path invalidation | `x-cache` |

Two columns decide your architecture. **No tag header means no footer-edit invalidation** — you fall back to URL purge plus a wildcard for site-wide changes. **No `CDN-Cache-Control` support** means the browser and the edge must share one TTL, so you lose the Step 3 split and should keep the TTL short enough that a browser holding it is tolerable.

Tag purge used to be the premium-tier feature that decided this table, and a lot of still-circulating advice is built on that assumption. It isn't true any more on either Cloudflare (all plans since April 2025) or CloudFront (opt-in via `CacheTagConfig`). Before you design a URL-enumeration workaround — or agree with a user who says their plan rules tags out — confirm the limitation still exists. The workaround is far more code than the thing it replaces.

Provider behaviour changes; confirm each claim here with `curl` against the actual environment before building on it.

## Optimizely frontend hosting (DXP)

Purge is URL-based through the Cloud Platform Services API, authenticated with the deployment's managed identity. `optimizely-isr-setup`'s `references/optimizely-frontend-hosting.md` contains a complete `purgeCdnCache()` client — use it rather than writing another one.

What matters here:

- **Purge `OPTIMIZELY_SITE_HOSTNAME`**, never a URL Graph resolved for you. Graph may return the CMS-side or an internal host; purging it returns success and clears nothing.
- **Wildcards are supported** (`https://host/*`) and are the only option for deletes and site-wide blast radius, at the cost of the entire edge cache.
- **Batch the URLs.** The endpoint accepts an array in one call; one request per URL is dramatically slower inside a webhook handler that has to return promptly.
- **No tag header.** A footer or navigation edit has to be expanded into a URL list at purge time, or handled with a wildcard. If the site has frequent global-content edits, maintain a content-key → paths index so you can purge precisely.

Because the platform runs multiple instances, also confirm the shared Redis cache handler is in place — without it, `revalidateTag()` clears one instance and the purge repopulates the edge from a stale one. That's covered in the same reference file.

## Vercel

Vercel purges its own edge automatically when `revalidateTag()` or `revalidatePath()` runs, so the Step 7 purge call is unnecessary. This is the one platform where a correct ISR setup is a correct edge setup.

Header precedence, most specific first: `Vercel-CDN-Cache-Control` → `CDN-Cache-Control` → `Cache-Control`. Vercel strips the first before the response reaches the browser and forwards the second, which lets you drive a downstream CDN differently from Vercel's own edge:

```http
Cache-Control:             public, max-age=0, must-revalidate   # browser
CDN-Cache-Control:         max-age=3600                          # any downstream CDN
Vercel-CDN-Cache-Control:  max-age=86400                         # Vercel's edge
```

Read `x-vercel-cache` to verify: `HIT`, `MISS`, `STALE` (served from the SWR window), `PRERENDER`, `REVALIDATED`. A `STALE` that never becomes `HIT` means background revalidation is failing at the origin.

## Cloudflare

**Tags.** Set `Cache-Tag` on responses (comma-separated, no spaces). Purge by tag:

```bash
curl -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/purge_cache" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -H 'Content-Type: application/json' \
  --data '{"tags":["optimizely:content:abc123","optimizely:nav"]}'
```

**Tag purge is available on every plan, including Free** — this changed on 1 April 2025, when Cloudflare opened purge by tag, prefix and hostname to all tiers. A great deal of writing online, and a fair number of plugins, still say Enterprise-only. If a user tells you their plan rules out cache tags, check before designing around the constraint: the URL-enumeration workarounds are substantially more work than the thing they are replacing, and are usually now unnecessary.

**Purge limits** (per account; zones on the same plan share them):

| Limit | Free | Pro | Business | Enterprise |
|---|---|---|---|---|
| URLs per single-file request | 100 | 100 | 100 | 500 |
| Single-file rate | 800/s | 1,500/s | 1,500/s | 3,000/s |
| Tag/prefix/host/everything rate | 5/min | 5/s | 10/s | 50/s |
| Operations per request | 100 | 100 | 100 | 100 |

Note the shape of that table: the *rate* scales with plan, the *batch size* mostly does not. Free-tier tag purge at 5 requests per minute is the figure to design around — a bulk publish needs coalescing, not a retry loop. Rate limiting is token-bucket, so short bursts are fine if tokens have accumulated.

Tag constraints: printable ASCII only, **no spaces**, case-insensitive, max 1,024 characters per tag in an API call, and the aggregate `Cache-Tag` response header must stay under 16 KB. The `optimizely:*` vocabulary satisfies all of these. With Tiered Cache, a tag purge may surface as `EXPIRED` rather than `MISS`, because the lower tier revalidates against the upper tier — that is a successful purge, not a failed one.

When using URL purge, remember to include both the HTML URL and its `?_rsc=` variant.

**HTML is not cached by default.** Cloudflare's default cache rules cover static assets only; a page response is passed through no matter what `Cache-Control` says. You must add a Cache Rule that sets *eligible for cache* on the HTML paths, or nothing in this skill takes effect. This is the single most common reason a correct header configuration produces zero hit rate on Cloudflare.

**Cache key.** In the same Cache Rule, configure the key to ignore tracking parameters and include `_rsc`. Also set *Cache Level: Ignore Query String* off — you need selective inclusion, not all-or-nothing. If cookies are set on the zone, add the consent/analytics cookies to the ignore list or every returning visitor bypasses the cache.

**CDN-targeted headers.** Precedence is `Cloudflare-CDN-Cache-Control` → `CDN-Cache-Control` → `Cache-Control`. Cloudflare removes `Cloudflare-CDN-Cache-Control` before delivery but passes `CDN-Cache-Control` through to the browser — harmless, since browsers ignore it, and useful as a signal of which header the edge consumed. Use the `Cloudflare-` prefixed form when a second CDN sits downstream and needs its own TTL.

Read `cf-cache-status`: `HIT`, `MISS`, `EXPIRED`, `STALE`, `BYPASS`, `DYNAMIC`. `DYNAMIC` means the response was never considered cacheable — that's the missing Cache Rule.

## Fastly

The most capable option for this use case, because surrogate keys are first-class.

```http
Surrogate-Control: max-age=3600, stale-while-revalidate=86400
Surrogate-Key:     optimizely:content:abc123 optimizely:type:ArticlePage optimizely:nav
Cache-Control:     public, max-age=0, must-revalidate
```

`Surrogate-Key` is **space**-separated (unlike Cloudflare's commas) — mixing them up produces one long key that never matches a purge. Fastly strips both surrogate headers before the response reaches the browser, so the browser only sees `Cache-Control`.

Purge by key:

```bash
curl -X POST "https://api.fastly.com/service/$SERVICE_ID/purge/optimizely:content:abc123" \
  -H "Fastly-Key: $FASTLY_API_TOKEN" \
  -H 'fastly-soft-purge: 1'
```

**Soft purge** (`fastly-soft-purge: 1`) marks the object stale rather than evicting it, so the next request is served instantly from the stale copy while one background request refreshes it — which protects the origin when a high-traffic page is invalidated. The cost is that the very next requester gets the *old* page, and after an editorial publish that requester is usually the editor who just clicked "view on site". Default to hard purge for single-item publishes (the request volume is trivial, and freshness is the whole point) and soft purge for bulk or global invalidation, where a stampede is the real risk. See Step 7 of `SKILL.md`.

Batch up to **256 keys per request** with `POST /service/$SERVICE_ID/purge` and a `Surrogate-Key` header — chunk anything larger. Note that purge-all is the one operation that *cannot* be soft; it always evicts immediately. If you want a soft global invalidation, Fastly's own advice is to tag every object with a constant key (`all`) and soft-purge that key instead.

## Akamai

Tags go in `Edge-Cache-Tag` (comma-separated) and TTL in `Edge-Control` (e.g. `Edge-Control: !no-store, max-age=3600, downstream-ttl=0`). Both need to be enabled in the property configuration before the edge honours them; a header alone does nothing if the behaviour isn't switched on.

Purge through Fast Purge (CCU v3), by `tag`, `url`, or `cpcode`, in either `invalidate` (mark stale, revalidate on next request) or `delete` (evict) mode. The same trade-off as Fastly's soft purge applies — `invalidate` protects the origin, `delete` guarantees the next requester gets fresh content.

**Fast Purge limits** are generous enough that batching is rarely the constraint: 5,000 cache tags or 10,000 URLs per request, 300 CP codes, with a 50 KB request body cap (a `413` if you exceed it). One object type per request — you cannot mix tags and URLs. Rate limiting is token-bucket at 100 requests refilling 50/s account-wide, and tag operations refill at 500/minute; a denied request returns `429` without consuming tokens, so a bounded retry is safe.

Akamai's caching is configured predominantly in the property rather than by origin headers, so expect to make the change in Property Manager and use headers only as inputs. Verify the property honours origin `Cache-Control` at all before tuning it.

## AWS CloudFront

CloudFront now supports **invalidation by cache tag**, so it is no longer the path-only outlier it used to be. It is opt-in: the distribution needs `CacheTagConfig` naming the response header to read, and a distribution without it silently ignores tag headers from the origin.

```bash
# Path invalidation. The '?*' form is what catches the _rsc variant.
aws cloudfront create-invalidation --distribution-id $DIST_ID \
  --paths '/about' '/about?*'

# Tag invalidation. Tag items are '#'-prefixed and go in the same --paths list.
aws cloudfront create-invalidation --distribution-id $DIST_ID \
  --paths '#optimizely:content:abc123'
```

Tag constraints: `#` prefix on the invalidation item (not on the header value), ASCII visible characters excluding commas, 256 characters max, case-insensitive, **no wildcard support**, and CloudFront stores only the first 50 tags per cached object — tags beyond that are dropped and cannot be invalidated. Path and tag items can be mixed in one batch.

**Billing is the real design constraint.** The first 1,000 invalidation paths per month are free across the whole AWS account, and every item counts as one path regardless of blast radius — `/*` is one path, and so is one tag matching 10,000 objects. That pricing makes tags dramatically cheaper than URL enumeration here: purging one `optimizely:content:{key}` tag costs a single path where the equivalent URL list might cost hundreds. On a busy editorial site, tag invalidation is what makes per-publish invalidation affordable at all.

If tags aren't an option, fall back to a short `s-maxage` (5–15 minutes) with TTL-based freshness, reserving invalidation for high-value pages.

Cache-key configuration lives in a cache policy: forward the `rsc` header, include `_rsc` in the query-string allow-list, and forward `Host` if the origin is multisite. CloudFront excludes all query strings and headers by default, which breaks App Router navigation until you fix it.

## Nginx or Varnish as a reverse proxy

For self-hosted deployments with no CDN, the same model applies one hop in.

**Varnish** supports surrogate keys through `xkey` (the vmod), giving you tag purge without a commercial CDN. This is the best self-hosted option if global-content invalidation matters.

**Nginx** `proxy_cache` keys on `$scheme$proxy_host$request_uri` by default, which includes the query string — so `_rsc` is handled, but tracking parameters fragment the cache. Purge requires `ngx_cache_purge` (URL-based only) or deleting cache files directly. Add `$http_host` to `proxy_cache_key` for multisite, and `proxy_cache_use_stale updating` to get stale-while-revalidate behaviour.

Both need `proxy_cache_bypass` / `vcl_recv` rules for the draft-mode cookie, or preview content lands in a shared cache.

## Verifying any provider

Provider documentation describes intent; the wire describes behaviour. Before concluding a configuration is correct:

```bash
URL=https://www.example.com/about

# Is the HTML cacheable at all, and is a second request a hit?
curl -sSI $URL >/dev/null && curl -sSI $URL | grep -iE 'cache-control|age|x-cache|cf-cache-status|x-served-by|x-vercel-cache'

# Do the surrogate headers leak to the browser? They should not.
curl -sSI $URL | grep -iE 'surrogate|cdn-cache-control|cache-tag|edge-cache-tag'

# Is the RSC variant a separate, working cache object?
curl -sSI -H 'rsc: 1' "$URL?_rsc=1" | grep -iE 'content-type|age|x-cache'

# Does a tracking parameter produce a new cache object it shouldn't?
curl -sSI "$URL?utm_source=test" | grep -iE 'age|x-cache|cf-cache-status'
```

The last one is the most informative and the most often skipped: if `?utm_source=test` is always a miss while the bare URL is a hit, the cache key still includes tracking parameters and the next campaign will bypass the edge entirely.
