---
name: optimizely-troubleshoot-graph
description: This skill should be used when the user asks to "debug Graph errors", "fix GraphContentResponseError", "fix GraphFragmentThresholdError", "getContentByPath returns empty", "content not showing", "Graph API not working", "fix GraphMissingContentTypeError", "troubleshoot Content Graph", "query returns no results", "fix schema validation error", or mentions errors, debugging, or troubleshooting related to Optimizely Content Graph queries.
---

# Optimizely Content Graph Troubleshooting

This skill teaches how to debug and troubleshoot Optimizely Content Graph query errors, including common error types, diagnostic steps, and solutions.

## When to Use This Skill

Use this skill when the user encounters:
- `GraphContentResponseError` - query returned no content
- `GraphHttpResponseError` - HTTP error from Graph API
- `GraphResponseError` - general GraphQL error
- `GraphMissingContentTypeError` - content type not registered
- `GraphFragmentThresholdError` - too many GraphQL fragments
- `SchemaValidationError` - validation failures
- Empty results from `getContentByPath` or `getContent`
- General Content Graph connectivity or query issues

## Error Types Reference

### GraphContentResponseError

**What it means:** The GraphQL query executed successfully but returned no content matching the request.

**Common causes and fixes:**

1. **Path format incorrect**: `getContentByPath` expects paths with leading and trailing slashes
   ```typescript
   // Wrong
   client.getContentByPath('en/about');
   client.getContentByPath('/en/about');

   // Correct
   client.getContentByPath('/en/about/');
   ```

2. **Content not published**: Draft content is not available through the delivery API. Verify the content item is published in the CMS.

3. **Wrong locale**: The path may include a locale segment that does not match the content's locale configuration.

4. **Host filter mismatch**: If your CMS is configured with multiple hostnames, the Graph query filters by host. Verify the hostname configuration in CMS Settings > Hostnames matches your application URL.

5. **Content type not registered**: The content type must be registered with `initContentTypeRegistry` for the SDK to generate the correct query. See `GraphMissingContentTypeError` below.

### GraphHttpResponseError

**What it means:** The HTTP request to the Content Graph API failed (non-200 status code).

**Common causes and fixes:**

1. **Invalid API key**: Verify `OPTIMIZELY_GRAPH_SINGLE_KEY` is correct
   ```bash
   # Check the value is set
   echo $OPTIMIZELY_GRAPH_SINGLE_KEY
   ```

2. **Wrong Graph URL**: If using a test environment, verify `OPTIMIZELY_GRAPH_GATEWAY` points to the staging endpoint:
   ```ini
   OPTIMIZELY_GRAPH_GATEWAY=https://staging.cg.optimizely.com/
   ```

3. **Network connectivity**: Check that your application can reach the Graph API endpoint. Test with curl:
   ```bash
   curl -H "Authorization: Bearer YOUR_KEY" https://cg.optimizely.com/content/v2
   ```

4. **Rate limiting**: If you see 429 status codes, you are exceeding the API rate limit. Implement caching or reduce request frequency.

### GraphResponseError

**What it means:** The GraphQL query itself has an error (syntax, schema mismatch, or invalid fields).

**Common causes and fixes:**

1. **Schema mismatch**: Your local content type definitions do not match what is in the CMS. Run `config push` to sync:
   ```bash
   npx @optimizely/cms-cli@latest config push
   ```

2. **Query syntax error**: This typically indicates a bug in query generation. Enable verbose logging to see the raw query:
   ```typescript
   const client = new GraphClient(key, {
     graphUrl: process.env.OPTIMIZELY_GRAPH_GATEWAY,
     debug: true,
   });
   ```

3. **Invalid field references**: A content type property was renamed or removed in the CMS but your code still references the old name.

### GraphMissingContentTypeError

**What it means:** The SDK attempted to generate a query for a content type that is not registered in `initContentTypeRegistry`.

**Fix:** Add the missing content type to the registry:

```typescript
import { initContentTypeRegistry } from '@optimizely/cms-sdk';
import { ArticleContentType } from '@/components/Article';

initContentTypeRegistry([
  ArticleContentType,
  // Add all content types here
]);
```

**Common mistake:** Creating a content type definition file but forgetting to add it to the registry in `layout.tsx` or your application bootstrap code.

**Diagnostic step:** Search your codebase for `initContentTypeRegistry` and verify all content types are listed:

```bash
grep -r "initContentTypeRegistry" --include="*.tsx" --include="*.ts"
```

### GraphFragmentThresholdError

**What it means:** The SDK generated too many GraphQL fragments for a query. This happens when content area properties do not have `allowedTypes` or `restrictedTypes` constraints, causing the SDK to generate fragments for every possible content type.

**Fix:** Add type constraints to content area properties in your content type definitions:

```typescript
// Before (causes too many fragments)
contentArea: {
  type: 'array',
  items: { type: 'content' },
}

// After (limits fragments to specific types)
contentArea: {
  type: 'array',
  items: {
    type: 'content',
    allowedTypes: [HeroContentType, CardContentType, TextBlockContentType],
  },
}
```

**Alternative:** Increase the maximum fragment threshold (not recommended for production):

```typescript
const client = new GraphClient(key, {
  maxFragmentThreshold: 100, // Default is lower
});
```

**Prevention:** The CLI validates content area constraints at push time. Pay attention to warnings during `config push` about missing `allowedTypes`/`restrictedTypes`.

### SchemaValidationError

**What it means:** A custom Graph client or query failed schema validation.

**Common causes:**
- Manually constructed queries with invalid field names
- Using fields that exist locally but have not been pushed to the CMS
- Version mismatch between local definitions and CMS schema

**Fix:** Sync your local definitions with the CMS:
```bash
npx @optimizely/cms-cli@latest config push
```

## Common Debugging Steps

Follow this sequence when troubleshooting any Graph issue:

### 1. Verify Content Type Registration

Check that `initContentTypeRegistry` includes all content types your application uses:

```typescript
// In layout.tsx or app bootstrap
import { initContentTypeRegistry } from '@optimizely/cms-sdk';

initContentTypeRegistry([
  // ALL content types must be listed here
  HomePageContentType,
  ArticleContentType,
  BlogPageContentType,
  HeroContentType,
  // Including contracts
  SEOContract,
]);
```

### 2. Verify Environment Variables

Check that all required variables are set:

```ini
# Required for content delivery
OPTIMIZELY_GRAPH_SINGLE_KEY=your-single-key

# Required for CMS instance URL (used for host filtering)
OPTIMIZELY_CMS_URL=https://your-instance.cms.optimizely.com

# Optional: Graph endpoint (defaults to production)
OPTIMIZELY_GRAPH_GATEWAY=https://cg.optimizely.com/content/v2
```

### 3. Check Path Format

`getContentByPath` expects paths with specific formatting:

```typescript
// Correct path formats
'/en/'           // Root page with locale
'/en/about/'     // Nested page with locale
'/about/'        // Without locale (if not using locale routing)

// Common mistakes
'en/about'       // Missing slashes
'/en/about'      // Missing trailing slash
'about'          // Missing all slashes
```

### 4. Verify Content Is Published

Draft content is NOT available through the delivery API. To check:
1. Open the CMS admin
2. Navigate to the content item
3. Verify it shows as "Published" (not "Draft" or "Ready to Publish")
4. If using scheduled publishing, verify the publish date has passed

### 5. Check Host Filtering

If your CMS has multiple hostnames configured, the Graph API filters content by host:
1. Go to CMS Settings > Hostnames
2. Verify your application URL is listed
3. Content is only returned for the hostname that matches the request

### 6. Enable Debug Logging

Enable verbose logging to see raw queries and responses:

```typescript
const client = new GraphClient(process.env.OPTIMIZELY_GRAPH_SINGLE_KEY!, {
  graphUrl: process.env.OPTIMIZELY_GRAPH_GATEWAY,
  debug: true,
});
```

Check the server console or Network tab in browser DevTools for Graph requests and responses.

## Fragment Issues

### Understanding Fragments

The SDK generates GraphQL fragments for each content type to fetch the correct fields. When content areas allow any content type, the SDK must generate fragments for all types, which can exceed the threshold.

### Prevention

1. **At definition time**: Always add `allowedTypes` or `restrictedTypes` to content area properties
2. **At push time**: The CLI warns about unconstrained content areas during `config push`
3. **At runtime**: If you see `GraphFragmentThresholdError`, add constraints to the relevant content areas and re-push

### Debugging Fragment Count

Enable debug mode to see how many fragments are generated:

```typescript
const client = new GraphClient(key, { debug: true });
```

Look for the fragment count in the debug output. If it exceeds the threshold, identify which content areas lack type constraints.

## Cache Invalidation

Content Graph caches query results. When content is updated in the CMS, the cache may serve stale data until invalidated.

**Webhook-based invalidation:**
For real-time cache invalidation, set up Graph webhooks. See the `samples/graph-webhooks-cache-invalidation` example in the SDK repository for a reference implementation.

**Manual invalidation:**
Restart your application or clear the CDN cache to force fresh queries.

## Common Mistakes

1. **Forgetting to register content types**: Every content type used in content delivery must be in `initContentTypeRegistry`
2. **Wrong path format**: Always use leading and trailing slashes with `getContentByPath`
3. **Using draft content**: Only published content is available through the delivery API
4. **Missing environment variables**: `OPTIMIZELY_GRAPH_SINGLE_KEY` is required for all content fetching
5. **Stale cache after type changes**: After modifying content types and pushing, content may need to be re-published for Graph to pick up schema changes

## Related Skills

- **`optimizely-model`** - Creating content type definitions (fixes registration issues)
- **`optimizely-cli-workflows`** - CLI commands for pushing and pulling content types
- **`optimizely-observability`** - Adding telemetry to diagnose performance issues
- **`setup-live-preview`** - Preview-specific debugging (separate from delivery)
