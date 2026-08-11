---
name: optimizely-graphql-optimization
description: This skill should be used when the user asks about "fragment threshold", "too many fragments", "GraphFragmentThresholdError", "optimize GraphQL queries", "reduce query size", "content area constraints", "allowedTypes on content area", "typeFilter", "graph caching", "slot Current or New", "expandContracts", or mentions performance issues, large queries, or optimization of GraphQL content fetching in Optimizely CMS.
---

# GraphQL Query Optimization for Optimizely CMS

This skill teaches how to optimize GraphQL query generation and performance when fetching content from Optimizely CMS, including fragment management, caching, and content area constraints.

## When to Use This Skill

Use this skill when the user:
- Encounters `GraphFragmentThresholdError` or "too many fragments" errors
- Has slow content fetching due to large GraphQL queries
- Needs to constrain content areas to reduce query complexity
- Wants to understand and configure caching behavior
- Is deploying schema changes and needs smooth transitions with slots
- Wants to exclude certain content types from queries using `typeFilter`

## Understanding Fragment Generation

When the SDK fetches content, it generates GraphQL fragments for every content type that could appear in a content area. If a content area has no constraints, the SDK generates fragments for **all** registered content types.

### The Fragment Threshold

The SDK enforces a `maxFragmentThreshold` (default: **100**) that limits the number of fragments generated per content area. When exceeded, the SDK throws a `GraphFragmentThresholdError`.

```
GraphFragmentThresholdError: Fragment count (247) exceeds threshold (100)
for property 'mainContent' on type 'StandardPage'
```

## Step 1: Constrain Content Areas

The primary fix for fragment threshold errors is adding type constraints to content area properties.

### Using `allowedTypes` (Whitelist)

Specify exactly which content types can appear in the content area:

```typescript
export const StandardPageContentType = contentType({
  key: 'StandardPage',
  baseType: '_page',
  properties: {
    mainContent: {
      type: 'array',
      items: {
        type: 'content',
        allowedTypes: [HeroContentType, CardContentType, TextBlockContentType],
      },
      displayName: 'Main Content Area',
    },
  },
});
```

### Using `restrictedTypes` (Blacklist)

Exclude specific types from appearing in the content area:

```typescript
mainContent: {
  type: 'array',
  items: {
    type: 'content',
    restrictedTypes: [InternalOnlyContentType, DeprecatedBlockContentType],
  },
  displayName: 'Main Content Area',
}
```

### CLI Validation

The Optimizely CLI warns about unconstrained content areas when you run `config push`:

```
Warning: Content area 'mainContent' on 'StandardPage' has no type constraints.
This may cause fragment threshold errors at runtime.
Consider adding allowedTypes or restrictedTypes.
```

Always address these warnings before deploying.

## Step 2: Use `typeFilter` for Query-Time Exclusion

If you cannot add constraints at the content type level, use `typeFilter` to exclude types at query time:

```typescript
import { config } from '@optimizely/cms-sdk';

config({
  graphKey: process.env.OPTIMIZELY_GRAPH_SINGLE_KEY!,
  typeFilter: (key) => {
    // Exclude internal or deprecated types from fragment generation
    const excluded = ['InternalBlock', 'DeprecatedWidget', 'TestComponent'];
    return !excluded.includes(key);
  },
});
```

The `typeFilter` function receives each content type key and returns `true` to include or `false` to exclude the type from generated fragments.

**Important**: Using `typeFilter` **bypasses query caching** because the filter function can produce different results per request. Use content area constraints (`allowedTypes`/`restrictedTypes`) instead when possible, as those are statically analyzable and cache-friendly.

## Step 3: Configure Caching

### Server-Side Cache

The SDK supports server-side caching of GraphQL responses. Enabled by default:

```typescript
config({
  graphKey: process.env.OPTIMIZELY_GRAPH_SINGLE_KEY!,
  cache: true, // default: true
});
```

To disable caching globally:

```typescript
config({
  graphKey: process.env.OPTIMIZELY_GRAPH_SINGLE_KEY!,
  cache: false,
});
```

### Per-Request Cache Override

You can override caching on individual requests:

```typescript
const client = getClient();

// Force fresh data for this specific request
const results = await client.getContentByPath('/about', {
  cache: false,
});
```

### When to Disable Caching

- **Preview routes**: Always fetch fresh data for preview (preview routes handle this automatically)
- **Personalized content**: Content that varies per user should bypass cache
- **After content publish**: Webhook handlers that need to verify published content

## Step 4: Configure `expandContracts`

The `expandContracts` option controls whether the SDK includes implementing types when generating fragments for contracts:

```typescript
config({
  graphKey: process.env.OPTIMIZELY_GRAPH_SINGLE_KEY!,
  expandContracts: false, // default: false
});
```

- **`false` (default)**: Only generates fragments for the contract interface itself. More efficient but requires content types to be explicitly listed in `allowedTypes`.
- **`true`**: Generates fragments for all content types that implement the contract. Can increase fragment count significantly.

## Step 5: Use Slots for Smooth Deployments

When Optimizely rebuilds the Content Graph schema (e.g., after pushing new content types), you can use slots to avoid downtime:

```typescript
config({
  graphKey: process.env.OPTIMIZELY_GRAPH_SINGLE_KEY!,
  slot: 'Current', // default: uses the active slot
});
```

- **`'Current'`**: Use the currently active schema slot (default behavior)
- **`'New'`**: Use the new slot that is being built

**Deployment workflow**:
1. Push content type changes: `npx @optimizely/cms-cli config push`
2. Content Graph starts rebuilding the schema in the `'New'` slot
3. Your application continues serving from `'Current'` slot (no disruption)
4. Once the rebuild completes, Content Graph swaps `'New'` to become `'Current'`
5. Your application automatically picks up the new schema

## Common Patterns

### Reducing Fragment Count Step-by-Step

If you hit the fragment threshold:

1. **Identify the problematic content area** from the error message
2. **List which content types actually need to appear** in that area
3. **Add `allowedTypes`** with only those types
4. **Run `config push`** to sync the constraints to CMS
5. **Verify** the fragment count is now under the threshold

### Monitoring Fragment Count

You can check fragment counts by enabling verbose logging:

```typescript
config({
  graphKey: process.env.OPTIMIZELY_GRAPH_SINGLE_KEY!,
  // Enable debug logging to see fragment counts
});
```

### Multiple Content Areas on One Page

When a page type has multiple content areas, each one independently contributes to the fragment count. Constrain each area separately:

```typescript
export const LandingPageContentType = contentType({
  key: 'LandingPage',
  baseType: '_page',
  properties: {
    heroArea: {
      type: 'array',
      items: {
        type: 'content',
        allowedTypes: [HeroContentType, BannerContentType],
      },
    },
    mainContent: {
      type: 'array',
      items: {
        type: 'content',
        allowedTypes: [TextBlockContentType, ImageBlockContentType, CardContentType],
      },
    },
    sidebar: {
      type: 'array',
      items: {
        type: 'content',
        allowedTypes: [WidgetContentType, LinkListContentType],
      },
    },
  },
});
```

## Summary

1. **Always add `allowedTypes` or `restrictedTypes`** to content area properties to prevent fragment explosion
2. Use `typeFilter` only as a last resort (it bypasses caching)
3. Keep caching enabled for production; disable per-request when needed
4. Use slots for zero-downtime schema updates
5. Address CLI warnings about unconstrained content areas before deploying

## References

- For content type modeling and content area constraints, see the `optimizely-model` skill
- For content fetching patterns, see the `optimizely-content-fetching` skill
- For multi-site configuration that affects queries, see the `optimizely-multisite-locale` skill
