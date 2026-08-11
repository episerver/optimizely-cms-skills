---
name: optimizely-display-templates
description: This skill should be used when the user asks to "create a display template", "add a visual variant", "register a display template", "add display settings", "create a card view template", "add a list view variant", "customize row or column layout", "add a color picker setting", "register a component variant", or mentions display templates, display settings, component tags, or visual variations for Optimizely CMS.
---

# Optimizely Display Templates

This skill teaches how to create display templates with settings and register component variants for Optimizely CMS projects.

## When to Use This Skill

Use this skill when the user wants to:
- Create a new display template for visual variations of a content type
- Add display settings (dropdowns, checkboxes) that editors can configure
- Register display template variant components in the React component registry
- Customize row or column layout with structural display templates
- Apply a display template broadly to all components, experiences, or sections

## Before You Start: Locate the Components Directory

The first step is to find where display template files should be created. Do this by reading `optimizely.config.mjs`:

1. Search for `optimizely.config.mjs` in the project root
2. Look for the `components` field in the config - this tells you where to create files
3. If the config file doesn't exist, stop and tell the user:
   > "I need an `optimizely.config.mjs` file to determine where to create display templates. You can either:
   > - Use the `optimizely-setup` skill to set up the full Optimizely SDK configuration
   > - Create the config file manually with a `components` field pointing to your components directory"

**Example config structure:**
```javascript
import { buildConfig } from '@optimizely/cms-sdk';

export default buildConfig({
  components: ['./src/components/**.tsx'],
});
```

## Step 1: Create the Display Template Definition

Display templates are created using the `displayTemplate()` function from `@optimizely/cms-sdk`.

### Basic Structure

```typescript
import { displayTemplate } from '@optimizely/cms-sdk';

export const CardDisplayTemplate = displayTemplate({
  key: 'CardDisplayTemplate',
  displayName: 'Card Display',
  isDefault: false,
  contentType: 'Article',
  settings: {
    showImage: {
      editor: 'checkbox',
      displayName: 'Show Image',
      sortOrder: 1,
      choices: {
        true: { displayName: 'Yes', sortOrder: 1 },
        false: { displayName: 'No', sortOrder: 2 },
      },
    },
  },
  tag: 'ArticleCard',
});
```

### Required Properties

Every display template MUST include:

| Property | Description | Example |
|----------|-------------|---------|
| `key` | Unique identifier for the template | `'CardDisplayTemplate'` |
| `displayName` | Label shown in the CMS UI | `'Card Display'` |
| `isDefault` | Whether this is the default template | `true` or `false` |
| `settings` | Object defining editor-configurable settings | `{ color: { editor: 'select', ... } }` |

### Optional Properties

| Property | Description | Example |
|----------|-------------|---------|
| `tag` | Links to a specific React component variant | `'ArticleCard'` |
| `sortOrder` | Controls display order in the CMS template picker | `10` |

### Target Type (Choose One)

A display template must specify exactly one target type to determine what it applies to:

| Property | Description | Example |
|----------|-------------|---------|
| `contentType` | Apply to a specific content type | `contentType: 'Article'` |
| `baseType` | Apply to all types of a given base | `baseType: '_component'` or `'_experience'` or `'_section'` |
| `nodeType` | Apply to structural layout nodes | `nodeType: 'row'` or `'column'` |

**Examples:**

```typescript
// Apply to a specific content type
export const ArticleCardTemplate = displayTemplate({
  key: 'ArticleCardTemplate',
  displayName: 'Card View',
  isDefault: false,
  contentType: 'Article',
  tag: 'ArticleCard',
  settings: { /* ... */ },
});

// Apply to ALL component types
export const CompactComponentTemplate = displayTemplate({
  key: 'CompactComponentTemplate',
  displayName: 'Compact Display',
  isDefault: false,
  baseType: '_component',
  settings: { /* ... */ },
});

// Apply to row structural nodes
export const PaddedRowTemplate = displayTemplate({
  key: 'PaddedRowTemplate',
  displayName: 'Padded Row',
  isDefault: false,
  nodeType: 'row',
  settings: { /* ... */ },
});
```

## Step 2: Configure Settings

Settings allow editors to customize the display from within the CMS. There are two editor types.

### Select Editor (Dropdown)

Use `editor: 'select'` for a single-selection dropdown. The values returned to your component are the choice keys (e.g., `'red'`, `'blue'`).

```typescript
settings: {
  color: {
    editor: 'select',
    displayName: 'Background Color',
    sortOrder: 1,
    choices: {
      red: { displayName: 'Red', sortOrder: 1 },
      blue: { displayName: 'Blue', sortOrder: 2 },
      green: { displayName: 'Green', sortOrder: 3 },
    },
  },
},
```

### Checkbox Editor (Boolean Toggle)

Use `editor: 'checkbox'` for a boolean toggle. Returns `true` or `false`.

```typescript
settings: {
  showImage: {
    editor: 'checkbox',
    displayName: 'Show Featured Image',
    sortOrder: 1,
    choices: {
      true: { displayName: 'Yes', sortOrder: 1 },
      false: { displayName: 'No', sortOrder: 2 },
    },
  },
},
```

### Settings Structure

Each setting follows this structure:

```typescript
{
  editor: 'select' | 'checkbox',
  displayName: string,
  sortOrder: number,
  choices: {
    [key: string]: {
      displayName: string,
      sortOrder: number,
    },
  },
}
```

### Multiple Settings

You can combine multiple settings in a single display template:

```typescript
settings: {
  color: {
    editor: 'select',
    displayName: 'Color Theme',
    sortOrder: 1,
    choices: {
      light: { displayName: 'Light', sortOrder: 1 },
      dark: { displayName: 'Dark', sortOrder: 2 },
    },
  },
  showImage: {
    editor: 'checkbox',
    displayName: 'Show Image',
    sortOrder: 2,
    choices: {
      true: { displayName: 'Yes', sortOrder: 1 },
      false: { displayName: 'No', sortOrder: 2 },
    },
  },
  layout: {
    editor: 'select',
    displayName: 'Layout Style',
    sortOrder: 3,
    choices: {
      horizontal: { displayName: 'Horizontal', sortOrder: 1 },
      vertical: { displayName: 'Vertical', sortOrder: 2 },
      stacked: { displayName: 'Stacked', sortOrder: 3 },
    },
  },
},
```

## Step 3: Use Settings in React Components

### Typing Display Settings

Use `ContentProps` with the display template type to get typed settings:

```typescript
import { ContentProps } from '@optimizely/cms-sdk';
import { getPreviewUtils } from '@optimizely/cms-sdk/react/server';

type Props = {
  content: ContentProps<typeof ArticleContentType>;
  displaySettings?: ContentProps<typeof CardDisplayTemplate>;
};

export function ArticleCard({ content, displaySettings }: Props) {
  const { pa } = getPreviewUtils(content);

  return (
    <div style={{ backgroundColor: displaySettings?.color }}>
      {displaySettings?.showImage && content.image && (
        <img src={content.image} alt="" />
      )}
      <h2 {...pa('title')}>{content.title}</h2>
    </div>
  );
}
```

### Accessing Settings Values

Access settings with optional chaining since `displaySettings` may be undefined:

```typescript
// Select editor returns the choice key as a string
const color = displaySettings?.color;       // 'red' | 'blue' | 'green' | undefined
const layout = displaySettings?.layout;     // 'horizontal' | 'vertical' | undefined

// Checkbox editor returns boolean-like value
const show = displaySettings?.showImage;    // true | false | undefined
```

## Step 4: Register Display Templates

### Register the Template Definition

Add the display template to `initDisplayTemplateRegistry`, typically in `app/layout.tsx`:

```typescript
import { initDisplayTemplateRegistry } from '@optimizely/cms-sdk';
import { CardDisplayTemplate } from '@/components/ArticleCard';
import { ListDisplayTemplate } from '@/components/ArticleList';

initDisplayTemplateRegistry([
  CardDisplayTemplate,
  ListDisplayTemplate,
]);
```

### Register the Variant Component

**CRITICAL**: The `tag` field in the display template MUST match the key in the `tags` object when registering the React component.

There are two patterns for registering component variants:

**Pattern 1: Tags object (recommended)**

```typescript
import { initReactComponentRegistry } from '@optimizely/cms-sdk/react/server';
import Article from '@/components/Article';
import { ArticleCard } from '@/components/ArticleCard';
import { ArticleList } from '@/components/ArticleList';

initReactComponentRegistry({
  resolver: {
    Article: {
      default: Article,
      tags: {
        ArticleCard: ArticleCard,   // MUST match tag: 'ArticleCard' in display template
        ArticleList: ArticleList,   // MUST match tag: 'ArticleList' in display template
      },
    },
  },
});
```

**Pattern 2: Colon notation**

```typescript
initReactComponentRegistry({
  resolver: {
    Article: Article,                    // Default component
    'Article:ArticleCard': ArticleCard,  // tag variant
    'Article:ArticleList': ArticleList,  // tag variant
  },
});
```

**CRITICAL**: If the display template has `tag: 'ArticleCard'`, then:
- Tags object: `tags: { ArticleCard: ArticleCard }` -- the key `ArticleCard` MUST match
- Colon notation: `'Article:ArticleCard': ArticleCard` -- the part after `:` MUST match

Do NOT use the component function name, display template key, or any other value. Always use the exact `tag` value from the display template definition.

## Step 5: Default vs Variant Components

### File Organization

Export the default component as the default export and variant components as named exports:

```typescript
// Article.tsx
import { contentType, displayTemplate, ContentProps } from '@optimizely/cms-sdk';
import { getPreviewUtils } from '@optimizely/cms-sdk/react/server';

// Content type definition
export const ArticleContentType = contentType({
  key: 'Article',
  displayName: 'Article',
  baseType: '_page',
  properties: {
    title: { type: 'string', displayName: 'Title' },
    excerpt: { type: 'string', displayName: 'Excerpt' },
    body: { type: 'richText', displayName: 'Body' },
  },
});

// Display template for card variant
export const CardDisplayTemplate = displayTemplate({
  key: 'CardDisplayTemplate',
  displayName: 'Card View',
  isDefault: false,
  contentType: 'Article',
  tag: 'ArticleCard',
  settings: {
    showExcerpt: {
      editor: 'checkbox',
      displayName: 'Show Excerpt',
      sortOrder: 1,
      choices: {
        true: { displayName: 'Yes', sortOrder: 1 },
        false: { displayName: 'No', sortOrder: 2 },
      },
    },
  },
});

// Default component
type ArticleProps = {
  content: ContentProps<typeof ArticleContentType>;
};

export default function Article({ content }: ArticleProps) {
  const { pa } = getPreviewUtils(content);

  return (
    <main>
      <h1 {...pa('title')}>{content.title}</h1>
      <div {...pa('body')}>{/* render body */}</div>
    </main>
  );
}

// Variant component for card display
type CardProps = {
  content: ContentProps<typeof ArticleContentType>;
  displaySettings?: ContentProps<typeof CardDisplayTemplate>;
};

export function ArticleCard({ content, displaySettings }: CardProps) {
  const { pa } = getPreviewUtils(content);

  return (
    <article>
      <h2 {...pa('title')}>{content.title}</h2>
      {displaySettings?.showExcerpt && (
        <p {...pa('excerpt')}>{content.excerpt}</p>
      )}
    </article>
  );
}
```

## Row and Column Display Templates

Structural display templates customize the layout of rows and columns within visual builder experiences.

### Row Display Template

```typescript
export const PaddedRowTemplate = displayTemplate({
  key: 'PaddedRowTemplate',
  displayName: 'Padded Row',
  isDefault: false,
  nodeType: 'row',
  settings: {
    padding: {
      editor: 'select',
      displayName: 'Padding',
      sortOrder: 1,
      choices: {
        none: { displayName: 'None', sortOrder: 1 },
        small: { displayName: 'Small', sortOrder: 2 },
        medium: { displayName: 'Medium', sortOrder: 3 },
        large: { displayName: 'Large', sortOrder: 4 },
      },
    },
  },
});
```

### Column Display Template

```typescript
export const HighlightColumnTemplate = displayTemplate({
  key: 'HighlightColumnTemplate',
  displayName: 'Highlight Column',
  isDefault: false,
  nodeType: 'column',
  settings: {
    background: {
      editor: 'select',
      displayName: 'Background',
      sortOrder: 1,
      choices: {
        transparent: { displayName: 'Transparent', sortOrder: 1 },
        light: { displayName: 'Light Gray', sortOrder: 2 },
        accent: { displayName: 'Accent Color', sortOrder: 3 },
      },
    },
  },
});
```

## Complete Example: Full Workflow

Here is a complete example of creating display templates with registration:

```typescript
// src/components/Tile.tsx
import { contentType, displayTemplate, ContentProps } from '@optimizely/cms-sdk';
import { getPreviewUtils } from '@optimizely/cms-sdk/react/server';

export const TileContentType = contentType({
  key: 'Tile',
  displayName: 'Tile',
  baseType: '_component',
  properties: {
    title: { type: 'string', displayName: 'Title' },
    description: { type: 'string', displayName: 'Description' },
    image: { type: 'contentReference', allowedTypes: ['_image'], displayName: 'Image' },
  },
});

export const SquareDisplayTemplate = displayTemplate({
  key: 'SquareDisplayTemplate',
  displayName: 'Square Tile',
  isDefault: false,
  contentType: 'Tile',
  tag: 'Square',
  settings: {
    color: {
      editor: 'select',
      displayName: 'Background Color',
      sortOrder: 1,
      choices: {
        white: { displayName: 'White', sortOrder: 1 },
        gray: { displayName: 'Gray', sortOrder: 2 },
        blue: { displayName: 'Blue', sortOrder: 3 },
      },
    },
  },
});

// Default component
type TileProps = {
  content: ContentProps<typeof TileContentType>;
};

export default function Tile({ content }: TileProps) {
  const { pa } = getPreviewUtils(content);
  return (
    <div>
      <h3 {...pa('title')}>{content.title}</h3>
      <p {...pa('description')}>{content.description}</p>
    </div>
  );
}

// Variant component
type SquareProps = {
  content: ContentProps<typeof TileContentType>;
  displaySettings?: ContentProps<typeof SquareDisplayTemplate>;
};

export function SquareTile({ content, displaySettings }: SquareProps) {
  const { pa } = getPreviewUtils(content);
  return (
    <div style={{ backgroundColor: displaySettings?.color, aspectRatio: '1 / 1' }}>
      <h3 {...pa('title')}>{content.title}</h3>
    </div>
  );
}
```

```typescript
// app/layout.tsx (registration)
import { initContentTypeRegistry, initDisplayTemplateRegistry } from '@optimizely/cms-sdk';
import { initReactComponentRegistry } from '@optimizely/cms-sdk/react/server';
import Tile, { TileContentType, SquareTile, SquareDisplayTemplate } from '@/components/Tile';

initContentTypeRegistry([TileContentType]);

initDisplayTemplateRegistry([SquareDisplayTemplate]);

initReactComponentRegistry({
  resolver: {
    Tile: {
      default: Tile,
      tags: {
        Square: SquareTile,  // Key 'Square' matches tag: 'Square' in SquareDisplayTemplate
      },
    },
  },
});
```

## After Creating Files

After successfully creating display template files, **always** do the following:

### 1. Remind About Syncing to CMS

Immediately remind the user that they need to sync to CMS. Provide the exact command they should run:

> **Next Step**: Sync your changes to the CMS by running:
> ```bash
> npx @optimizely/cms-cli@latest config push optimizely.config.mjs
> ```

### 2. Offer to Run the Command

Ask the user if they want you to run the sync command now:

> Would you like me to run the sync command for you now?

### 3. Suggest Creating the React Component Variant

If the display template includes a `tag`, suggest creating the corresponding React component:

> For the React rendering component for this display template variant, use the `optimizely-model-react` skill to generate the component.

## Common Pitfalls to Avoid

1. **Mismatched tag values**: The `tag` in the display template definition MUST exactly match the key used in the `tags` object of `initReactComponentRegistry`. A mismatch causes the variant component to never render.

2. **Forgetting to register both**: Display templates require registration in BOTH `initDisplayTemplateRegistry` (for the template definition) AND `initReactComponentRegistry` (for the variant component).

3. **Using wrong target type**: Each display template must have exactly ONE of `contentType`, `baseType`, or `nodeType`. Do not combine them.

4. **Missing settings structure**: Every setting must include `editor`, `displayName`, `sortOrder`, and `choices` with proper `displayName` and `sortOrder` for each choice.

5. **Not using optional chaining**: Always access `displaySettings?.settingName` since `displaySettings` may be undefined when no template is selected.

## File Naming Conventions

Use PascalCase for file names matching the key:
- Display template key `CardDisplayTemplate` -> file `CardDisplayTemplate.tsx` (or co-located in the content type file)
- Variant components can live in the same file as the content type or in separate files

Export with appropriate suffixes:
- `export const CardDisplayTemplate = displayTemplate({ ... })`
- `export function ArticleCard({ content, displaySettings }: Props) { ... }`

## Summary Workflow

1. Check `optimizely.config.mjs` for components directory
2. Create the display template file with `displayTemplate()` definition
3. Choose the correct target type (`contentType`, `baseType`, or `nodeType`)
4. Configure settings with `select` or `checkbox` editors
5. Optionally set a `tag` to link to a React component variant
6. Register the template in `initDisplayTemplateRegistry`
7. Register the variant component in `initReactComponentRegistry` with matching tag key
8. **Always remind** user to run `config push` and **offer to run it** for them
9. Suggest `optimizely-model-react` for creating the variant React component
