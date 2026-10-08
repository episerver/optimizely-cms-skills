# Optimizely Content Graph Troubleshooting

Debug and resolve errors when querying Optimizely Content Graph, from empty results and HTTP failures to fragment threshold issues and schema mismatches.

## When to Use

Use this skill when you want to:
- Fix a `GraphContentResponseError` (query ran but returned no content)
- Fix a `GraphHttpResponseError` (HTTP-level failure talking to the Graph API)
- Fix a `GraphMissingContentTypeError` (content type not registered in your app)
- Fix a `GraphFragmentThresholdError` (too many GraphQL fragments generated)
- Diagnose why `getContentByPath` or `getContent` returns empty results
- Debug schema validation errors after pushing content type changes
- Resolve stale cache issues after publishing content
- Troubleshoot general Content Graph connectivity problems

## Trigger Phrases

Say any of these to activate the skill:
- "Debug Graph errors"
- "Fix GraphContentResponseError"
- "Fix GraphFragmentThresholdError"
- "getContentByPath returns empty"
- "Content not showing"
- "Graph API not working"
- "Fix GraphMissingContentTypeError"
- "Troubleshoot Content Graph"
- "Query returns no results"
- "Fix schema validation error"

## Usage Example

```
You: "getContentByPath is returning empty for my About page"

Agent: [Uses optimizely-troubleshoot-graph skill]
- Checks path format (must have leading and trailing slashes: /en/about/)
- Verifies the content is published (drafts are not available via delivery API)
- Confirms OPTIMIZELY_GRAPH_SINGLE_KEY is set and valid
- Checks hostname configuration in CMS matches your application URL
- Verifies the content type is registered in initContentTypeRegistry
- Suggests enabling debug mode on GraphClient if the issue persists
```

```
You: "I'm getting a GraphFragmentThresholdError on my homepage"

Agent: [Uses optimizely-troubleshoot-graph skill]
- Identifies which content area properties lack allowedTypes constraints
- Shows how to add type constraints to limit generated fragments
- Suggests re-pushing content type definitions with the CLI
- Explains why unconstrained content areas cause fragment explosion
```

## Error Quick Reference

| Error | Typical cause | First thing to check |
|-------|--------------|----------------------|
| `GraphContentResponseError` | Wrong path format or unpublished content | Path has leading + trailing slashes |
| `GraphHttpResponseError` | Invalid API key or wrong endpoint | `OPTIMIZELY_GRAPH_SINGLE_KEY` value |
| `GraphResponseError` | Schema mismatch between local types and CMS | Run `config push` to sync |
| `GraphMissingContentTypeError` | Content type not in registry | Check `initContentTypeRegistry` call |
| `GraphFragmentThresholdError` | Content area missing `allowedTypes` | Add type constraints to content areas |
| `SchemaValidationError` | Local definitions out of sync with CMS | Run `config push` to sync |

## What It Handles

- **Diagnostic sequence** -- A systematic six-step debugging flow: check registration, verify env vars, validate path format, confirm publish state, check host filtering, enable debug logging
- **Error-specific guidance** -- Targeted fixes for each of the six named error types the SDK can throw
- **Fragment analysis** -- How to identify and constrain content areas that generate too many GraphQL fragments
- **Cache invalidation** -- Options for webhook-based and manual cache invalidation when content updates are not reflected
- **Debug mode setup** -- Enabling verbose logging on `GraphClient` to inspect raw queries and responses

## Common Path Format Mistakes

The most frequent cause of empty results is incorrect path formatting:

| Input | Result |
|-------|--------|
| `en/about` | Will not match |
| `/en/about` | Will not match (missing trailing slash) |
| `/en/about/` | Correct |
| `/about/` | Correct (if not using locale routing) |

## Tips

- Always register every content type in `initContentTypeRegistry`, including contracts and shared types.
- After modifying content types in the CMS, run `npx @optimizely/cms-cli@latest config push` to sync schemas.
- Only published content is available through the delivery API. Check publish state before debugging queries.
- Enable `debug: true` on `GraphClient` to see the raw GraphQL queries being sent.

## Related Skills

- [`optimizely-preview`](optimizely-preview.md) -- For preview-specific issues (separate from delivery queries)
- [`optimizely-content-fetching`](optimizely-content-fetching.md) -- Content fetching patterns and best practices
- [`optimizely-setup`](optimizely-setup.md) -- Verify your SDK and environment are configured correctly
