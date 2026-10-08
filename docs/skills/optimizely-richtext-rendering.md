# Optimizely Rich Text Rendering

Render rich text content from Optimizely CMS with full control over how headings, paragraphs, links, tables, code blocks, and inline formatting appear, using the `RichText` component's custom element and leaf renderers.

## When to Use

Use this skill when you want to:
- Render a rich text property from a content type
- Customize how specific elements (headings, links, quotes, tables) look in rich text
- Override inline formatting like bold, italic, underline, or code
- Handle code blocks or technical documentation content
- Choose between the `RichText` component and `dangerouslySetInnerHTML`
- Fix unexpected rich text display or rendering issues

## Trigger Phrases

Say any of these to activate the skill:
- "Render rich text"
- "Customize rich text elements"
- "Style headings in rich text"
- "Handle code blocks in rich text"
- "Override rich text rendering"
- "Use the RichText component"
- "Fix rich text display"

Any mention of custom element renderers, custom leaf renderers, or rendering rich text content for Optimizely CMS will also trigger this skill.

## Usage Example

```
You: "I want to customize how headings and links render in my Article's body rich text"

Agent: [Uses optimizely-richtext-rendering skill]
- Identifies the rich text property on the Article content type
- Adds the RichText import from @optimizely/cms-sdk/react/richText
- Passes content.body?.json to the RichText component
- Adds custom element renderers for heading-two, heading-three, and link
- Wraps the RichText in a container div with preview attributes for editing
```

## What It Generates

- `RichText` component usage with `content.propertyName?.json` data binding
- Custom `elements` prop with overrides for block-level elements (headings, paragraphs, lists, tables, links, quotes, code blocks)
- Custom `leafs` prop with overrides for inline formatting (bold, italic, underline, strikethrough, code)
- Proper `decodeHtmlEntities` configuration for code-heavy or documentation content
- Container wrappers with preview attributes for in-context editing

## Key Concepts

### Elements vs Leafs

The `RichText` component offers two customization points:

- **Elements** control block-level and structural rendering (headings, paragraphs, lists, tables, links, quotes). There are 20+ element types you can override.
- **Leafs** control inline text formatting (bold, italic, underline, strikethrough, code). There are 5 leaf types you can override.

### Basic Usage

```tsx
import { RichText } from '@optimizely/cms-sdk/react/richText';

<div {...pa('body')}>
  <RichText content={content.body?.json} />
</div>
```

### Custom Rendering

```tsx
<RichText
  content={content.body?.json}
  elements={{
    'heading-two': (props) => (
      <h2 className="text-3xl font-bold">{props.children}</h2>
    ),
    link: (props) => (
      <a href={props.href} className="text-blue-600 underline">
        {props.children}
      </a>
    ),
  }}
  leafs={{
    bold: (props) => (
      <strong className="font-black">{props.children}</strong>
    ),
  }}
/>
```

### HTML Entity Decoding

For documentation or code-heavy content, set `decodeHtmlEntities={false}` to preserve entities like `&lt;` as literal text instead of converting them to `<`.

### Fallback Behavior

Unknown or unrecognized element types render as `<span>` by default. This prevents errors and keeps the page stable even when the CMS delivers unexpected markup.

### RichText vs dangerouslySetInnerHTML

The `RichText` component is recommended over `dangerouslySetInnerHTML` because it is XSS-safe by default and gives you granular control over every element. Use `dangerouslySetInnerHTML` only when you specifically need the raw HTML representation and accept the security trade-off.

## Prerequisites

- The `@optimizely/cms-sdk` package installed
- A content type with a `richText` property (created via `optimizely-model`)
- A React component for the content type (created via `optimizely-model-react`)

## Related Skills

- [`optimizely-model-react`](optimizely-model-react.md) -- generating the React component that hosts the RichText rendering
- [`optimizely-dam-assets`](optimizely-dam-assets.md) -- handling media assets that may appear alongside rich text content
- [`optimizely-experience-composition`](optimizely-experience-composition.md) -- using rich text elements within visual builder experiences
