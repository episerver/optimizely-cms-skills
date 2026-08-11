# Optimizely Content Fetching

Fetch content from Optimizely CMS using the JavaScript SDK's GraphClient. This skill covers loading pages by URL path, retrieving content by GUID or key, and fetching draft content for editor previews.

## When to Use

Use this skill when you want to:
- Load a CMS page by its URL path (e.g., in a Next.js catch-all route)
- Fetch a specific content item by its GUID, key, or `graph://` reference
- Set up a catch-all route that renders any CMS-managed page
- Load draft/preview content for the CMS editor experience
- Understand the difference between `config() + getClient()` and `new GraphClient()`
- Handle errors from content fetching operations

## Trigger Phrases

Say any of these to activate the skill:
- "fetch content from CMS"
- "get a page by URL"
- "load content by path"
- "fetch by GUID"
- "get content by key"
- "set up a catch-all route"
- "configure GraphClient"
- "use getContentByPath"
- "use getContent"
- "preview draft content"
- "fetch preview content"

## Usage Example

```
You: "I need to set up a catch-all route in Next.js that renders pages from the CMS."

Agent: [Uses optimizely-content-fetching skill]
- Registers content types with initContentTypeRegistry in layout.tsx
- Configures the GraphClient with config() using your OPTIMIZELY_GRAPH_SINGLE_KEY
- Creates app/[...slug]/page.tsx with a catch-all route
- Calls getContentByPath() with the constructed path
- Renders the result using OptimizelyComponent
- Adds a notFound() fallback for missing pages
```

## What It Generates

- GraphClient configuration using `config()` in your root layout
- Catch-all route pages (`app/[...slug]/page.tsx`) that resolve CMS content by URL
- Start/home page setup (`app/page.tsx`) fetching content at path `/`
- Content type registry initialization with `initContentTypeRegistry`
- Error handling using SDK-specific error types like `GraphHttpResponseError` and `GraphMissingContentTypeError`
- Preview content fetching with `getPreviewContent` for editor preview routes

## Key Concepts

### Client Strategies

There are two ways to create a GraphClient. Choose based on your use case:

**`config()` + `getClient()` (recommended for most apps):**
Call `config()` once in your root layout with your `OPTIMIZELY_GRAPH_SINGLE_KEY`, then call `getClient()` anywhere in your app to get a pre-configured client. This keeps configuration in one place and ensures consistent options across all pages.

**`new GraphClient(key, options)` (direct instantiation):**
Create a client instance with the key passed directly. Use this approach for preview routes that need different auth, one-off scripts, or situations where you need different configuration per request.

### Fetching Methods

The GraphClient provides three methods for loading content:

- `getContentByPath('/path')` -- the most common method. Pass a URL path (must start with `/`) and get back an array of matching content items. Typically used in catch-all routes.
- `getContent(reference)` -- fetch a single content item by its GUID, key, or a `graph://` reference string. Supports a `GraphReference` object with `key`, `locale`, and `version` fields.
- `getPreviewContent(params)` -- fetch draft content using search parameters passed from the CMS preview URL. Used exclusively in dedicated preview routes.

### Content Type Registration

Before any fetching will work, you must call `initContentTypeRegistry` with an array of all your content type definitions. Without this, the SDK cannot deserialize fetched content into the correct types, and queries will return empty arrays. This call belongs in `app/layout.tsx` or your application's bootstrap file.

### Error Types

The SDK provides specific error classes for different failure scenarios:

- `GraphMissingContentTypeError` -- a content type referenced in the response was not registered
- `GraphHttpResponseError` -- an HTTP-level error (401, 403, 500, etc.)
- `GraphContentResponseError` -- GraphQL returned data but with content-level errors
- `GraphResponseError` -- general GraphQL response error

### Common Troubleshooting

If `getContentByPath` returns an empty array:

1. Check that all content types are registered with `initContentTypeRegistry`
2. Verify the path starts with `/` and matches what the CMS uses
3. Confirm `OPTIMIZELY_GRAPH_SINGLE_KEY` is set and valid
4. Make sure the content is published (drafts require `getPreviewContent`)
5. If using multi-site, check whether the `host` option is needed

## Related Skills

- [`optimizely-content-navigation`](optimizely-content-navigation.md) -- build breadcrumbs and menus from CMS page hierarchy
- [`optimizely-multisite-locale`](optimizely-multisite-locale.md) -- filter content by host or locale when fetching
- [`optimizely-graphql-optimization`](optimizely-graphql-optimization.md) -- optimize query performance and manage fragment thresholds
- [`optimizely-schema-validation`](optimizely-schema-validation.md) -- validate fetched content when using custom GraphQL clients
