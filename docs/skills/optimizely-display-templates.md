# Optimizely Display Templates

Create display templates that give content editors visual variation options and configurable settings for content types, components, and layout nodes in Optimizely CMS.

## When to Use

Use this skill when you want to:

- Create a visual variant of a content type (e.g., a "Card" view for an Article)
- Add editor-configurable settings like color pickers, toggles, or layout options
- Define display templates for structural layout nodes (rows and columns)
- Apply a display template broadly to all components or experiences
- Register variant React components in the component registry

## Trigger Phrases

Say any of these to activate the skill:

- "Create a display template"
- "Add a visual variant"
- "Register a display template"
- "Add display settings"
- "Create a card view template"
- "Add a list view variant"
- "Customize row or column layout"
- "Add a color picker setting"
- "Register a component variant"

## Usage Example

```
You: "Create a Card display template for the Article content type
      with a background color dropdown (white, gray, blue) and a
      toggle to show or hide the featured image."

Agent: [Uses optimizely-display-templates skill]
- Reads optimizely.config.mjs to find the components directory
- Creates CardDisplayTemplate using displayTemplate() with
  contentType: 'Article' and tag: 'ArticleCard'
- Adds a 'color' setting with editor: 'select' and three choices
- Adds a 'showImage' setting with editor: 'checkbox'
- Registers the template in initDisplayTemplateRegistry
- Registers the variant component in initReactComponentRegistry
  with the tag 'ArticleCard' as the key
- Reminds you to run config push to sync with CMS
```

```
You: "Add a padded row template with small, medium, and large
      padding options for the visual builder."

Agent: [Uses optimizely-display-templates skill]
- Creates PaddedRowTemplate using displayTemplate() with
  nodeType: 'row'
- Adds a 'padding' setting with editor: 'select' and three choices
- Registers the template and offers to sync
```

## What It Generates

- **Display template definitions** (`*.tsx`) using the `displayTemplate()` function with settings, target type, and optional tag
- **Variant React components** that receive `displaySettings` as typed props and render the visual variation
- **Registry updates** to both `initDisplayTemplateRegistry` (template definition) and `initReactComponentRegistry` (variant component)

## Target Types

Every display template must specify exactly one target type:

| Property | Applies To | Example |
|----------|-----------|---------|
| `contentType` | A specific content type | `contentType: 'Article'` |
| `baseType` | All types of a given base | `baseType: '_component'` |
| `nodeType` | Structural layout nodes | `nodeType: 'row'` or `'column'` |

## Settings Editors

Display template settings give editors control over visual variations. There are two editor types:

**Select** -- a dropdown for choosing one option:

```typescript
color: {
  editor: 'select',
  displayName: 'Background Color',
  sortOrder: 1,
  choices: {
    white: { displayName: 'White', sortOrder: 1 },
    gray: { displayName: 'Gray', sortOrder: 2 },
  },
}
```

**Checkbox** -- a boolean toggle:

```typescript
showImage: {
  editor: 'checkbox',
  displayName: 'Show Image',
  sortOrder: 2,
  choices: {
    true: { displayName: 'Yes', sortOrder: 1 },
    false: { displayName: 'No', sortOrder: 2 },
  },
}
```

## How Tags Connect Templates to Components

The `tag` field in a display template links it to a specific React component variant. The tag value must exactly match the key used when registering the component:

- Template defines `tag: 'ArticleCard'`
- Registry uses `tags: { ArticleCard: ArticleCardComponent }`

A mismatch causes the variant component to silently not render.

## Common Pitfalls

- **Mismatched tags**: The `tag` in the template must exactly match the key in the component registry -- this is the most common source of issues
- **Forgetting dual registration**: Templates need both `initDisplayTemplateRegistry` (definition) and `initReactComponentRegistry` (component)
- **Mixing target types**: Use only one of `contentType`, `baseType`, or `nodeType` per template
- **Missing optional chaining**: Always access settings as `displaySettings?.color` since the prop may be undefined

## After Generation

The skill always:

1. Reminds you to sync with CMS via `npx @optimizely/cms-cli@latest config push optimizely.config.mjs`
2. Offers to run the sync command for you
3. Suggests using `optimizely-model-react` to create the variant React component if a tag is specified

## Related Skills

- [`optimizely-model`](optimizely-model.md) -- Define the content types that display templates apply to
- `optimizely-model-react` -- Generate React rendering components for content types and display template variants
- `optimizely-setup` -- Set up the Optimizely SDK configuration (including `optimizely.config.mjs`)
- `optimizely-experience-composition` -- Work with visual builder experiences where row/column display templates are used
