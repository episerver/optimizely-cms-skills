---
name: optimizely-multisite-locale
description: This skill should be used when the user asks to "set up multi-site", "configure multiple domains", "filter content by host", "set up language switching", "handle locales", "configure multi-language", "use host parameter", "locale-aware content", "A/B testing variation", "content variation", or mentions multi-site management, language-specific content, locale filtering, domain-based content filtering, or A/B test variations in Optimizely CMS.
---

# Multi-Site and Multi-Language Content Management

This skill teaches how to manage content across multiple sites and languages using the Optimizely CMS SDK, including host-based filtering, locale-aware content fetching, and A/B testing variations.

## When to Use This Skill

Use this skill when the user:
- Runs multiple websites from a single Optimizely CMS instance
- Needs to filter content to a specific domain/hostname
- Wants to fetch content in a specific language
- Needs to build a language switcher
- Wants to use A/B testing variations on content
- Needs locale-aware navigation and breadcrumbs

## Step 1: Multi-Site Configuration

When multiple websites share a single CMS instance, use the `host` parameter to filter content to the correct domain.

### Setting the Default Host

Configure the default host in `config()` or on the GraphClient constructor:

```typescript
// Using config() — applies to all getClient() instances
import { config } from '@optimizely/cms-sdk';

config({
  graphKey: process.env.OPTIMIZELY_GRAPH_SINGLE_KEY!,
  host: 'www.brand-a.com', // Default host for content filtering
});
```

```typescript
// Using GraphClient directly
import { GraphClient } from '@optimizely/cms-sdk';

const client = new GraphClient(process.env.OPTIMIZELY_GRAPH_SINGLE_KEY!, {
  host: 'www.brand-a.com',
});
```

### Per-Request Host Override

Override the default host on individual requests when needed:

```typescript
const client = getClient();

// Fetch content filtered to a specific site
const results = await client.getContentByPath('/about', {
  host: 'www.brand-b.com',
});
```

### Multi-Site Pattern

A common pattern for a multi-site Next.js application:

```typescript
// middleware.ts — detect which site the request is for
import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') ?? 'www.default-site.com';
  // Store the hostname for use in page components
  const response = NextResponse.next();
  response.headers.set('x-site-host', hostname);
  return response;
}
```

```typescript
// app/[...slug]/page.tsx — use the detected host
import { getClient } from '@optimizely/cms-sdk';
import { OptimizelyComponent } from '@optimizely/cms-sdk/react/server';
import { headers } from 'next/headers';

export default async function CatchAllPage({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params;
  const path = '/' + (slug?.join('/') ?? '');

  const headerStore = await headers();
  const host = headerStore.get('x-site-host') ?? undefined;

  const client = getClient();
  const results = await client.getContentByPath(path, { host });

  if (!results || results.length === 0) {
    const { notFound } = await import('next/navigation');
    notFound();
  }

  return <OptimizelyComponent content={results[0]} />;
}
```

## Step 2: Locale-Aware Content Fetching

### Locale in `getContent` (GraphReference)

When fetching a specific content item, include the locale in the GraphReference:

```typescript
const client = getClient();

// Fetch the article in Swedish
const content = await client.getContent({
  key: 'abc-123-def',
  locale: 'sv',
});

// Fetch the same article in English
const contentEn = await client.getContent({
  key: 'abc-123-def',
  locale: 'en',
});
```

### Locale Filtering in Navigation

Both `getPath` and `getItems` support the `locales` option:

```typescript
const client = getClient();

// Get Swedish navigation
const navItems = await client.getItems('/', {
  locales: ['sv'],
});

// Get French breadcrumbs
const breadcrumbs = await client.getPath('/a-propos', {
  locales: ['fr'],
});
```

### Language Switcher Pattern

Build a language switcher that links to the same content in different languages:

```typescript
import { getClient } from '@optimizely/cms-sdk';

type LanguageOption = {
  locale: string;
  label: string;
  url: string;
};

async function getLanguageOptions(
  contentKey: string,
  availableLocales: string[]
): Promise<LanguageOption[]> {
  const client = getClient();
  const options: LanguageOption[] = [];

  // Fetch the content in each available locale
  const results = await Promise.all(
    availableLocales.map(async (locale) => {
      const content = await client.getContent({
        key: contentKey,
        locale,
      });
      return { locale, content };
    })
  );

  for (const { locale, content } of results) {
    if (content) {
      options.push({
        locale,
        label: getLocaleLabel(locale),
        url: content._metadata?.url?.hierarchical ?? '/',
      });
    }
  }

  return options;
}

function getLocaleLabel(locale: string): string {
  const labels: Record<string, string> = {
    en: 'English',
    sv: 'Svenska',
    fr: 'Fran\u00e7ais',
    de: 'Deutsch',
    es: 'Espa\u00f1ol',
  };
  return labels[locale] ?? locale;
}
```

### React Language Switcher Component

```tsx
type Props = {
  contentKey: string;
  currentLocale: string;
  availableLocales: string[];
};

export default async function LanguageSwitcher({
  contentKey,
  currentLocale,
  availableLocales,
}: Props) {
  const options = await getLanguageOptions(contentKey, availableLocales);

  return (
    <nav aria-label="Language selection">
      <ul>
        {options.map((option) => (
          <li key={option.locale}>
            {option.locale === currentLocale ? (
              <span aria-current="true">{option.label}</span>
            ) : (
              <a href={option.url} hrefLang={option.locale}>
                {option.label}
              </a>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}
```

## Step 3: Locale-Aware Navigation

Combine locale filtering with navigation methods for a fully localized navigation experience:

```typescript
import { getClient } from '@optimizely/cms-sdk';

async function getLocalizedNavigation(locale: string) {
  const client = getClient();

  const [navItems, breadcrumbs] = await Promise.all([
    client.getItems('/', { locales: [locale] }),
    client.getPath('/current-page', { locales: [locale] }),
  ]);

  return {
    navigation: (navItems ?? []).map((page) => ({
      displayName: page._metadata.displayName,
      url: page._metadata.url.hierarchical,
      key: page._metadata.key,
    })),
    breadcrumbs: (breadcrumbs ?? []).slice(1).map((page) => ({
      displayName: page._metadata.displayName,
      url: page._metadata.url.hierarchical,
    })),
  };
}
```

## Step 4: A/B Testing Variations

Use the `variation` option on `getContentByPath` to include A/B testing content variants:

```typescript
const client = getClient();

// Include a specific variation for an experiment
const results = await client.getContentByPath('/pricing', {
  variation: {
    include: 'SOME',
    value: ['experiment-abc-123'],
  },
});
```

### Variation Options

| Field | Type | Description |
|-------|------|-------------|
| `include` | `'SOME'` | Include specific variations by ID |
| `value` | `string[]` | Array of variation/experiment IDs to include |

### Pattern: Feature Flag Driven Content

```typescript
import { getClient } from '@optimizely/cms-sdk';

async function getPageContent(path: string, activeExperiments: string[]) {
  const client = getClient();

  const options: Record<string, unknown> = {};

  if (activeExperiments.length > 0) {
    options.variation = {
      include: 'SOME',
      value: activeExperiments,
    };
  }

  return client.getContentByPath(path, options);
}
```

## Step 5: Combining Host and Locale

For sites that are both multi-domain and multi-language:

```typescript
const client = getClient();

// Fetch content for the Swedish version of brand-b's about page
const results = await client.getContentByPath('/om-oss', {
  host: 'www.brand-b.se',
});

// Locale-aware navigation for brand-b
const navItems = await client.getItems('/', {
  host: 'www.brand-b.se',
  locales: ['sv'],
});
```

## Common Pitfalls

### Missing Host Causes Cross-Site Content Leaking

If you do not set the `host` parameter in a multi-site setup, `getContentByPath` may return content from any site that has a matching path. Always set a default host via `config()` or pass it per-request.

### Locale Mismatch Between Path and Option

When passing a `locales` filter, ensure the path you are querying matches that locale. For example, `/about` may exist in English but not in Swedish (where it might be `/om-oss`).

### Version vs Locale Priority

When using `getContent` with a `GraphReference` that has both `version` and `locale`, the `version` takes priority. This means you get the specified version regardless of locale. This is intentional for preview scenarios where you want a specific draft version.

## Summary

1. Use `host` in `config()` or on individual requests to filter content to a specific domain
2. Use `locales` array on `getPath` and `getItems` for locale-filtered navigation
3. Use `locale` field in `GraphReference` for locale-specific content fetching with `getContent`
4. Use `variation` on `getContentByPath` for A/B testing content variants
5. Combine `host` and `locales` for sites that are both multi-domain and multi-language
6. Always set a default host in multi-site setups to prevent cross-site content leaking

## References

- For content fetching patterns, see the `optimizely-content-fetching` skill
- For navigation and breadcrumbs, see the `optimizely-content-navigation` skill
- For SDK setup including environment variables, see the `optimizely-setup` skill
