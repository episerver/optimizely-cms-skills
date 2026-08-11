# Optimizely Experience Composition

Create and render Experiences for the Optimizely visual page builder, including defining experience types, sections with grid layouts, and drag-and-drop elements that editors assemble into pages.

## When to Use

Use this skill when you want to:
- Create an experience content type for the visual page builder
- Render a composition using `OptimizelyComposition`
- Understand the difference between sections and elements in the visual builder
- Customize row and column layout within grid sections
- Mix static properties (like a page title) with dynamic drag-and-drop composition content
- Use `BlankExperienceContentType` or `BlankSectionContentType` as starting points

## Trigger Phrases

Say any of these to activate the skill:
- "Create an experience"
- "Build a visual page builder page"
- "Render a composition"
- "Use OptimizelyComposition"
- "Add sections and elements"
- "Create a drag-and-drop page"
- "Set up a blank experience"
- "Customize section grid layout"
- "Use sectionEnabled or elementEnabled"

Any mention of experiences, compositions, sections, or elements in the context of Optimizely CMS will also trigger this skill.

## Usage Example

```
You: "Create a landing page experience with a hero section and a text block element"

Agent: [Uses optimizely-experience-composition skill]
- Creates a LandingPageExperience content type with baseType: '_experience'
  and static properties like title and subtitle
- Creates a HeroSection content type with baseType: '_section' and
  properties like backgroundColor and fullWidth
- Creates a TextBlock element content type with compositionBehaviors:
  ['elementEnabled'] and properties like heading and body (rich text)
- Generates React components for each:
  - LandingPageExperience uses OptimizelyComposition to render composition nodes
  - HeroSection uses OptimizelyGridSection to render its grid layout
  - TextBlock renders its content directly with preview attributes
- Registers all content types and React components in the app layout
- Reminds you to sync with the CMS via npx @optimizely/cms-cli config push
```

## What It Generates

- **Experience content types** with `baseType: '_experience'` that serve as routable pages with a composition structure
- **Section content types** with `baseType: '_section'` or `compositionBehaviors: ['sectionEnabled']` that provide grid-based layouts
- **Element content types** with `compositionBehaviors: ['elementEnabled']` that serve as the smallest drag-and-drop building blocks
- **Experience React components** using `OptimizelyComposition` to render the visual builder's node tree
- **Section React components** using `OptimizelyGridSection` with optional custom `row` and `column` renderers
- **Element React components** with standard preview attributes and property rendering
- **Component registration** in both `initContentTypeRegistry` and `initReactComponentRegistry`

## Key Concepts

### The Three Building Blocks

| Concept | Base Type | Purpose | Editor Experience |
|---------|-----------|---------|-------------------|
| Experience | `_experience` | Routable page entry point | The page itself |
| Section | `_section` | Vertical layout chunk with a grid | Drag sections onto the page |
| Element | `_component` + `elementEnabled` | Individual content piece | Drag elements into sections |

### How They Fit Together

1. An **Experience** is the page. It has static properties (title, hero image) plus a `composition` that holds the dynamic layout.
2. Editors drag **Sections** onto the experience. Each section has a grid with rows and columns.
3. Editors drag **Elements** into section columns. Elements are the actual content -- text blocks, images, CTAs.

### Static + Dynamic Content

A common pattern combines fixed properties with flexible composition:

```tsx
export default function LandingPage({ content }: Props) {
  const { pa } = getPreviewUtils(content);
  return (
    <main>
      <h1 {...pa('title')}>{content.title}</h1>
      <OptimizelyComposition nodes={content.composition.nodes ?? []} />
    </main>
  );
}
```

The title always appears. Everything below it is editor-controlled via drag and drop.

### Dual-Behavior Components

A single component can be both a section and an element by specifying both behaviors:

```tsx
compositionBehaviors: ['sectionEnabled', 'elementEnabled']
```

This lets editors use the component at either level of the composition hierarchy.

## Prerequisites

- The `@optimizely/cms-sdk` package installed
- The `optimizely.config.mjs` file configured (use `optimizely-setup` if missing)
- Understanding of content type modeling (use `optimizely-model` for basics)

## Related Skills

- [`optimizely-model-react`](optimizely-model-react.md) -- React component generation and registration patterns used by experiences, sections, and elements
- [`optimizely-richtext-rendering`](optimizely-richtext-rendering.md) -- rendering rich text properties inside elements and sections
- [`optimizely-dam-assets`](optimizely-dam-assets.md) -- handling images and media within experience components
