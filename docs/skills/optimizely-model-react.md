# Optimizely React Component Generator

Generate React components for Optimizely CMS content types and display templates, following SDK patterns with preview attributes, rich text rendering, image handling, and proper component registration.

## When to Use

Use this skill when you want to:
- Create a React component for an existing Optimizely content type
- Implement rendering logic for a page, component, or experience type
- Add a React component for a display template variant
- Generate component boilerplate that follows Optimizely SDK patterns
- Register a new component in the app layout so the CMS can render it

## Trigger Phrases

Say any of these to activate the skill:
- "Create a React component for BlogPage"
- "Generate the component"
- "Build the display template component"
- "Add preview attributes"
- "Implement the Hero component"
- "Create component for Article"

Any mention of creating React components for Optimizely content types or display templates will also trigger this skill.

## Usage Example

```
You: "Create a React component for the Article content type"

Agent: [Uses optimizely-model-react skill]
- Locates the ArticleContentType definition and reads its properties
- Checks for existing CSS/SCSS styles to stay consistent
- Generates a React component with:
  - ContentProps typing from the content type
  - Preview attributes (pa) for in-context editing
  - RichText rendering for rich text properties
  - Image handling with damAssets for image properties
  - Semantic HTML based on the base type
- Reads tsconfig.json to determine the correct import path alias
- Registers the component in initContentTypeRegistry and initReactComponentRegistry
- Runs npx tsc --noEmit to verify imports resolve correctly
```

## What It Generates

- A typed React component (`.tsx`) with `ContentProps` from the content type definition
- Preview attributes (`pa`) on editable properties for in-context CMS editing
- `RichText` component usage for rich text fields
- `damAssets` and `src` helpers for image/media properties
- `OptimizelyComponent` calls for rendering arrays of child content
- `OptimizelyComposition` for experience types with visual builder nodes
- Display template variants with `displaySettings` prop when applicable
- Updated registration calls in the app layout file

## Key Concepts

### Preview Attributes

Every editable property gets a spread of preview attributes so editors can click to edit inline:

```tsx
<h1 {...pa('heading')}>{content.heading}</h1>
```

### Property Type Handling

The skill automatically chooses the right rendering approach based on property type:

| Property Type | Rendering Approach |
|---------------|-------------------|
| `string` | Direct text output |
| `richText` | `RichText` component with JSON data |
| `contentReference` (image) | `damAssets` + `src` helpers |
| `url` | Access `.default` for href value |
| `link` | `LinkItem` object with `?? undefined` conversion |
| `content` (array) | `OptimizelyComponent` for each item |
| `component` (embedded) | Direct nested property access |

### Display Templates

When a content type has multiple visual treatments, the skill generates separate components and registers them under the display template's `tag` value:

```tsx
initReactComponentRegistry({
  resolver: {
    Tile: {
      default: Tile,
      tags: { Square: SquareTile },
    },
  },
});
```

## Prerequisites

- An existing content type definition (created via `optimizely-model`)
- The `@optimizely/cms-sdk` package installed
- The `optimizely.config.mjs` configuration file

## Related Skills

- [`optimizely-richtext-rendering`](optimizely-richtext-rendering.md) -- customizing how rich text elements and inline formatting render
- [`optimizely-dam-assets`](optimizely-dam-assets.md) -- rendering responsive images and handling DAM media assets
- [`optimizely-experience-composition`](optimizely-experience-composition.md) -- building visual page builder experiences with sections and elements
