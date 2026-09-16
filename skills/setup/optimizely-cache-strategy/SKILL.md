---
name: optimizely-cache-strategy
description: This skill should be used when the user asks about "Cache-Control headers", "s-maxage", "stale-while-revalidate", "CDN-Cache-Control", "Surrogate-Key", "Cache-Tag", "purge the CDN", "edge cache", "cache key", "Vary header", "browser is caching the old page", "the CDN still serves stale content after publishing", "how long should the edge cache my pages", or mentions CDN configuration, edge caching, cache headers, surrogate keys, or cache-key/query-string handling for an Optimizely CMS site served by Next.js. Use this skill whenever caching behaviour lives in front of the Next.js server — the edge, a reverse proxy, or the browser — even if the user only says "my site shows old content" or "clearing the cache doesn't help", and even when they don't name a CDN.
---

# HTTP and CDN caching for Optimizely CMS

Configure the caching layer that sits in *front* of a Next.js app backed by Optimizely CMS: the `Cache-Control` header the origin puts on the wire, what the CDN keys on, which responses carry edge cache tags, and how a publish purges the edge.

## Where this skill applies

A request for a CMS page passes through **five** caches, not the three most people count:

```
Client Router Cache → Browser HTTP cache → CDN / edge → Next.js server cache → Graph
        │                     │                │                 │
   staleTimes,           Cache-Control    Cache-Control      revalidate,
   router.refresh()      max-age          s-maxage +         cacheLife,
   in-memory, per tab,   (cannot          cache key +        revalidateTag
   NO network request     be purged)      surrogate tags     (origin only)
                                          (CAN be purged)
```

This skill owns the first three. The Next.js server cache — `revalidate`, `cacheLife`, `unstable_cache`, `'use cache'`, `revalidateTag`, the publish webhook, the shared cache handler — belongs to the `optimizely-isr-setup` skill. If the project has no ISR setup yet, start there and come back; edge caching on top of an untagged origin just moves the staleness one layer out.

Two things to internalise before changing anything:

**`revalidateTag()` and `revalidatePath()` do nothing to a CDN.** They clear the Next.js server cache only. An edge cache in front of it keeps serving its copy until `s-maxage` expires or something explicitly purges it. This is the root cause of most "ISR is set up correctly and editors still see old content" reports, and no amount of tuning the ISR side will fix it.

**TTLs multiply down the stack.** A Next.js `revalidate` of 60s behind an edge `s-maxage` of 300s is a 360-second worst case, not 300. Each layer can serve its own full lifetime of staleness on top of the one below it, which is why stacking "short" TTLs at every layer still produces complaints.

**An edge miss is not a Graph query.** A miss at the CDN falls through to the *next* cache down, not to the bottom of the stack. On a route with ISR, the Next.js server cache answers it and Graph is never touched. This matters because it tells you what a symptom can and cannot mean: edge cache-key fragmentation costs you latency and origin CPU, but on a properly cached route it does **not** raise Graph usage. So if Graph queries scale with visitor traffic, the cause is downstream of the edge — the route is rendering dynamically, or the origin cache is cold or per-instance — and no amount of cache-key tuning will bring it down. Reaching for the edge first here is the most common way to spend a day fixing the wrong layer.

### Diagnose the layer before configuring anything

Editors describe symptoms, not layers, and the same sentence can come from three different caches. Guessing wrong here means a correct fix applied to the wrong place. Use the symptom to narrow it:

| Symptom | Likely layer | Confirms it |
|---|---|---|
| Stale for one person, fine in incognito | Browser HTTP cache or Client Router Cache | A hard reload fixes it; another device was never affected |
| Stale on in-app navigation, correct on hard refresh | Client Router Cache **or** the edge-cached RSC payload | If a full page load in a fresh tab is correct, it's the router cache, not the edge |
| Stale for everyone, everywhere, clears on a schedule | CDN | `Age` is high and the staleness window matches `s-maxage` |
| Stale for everyone, `curl` at the origin is also stale | Next.js server cache | Not this skill — go to `optimizely-isr-setup` |
| Stale only on some requests, inconsistently | Multi-instance origin without a shared cache handler | Repeated `curl`s alternate between old and new |

Use this table to generate hypotheses, not to put words in the user's mouth. The symptoms above are vivid and easy to echo back as though they were reported — "that's your 'fine in incognito' complaint" — when the user said no such thing. Invented evidence is worse than none: it sounds like you confirmed something, so nobody re-checks it, and the real symptom goes unexamined. Distinguish what they told you from what you are predicting, and ask for the missing observation instead of supplying it.

The Client Router Cache is the one people forget. It holds prefetched RSC payloads in memory per tab, serves them with **no network request at all**, and cannot be purged by anything you do server-side — so it survives a perfect CDN purge. Its lifetime comes from `staleTimes` (default 5 minutes for static routes), and it resets on a hard reload, `router.refresh()`, or a new tab. If a publish looks correct in a fresh tab and stale on the click-through, stop configuring the CDN — you are looking at this.

## Step 1: Find out what you are already sending

Never reason about this from the source code alone — the emitted header depends on the rendering strategy Next.js actually chose for the route, which is often not the one the developer intended. Read it off the wire, against the deployed origin *and* through the CDN:

```bash
# Through the CDN — what visitors get
curl -sSI https://www.example.com/about | grep -iE 'cache-control|age|x-cache|cf-cache-status|x-served-by|x-vercel-cache'

# Bypassing the CDN, straight at the origin — what Next.js emits
curl -sSI --resolve www.example.com:443:<origin-ip> https://www.example.com/about | grep -i cache-control
```

Next.js sets `Cache-Control` on rendered routes itself, by strategy:

| Route rendered as | Header Next.js emits | What it means at the edge |
|---|---|---|
| Fully static (no `revalidate`, no dynamic input) | `s-maxage=31536000` | Cached at the edge for a **year**. Only a purge will ever change it. |
| ISR / time-based revalidation | `s-maxage={revalidate}, stale-while-revalidate={expire - revalidate}` | Fresh for `revalidate`, then served stale while refreshing. |
| Dynamic (cookies, headers, search params, draft mode) | `private, no-cache, no-store, max-age=0, must-revalidate` | Never cached anywhere. |
| Route handler (`app/api/*`) | *nothing at all* | No header to read, so the CDN applies its own default TTL. |
| `/_next/static/*` | `public, max-age=31536000, immutable` | Cached forever, content-hashed. Cannot be overridden. |

Exact values drift between Next.js versions, which is why you read them with `curl` rather than trusting this table. Three findings are worth acting on immediately:

- **`s-maxage=31536000` on a CMS page.** A page that compiles to fully static has no expiry the editor can wait out. This is the correct configuration *only if* a publish reliably purges the edge. Otherwise it is a year-long outage of the content team's ability to change that page.
- **`private, no-cache, no-store` on a page that should be cacheable.** Something forced the route dynamic — usually `headers()` for multisite host resolution, or an uncached `searchParams` read. The fix is on the ISR/rendering side, not here; see `optimizely-multisite-locale`.
- **`Age` climbing but content correct.** Caching is working. Note the value — it tells you the real observed TTL, which is the number to argue about in Step 2.
- **No `Cache-Control` header at all.** Two sources, one consequence. Route handlers emit none by default, so every `app/api/*` endpoint you have is currently governed by the CDN's default TTL rather than by anything in your code. Measured on 15.5.4, a GET handler returns no `Cache-Control`, no `ETag` and no `x-nextjs-cache` whether it is trivially static, reads `headers()`, or sets `export const dynamic = 'force-dynamic'` — that last one changes nothing because route handlers are already dynamic by default. You only get a header by opting in: `force-static` yields `s-maxage=31536000`, and `export const revalidate = 60` yields `s-maxage=60, stale-while-revalidate=31535940`. The same has been observed on rendered pages served while Next.js regenerates a stale ISR entry (`x-nextjs-cache: STALE`). With no header to read, the CDN applies its own default — Fastly's stock VCL uses an hour — so a slice of your traffic is cached on a number nobody chose, and a cached `200` on the publish webhook means later publishes never reach your handler. Curl your route handlers as well as your pages, request the same page a few times right after a revalidation window expires, and set an explicit fallback TTL in the CDN config so the default is at least yours.

The same discipline applies to every number and identifier you hand back: CDN batch limits, plan-tier capabilities, version-specific behaviour, CVE identifiers. A confidently stated figure that turns out to be invented is worse than "I'd need to check" — it gets written into a config and nobody re-examines it. Read limits out of `references/cdn-providers.md`, read behaviour off the wire, and if you have not actually looked something up, say so rather than producing a plausible number.

## Step 2: Decide the edge contract per route class

Two numbers per route: how long the edge may serve without asking (`s-maxage`), and how long it may serve stale while it re-fetches in the background (`stale-while-revalidate`).

These are not the same kind of decision. `s-maxage` is a freshness promise and costs you staleness when you get it wrong. `stale-while-revalidate` costs you almost nothing and buys a lot — during the SWR window visitors get an instant cached response while one background request refreshes it, so a traffic spike on an expired page doesn't turn into a stampede against Optimizely Graph. Be conservative with the first and generous with the second.

| Route class | `s-maxage` | SWR window | Notes |
|---|---|---|---|
| Marketing and campaign pages | 1 hour | 1 day | Purged on publish; the hour is only the fallback. |
| Articles and news | 1 hour | 1 day | Same shape; listings usually need the shorter TTL, not the article. |
| Evergreen pages (about, legal, contact) | 1 day | 1 week | Changes are rare and always accompanied by a publish. |
| Listing and index pages | 5–15 min | 1 day | Fed by many content items, so more of their invalidations get missed. |
| Navigation, footer, global settings fragments | 1 day | 1 week | Blast radius is the whole site; rely on tag purge, not TTL. |
| `sitemap.xml`, `robots.txt`, RSS | 1 hour | 1 day | Cheap to serve stale; crawlers are not editors. |
| Search, faceted results, anything with query params | 0–60 s | 5 min | Only worth caching if the parameter space is small. |
| Preview, draft, personalized, authenticated | not cacheable | — | See Step 5. |

The right-hand column matters more than the numbers. **If publishes purge correctly, `s-maxage` is a safety net and can be long. If they don't, `s-maxage` *is* your content freshness and everything here is too long.** Tell the user which regime the project is in before handing them numbers.

On a route Next.js renders, you do not set these directly — you choose them through the cache lifetime, and Next.js does the arithmetic:

```typescript
// Next.js 16 with cacheComponents — inside the cached function
'use cache';
cacheLife({ stale: 300, revalidate: 3600, expire: 86400 });
// → Cache-Control: s-maxage=3600, stale-while-revalidate=82800
```

`stale-while-revalidate` is `expire - revalidate`. If you want a longer SWR window, raise `expire`; if you leave it at its default the window is roughly a year, which is usually fine and self-healing.

**The same arithmetic governs Next.js 14/15**, where `export const revalidate = 3600` is the lever and `expire` is the one-year default — which is why a route-segment `revalidate` of an hour emits `s-maxage=3600, stale-while-revalidate=31532400`. That second number is not arbitrary and not a bug: it is `31536000 - 3600`. Recognising it on the wire tells you the route is using segment-level ISR with a default expiry, which is a useful thing to know before you touch anything. Which lever exists is decided by the `cacheComponents` flag, not by the version number alone — Next.js 16 without it still uses route-segment `revalidate`, so check `package.json` *and* `next.config` before choosing.

**This is one of the few mistakes in this skill that fails loudly, and that is worth saying to the reader.** Measured on 15.5.4: a `'use cache'` directive without the flag is a compile error (`To use "use cache", please enable the experimental feature flag "useCache"`), under both webpack and Turbopack, with or without an accompanying `cacheLife` call — the directive is rejected by the SWC transform before the rest of the function is reached. On that version `next/cache` does not export `cacheLife` at all; the export is `unstable_cacheLife`, so the import is additionally a type error, and calling it without the directive throws at prerender instead. The reverse direction is loud too: with `cacheComponents` enabled, a segment still exporting `revalidate` or `dynamic` is a build error telling you to remove it.

So prescribing the wrong lever costs the reader a failed build, not a silent no-op. Say which lever you picked and why anyway — it tells them what to revisit on upgrade — but do not dress it up as a silent-failure trap. Most of this skill is about configuration that quietly does nothing; this particular one is not, and claiming otherwise trains people to distrust the cases where it is true.

Content-type-to-interval mapping is Step 2 of `optimizely-isr-setup` — reuse the buckets already chosen there rather than inventing a second set of numbers that disagree.

## Step 3: Split the browser TTL from the CDN TTL

This is the highest-leverage change in the whole skill, and Next.js will not do it for you.

You can purge a CDN. You cannot purge a browser. If HTML is cached in a visitor's browser, that visitor sees stale content until it expires, no matter what the editor does, and support cannot reproduce it. So for CMS HTML the target is: **long TTL at the edge, zero TTL in the browser.**

`s-maxage` alone gets you most of the way there — it applies only to shared caches, so browsers ignore it. The gap is `stale-while-revalidate`, which is **not** shared-cache-only: RFC 5861 defines it for private caches too. So the header Next.js emits for an hourly ISR route — `s-maxage=3600, stale-while-revalidate=31532400`, with no `max-age` — gives the browser a freshness lifetime of roughly zero *and*, in a browser that implements the directive, explicit permission to keep serving that stale entry from its own disk for a year while it revalidates in the background. Every navigation renders instantly from the local copy and the refresh lands in the *next* one, and nothing you purge server-side can reach it.

Scope that claim honestly when you explain it: Chromium implements private-cache `stale-while-revalidate`, Firefox and Safari do not. So this mechanism accounts for a Chrome user seeing day-old content while a colleague on Safari does not — which is a useful diagnostic asymmetry, and a reason not to tell someone their whole audience is affected. The fix is the same either way and costs nothing on browsers that ignore the directive. Close the gap explicitly, and while you're there, use the CDN-targeted header family so the two layers can differ:

```http
Cache-Control:     public, max-age=0, must-revalidate
CDN-Cache-Control: max-age=3600, stale-while-revalidate=86400, stale-if-error=604800
```

**The CDN-targeted header name is provider-specific, and sending the wrong one fails silently** — the edge ignores it, falls back to `Cache-Control`, and your carefully chosen TTL collapses to `max-age=0`. Precedence runs most-specific-first: Fastly reads `Surrogate-Control`, Vercel reads `Vercel-CDN-Cache-Control`, Cloudflare reads `Cloudflare-CDN-Cache-Control` then `CDN-Cache-Control`, most other modern CDNs read `CDN-Cache-Control`, and everything falls back to `Cache-Control`. Look the project's CDN up in `references/cdn-providers.md` before writing a header — treat `CDN-Cache-Control` in the examples below as a placeholder for whatever that table says, not as a default.

Whether the CDN strips its own header before the browser sees it also varies: Fastly removes `Surrogate-Control` and `Surrogate-Key`, Vercel removes `Vercel-CDN-Cache-Control`, Cloudflare removes `Cloudflare-CDN-Cache-Control` but passes `CDN-Cache-Control` through. A leaked header is harmless — browsers ignore all of them — but it tells you which one the edge actually consumed, which makes it a useful debugging signal.

**Construct the edge header; never concatenate it onto what Next.js sent.** The tempting one-liner in VCL or an edge function is to take the existing `Cache-Control` and append a longer window to it:

```vcl
# Wrong. beresp.http.Cache-Control is already
# "s-maxage=3600, stale-while-revalidate=31532400".
set beresp.http.Surrogate-Control = beresp.http.Cache-Control + ", stale-while-revalidate=86400";
```

That emits `s-maxage=3600, stale-while-revalidate=31532400, stale-while-revalidate=86400`. Duplicate directives are not merged and not an error — implementations commonly honour the first occurrence, so you keep the one-year window you were trying to replace and your intended value is silently ignored. It also drags `s-maxage` into `Surrogate-Control`, which is not the directive that header takes. Write the literal you decided on in Step 2 instead:

```vcl
set beresp.http.Surrogate-Control = "max-age=3600, stale-while-revalidate=86400, stale-if-error=604800";
```

The general rule: the edge header is a decision, not a derivation. If you are reading the origin's `Cache-Control` to build it, you have two sources of truth for one number and they will disagree the first time someone changes `revalidate`.

Add `stale-if-error` while you are here. It lets the edge keep serving the last good copy when the origin or Graph returns errors, which converts a backend outage into stale content rather than a down site. For CMS content that trade is almost always right, and it costs nothing when everything is healthy.

## Step 4: Set headers where Next.js lets you

Three places, in descending order of reliability.

**Route handlers — you own the header completely, and own it by default.** Nothing in the App Router pipeline rewrites `Cache-Control` on a `Response` you return, so this is where CDN-targeted headers and surrogate tags actually belong. The flip side is that Next.js puts nothing there for you: a handler that sets no headers ships no `Cache-Control` at all, and the CDN falls back to its own default TTL. There is no safe-by-default here, only a header you wrote or a number someone else chose.

```typescript
// app/api/navigation/route.ts
export async function GET() {
  const nav = await getNavigation();

  return Response.json(nav, {
    headers: {
      // Browser: never hold HTML or content JSON you can't purge.
      'Cache-Control': 'public, max-age=0, must-revalidate',
      // Edge: substitute the header names your CDN actually reads.
      // Fastly wants Surrogate-Control + Surrogate-Key; Akamai wants
      // Edge-Control + Edge-Cache-Tag. Sending the wrong pair is a silent no-op.
      'CDN-Cache-Control': 'max-age=86400, stale-while-revalidate=604800, stale-if-error=604800',
      'Cache-Tag': 'optimizely:nav',
    },
  });
}
```

Use the same tag vocabulary the ISR webhook already uses (`optimizely:content:{key}`, `optimizely:type:{Type}`, `optimizely:nav`) so one publish event can drive both `revalidateTag()` and the CDN purge from the same string. Inventing a second naming scheme for the edge is how the two drift apart.

**Middleware — for headers on rendered pages.** A page component cannot set response headers, so anything you want on HTML has to come from middleware (`middleware.ts`, or `proxy.ts` on Next.js 16):

```typescript
export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Path-derived tags: the most granular tag available without a content lookup.
  response.headers.set('Cache-Tag', `path:${request.nextUrl.pathname}`);
  return response;
}
```

**A `Cache-Control` set in middleware does replace the one Next.js emitted.** On 15.5.4 this was measured directly: the middleware value fully replaced `s-maxage=3600, stale-while-revalidate=31532400`, `x-nextjs-cache` stayed `HIT`, and the header landed on the RSC variant too. So middleware is a real option for the browser/edge split, not just for adding tags. Two caveats. Re-check it with `curl` after any Next.js upgrade rather than trusting it forever — the framework owns that header and this is behaviour, not API. And understand what you have taken on: once middleware writes `Cache-Control`, the route's `export const revalidate` no longer reaches the edge. It still governs the Next.js server cache, but the edge TTL now lives in your middleware, and the two will drift the first time someone changes one of them. Derive both from one table keyed by path, or leave a comment on each `revalidate` pointing at the middleware.

**`next.config.js` `headers()` — static path patterns only.** Fine for asset directories and blanket rules, useless for anything content-derived since it is evaluated at build time and cannot see the response. It cannot override the immutable-asset header on `/_next/static/*`; Next.js reserves that one. Two behaviours here surprise people, both worth knowing before you write a rule:

- **Matching is last-wins, not most-specific-wins.** *Every* rule whose `source` matches applies, and a later rule overwrites an earlier one for the same header key. There is no specificity ranking like CSS and no first-match-wins like a router. The instinctive ordering — specific rules first, catch-all last — gives every route the catch-all's values, which is how `/api/revalidate` ends up cached at the edge for an hour. Put the catch-all first and the exceptions after it.
- **Setting `Cache-Control` here wipes Next's per-route `s-maxage` everywhere it matches**, exactly as middleware does, with the same drift problem. Setting *only* the surrogate header (`Surrogate-Control`, `CDN-Cache-Control`) leaves Next's `Cache-Control` intact. If all you need is a longer edge TTL, that is the cheaper change: you get the edge contract you want and keep `revalidate` as the single source of truth for it.

Also scope your `source` patterns rather than reaching for `/:path*`. A catch-all matches `/_next/static/*` too — harmless for `Cache-Control`, which Next.js protects there, but not for tags: tagging your content-hashed JS and CSS with a page tag means every editorial purge also evicts the whole bundle from every PoP, which surfaces as an unexplained TTFB spike after each publish rather than as a caching bug. A negative lookahead (`/((?!_next/static|_next/image|favicon.ico).*)`) is the usual fix.

**The trap worth naming out loud:** middleware runs on the origin, *behind* the CDN. Any header it sets is computed only on requests that miss the edge. That's correct for cache tags (they're stored with the object on the miss that populates it) and wrong for anything you expect to vary per visitor.

## Step 5: Get the cache key right

A correct TTL on the wrong cache key is worse than no caching — it serves one site's or one visitor's page to someone else.

**`_rsc` and the `rsc` header — the App Router-specific one.** The same URL returns HTML for a document request and an RSC payload for a client-side navigation. Next.js distinguishes them with the `rsc` request header and the `_rsc` search parameter. The CDN must forward the `rsc` header and **must include `_rsc` in the cache key**. CDNs that strip unknown query parameters by default will break client-side navigation in a way that looks like random blank pages, not like a caching bug. If you normalize the query string at all — see *Query parameters* below — allow-list `_rsc` explicitly. (`Vary` will not save you here: Cloudflare honours it only for `Accept-Encoding`, so the query parameter is what keeps the two objects apart. Turning on "ignore query string" starts serving `text/x-component` payloads to browsers asking for HTML.)

**`_rsc` is a per-request hash, not a build constant.** Next.js computes it from the router-state request headers (`next-router-prefetch`, `next-router-segment-prefetch`, `next-router-state-tree`, `Next-Url`), so its value depends on *where the visitor is navigating from*. One page therefore has many distinct `_rsc` values live at the edge at once, and none of them are reconstructable from a webhook. This is a cache-key fact with a large consequence for Step 7: it is not that URL-based purging *usually misses* the RSC variants, it is that it structurally cannot reach them.

**Host, for multisite.** Most CDNs key on host by default; confirm it, because an Optimizely multisite install serves genuinely different content per hostname from one origin. Getting this wrong cross-serves brands. See `optimizely-multisite-locale`.

**Locale.** Put the locale in the path (`/en/about`) and the cache key follows for free. If the app negotiates locale from `Accept-Language` instead, you must send `Vary: Accept-Language` — and accept that it fragments the cache across dozens of header variants, most of which never get a second hit. Path-based locales are the better trade.

**Query parameters.** Optimizely campaign links arrive carrying `utm_source`, `utm_campaign`, `gclid`, `fbclid`. If the CDN keys on the full query string, every campaign variant is a separate cold object and a launch mostly bypasses the cache. Normalize: ignore tracking parameters, keep the ones that change the response (`page`, `q`, `_rsc`).

**Cookies.** Cookie-bearing requests bypass the cache on most CDNs by default, which quietly disables edge caching for every returning visitor once an analytics or consent cookie is set. Configure the CDN to ignore all cookies except the ones that must bypass (Step 6).

## Step 6: Keep uncacheable responses uncacheable

Some responses must never be stored at the edge. Next.js marks most of them dynamic already, but the CDN needs matching rules so a misconfiguration can't cache them anyway:

- **Preview and draft mode.** Optimizely's on-page editing loads the site in an iframe with draft content. Next.js draft mode sets a `__prerender_bypass` cookie and renders dynamically; make the CDN bypass cache whenever that cookie is present. A preview response cached at the edge leaks unpublished content to the public, so treat this as a correctness requirement, not a performance one. See `optimizely-preview`.
- **The publish webhook endpoint.** A cached `200` on the revalidation route means later publishes never reach your handler.
- **Personalized or experiment-assigned pages.** If the response varies per visitor, it cannot be a shared cache entry. Either render dynamically or move the personalized part to a client-side fetch so the shell stays cacheable.
- **Authenticated and editor-facing routes.** Anything behind login.

**Not-found and error responses need their own, much shorter TTL, and they almost never get one.** A `404` rendered by Next.js carries the same `s-maxage` as a real page, so a URL that 404s *because the content isn't published yet* stays a 404 at the edge for the full hour after it goes live. The editor experiences this as "I published it and the page doesn't exist" — it sounds like a CMS bug and it is a caching one. Cap it at a minute or so, and note where that rule has to live: middleware runs before the response exists and cannot see the status code, so this one belongs in the CDN's own configuration.

## Step 7: Purge the edge on publish

The ISR webhook from `optimizely-isr-setup` already resolves the changed content to a path and calls `revalidateTag()`. Purging the edge is the same handler, one call later — the two must happen together or the layers disagree.

**Order matters: clear the Next.js cache first, purge the edge second.** Purging the edge is what sends the next visitor to the origin, so if the origin's own cache hasn't been cleared yet, that request repopulates the edge with the same stale HTML you just purged — and now it's pinned there for another full TTL. The bug looks like the purge silently failing, and retrying it makes it worse. For the same reason, don't "warm" the cache by fetching the public hostname before purging; that request is answered by the unpurged edge and never reaches the origin at all.

Two purge models, and which you get is decided by the CDN:

**Tag purge** (Fastly `Surrogate-Key`, Cloudflare `Cache-Tag`, Akamai `Edge-Cache-Tag`) is the one you want. The origin labels each response with the content it was built from; a publish purges the tag and every page embedding that content drops out of the edge at once. This is the only mechanism that handles the footer-edit case, where one content item affects every URL on the site.

**URL purge** (Optimizely frontend hosting / DXP, and the lowest common denominator everywhere) requires you to already know every affected URL. It handles the changed page and misses every page that embeds it. When a change has site-wide blast radius the only honest option is a wildcard purge, which costs the entire edge cache — expensive enough that it's worth maintaining a content-key → URL index if it happens often. The DXP purge client is in `optimizely-isr-setup`'s `references/optimizely-frontend-hosting.md`; don't write a second one.

Two details that make the difference between a purge that works and one that appears to:

- **Purge every variant of the URL, not just the URL.** The HTML and the RSC payload are separate cache objects. Purging only the document leaves client-side navigation serving the old payload — the page updates on hard refresh and not on in-app navigation, which is a confusing bug to receive as a report. This is the strongest argument for tags over URLs, and it is stronger than "tags are more convenient": single-file purge matches the full URL including query string, and the `_rsc` query parameter in Step 5 is a per-request hash, so you cannot enumerate the RSC URLs to purge them. A perfect URL purge of every affected document still leaves the prefetch payloads serving old content until they expire on their own. A tag purge reaches both objects for free, because the tag rides on the response rather than being something you have to predict.
- **Purge the public hostname.** Purging an internal container or CMS-side host that Graph handed you returns success and clears nothing.
- **Generate the tag you set and the tag you purge from one function.** The most common way a tag purge fails is that the response was labelled `page:<contentKey>` and the webhook purged `page:<path>`. Both sides look right in isolation, the API returns `200` with a purged count of zero, and nothing clears — there is no error anywhere to lead you to it. Export a single `cacheTagsFor(content)` helper, call it from the middleware or route handler that writes the header *and* from the webhook that purges, and the two cannot drift. This is worth doing even when it feels like overkill for two call sites.

**Purge APIs have batch and rate limits, and a bulk publish will find them.** Every provider caps how many URLs or keys one call may carry, and caps how often you may call — the numbers differ per provider and per plan, so look them up in `references/cdn-providers.md` rather than assuming a figure. Two consequences worth designing for from the start: chunk the list and issue the calls with bounded concurrency, because a 400-URL purge is not one request; and check the response body rather than the status code, since several providers return `200` with a failure payload. A bulk import or a site-wide retag can emit thousands of events in a burst, so debounce or coalesce per content key before purging — otherwise the first real content emergency is also the moment you get rate-limited. `purge everything` is the most aggressively limited call of all and the most expensive, which is why it belongs behind a threshold, not in the normal path.

**Soft purge and editorial publishes pull in opposite directions.** A soft purge marks the object stale rather than evicting it, so the next request is served instantly from the stale copy while one background request refreshes — excellent for protecting the origin on a high-traffic page. But the person most likely to request that URL one second after publishing is the editor who just clicked "view on site", and a soft purge serves them the old page, which is the exact complaint you were asked to fix. Resolve it deliberately: hard purge on single-item editorial publishes where the request volume is trivial, soft purge for bulk or global invalidation where a stampede is the real risk. If the CMS "view on site" link is the recurring source of complaints, give it a cache-busting parameter the CDN is configured to bypass, so editors always see the origin.

## Step 8: Verify it end to end

Header inspection tells you what you configured. Only this tells you it works:

```bash
URL=https://www.example.com/about

# 1. Prime, then confirm the second request is an edge hit.
curl -sSI $URL > /dev/null
curl -sSI $URL | grep -iE 'age|x-cache|cf-cache-status|x-vercel-cache'

# 2. Publish a visible change in the CMS, wait for the webhook, re-request.
curl -sS $URL | grep -o 'the new headline'

# 3. Confirm the RSC variant updated too — the step most setups skip.
curl -sS -H 'rsc: 1' "$URL?_rsc=1" | grep -o 'the new headline'
```

Check three things in order, because they fail differently: `Age` resets to `0` after the purge (the purge landed), the new content is present (the origin had fresh data), and the RSC variant matches the HTML (both objects were purged). If `Age` resets but the content is old, the problem is the Next.js cache, not the edge — go back to `optimizely-isr-setup`.

One honest limit on step 3: `?_rsc=1` is a value no browser will ever send, so that request is its own cache object and will usually be a miss. It confirms the origin renders fresh RSC, which is worth knowing, but it does not prove the edge-cached prefetch payloads were purged. Only a tag purge gives you that, and the way to observe it is from the browser — publish, then click through to the page from another page in the site without reloading, and see whether the change is there.

## Common pitfalls

**"I purge the CDN and it still serves the old page."** The purge went to a different hostname or a different cache object than the one being read. Compare the URL in the purge call against the URL in your `curl`, including protocol, trailing slash, and whether `www` is present.

**Hard refresh fixes it, normal navigation doesn't.** Two candidates, and they need different fixes. If a full page load in a *fresh tab* is also correct, it's the Client Router Cache holding a prefetched payload in memory — tune `staleTimes`, or call `router.refresh()` after actions that must show new content. If a fresh tab is *stale*, the edge-cached RSC payload wasn't purged. See Step 7.

**Edge hit rate near zero despite long TTLs.** Almost always cookies or query parameters in the cache key. Check `Age` on a second request: if it's always absent, nothing is being stored at all.

**Content updates in one region and not another.** A purge that isn't global, or a multi-tier CDN where only the edge tier was purged and a shield/origin-shield tier still holds the object.

**Editors report staleness that nobody else can reproduce.** Their own browser is holding a response you cannot purge — either the HTTP cache (fixed by Step 3, and only retroactively, once they re-request and pick up `max-age=0`) or the Client Router Cache, which needs no network request at all and so survives every server-side fix. Editors hit both more than anyone because they reload the same handful of URLs all day. A service worker, if the project has one, is the third candidate.

**Everything works in staging and not in production.** Staging is usually not behind the same CDN, or is behind it with caching disabled. Any caching change has to be verified through the production edge path.

**A page that "was always fine" goes stale for a year after a refactor.** It stopped being ISR and became fully static, so its `s-maxage` jumped to `31536000`. Diff the `Cache-Control` header against the previous deploy — this one is invisible in the source diff.

**`Vary: *` or `Vary: Cookie` on HTML responses.** Disables edge caching completely. Usually added by a security middleware or an analytics integration rather than intentionally.

## References

- `references/cdn-providers.md` — per-provider header names, cache-key configuration, purge APIs, and `_rsc` handling for Cloudflare, Fastly, Akamai, CloudFront, Vercel, and Optimizely frontend hosting. Read this once you know which CDN is in front of the app.

## Related Skills

- **`optimizely-isr-setup`** — the Next.js server cache, cache tags, and the publish webhook. Do that first; this skill extends its webhook with the edge purge.
- **`optimizely-preview`** — preview and draft routes, which must bypass every cache in Step 6.
- **`optimizely-multisite-locale`** — host and locale resolution, which determines the cache key in Step 5.
- **`optimizely-graphql-optimization`** — the SDK-level query cache behind the Next.js cache, and what defeats it.
- **`optimizely-observability`** — cache hit/miss attributes on spans, for measuring the effect of these changes.
- **`optimizely-troubleshoot-graph`** — when the origin itself is returning stale or wrong data.
