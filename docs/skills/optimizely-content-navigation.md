# Optimizely Content Navigation

Build navigation menus and breadcrumb trails from the CMS page hierarchy using the SDK's `getPath()` and `getItems()` methods. This skill covers main nav bars, sub-navigation, breadcrumbs, and combined layout patterns.

## When to Use

Use this skill when you want to:
- Build a breadcrumb trail from the start page down to the current page
- Create a main navigation menu from CMS page hierarchy
- Get all child pages of a given parent page
- Get all ancestor pages of the current page
- Build a combined layout with both navigation and breadcrumbs
- Create locale-aware navigation for multi-language sites

## Trigger Phrases

Say any of these to activate the skill:
- "build breadcrumbs"
- "create a navigation menu"
- "get child pages"
- "get ancestor pages"
- "build site navigation"
- "get parent pages"
- "use getPath"
- "use getItems"
- "create a nav bar"
- "build a menu from CMS"

## Usage Example

```
You: "I need breadcrumbs and a top navigation bar for my Optimizely site."

Agent: [Uses optimizely-content-navigation skill]
- Fetches top-level nav items with client.getItems('/')
- Fetches ancestor pages with client.getPath(currentPath)
- Uses Promise.all to run both fetches in parallel
- Builds a <nav> component with aria-label="Main navigation"
- Builds a breadcrumb <nav> with aria-label="Breadcrumb"
- Skips the first getPath result (the start page) since "Home" is rendered separately
- Marks the last breadcrumb item with aria-current="page"
```

## What It Generates

- Main navigation components using `getItems('/')` to list top-level pages
- Breadcrumb components using `getPath('/current/page')` to list ancestor pages
- Sub-navigation components for sidebar menus under a specific section
- Combined layout patterns that fetch nav and breadcrumbs in parallel with `Promise.all`
- Accessible markup with proper `aria-label` and `aria-current` attributes

## Key Concepts

### The Two Navigation Methods

The SDK provides two methods on the GraphClient, each serving a distinct navigation need:

**`getPath(path)` -- Ancestor chain (for breadcrumbs):**
Returns an ordered array of pages from the site root down to the page at the given path. For example, calling `getPath('/blog/2024/my-article')` returns `[StartPage, BlogSection, 2024Archive, MyArticle]`. The first element is always the start page.

**`getItems(path)` -- Direct children (for menus):**
Returns an array of pages that are direct children of the page at the given path. For example, calling `getItems('/')` returns the top-level pages like `[AboutPage, BlogPage, ContactPage, ProductsPage]`.

### Input Types and Options

Both methods accept the same input types:
- A URL path string like `'/blog/my-article'`
- A GraphReference object like `{ key: 'abc-123', locale: 'en' }`

Both methods support these options:

| Option | Type | Purpose |
|--------|------|---------|
| `locales` | `string[]` | Filter results to specific languages |
| `host` | `string` | Filter to a specific domain in multi-site setups |

### Null Handling

Both `getPath` and `getItems` return `null` when the input page does not exist. Always check for null before mapping over results. A safe pattern is to default to an empty array: `(items ?? []).map(...)`.

### Breadcrumb Tips

- Skip index 0 from `getPath` results. The first item is always the start page (site root), which you typically render as a hard-coded "Home" link instead.
- Mark the last breadcrumb item with `aria-current="page"` for accessibility.
- Render all items except the last as links; the last item is the current page and should be plain text.

### Page Metadata Shape

Each item returned by both methods includes a `_metadata` property with:

| Field | Use For | Example |
|-------|---------|---------|
| `_metadata.key` | React keys | `'abc-123-def'` |
| `_metadata.displayName` | Link text | `'About Us'` |
| `_metadata.url.hierarchical` | Link href | `'/about-us'` |

### Performance Tip

When you need both navigation and breadcrumbs on the same page, fetch them in parallel with `Promise.all` rather than sequentially:

```
const [navItems, ancestors] = await Promise.all([
  client.getItems('/'),
  client.getPath(currentPath),
]);
```

### Caching Considerations

Navigation data is cached by the SDK. After publishing new pages in the CMS, navigation may not update immediately. Consider using ISR with a reasonable `revalidate` interval or on-demand revalidation via a CMS webhook.

## Related Skills

- [`optimizely-content-fetching`](optimizely-content-fetching.md) -- fetch page content to render alongside navigation
- [`optimizely-multisite-locale`](optimizely-multisite-locale.md) -- locale-aware navigation with the `locales` option
- [`optimizely-graphql-optimization`](optimizely-graphql-optimization.md) -- optimize query performance for navigation data
