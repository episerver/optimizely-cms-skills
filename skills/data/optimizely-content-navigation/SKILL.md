---
name: optimizely-content-navigation
description: This skill should be used when the user asks to "build breadcrumbs", "create a navigation menu", "get child pages", "get ancestor pages", "build site navigation", "get parent pages", "use getPath", "use getItems", "create a nav bar", "build a menu from CMS", or mentions breadcrumbs, navigation menus, site maps, or hierarchical page structures for Optimizely CMS.
---

# Building Navigation and Breadcrumbs with Optimizely CMS

This skill teaches how to build navigation menus and breadcrumb trails using the SDK's `getPath()` and `getItems()` methods.

## When to Use This Skill

Use this skill when the user wants to:
- Build a breadcrumb trail showing the path from the start page to the current page
- Create a navigation menu from CMS page hierarchy
- Get all child pages of a parent page
- Get all ancestor pages of the current page
- Build a combined layout with both navigation and breadcrumbs
- Create locale-aware navigation for multi-language sites

## Step 1: Understand the Navigation Methods

The SDK provides two methods on the GraphClient for navigation:

### `getPath(input, options?)` — Ancestors (for Breadcrumbs)

Returns an array of ancestor pages from the root (start page) down to the current page.

```typescript
const client = getClient();
const ancestors = await client.getPath('/blog/2024/my-article');
// Returns: [StartPage, BlogSection, 2024Archive, MyArticle]
```

### `getItems(input, options?)` — Children (for Menus)

Returns an array of child pages directly under the given parent page.

```typescript
const client = getClient();
const children = await client.getItems('/');
// Returns: [AboutPage, BlogPage, ContactPage, ProductsPage]
```

### Input Types

Both methods accept:
- **URL path string**: `'/blog/my-article'`
- **GraphReference object**: `{ key: 'abc-123', locale: 'en' }`

### Options

Both methods support these options:

| Option | Type | Description |
|--------|------|-------------|
| `locales` | `string[]` | Filter results to specific locales |
| `host` | `string` | Override the default host for multi-site |

### Return Values

Both methods return `null` if the input page does not exist. When successful, they return an array of page metadata objects.

## Step 2: Build Breadcrumbs

### Basic Breadcrumb Component

```typescript
import { getClient } from '@optimizely/cms-sdk';

type BreadcrumbItem = {
  displayName: string;
  url: string;
};

async function getBreadcrumbs(path: string): Promise<BreadcrumbItem[]> {
  const client = getClient();
  const ancestors = await client.getPath(path);

  if (!ancestors) {
    return [];
  }

  // Skip index 0 (start page) — it's usually the site root
  return ancestors.slice(1).map((page) => ({
    displayName: page._metadata.displayName,
    url: page._metadata.url.hierarchical,
  }));
}
```

### React Breadcrumb Component

```tsx
type Props = {
  path: string;
};

export default async function Breadcrumbs({ path }: Props) {
  const items = await getBreadcrumbs(path);

  if (items.length === 0) {
    return null;
  }

  return (
    <nav aria-label="Breadcrumb">
      <ol>
        <li>
          <a href="/">Home</a>
        </li>
        {items.map((item, index) => (
          <li key={item.url}>
            {index === items.length - 1 ? (
              <span aria-current="page">{item.displayName}</span>
            ) : (
              <a href={item.url}>{item.displayName}</a>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
```

**Why skip index 0?** The first item returned by `getPath` is the start page (site root). Breadcrumbs typically start with a "Home" link that you render separately, then show the path below the start page.

## Step 3: Build Navigation Menus

### Basic Navigation Menu

Fetch child pages of the start page to build the main navigation:

```typescript
import { getClient } from '@optimizely/cms-sdk';

type NavItem = {
  displayName: string;
  url: string;
  key: string;
};

async function getMainNavigation(): Promise<NavItem[]> {
  const client = getClient();
  const children = await client.getItems('/');

  if (!children) {
    return [];
  }

  return children.map((page) => ({
    displayName: page._metadata.displayName,
    url: page._metadata.url.hierarchical,
    key: page._metadata.key,
  }));
}
```

### React Navigation Component

```tsx
export default async function MainNavigation() {
  const items = await getMainNavigation();

  return (
    <nav aria-label="Main navigation">
      <ul>
        {items.map((item) => (
          <li key={item.key}>
            <a href={item.url}>{item.displayName}</a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
```

### Sub-Navigation (Children of Current Page)

Build a sidebar showing pages under the current section:

```typescript
async function getSubNavigation(sectionPath: string): Promise<NavItem[]> {
  const client = getClient();
  const children = await client.getItems(sectionPath);

  if (!children) {
    return [];
  }

  return children.map((page) => ({
    displayName: page._metadata.displayName,
    url: page._metadata.url.hierarchical,
    key: page._metadata.key,
  }));
}
```

## Step 4: Combined Layout Pattern

A common pattern is a layout that includes both main navigation and breadcrumbs:

```tsx
import { getClient } from '@optimizely/cms-sdk';

type Props = {
  currentPath: string;
  children: React.ReactNode;
};

export default async function SiteLayout({ currentPath, children }: Props) {
  const client = getClient();

  // Fetch navigation and breadcrumbs in parallel
  const [navItems, breadcrumbAncestors] = await Promise.all([
    client.getItems('/'),
    client.getPath(currentPath),
  ]);

  const breadcrumbs = (breadcrumbAncestors ?? []).slice(1).map((page) => ({
    displayName: page._metadata.displayName,
    url: page._metadata.url.hierarchical,
  }));

  const navigation = (navItems ?? []).map((page) => ({
    displayName: page._metadata.displayName,
    url: page._metadata.url.hierarchical,
    key: page._metadata.key,
  }));

  return (
    <>
      <header>
        <nav aria-label="Main navigation">
          <ul>
            {navigation.map((item) => (
              <li key={item.key}>
                <a href={item.url}>{item.displayName}</a>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      {breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb">
          <ol>
            <li><a href="/">Home</a></li>
            {breadcrumbs.map((item, index) => (
              <li key={item.url}>
                {index === breadcrumbs.length - 1 ? (
                  <span aria-current="page">{item.displayName}</span>
                ) : (
                  <a href={item.url}>{item.displayName}</a>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}

      <main>{children}</main>
    </>
  );
}
```

## Step 5: Page Metadata Shape

Both `getPath` and `getItems` return objects with a `_metadata` property containing:

| Field | Description | Example |
|-------|-------------|---------|
| `_metadata.key` | Unique content key (GUID) | `'abc-123-def'` |
| `_metadata.displayName` | Editor-friendly page name | `'About Us'` |
| `_metadata.url.hierarchical` | Full URL path | `'/about-us'` |

Use `_metadata.key` for React keys, `_metadata.displayName` for display text, and `_metadata.url.hierarchical` for link targets.

## Multi-Language Navigation

For locale-aware navigation, pass the `locales` option:

```typescript
// Get navigation items in Swedish
const client = getClient();
const items = await client.getItems('/', {
  locales: ['sv'],
});

// Get breadcrumbs in French
const ancestors = await client.getPath('/a-propos', {
  locales: ['fr'],
});
```

See the `optimizely-multisite-locale` skill for comprehensive multi-language patterns.

## Common Pitfalls

### Null Return Values

Both `getPath` and `getItems` return `null` when the input page does not exist. Always handle this case:

```typescript
const items = await client.getItems('/nonexistent');
if (!items) {
  // Page does not exist — render fallback or return empty
  return [];
}
```

### Stale Navigation After Publishing

Navigation data is cached. After publishing new pages, the navigation may not update immediately. Consider:
- Setting appropriate cache headers
- Using ISR (Incremental Static Regeneration) in Next.js with a reasonable `revalidate` interval
- Using on-demand revalidation via a CMS webhook

## Summary

1. Use `getPath()` to get ancestor pages for breadcrumbs
2. Use `getItems()` to get child pages for navigation menus
3. Both accept URL path strings or GraphReference objects
4. Both support `locales` and `host` options
5. Both return `null` if the page does not exist
6. Skip the first item from `getPath` results when building breadcrumbs (it is the start page)
7. Fetch navigation and breadcrumbs in parallel with `Promise.all` for performance

## References

- For content fetching, see the `optimizely-content-fetching` skill
- For multi-site and locale handling, see the `optimizely-multisite-locale` skill
- For creating page content types, see the `optimizely-model` skill
