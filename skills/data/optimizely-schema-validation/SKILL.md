---
name: optimizely-schema-validation
description: This skill should be used when the user asks to "validate content data", "use toSchema", "validate webhook payload", "parse CMS content", "validate GraphQL response", "use safeParse", "use SchemaValidationError", "validate with strict mode", or mentions runtime validation of content from Optimizely CMS, especially when using custom GraphQL clients like Apollo or urql instead of the built-in GraphClient.
---

# Schema Validation for Optimizely CMS Content

This skill teaches how to use the SDK's schema validation utilities to validate content data at runtime, particularly when using custom GraphQL clients or processing data from external sources like webhooks.

## When to Use This Skill

Use this skill when the user:
- Uses a custom GraphQL client (Apollo, urql, graphql-request) instead of the SDK's built-in `GraphClient`
- Receives content data via webhooks and needs to validate it
- Processes user-submitted content that should conform to a content type schema
- Wants strict validation that rejects unknown properties
- Needs to validate data without throwing exceptions (safe parsing)

## When NOT to Use This Skill

Schema validation is **not needed** when using `GraphClient` or `getClient()` from the SDK. These clients already return properly typed content based on registered content types. Adding validation on top would be redundant.

## Step 1: Generate a Validation Schema

Use `toSchema()` to generate a validation schema from a content type definition:

```typescript
import { toSchema } from '@optimizely/cms-sdk/schema';
import { ArticleContentType } from '@/components/Article';

// Generate schema with default options (passthrough mode)
const articleSchema = toSchema(ArticleContentType);

// Generate schema with strict mode (rejects unknown properties)
const strictArticleSchema = toSchema(ArticleContentType, { strict: true });
```

### Options

| Option | Default | Description |
|--------|---------|-------------|
| `strict` | `false` | When `true`, rejects objects with properties not defined in the content type. When `false` (passthrough), extra properties are accepted and passed through. |

### Default Mode (Passthrough)

In the default mode, extra properties in the data are accepted. This is useful when your GraphQL query returns additional fields beyond what the content type defines:

```typescript
const schema = toSchema(ArticleContentType);

const data = {
  heading: 'My Article',
  body: '<p>Content</p>',
  _metadata: { key: 'abc-123' }, // Extra field — accepted in passthrough
};

const result = schema.safeParse(data);
// result.success === true
```

### Strict Mode

In strict mode, any property not defined in the content type causes validation to fail:

```typescript
const schema = toSchema(ArticleContentType, { strict: true });

const data = {
  heading: 'My Article',
  body: '<p>Content</p>',
  unknownField: 'something', // Not in content type definition
};

const result = schema.safeParse(data);
// result.success === false
// result.errors includes "Unknown property: unknownField"
```

## Step 2: Validate Data

### Safe Parsing (`safeParse`)

Validates data without throwing. Returns a result object:

```typescript
const schema = toSchema(ArticleContentType);

const result = schema.safeParse(incomingData);

if (result.success) {
  // result.data is the validated content
  console.log('Valid article:', result.data.heading);
} else {
  // result.errors contains validation error details
  console.error('Validation failed:', result.errors);
}
```

The result object shape:

```typescript
// Success
{
  success: true,
  data: { heading: 'Title', body: '...', ... }
}

// Failure
{
  success: false,
  data: undefined,
  errors: [
    { path: 'heading', message: 'Expected string, received number' },
    { path: 'body', message: 'Required field missing' },
  ]
}
```

### Throwing Parse (`parse`)

Validates data and throws `SchemaValidationError` on failure:

```typescript
import { toSchema, SchemaValidationError } from '@optimizely/cms-sdk/schema';

const schema = toSchema(ArticleContentType);

try {
  const validData = schema.parse(incomingData);
  // validData is guaranteed to match the content type shape
  console.log('Valid:', validData.heading);
} catch (error) {
  if (error instanceof SchemaValidationError) {
    console.error('Validation errors:', error.errors);
  }
}
```

## Step 3: Common Use Cases

### Validating Webhook Data

When receiving content change notifications via webhook:

```typescript
import { toSchema } from '@optimizely/cms-sdk/schema';
import { ArticleContentType } from '@/components/Article';

const articleSchema = toSchema(ArticleContentType);

export async function handleWebhook(request: Request) {
  const payload = await request.json();

  const result = articleSchema.safeParse(payload.content);

  if (!result.success) {
    console.error('Invalid webhook payload:', result.errors);
    return new Response('Invalid payload', { status: 400 });
  }

  // Process the validated content
  await updateSearchIndex(result.data);
  return new Response('OK', { status: 200 });
}
```

### Using Apollo Client with Schema Validation

When fetching content with Apollo instead of the SDK's GraphClient:

```typescript
import { useQuery, gql } from '@apollo/client';
import { toSchema } from '@optimizely/cms-sdk/schema';
import { ArticleContentType } from '@/components/Article';

const GET_ARTICLE = gql`
  query GetArticle($path: String!) {
    article(where: { _metadata: { url: { hierarchical: { eq: $path } } } }) {
      items {
        heading
        body {
          html
        }
      }
    }
  }
`;

const articleSchema = toSchema(ArticleContentType);

function ArticlePage({ path }: { path: string }) {
  const { data, loading, error } = useQuery(GET_ARTICLE, {
    variables: { path },
  });

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error.message}</p>;

  const rawArticle = data?.article?.items?.[0];
  const result = articleSchema.safeParse(rawArticle);

  if (!result.success) {
    console.error('Article data does not match schema:', result.errors);
    return <p>Content format error</p>;
  }

  return (
    <article>
      <h1>{result.data.heading}</h1>
      <div dangerouslySetInnerHTML={{ __html: result.data.body?.html ?? '' }} />
    </article>
  );
}
```

### Validating User-Submitted Content

When content editors submit data through a custom form (not the CMS editor):

```typescript
import { toSchema } from '@optimizely/cms-sdk/schema';
import { ReviewContentType } from '@/components/Review';

const reviewSchema = toSchema(ReviewContentType, { strict: true });

export async function submitReview(formData: FormData) {
  const reviewData = {
    title: formData.get('title'),
    rating: Number(formData.get('rating')),
    body: formData.get('body'),
  };

  const result = reviewSchema.safeParse(reviewData);

  if (!result.success) {
    return { success: false, errors: result.errors };
  }

  // Safe to save — data matches the content type schema
  await saveReview(result.data);
  return { success: true };
}
```

## Common Pitfalls

### Using Schema Validation with GraphClient

Do not add schema validation when using the SDK's `GraphClient` or `getClient()`. These clients already return properly typed data based on registered content types. Adding validation is redundant and adds unnecessary overhead.

```typescript
// Unnecessary — GraphClient already handles typing
const client = getClient();
const results = await client.getContentByPath('/about');
const schema = toSchema(AboutPageContentType);
schema.parse(results[0]); // Redundant!
```

### Forgetting Strict Mode for External Data

When validating data from external sources (webhooks, third-party APIs), consider using strict mode to catch unexpected properties that might indicate a schema mismatch or data corruption:

```typescript
// For webhook data, strict mode catches schema drift
const schema = toSchema(ArticleContentType, { strict: true });
```

## Summary

1. Use `toSchema(contentType, options?)` to generate a validation schema from a content type definition
2. Use `safeParse(data)` for non-throwing validation that returns a result object
3. Use `parse(data)` for throwing validation that raises `SchemaValidationError`
4. Use `{ strict: true }` to reject unknown properties
5. Default passthrough mode accepts extra fields (useful for GraphQL responses with additional metadata)
6. Schema validation is for custom clients, webhooks, and external data only — not needed with the SDK's GraphClient

## References

- For content type definitions used to generate schemas, see the `optimizely-model` skill
- For the built-in GraphClient that provides type-safe fetching, see the `optimizely-content-fetching` skill
