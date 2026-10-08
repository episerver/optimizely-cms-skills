# Optimizely Multi-Site and Locale

Manage content across multiple websites and languages from a single Optimizely CMS instance. This skill covers host-based content filtering, locale-aware fetching, language switcher components, and A/B testing variations.

## When to Use

Use this skill when you want to:
- Run multiple websites from one Optimizely CMS instance
- Filter content to a specific domain or hostname
- Fetch content in a specific language or locale
- Build a language switcher component
- Set up locale-aware navigation and breadcrumbs
- Use A/B testing variations on content
- Prevent cross-site content leaking in multi-domain setups

## Trigger Phrases

Say any of these to activate the skill:
- "set up multi-site"
- "configure multiple domains"
- "filter content by host"
- "set up language switching"
- "handle locales"
- "configure multi-language"
- "use host parameter"
- "locale-aware content"
- "A/B testing variation"
- "content variation"

## Usage Example

```
You: "I have two brand sites sharing one CMS. How do I make sure each site only
     shows its own content?"

Agent: [Uses optimizely-multisite-locale skill]
- Sets a default host in config() so all queries filter to one domain
- Creates middleware.ts to detect the incoming hostname from the request
- Passes the detected host to getContentByPath() in the catch-all route
- Shows how to override the host per-request for cross-site lookups
- Warns that omitting host in a multi-site setup causes content leaking
```

## What It Generates

- Default host configuration in `config()` for domain-based content filtering
- Next.js middleware that detects the request hostname and passes it to pages
- Per-request `host` overrides on `getContentByPath`, `getPath`, and `getItems`
- Locale-filtered navigation using the `locales` option on `getPath` and `getItems`
- Language switcher components that link to the same content in different languages
- A/B testing variation options on `getContentByPath` with experiment IDs
- Combined host + locale patterns for sites that are both multi-domain and multi-language

## Key Concepts

### Host Filtering for Multi-Site

When multiple websites share a single CMS instance, the `host` parameter determines which site's content is returned. You can set it in two places:

**Default host via `config()`:** Set `host` in your global configuration so all queries filter to one domain by default. This is the recommended starting point.

**Per-request override:** Pass `host` as an option to `getContentByPath`, `getPath`, or `getItems` when you need to query a different site than the default.

**Critical warning:** If you do not set a host in a multi-site setup, `getContentByPath` may return content from any site that has a matching path. This is the most common cause of "content leaking" between sites.

### Multi-Site Architecture in Next.js

A typical pattern uses Next.js middleware to detect the incoming hostname from the request, then stores it in a response header (e.g., `x-site-host`). Page components read this header and pass it as the `host` option to content fetching calls. This way, each request automatically fetches content for the correct domain.

### Locale-Aware Fetching

Locale handling works differently depending on which method you use:

**`getContent()` with GraphReference:** Include the `locale` field directly in the reference object: `{ key: 'abc-123', locale: 'sv' }`.

**`getPath()` and `getItems()`:** Pass `locales` as an option: `{ locales: ['sv'] }`. This filters navigation results to a specific language.

**`getContentByPath()`:** Locale is typically implicit in the URL path itself. For example, the Swedish version of `/about` might live at `/om-oss`.

### Building a Language Switcher

The language switcher pattern works by fetching the same content key in each available locale using `Promise.all`. For each locale where the content exists, you get back its locale-specific URL. Content that does not exist in a locale is simply omitted from the switcher. Use `hrefLang` attributes on links for proper SEO.

### A/B Testing Variations

Pass `variation` as an option to `getContentByPath` to include content variants from A/B experiments:

| Field | Type | Description |
|-------|------|-------------|
| `include` | `'SOME'` | Include specific variations by ID |
| `value` | `string[]` | Array of variation/experiment IDs to include |

This is useful when your application knows which experiments are active for the current visitor and needs to fetch the corresponding content variant.

### Combining Host and Locale

For sites that are both multi-domain and multi-language, combine both parameters. For example, fetching the Swedish version of Brand B's about page:

```
client.getContentByPath('/om-oss', { host: 'www.brand-b.se' })
```

### Common Pitfalls

**Locale mismatch:** When passing a `locales` filter, make sure the URL path you are querying actually exists in that locale. The path `/about` may exist in English but not in Swedish.

**Version vs. locale priority:** When a GraphReference includes both `version` and `locale`, the version takes priority. This is intentional for preview scenarios where you need a specific draft version regardless of language.

## Related Skills

- [`optimizely-content-fetching`](optimizely-content-fetching.md) -- core content fetching that host and locale options extend
- [`optimizely-content-navigation`](optimizely-content-navigation.md) -- navigation and breadcrumbs that support locale filtering
- [`optimizely-graphql-optimization`](optimizely-graphql-optimization.md) -- query optimization affected by multi-site configuration
