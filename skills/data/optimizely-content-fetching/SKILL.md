---
name: optimizely-content-fetching
description: This skill should be used when the user asks to "fetch content from CMS", "get a page by URL", "load content by path", "fetch by GUID", "get content by key", "set up a catch-all route", "configure GraphClient", "use getContentByPath", "use getContent", "preview draft content", "fetch preview content", or mentions fetching, loading, or retrieving content from Optimizely CMS using the JavaScript SDK.
---

# Fetching Content from Optimizely CMS

This skill teaches how to fetch content from Optimizely CMS using the SDK's GraphClient, including path-based fetching, reference-based fetching, and preview content loading.

## When to Use This Skill

Use this skill when the user wants to:
- Fetch a page or content item by its URL path (e.g., in a Next.js catch-all route)
- Fetch content by its GUID, key, or `graph://` reference string
- Fetch draft/preview content for the CMS editor preview experience
- Understand the difference between `new GraphClient()` and `config()` + `getClient()`
- Handle errors from content fetching operations
- Set up a catch-all route in Next.js that renders CMS-managed pages

## Before You Start: Register Content Types

**CRITICAL**: Before any content fetching will work, you must register your content types using `initContentTypeRegistry`. Without registration, fetched content will not be deserialized into the correct types and queries will return empty arrays.

```typescript
import { initContentTypeRegistry } from '@optimizely/cms-sdk';
import { ArticleContentType } from '@/components/Article';
import { BlogPageContentType } from '@/components/BlogPage';

initContentTypeRegistry([
  ArticleContentType,
  BlogPageContentType,
  // ... all content types used in your application
]);
```

This is typically done in `app/layout.tsx` or your application's bootstrap file.

## Step 1: Choose Your Client Strategy

There are two ways to create a GraphClient. **Prefer `config()` + `getClient()`** for most applications.

### Strategy A: `config()` + `getClient()` (Recommended)

Configure once in `layout.tsx`, then call `getClient()` anywhere:

```typescript
// app/layout.tsx
import { config } from '@optimizely/cms-sdk';

config({
  graphKey: process.env.OPTIMIZELY_GRAPH_SINGLE_KEY!,
  graphUrl: process.env.OPTIMIZELY_GRAPH_GATEWAY,
});
```

Then in any page or component:

```typescript
import { getClient } from '@optimizely/cms-sdk';

const client = getClient();
const content = await client.getContentByPath('/about');
```

**Benefits**: Single configuration point, no need to pass keys around, consistent options across the application.

### Strategy B: `new GraphClient()` (Direct)

Create a client instance directly with the key:

```typescript
import { GraphClient } from '@optimizely/cms-sdk';

const client = new GraphClient(process.env.OPTIMIZELY_GRAPH_SINGLE_KEY!, {
  graphUrl: process.env.OPTIMIZELY_GRAPH_GATEWAY,
});
```

**When to use**: Preview routes, one-off scripts, or when you need different configuration per request.

## Step 2: Fetch Content

### Fetching by URL Path (`getContentByPath`)

The most common approach for rendering CMS-managed pages. Returns an **array** of content items matching the path.

```typescript
const results = await client.getContentByPath('/blog/my-article');
const page = results[0]; // First matching item
```

**Options**:

```typescript
const results = await client.getContentByPath('/blog/my-article', {
  // For A/B testing: include a specific variation
  variation: { include: 'SOME', value: ['experiment-id'] },
  // For multi-site: filter content to a specific host/domain
  host: 'www.mysite.com',
});
```

### Fetching by Reference (`getContent`)

Fetch a specific content item by its GUID, key, or a `GraphReference` object:

```typescript
// Using a graph:// string reference
const content = await client.getContent('graph://content/abc-123-def');

// Using a GraphReference object
const content = await client.getContent({
  key: 'abc-123-def',
  locale: 'en',
  version: '5',
});

// With a preview token for draft content
const content = await client.getContent(
  { key: 'abc-123-def' },
  'preview-token-from-cms'
);
```

**Priority rules**: When both `version` and `locale` are provided in a `GraphReference`, `version` takes priority over `locale`.

### Fetching Preview Content (`getPreviewContent`)

Used in preview routes to load draft content that editors are working on:

```typescript
import { type PreviewParams } from '@optimizely/cms-sdk';

// searchParams come from the CMS preview URL
const content = await client.getPreviewContent(
  searchParams as PreviewParams
);
```

This is typically used in a dedicated `/preview` route. See the `optimizely-preview` skill for full preview setup.

## Step 3: Set Up a Catch-All Route (Next.js)

The most common pattern is a catch-all route that renders any CMS-managed page.

### `app/[...slug]/page.tsx`

```typescript
import { getClient } from '@optimizely/cms-sdk';
import { OptimizelyComponent } from '@optimizely/cms-sdk/react/server';

type Props = {
  params: Promise<{ slug?: string[] }>;
};

export default async function CatchAllPage({ params }: Props) {
  const { slug } = await params;
  const path = '/' + (slug?.join('/') ?? '');

  const client = getClient();
  const results = await client.getContentByPath(path);

  if (!results || results.length === 0) {
    const { notFound } = await import('next/navigation');
    notFound();
  }

  return <OptimizelyComponent content={results[0]} />;
}
```

**Important**: The path must start with `/`. Construct it from the slug segments by joining with `/` and prepending a slash.

### Start Page (`app/page.tsx`)

For the root/start page, fetch content at path `/`:

```typescript
import { getClient } from '@optimizely/cms-sdk';
import { OptimizelyComponent } from '@optimizely/cms-sdk/react/server';

export default async function HomePage() {
  const client = getClient();
  const results = await client.getContentByPath('/');

  if (!results || results.length === 0) {
    return <div>No start page configured in CMS</div>;
  }

  return <OptimizelyComponent content={results[0]} />;
}
```

## Step 4: Handle Errors

The SDK provides specific error types for different failure scenarios:

```typescript
import {
  GraphContentResponseError,
  GraphHttpResponseError,
  GraphResponseError,
  GraphMissingContentTypeError,
} from '@optimizely/cms-sdk';

try {
  const results = await client.getContentByPath('/about');
} catch (error) {
  if (error instanceof GraphMissingContentTypeError) {
    // Content type not registered - check initContentTypeRegistry
    console.error('Missing content type:', error.message);
  } else if (error instanceof GraphHttpResponseError) {
    // HTTP-level error (401, 403, 500, etc.)
    console.error('HTTP error:', error.status, error.message);
  } else if (error instanceof GraphContentResponseError) {
    // GraphQL returned data but with content-level errors
    console.error('Content error:', error.message);
  } else if (error instanceof GraphResponseError) {
    // General GraphQL response error
    console.error('Graph error:', error.message);
  }
}
```

## Common Pitfalls

### Empty Results from `getContentByPath`

If `getContentByPath` returns an empty array:

1. **Check `initContentTypeRegistry`** - Content types must be registered before fetching. This is the most common cause.
2. **Check path format** - The path must start with `/` and match exactly what the CMS uses.
3. **Check `OPTIMIZELY_GRAPH_SINGLE_KEY`** - Ensure the environment variable is set and valid.
4. **Check content is published** - Draft content is not returned by default (use `getPreviewContent` for drafts).
5. **Check host filtering** - If using multi-site, ensure the `host` option matches or is omitted.

### Client Not Configured

If `getClient()` throws an error:

- Ensure `config()` was called before `getClient()` in the execution order.
- In Next.js, call `config()` in `layout.tsx` which runs before page components.

## Summary Workflow

1. Register all content types with `initContentTypeRegistry`
2. Configure the client with `config()` in `layout.tsx`
3. Use `getClient()` in pages and components
4. Use `getContentByPath` for URL-based routing (catch-all routes)
5. Use `getContent` for reference-based lookups (GUID, key)
6. Use `getPreviewContent` in preview routes
7. Handle errors with SDK-specific error types

## References

- For setting up the SDK and environment variables, see the `optimizely-setup` skill
- For creating content type definitions, see the `optimizely-model` skill
- For setting up preview, see the `optimizely-preview` skill
- For multi-site and locale handling, see the `optimizely-multisite-locale` skill
