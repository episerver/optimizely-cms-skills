# Optimizely Schema Validation

Validate CMS content data at runtime using the SDK's schema validation utilities. This skill is for projects that use custom GraphQL clients (Apollo, urql) instead of the built-in GraphClient, or that receive content from external sources like webhooks.

## When to Use

Use this skill when you want to:
- Validate content data fetched with a custom GraphQL client (Apollo, urql, graphql-request)
- Validate content payloads received via webhooks
- Parse user-submitted content that should conform to a CMS content type schema
- Use strict validation that rejects unknown properties
- Validate data safely without throwing exceptions

## When NOT to Use

Do not use this skill when you are fetching content with the SDK's built-in `GraphClient` or `getClient()`. Those clients already return properly typed content based on registered content types. Adding schema validation on top is redundant.

## Trigger Phrases

Say any of these to activate the skill:
- "validate content data"
- "use toSchema"
- "validate webhook payload"
- "parse CMS content"
- "validate GraphQL response"
- "use safeParse"
- "use SchemaValidationError"
- "validate with strict mode"

## Usage Example

```
You: "I'm using Apollo Client to fetch articles. How do I validate the response
     matches my content type?"

Agent: [Uses optimizely-schema-validation skill]
- Generates a validation schema from ArticleContentType using toSchema()
- Adds safeParse() after the Apollo query to validate the response data
- Returns validated, typed data on success
- Logs validation errors with field paths on failure
- Uses passthrough mode (default) to accept extra GraphQL metadata fields
```

## What It Generates

- Validation schemas from content type definitions using `toSchema(contentType, options)`
- Safe parsing logic with `safeParse()` that returns `{ success, data, errors }` without throwing
- Throwing parse logic with `parse()` that raises `SchemaValidationError` on failure
- Webhook handler validation that checks incoming payloads before processing
- Apollo/urql integration patterns that validate query results against content type schemas
- Strict mode validation for external data sources where unknown properties should be rejected

## Key Concepts

### Generating a Schema

Use `toSchema()` from `@optimizely/cms-sdk/schema` to generate a validation schema from any content type definition. The function takes the content type and an optional options object:

```
const schema = toSchema(ArticleContentType);
const strictSchema = toSchema(ArticleContentType, { strict: true });
```

### Validation Modes

**Passthrough (default):** Extra properties in the data are accepted and passed through. This is the right choice for GraphQL responses that typically include additional metadata fields like `_metadata` or `__typename` beyond what the content type defines.

**Strict (`{ strict: true }`):** Any property not defined in the content type causes validation to fail. Use strict mode when validating data from external sources (webhooks, third-party APIs) where unexpected fields may indicate schema drift or data corruption.

### Parse Methods

**`safeParse(data)` -- non-throwing validation:**
Returns a result object that always has a `success` boolean. On success, `data` contains the validated content. On failure, `errors` contains an array of objects with `path` and `message` fields. This is the preferred method for most use cases because it gives you full control over error handling.

**`parse(data)` -- throwing validation:**
Returns the validated data on success. Throws `SchemaValidationError` on failure. Use this when invalid data is truly exceptional and should halt execution. Catch the error with `instanceof SchemaValidationError` to access the `errors` array.

### Common Use Cases

**Webhook validation:** When your app receives content change notifications via webhook, validate the payload before processing it. Use strict mode to catch unexpected fields. Return a 400 response if validation fails.

**Custom GraphQL client integration:** When using Apollo, urql, or graphql-request instead of the SDK's built-in GraphClient, the response data is untyped. Run it through `safeParse` to get type-safe validated content. Use passthrough mode since GraphQL responses include extra fields.

**User-submitted content:** When editors submit data through a custom form (not the CMS editor), validate against the content type schema before saving. Use strict mode to reject unexpected fields.

### Error Details

Validation errors are structured for easy diagnosis:

| Field | Description | Example |
|-------|-------------|---------|
| `path` | Which field failed | `'heading'` |
| `message` | What went wrong | `'Expected string, received number'` |

### Do Not Double-Validate

If you use the SDK's built-in `GraphClient` or `getClient()`, the returned content is already properly typed based on registered content types. Adding `toSchema` + `parse` on top of that is redundant and adds unnecessary overhead. Schema validation is specifically designed for situations where you bypass the built-in client.

## Related Skills

- [`optimizely-content-fetching`](optimizely-content-fetching.md) -- the built-in GraphClient that makes schema validation unnecessary
- [`optimizely-graphql-optimization`](optimizely-graphql-optimization.md) -- optimize queries whether using the built-in client or a custom one
- [`optimizely-multisite-locale`](optimizely-multisite-locale.md) -- locale handling that applies to both built-in and custom clients
