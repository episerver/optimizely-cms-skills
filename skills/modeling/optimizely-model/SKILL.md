---
name: optimizely-model
description: This skill should be used when the user asks to "create a content type", "model a BlogPage", "define a display template", "create a contract", "set up SEO fields", "convert JSON schema to TypeScript", "make an Article type", "add a Hero component", "model a Card display template", or mentions content type modeling, display templates, or contracts for Optimizely CMS.
---

# Optimizely Content Modeling

This skill helps you create content type definitions, display templates, and contracts for Optimizely CMS projects.

## When to Use This Skill

Use this skill when the user wants to:
- Create a new content type (page, component/block, experience, folder, media)
- Create a new display template for visual variations
- Create a new contract (reusable property set that content types can extend)
- Model content based on existing CMS definitions (content types, display templates, or contracts retrieved via `config pull`)

## Before You Start: Locate the Components Directory

The first step is to find where content type files should be created. Do this by reading `optimizely.config.mjs`:

1. Search for `optimizely.config.mjs` in the project root
2. Look for the `components` field in the config - this tells you where to create files
3. If the config file doesn't exist, stop and tell the user:
   > "I need an `optimizely.config.mjs` file to determine where to create content types. You can either:
   > - Use the `optimizely-setup` skill to set up the full Optimizely SDK configuration
   > - Create the config file manually with a `components` field pointing to your components directory"

**Example config structure:**
```javascript
import { buildConfig } from '@optimizely/cms-sdk';

export default buildConfig({
  components: ['./src/components/**.tsx'],
});
```

## Creating Content Types

Content types are created using the `contentType()` function from `@optimizely/cms-sdk`.

### File Structure

Create a file named after the content type (e.g., `Article.tsx`, `BlogPage.tsx`) in the components directory:

```typescript
import { contentType } from '@optimizely/cms-sdk';

export const ArticleContentType = contentType({
  key: 'Article',
  displayName: 'Article',
  baseType: '_page',
  properties: {
    heading: {
      type: 'string',
      displayName: 'Article Heading',
      group: 'content',
      indexingType: 'searchable',
    },
    body: {
      type: 'richText',
      displayName: 'Article Body',
      group: 'content',
    },
  },
});
```

### Base Types

Choose the appropriate `baseType`: `'_page'`, `'_component'`, `'_experience'`, `'_folder'`, `'_image'`, `'_media'`, or `'_video'`. See `references/base-types.md` for detailed information.

### Property Types

The available types are `'string'`, `'richText'`, `'boolean'`, `'integer'`, `'float'`, `'dateTime'`, `'url'`, `'link'`, `'binary'`, `'json'`, `'content'`, `'contentReference'`, `'array'` and `'component'`.

Two are worth knowing up front because they carry extra requirements:

- `'integer'`, `'float'` and `'dateTime'` accept `minimum`/`maximum` bounds (ISO 8601 strings for dates).
- `'binary'` additionally requires `format: 'blob'`; without it the push fails with `The Type field does not support the value 'binary'`. It also only exists on CMS 13 — SaaS CMS rejects binary properties however they are written, so say so when you generate one.

`references/property-types.md` documents every type, its constraints and its formats with examples.

### Turning a Request into Properties

Almost every defect in a generated content type is one of two things, and neither is a wrong `type`: an attribute the user named never made it into the file, or it arrived under a name the schema doesn't know. Both are quiet. A missing `description` or `minimum` pushes cleanly and simply behaves wrong in the editor; a misspelled `required` fails the push with a message that doesn't say which property caused it.

So treat the request as a checklist. Walk it one attribute at a time, map each to a field using the tables below, and count before writing: if the user named nine things, nine fields should be present — and nothing else, since an invented `isRequired: true` stops editors saving content until they fill the field in.

**What the user describes → what to emit**

| User says | Emit |
|-----------|------|
| "dropdown", "select one", "pick one of" | `type: 'string'`, `format: 'selectOne'`, `enum: [{ value, displayName }, ...]` |
| "select list", "multi-select", "checkboxes" | `type: 'array'`, `format: 'selectMany'`, `items: { type: 'string', enum: [...] }` |
| "URL to document", "document link" | `type: 'url'`, `format: 'DocumentUrl'` |
| "URL to image", "image link" | `type: 'url'`, `format: 'ImageUrl'` |
| "short string", "single-line text", "name" | `type: 'string'`, `format: 'shortString'` |
| "long string", "multi-line text", "description" | `type: 'string'` — the one string case that takes no format |
| "GUID", "UUID", "unique identifier" | `type: 'string'`, `format: 'guid'` |
| "rich text", "formatted text", "WYSIWYG" | `type: 'richText'` |
| "binary", "blob", "raw file data" | `type: 'binary'`, `format: 'blob'` (CMS 13 only) |
| "image", "picture", "photo" | `type: 'contentReference'`, `allowedTypes: ['_image']` |
| "list of tags", "array of strings" | `type: 'array'`, `items: { type: 'string' }` |

The `format` is not decoration — it picks the editor widget. Leave it off a document URL or a GUID and the editor shows a plain text box, with nothing to signal the mistake.

**Metadata and constraints → exact field names**

The user's wording is never the field name, and near-misses are rejected rather than ignored:

| User says | Field | Never write |
|-----------|-------|-------------|
| "display name", "label" | `displayName` | `name`, `label` |
| "description", "help text", "tooltip" | `description` | `helpText`, `tooltip` |
| "localized", "culture specific", "per language" | `isLocalized: true` | `localized`, `cultureSpecific` |
| "sort order", "sort index", "order" | `sortOrder` | `sortIndex`, `displayOrder` |
| "group", "tab", "section" | `group` | `tab`, `section` |
| "searchable" / "queryable", "filterable" | `indexingType: 'searchable'` / `'queryable'` | `indexing`, `searchable` |
| "required", "mandatory" | `isRequired: true` | `required` |
| "min length", "max length" | `minLength`, `maxLength` | `minimumLength`, `maximumLength` |
| "minimum", "maximum", "between X and Y", "at least", "up to" | `minimum`, `maximum` | `min`, `max` |
| "start with X", "must begin with X" | `pattern: '^X'` | |
| "allowedType is X", "restrictedType is X" | `allowedTypes: [X]`, `restrictedTypes: [X]` | the singular forms |

`required: true` is the one that bites most often — the user says "required", so the word looks like the field, but the schema calls it `isRequired` and rejects the push.

The three that vanish most often are `description`, `isLocalized` and `sortOrder`, closely followed by the constraint fields — precisely because nothing breaks when they go missing.

```typescript
// "p_string is a long string with display name 'string display name', description
//  'A sample string field', localized, group 'content', sort index 5, indexing type
//  'searchable', start with 'string', min length 1, max length 100"

p_string: {
  type: 'string',                      // "long string" → no format
  displayName: 'string display name',
  description: 'A sample string field',
  isLocalized: true,                   // "localized (culture specific)"
  group: 'content',
  sortOrder: 5,                        // "sort index"
  indexingType: 'searchable',
  pattern: '^string',                  // "start with"
  minLength: 1,
  maxLength: 100,
}
// Nine attributes asked for, nine fields emitted, no isRequired invented along the way.
```

Constraints belong to particular types — one that doesn't fit is invalid:

| Constraint | Valid on |
|------------|----------|
| `minLength`, `maxLength`, `pattern` | `string` (or `items` of a string array) |
| `minimum`, `maximum` | `integer`, `float`, `dateTime` |
| `minItems`, `maxItems` | `array` |

If the user asks for one that does not fit — `minimum: 20` on a string — leave it out and ask whether `minLength` was meant, rather than guessing on their behalf.

`references/common-pitfalls.md` walks through each of these failures with a before/after, if you want to see how they look in practice.

### Important Patterns

**Content references** constrain what an editor can pick, three ways:

- `allowedTypes: [...]` whitelists, `restrictedTypes: [...]` blacklists, and the two can be combined.
- `contentType: X` pins the property to exactly one type. It cannot be used alongside either of the others — if the user asks for both, use `contentType` and tell them which constraint you dropped and why.

Base types are strings; custom types are object references that need importing. The underscore is the tell: `'_image'` is a base type, `ArticleContentType` is yours. Writing a custom type as a string (`['ArticleContentType']`) silently matches nothing.

```typescript
import { ArticleContentType } from './Article';
import { DraftContentType } from './Draft';
import { HeroContentType } from './Hero';

featuredImage:  { type: 'contentReference', allowedTypes: ['_image', '_video'] },
relatedArticle: { type: 'contentReference', allowedTypes: [ArticleContentType], restrictedTypes: [DraftContentType] },
heroSection:    { type: 'contentReference', contentType: HeroContentType },
```

**Arrays** use `items` to say what they hold. Bounds on the array itself (`minItems`, `maxItems`) sit at the property level; anything describing each element — "every item must start with test" — goes inside `items`. Arrays cannot contain arrays.

```typescript
validatedTags: {
  type: 'array',
  items: { type: 'string', minLength: 1, maxLength: 20, pattern: '^test' },
  minItems: 1,
  maxItems: 10,
}
```

The same nesting applies to arrays of numbers (`items.minimum`), of content (`items.allowedTypes`) and of components (`items.contentType`).

**Components** embed one specific component type, by object reference rather than by name:

```typescript
hero: { type: 'component', contentType: HeroComponentType, displayName: 'Hero Section' }
```

**Container types** use `mayContainTypes` on pages, experiences and folders:
```typescript
export const BlogPageContentType = contentType({
  key: 'BlogPage',
  baseType: '_page',
  mayContainTypes: [ArticleContentType, '_self'], // Can contain Articles and other BlogPages
  properties: { /* ... */ },
});
```

### Creating from Existing CMS Definitions

If the user wants to model based on existing content types, display templates, or contracts from CMS:

1. First, pull the definitions as JSON:
   ```bash
   npx @optimizely/cms-cli@latest config pull --json
   ```
2. Parse the JSON output to understand the structure
3. Convert it to the appropriate TypeScript format:
   - Content types → `contentType()` format
   - Display templates → `displayTemplate()` format
   - Contracts → `contract()` format

### Creating Multiple Content Types (Batch Creation)

When creating multiple content types at once (e.g., generating from CMS site data or creating a set of related types):

1. Create all content type files in the components directory
2. Register them in one pass afterwards rather than one at a time - see [Registering Content Types and Contracts](#registering-content-types-and-contracts) below, and remember contracts come first in the array
3. If you write a script to generate the types, have the script update the registry too - a generated type that is never registered is invisible to the CMS
4. Remind the user to sync with `config push` once everything is created and registered

### Component-Specific Configuration

For component types, you can specify composition behaviors:

```typescript
export const HeroComponentType = contentType({
  key: 'Hero',
  baseType: '_component',
  compositionBehaviors: ['sectionEnabled', 'elementEnabled'],
  properties: { /* ... */ },
});
```

## Creating Display Templates

Display templates provide visual variations for content types and sections. You can create them from scratch or pull existing ones from CMS using `config pull --json`.

### File Structure

Create display templates in the same components directory:

```typescript
import { displayTemplate } from '@optimizely/cms-sdk';

export const CardDisplayTemplate = displayTemplate({
  key: 'CardTemplate',
  displayName: 'Card Display',
  isDefault: false,
  contentType: 'Article', // Or use a content type object
  settings: {
    showImage: {
      displayName: 'Show Image',
      editor: 'checkbox',
      sortOrder: 1,
      choices: {
        true: { displayName: 'Yes', sortOrder: 1 },
        false: { displayName: 'No', sortOrder: 2 },
      },
    },
  },
  tag: 'ArticleCard', // Optional: React component name
});
```

### Display Template Variants

A display template must specify one of:
- `contentType: 'TypeKey'` - For a specific content type
- `baseType: '_page' | '_component' | ...` - For all types with that base
- `nodeType: 'row' | 'column'` - For section nodes

### Settings Configuration

Settings allow editors to customize the display:
- `editor: 'select' | 'checkbox'`
- `choices` - Object mapping choice keys to display names and sort order

## Creating Contracts

Contracts are reusable property definitions that multiple content types can extend. They help avoid duplicating common properties across content types. You can create them from scratch or pull existing ones from CMS using `config pull --json`.

### File Structure

Create a file for the contract (e.g., `SEOContract.tsx`) in the components directory:

```typescript
import { contract } from '@optimizely/cms-sdk';

export const SEOContract = contract({
  key: 'seo',
  displayName: 'SEO Properties',
  properties: {
    metaTitle: {
      type: 'string',
      displayName: 'Meta Title',
      maxLength: 60,
    },
    metaDescription: {
      type: 'string',
      displayName: 'Meta Description',
      maxLength: 160,
    },
    ogImage: {
      type: 'contentReference',
      allowedTypes: ['_image'],
      displayName: 'Open Graph Image',
    },
  },
});
```

### Using Contracts in Content Types

Content types can extend contracts to inherit their properties:

```typescript
import { contentType } from '@optimizely/cms-sdk';
import { SEOContract } from './SEOContract';

export const ArticleContentType = contentType({
  key: 'Article',
  displayName: 'Article',
  baseType: '_page',
  extends: SEOContract, // Inherits metaTitle, metaDescription, ogImage
  properties: {
    heading: { type: 'string' },
    body: { type: 'richText' },
  },
});
```

### Common Contract Use Cases

- **SEO properties**: Meta titles, descriptions, social media tags
- **Authoring metadata**: Created by, last modified, review date
- **Publishing workflow**: Draft status, approval flags, scheduled publish date
- **Analytics**: Tracking codes, campaign parameters
- **Accessibility**: Alt text requirements, ARIA labels

### Multiple Contracts

Content types can extend multiple contracts (pass an array):

```typescript
export const ArticleContentType = contentType({
  key: 'Article',
  baseType: '_page',
  extends: [SEOContract, AuthorContract, PublishingContract],
  properties: {
    // Article-specific properties
  },
});
```

## Registering Content Types and Contracts

After creating content type or contract files, check if `initContentTypeRegistry` is used in the project:

1. Search for files importing `initContentTypeRegistry` (typically in `layout.tsx` or `app/layout.tsx`)
2. If found, add the new content types and contracts to the array:

```typescript
import { ArticleContentType } from '@/components/Article';
import { BlogPageContentType } from '@/components/BlogPage'; // New type
import { SEOContract } from '@/components/SEOContract'; // New contract
import { initContentTypeRegistry } from '@optimizely/cms-sdk';

initContentTypeRegistry([
  SEOContract, // Add new contracts
  ArticleContentType,
  BlogPageContentType, // Add new types
]);
```

3. If not found, inform the user they may need to set up the registry in their application bootstrap code

## Registering Display Templates

After creating display template files, check if `initDisplayTemplateRegistry` is used in the project:

1. Search for files importing `initDisplayTemplateRegistry` (typically in `layout.tsx` or `app/layout.tsx`)
2. If found, add the new display templates to the array:

```typescript
import { CardDisplayTemplate } from '@/components/CardDisplayTemplate'; // New template
import { ListDisplayTemplate } from '@/components/ListDisplayTemplate'; // New template
import { initDisplayTemplateRegistry } from '@optimizely/cms-sdk';

initDisplayTemplateRegistry([
  CardDisplayTemplate,
  ListDisplayTemplate, // Add new templates
]);
```

3. If not found, inform the user they may need to set up the registry in their application bootstrap code

### React Components for Display Templates

Display templates define the structure and settings in CMS, but they need corresponding React components for rendering.

After creating display template definitions, **always** suggest to the user:

> **Next Step**: Create the React rendering component for this display template using the `optimizely-model-react` skill.

The React component should:
- Match the display template's `tag` field (if specified) or use the display template key
- Implement the visual variation defined by the template
- Use the template's settings to customize rendering

## After Creating Files

After successfully creating content type, display template, or contract files, **always** do the following:

### 1. Remind About Syncing to CMS

Immediately remind the user that they need to sync to CMS. Provide the exact command they should run:

> **Next Step**: Sync your changes to the CMS by running:
> ```bash
> npx @optimizely/cms-cli@latest config push optimizely.config.mjs
> ```

### 2. Offer to Run the Command

Ask the user if they want you to run the sync command now:

> Would you like me to run the sync command for you now?

If they say yes, run the command and report the results. If they say no or later, acknowledge and move on.

### 3. Suggest React Components (if applicable)

If the user created content types and the project uses React, suggest:

> For React rendering components, use the `optimizely-model-react` skill to generate the component.

## File Naming Conventions

Use PascalCase for file names matching the key:
- Content type key `Article` → file `Article.tsx`
- Content type key `BlogPage` → file `BlogPage.tsx`
- Display template key `CardTemplate` → file `CardTemplate.tsx`
- Contract key `seo` → file `SEOContract.tsx`

Export with appropriate suffixes:
- `export const ArticleContentType = contentType({ ... })`
- `export const CardDisplayTemplate = displayTemplate({ ... })`
- `export const SEOContract = contract({ ... })`

## Common Pitfalls to Avoid

Avoid nested arrays, invalid base types, missing component type fields, forgetting to register types, adding baseType to contracts, and dropping the `format` field. See `references/common-pitfalls.md` for detailed explanations and solutions.

## Summary Workflow

1. Check `optimizely.config.mjs` for components directory
2. Create the content type, contract, or display template file in that directory
3. Use appropriate `contentType()`, `contract()`, or `displayTemplate()` structure
4. Re-read the request and verify each property carries **every** attribute asked for - its `format` (document/image URL, short string, GUID, dropdown, select list, binary) and its metadata (`description`, `isLocalized`, `sortOrder` are the ones most often dropped) - and nothing that was not asked for
5. Add to registry if it exists:
   - `initContentTypeRegistry` (contracts before content types)
   - `initDisplayTemplateRegistry` (for display templates)
6. **Always remind** user to run `config push` and **offer to run it** for them
7. Suggest `optimizely-model-react` for React components if applicable

## Additional Resources

### Reference Files

For detailed information, consult:

- **`references/property-types.md`** - Comprehensive property type reference with all types, constraints, and usage examples
- **`references/base-types.md`** - Detailed base type explanations and usage patterns for pages, components, experiences, and media
- **`references/common-pitfalls.md`** - Common pitfalls and solutions when modeling content types, display templates, and contracts
