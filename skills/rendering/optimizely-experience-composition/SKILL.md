---
name: optimizely-experience-composition
description: This skill should be used when the user asks to "create an experience", "build a visual page builder page", "render a composition", "use OptimizelyComposition", "add sections and elements", "create a drag-and-drop page", "set up a blank experience", "customize section grid layout", "use sectionEnabled or elementEnabled", or mentions experiences, compositions, sections, or elements in Optimizely CMS.
---

# Optimizely Experience Composition

This skill teaches how to create and render Experiences (visual page builder) in Optimizely CMS, including sections, elements, and grid layout customization.

## When to Use This Skill

Use this skill when the user wants to:
- Create an experience content type for the visual page builder
- Render a composition with `OptimizelyComposition`
- Understand sections vs elements in the visual builder
- Customize row and column layout in grid sections
- Mix static properties with dynamic composition content
- Use `BlankExperienceContentType` or `BlankSectionContentType`

## Prerequisites

Before creating experiences, you need:
1. The Optimizely SDK installed (`@optimizely/cms-sdk`)
2. The `optimizely.config.mjs` file configured (use the `optimizely-setup` skill if missing)
3. Understanding of content type modeling (use the `optimizely-model` skill for basics)

## Core Concepts

### Experiences

Experiences are routable entry points (like pages) that include a dynamic composition structure. Editors build layouts by dragging and dropping sections and elements in the visual editor.

- **Base type**: `_experience`
- **Composition data**: `content.composition.nodes` contains the visual layout structure
- **Built-in type**: `BlankExperienceContentType` provides a blank experience with no predefined properties, giving editors maximum flexibility

### Sections

Sections are vertical chunks of a page with a grid layout. They define the structural layout (rows and columns) that contain elements.

- **Base type**: `_section`
- **Composition behavior**: `compositionBehaviors: ['sectionEnabled']`
- **Built-in type**: `BlankSectionContentType` provides a generic section with no predefined properties

### Elements

Elements are the smallest building blocks placed inside sections. They represent individual pieces of content (text blocks, images, CTAs, etc.).

- **Composition behavior**: `compositionBehaviors: ['elementEnabled']`
- Components can have both behaviors: `compositionBehaviors: ['sectionEnabled', 'elementEnabled']`

## Step 1: Create an Experience Content Type

Define the experience using `baseType: '_experience'`:

```tsx
import { contentType } from '@optimizely/cms-sdk';

export const LandingPageExperienceContentType = contentType({
  key: 'LandingPageExperience',
  displayName: 'Landing Page Experience',
  baseType: '_experience',
  properties: {
    title: {
      type: 'string',
      displayName: 'Page Title',
    },
    subtitle: {
      type: 'string',
      displayName: 'Subtitle',
    },
  },
});
```

You can also use the built-in `BlankExperienceContentType` if you do not need any static properties:

```tsx
import { BlankExperienceContentType } from '@optimizely/cms-sdk';
```

## Step 2: Create the Experience React Component

Use `OptimizelyComposition` to render the visual builder's composition nodes. Preview attributes are automatically applied to child components within the composition.

```tsx
import { ContentProps } from '@optimizely/cms-sdk';
import {
  OptimizelyComposition,
  getPreviewUtils,
} from '@optimizely/cms-sdk/react/server';
import { LandingPageExperienceContentType } from './LandingPageExperience';

type Props = {
  content: ContentProps<typeof LandingPageExperienceContentType>;
};

export default function LandingPageExperience({ content }: Props) {
  const { pa } = getPreviewUtils(content);

  return (
    <main>
      {/* Static properties with preview attributes */}
      <header>
        <h1 {...pa('title')}>{content.title}</h1>
        <p {...pa('subtitle')}>{content.subtitle}</p>
      </header>

      {/* Dynamic composition - renders all sections and elements */}
      <OptimizelyComposition nodes={content.composition.nodes ?? []} />
    </main>
  );
}
```

### Best Practice: Mix Static and Dynamic Content

A common pattern is combining static properties (like a page title or hero heading that always appears) with `OptimizelyComposition` for the flexible, editor-controlled portion of the page. This gives editors both structure and freedom.

### Optional: ComponentWrapper

Only provide a `ComponentWrapper` when you need custom CSS or layout styling around each composition component. The `ComponentWrapper` receives `ComponentContainerProps` which provides `children` and `node`.

```tsx
import {
  OptimizelyComposition,
  ComponentContainerProps,
  getPreviewUtils,
} from '@optimizely/cms-sdk/react/server';

function ComponentWrapper({ children, node }: ComponentContainerProps) {
  const { pa } = getPreviewUtils(node);
  return (
    <div className="custom-component-wrapper" {...pa(node)}>
      {children}
    </div>
  );
}

export default function MyExperience({ content }: Props) {
  return (
    <main>
      <OptimizelyComposition
        nodes={content.composition.nodes ?? []}
        ComponentWrapper={ComponentWrapper}
      />
    </main>
  );
}
```

When to use `ComponentWrapper`:
- You need custom CSS classes or grid styles around each component
- You want to add spacing, borders, or background styling per component

When NOT to use `ComponentWrapper`:
- The default rendering is sufficient
- You only need to customize individual section or element components

## Step 3: Create Section Components

Sections use `baseType: '_section'` or `compositionBehaviors: ['sectionEnabled']` on a `_component` base type. Use `OptimizelyGridSection` to render the grid layout within a section.

### Using the Built-in BlankSectionContentType

```tsx
import { BlankSectionContentType } from '@optimizely/cms-sdk';
```

### Custom Section with Properties

```tsx
import { contentType } from '@optimizely/cms-sdk';

export const HeroSectionContentType = contentType({
  key: 'HeroSection',
  displayName: 'Hero Section',
  baseType: '_section',
  properties: {
    backgroundColor: {
      type: 'string',
      displayName: 'Background Color',
      format: 'selectOne',
      enum: [
        { value: 'white', displayName: 'White' },
        { value: 'light-gray', displayName: 'Light Gray' },
        { value: 'dark', displayName: 'Dark' },
      ],
    },
    fullWidth: {
      type: 'boolean',
      displayName: 'Full Width',
    },
  },
});
```

### Rendering a Section with OptimizelyGridSection

`OptimizelyGridSection` renders the grid layout inside a section. It accepts optional custom `row` and `column` components via `StructureContainerProps`, which provides `children` and `node`.

```tsx
import { ContentProps } from '@optimizely/cms-sdk';
import {
  OptimizelyGridSection,
  getPreviewUtils,
  StructureContainerProps,
} from '@optimizely/cms-sdk/react/server';
import { HeroSectionContentType } from './HeroSection';

type Props = {
  content: ContentProps<typeof HeroSectionContentType>;
};

export default function HeroSection({ content }: Props) {
  const { pa } = getPreviewUtils(content);

  return (
    <section
      style={{ backgroundColor: content.backgroundColor ?? 'white' }}
      className={content.fullWidth ? 'full-width' : 'contained'}
    >
      <OptimizelyGridSection content={content} />
    </section>
  );
}
```

### Custom Row and Column Components

To customize how rows and columns render within a grid section, pass `row` and `column` props to `OptimizelyGridSection`. Both receive `StructureContainerProps` with `children` and `node`.

```tsx
import {
  OptimizelyGridSection,
  StructureContainerProps,
} from '@optimizely/cms-sdk/react/server';

function CustomRow({ children, node }: StructureContainerProps) {
  return (
    <div className="custom-row" data-columns={node.nodes?.length ?? 0}>
      {children}
    </div>
  );
}

function CustomColumn({ children, node }: StructureContainerProps) {
  return (
    <div className="custom-column" style={{ padding: '1rem' }}>
      {children}
    </div>
  );
}

export default function StyledSection({ content }: Props) {
  return (
    <section>
      <OptimizelyGridSection
        content={content}
        row={CustomRow}
        column={CustomColumn}
      />
    </section>
  );
}
```

## Step 4: Create Element Components

Elements are the smallest building blocks. They use `compositionBehaviors: ['elementEnabled']` and are placed inside section grids by editors.

```tsx
import { contentType } from '@optimizely/cms-sdk';

export const TextBlockContentType = contentType({
  key: 'TextBlock',
  displayName: 'Text Block',
  baseType: '_component',
  compositionBehaviors: ['elementEnabled'],
  properties: {
    heading: {
      type: 'string',
      displayName: 'Heading',
    },
    body: {
      type: 'richText',
      displayName: 'Body Text',
    },
  },
});
```

```tsx
import { ContentProps } from '@optimizely/cms-sdk';
import { getPreviewUtils } from '@optimizely/cms-sdk/react/server';
import { RichText } from '@optimizely/cms-sdk/react/richText';
import { TextBlockContentType } from './TextBlock';

type Props = {
  content: ContentProps<typeof TextBlockContentType>;
};

export default function TextBlock({ content }: Props) {
  const { pa } = getPreviewUtils(content);

  return (
    <div>
      <h2 {...pa('heading')}>{content.heading}</h2>
      <RichText content={content.body?.json} />
    </div>
  );
}
```

### Components with Both Behaviors

A component can be used as both a section and an element:

```tsx
export const CallToActionContentType = contentType({
  key: 'CallToAction',
  displayName: 'Call to Action',
  baseType: '_component',
  compositionBehaviors: ['sectionEnabled', 'elementEnabled'],
  properties: {
    heading: { type: 'string', displayName: 'Heading' },
    buttonText: { type: 'string', displayName: 'Button Text' },
    buttonLink: { type: 'url', displayName: 'Button Link' },
  },
});
```

## Step 5: Register All Components

Both content type definitions and React components must be registered. Use `initContentTypeRegistry` for content types and `initReactComponentRegistry` for React components.

```tsx
import { initContentTypeRegistry } from '@optimizely/cms-sdk';
import { initReactComponentRegistry } from '@optimizely/cms-sdk/react/server';

// Import content types and components
import LandingPageExperience, {
  LandingPageExperienceContentType,
} from '@/src/components/LandingPageExperience';
import HeroSection, {
  HeroSectionContentType,
} from '@/src/components/HeroSection';
import TextBlock, {
  TextBlockContentType,
} from '@/src/components/TextBlock';

// Register content types
initContentTypeRegistry([
  LandingPageExperienceContentType,
  HeroSectionContentType,
  TextBlockContentType,
]);

// Register React components
initReactComponentRegistry({
  resolver: {
    LandingPageExperience,
    HeroSection,
    TextBlock,
  },
});
```

**Important**: Adjust import paths based on your `tsconfig.json` path aliases. See the `optimizely-model-react` skill for detailed guidance on import path resolution.

## Step 6: Inform the User

After creating and registering experience, section, and element components:

1. Show a summary of what was created
2. Remind to sync with CMS:
   ```bash
   npx @optimizely/cms-cli@latest config push optimizely.config.mjs
   ```
3. Explain the editor workflow: editors open the visual builder, add sections to the experience, add elements to sections, and arrange content using drag-and-drop

## Summary

The experience composition workflow:

1. **Experience** (`baseType: '_experience'`) is the routable page with `OptimizelyComposition`
2. **Sections** (`baseType: '_section'` or `compositionBehaviors: ['sectionEnabled']`) provide grid layout via `OptimizelyGridSection`
3. **Elements** (`compositionBehaviors: ['elementEnabled']`) are the content building blocks
4. Register all content types with `initContentTypeRegistry` and React components with `initReactComponentRegistry`
5. Use `ComponentWrapper` only when you need custom styling around composition components
6. Use custom `row` and `column` components on `OptimizelyGridSection` for grid layout customization

## Additional Resources

### Related Skills

- **`optimizely-model`** - Content type modeling fundamentals
- **`optimizely-model-react`** - React component generation and registration patterns
- **`optimizely-setup`** - SDK installation and configuration
