# Optimizely Content Modeling

Create content type definitions, display templates, and reusable contracts for Optimizely CMS projects using the `@optimizely/cms-sdk` TypeScript SDK.

## When to Use

Use this skill when you want to:

- Define a new content type (page, component, experience, folder, or media)
- Create a reusable contract (a shared set of properties like SEO fields)
- Model content based on existing CMS definitions pulled via `config pull`
- Convert JSON schema from CMS into TypeScript content type definitions
- Batch-create a set of related content types for a new site

## Trigger Phrases

Say any of these to activate the skill:

- "Create a content type"
- "Model a BlogPage"
- "Create a contract"
- "Set up SEO fields"
- "Convert JSON schema to TypeScript"
- "Make an Article type"
- "Add a Hero component"

## Usage Example

```
You: "Create an Article page type with a title, body, featured image,
      and a category dropdown with News, Blog, and Tutorial options."

Agent: [Uses optimizely-model skill]
- Reads optimizely.config.mjs to find the components directory
- Creates Article.tsx with a contentType() definition
- Sets baseType to '_page'
- Adds title (string), body (richText), featuredImage (contentReference
  with allowedTypes ['_image']), and category (string with selectOne
  format and enum values)
- Checks for initContentTypeRegistry and registers the new type
- Reminds you to run config push to sync with CMS
```

```
You: "Create an SEO contract with meta title, meta description,
      and an OG image, then use it in the Article type."

Agent: [Uses optimizely-model skill]
- Creates SEOContract.tsx using the contract() function
- Adds metaTitle (string, maxLength 60), metaDescription (string,
  maxLength 160), and ogImage (contentReference)
- Updates ArticleContentType to include extends: SEOContract
- Registers the contract in initContentTypeRegistry before content types
```

## What It Generates

- **Content type files** (`*.tsx`) using the `contentType()` function with typed properties, base types, and metadata
- **Contract files** (`*.tsx`) using the `contract()` function for reusable property sets (SEO, authoring, analytics)
- **Display template definitions** using the `displayTemplate()` function with editor settings
- **Registry updates** to `initContentTypeRegistry` and `initDisplayTemplateRegistry` in `layout.tsx`

## Key Concepts

**Base types** determine the fundamental behavior of a content type:

| Base Type | Use For |
|-----------|---------|
| `_page` | Routable pages with their own URL |
| `_component` | Reusable blocks embedded in pages or experiences |
| `_experience` | Visual Builder compositions |
| `_folder` | Container nodes for organizing content |
| `_image` | Image assets |
| `_video` | Video assets |
| `_media` | Other media files |

**Property types** cover common CMS field needs: `string`, `richText`, `boolean`, `integer`, `float`, `dateTime`, `url`, `contentReference`, `array`, and `component`.

**Contracts** let multiple content types share properties (like SEO fields) without duplication. A content type can extend one or many contracts via the `extends` field.

## Property Intent Recognition

The skill understands natural language descriptions of properties:

| You Say | What Gets Created |
|---------|-------------------|
| "dropdown with Red, Green, Blue" | `string` with `selectOne` format and enum |
| "multi-select checkboxes" | `array` with `selectMany` format |
| "rich text editor" | `richText` type |
| "image picker" | `contentReference` with `allowedTypes: ['_image']` |
| "required, localized title" | `string` with `isRequired: true`, `isLocalized: true` |

## After Generation

The skill always:

1. Reminds you to sync with CMS via `npx @optimizely/cms-cli@latest config push optimizely.config.mjs`
2. Offers to run the sync command for you
3. Suggests using `optimizely-model-react` to create the React rendering component

## Related Skills

- [`optimizely-display-templates`](optimizely-display-templates.md) -- Create visual variations and editor-configurable settings for content types
- `optimizely-model-react` -- Generate React rendering components for your content types
- `optimizely-setup` -- Set up the Optimizely SDK configuration (including `optimizely.config.mjs`)
- `optimizely-cli-workflows` -- Run CLI commands like `config push` and `config pull`
