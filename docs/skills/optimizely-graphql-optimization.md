# Optimizely GraphQL Optimization

Optimize GraphQL query generation and performance when fetching content from Optimizely CMS. This skill covers fragment threshold management, content area constraints, caching configuration, and zero-downtime schema deployments with slots.

## When to Use

Use this skill when you want to:
- Fix a `GraphFragmentThresholdError` or "too many fragments" error
- Reduce the size and complexity of generated GraphQL queries
- Add `allowedTypes` or `restrictedTypes` to content area properties
- Exclude specific content types from queries using `typeFilter`
- Configure or troubleshoot GraphQL response caching
- Use slots (`Current` / `New`) for smooth schema deployments
- Understand why content areas with no constraints cause performance issues

## Trigger Phrases

Say any of these to activate the skill:
- "fragment threshold"
- "too many fragments"
- "GraphFragmentThresholdError"
- "optimize GraphQL queries"
- "reduce query size"
- "content area constraints"
- "allowedTypes on content area"
- "typeFilter"
- "graph caching"
- "slot Current or New"
- "expandContracts"

## Usage Example

```
You: "I'm getting a GraphFragmentThresholdError on my StandardPage's mainContent area."

Agent: [Uses optimizely-graphql-optimization skill]
- Identifies that the mainContent content area has no type constraints
- The SDK is generating fragments for all 247 registered content types
- Adds allowedTypes to mainContent listing only the block types editors actually use
- Runs config push to sync constraints to the CMS
- Verifies the fragment count is now under the default threshold of 100
```

## What It Generates

- Content area property definitions with `allowedTypes` (whitelist) or `restrictedTypes` (blacklist)
- `typeFilter` configuration in `config()` for query-time exclusion of content types
- Cache configuration (global and per-request) for GraphQL responses
- `expandContracts` settings for controlling contract interface fragment generation
- Slot configuration (`Current` / `New`) for zero-downtime schema updates
- Multi-area page types where each content area has its own type constraints

## Key Concepts

### Fragment Threshold

When the SDK fetches content, it generates a GraphQL fragment for every content type that could appear in a content area. If a content area has no type constraints, it generates fragments for **all** registered content types. The default limit is 100 fragments per area (the `maxFragmentThreshold`). When exceeded, the SDK throws:

```
GraphFragmentThresholdError: Fragment count (247) exceeds threshold (100)
for property 'mainContent' on type 'StandardPage'
```

### Constraining Content Areas (Primary Fix)

The best way to fix fragment threshold errors is to add type constraints directly to your content type definitions:

**`allowedTypes` (whitelist):** Specify exactly which content types can appear in the area. Only those types generate fragments. This is the preferred approach.

**`restrictedTypes` (blacklist):** Exclude specific types from appearing. All other registered types still generate fragments, so this is less effective for reducing count.

The Optimizely CLI warns about unconstrained content areas when you run `config push`. Always address these warnings before deploying.

### typeFilter (Last Resort)

If you cannot add constraints at the model level, use `typeFilter` in your `config()` call to exclude types at query time. The filter function receives each content type key and returns `true` to include or `false` to exclude.

**Important trade-off:** Using `typeFilter` bypasses query caching because the filter function can produce different results per request. Prefer `allowedTypes` / `restrictedTypes` whenever possible.

### Caching

The SDK caches GraphQL responses by default. You can control caching at two levels:

**Global:** Set `cache: false` in `config()` to disable caching for all requests.

**Per-request:** Pass `{ cache: false }` to individual fetch calls to bypass the cache for that one request only.

When to disable caching:
- Preview routes (automatically handled by the SDK)
- Personalized content that varies per user
- Webhook handlers that need to verify freshly published content

### expandContracts

Controls whether the SDK generates fragments for all content types that implement a contract interface:
- `false` (default) -- only generates a fragment for the contract itself (more efficient)
- `true` -- generates fragments for every implementing type (can balloon fragment count)

### Slots for Zero-Downtime Deployments

When you push content type changes with `config push`, Content Graph rebuilds the schema in the background:

1. Your app keeps serving from the `Current` slot (no disruption)
2. Content Graph builds the new schema in the `New` slot
3. Once complete, `New` becomes `Current` automatically
4. Your app picks up the new schema on the next request

You can explicitly set `slot: 'Current'` or `slot: 'New'` in `config()` if you need to target a specific slot during deployment.

### Multiple Content Areas

When a page type has multiple content areas (e.g., hero, main content, sidebar), each area independently contributes to the fragment count. Constrain each area separately with its own `allowedTypes`.

## Related Skills

- [`optimizely-content-fetching`](optimizely-content-fetching.md) -- the fetching patterns that these optimizations apply to
- [`optimizely-multisite-locale`](optimizely-multisite-locale.md) -- multi-site configuration that also affects query generation
- [`optimizely-schema-validation`](optimizely-schema-validation.md) -- validate content data when bypassing the built-in GraphClient
