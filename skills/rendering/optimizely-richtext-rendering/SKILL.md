---
name: optimizely-richtext-rendering
description: This skill should be used when the user asks to "render rich text", "customize rich text elements", "style headings in rich text", "handle code blocks in rich text", "override rich text rendering", "use the RichText component", "fix rich text display", or mentions rendering rich text content, custom element renderers, or custom leaf renderers for Optimizely CMS.
---

# Optimizely Rich Text Rendering

This skill teaches how to render rich text content from Optimizely CMS using the `RichText` component, including custom element and leaf overrides for full control over markup and styling.

## When to Use This Skill

Use this skill when the user wants to:
- Render rich text content from a content type property
- Customize how headings, paragraphs, links, or other elements render in rich text
- Override bold, italic, underline, or other inline formatting
- Handle code blocks or preformatted text in rich text
- Understand fallback behavior for unknown rich text elements
- Choose between `RichText` component and `dangerouslySetInnerHTML`

## Prerequisites

1. The Optimizely SDK installed (`@optimizely/cms-sdk`)
2. A content type with a `richText` property (use the `optimizely-model` skill to create one)
3. A React component for the content type (use the `optimizely-model-react` skill)

## Step 1: Basic Rich Text Rendering

Import the `RichText` component and pass the JSON content from your rich text property:

```tsx
import { RichText } from '@optimizely/cms-sdk/react/richText';
import { ContentProps } from '@optimizely/cms-sdk';
import { getPreviewUtils } from '@optimizely/cms-sdk/react/server';

type Props = {
  content: ContentProps<typeof ArticleContentType>;
};

export default function Article({ content }: Props) {
  const { pa } = getPreviewUtils(content);

  return (
    <article>
      <h1 {...pa('title')}>{content.title}</h1>
      <div {...pa('body')}>
        <RichText content={content.body?.json} />
      </div>
    </article>
  );
}
```

**Key points**:
- Always pass `content.propertyName?.json` (the JSON representation), not the raw property
- Wrap in a container `<div>` with preview attributes for in-context editing
- The `RichText` component is preferred over `dangerouslySetInnerHTML` because it is safer and fully customizable

## Step 2: Custom Element Renderers

Use the `elements` prop to override how specific block-level and structural elements render. Each custom element receives `ElementProps` which includes `text` (for inline content) and `children` (for nested elements).

### Available Element Types

| Element Type | Default HTML | Description |
|-------------|-------------|-------------|
| `heading-one` | `<h1>` | Heading level 1 |
| `heading-two` | `<h2>` | Heading level 2 |
| `heading-three` | `<h3>` | Heading level 3 |
| `heading-four` | `<h4>` | Heading level 4 |
| `heading-five` | `<h5>` | Heading level 5 |
| `heading-six` | `<h6>` | Heading level 6 |
| `paragraph` | `<p>` | Paragraph text |
| `quote` | `<blockquote>` | Block quote |
| `div` | `<div>` | Generic division |
| `bulleted-list` | `<ul>` | Unordered list |
| `numbered-list` | `<ol>` | Ordered list |
| `list-item` | `<li>` | List item |
| `span` | `<span>` | Inline span |
| `link` | `<a>` | Hyperlink |
| `table` | `<table>` | Table |
| `thead` | `<thead>` | Table head |
| `tbody` | `<tbody>` | Table body |
| `tr` | `<tr>` | Table row |
| `td` | `<td>` | Table cell |
| `th` | `<th>` | Table header cell |
| `code` | `<code>` | Inline code |
| `pre` | `<pre>` | Preformatted block |
| `strong` | `<strong>` | Strong emphasis (semantic) |
| `em` | `<em>` | Emphasis (semantic) |
| `sub` | `<sub>` | Subscript |
| `sup` | `<sup>` | Superscript |

### Example: Custom Headings

```tsx
<RichText
  content={content.body?.json}
  elements={{
    'heading-one': (props) => (
      <h1 className="text-4xl font-bold text-primary">{props.children}</h1>
    ),
    'heading-two': (props) => (
      <h2 className="text-3xl font-semibold text-secondary">{props.children}</h2>
    ),
    'heading-three': (props) => (
      <h3 className="text-2xl font-medium">{props.children}</h3>
    ),
  }}
/>
```

### Example: Custom Links with Tracking

```tsx
<RichText
  content={content.body?.json}
  elements={{
    link: (props) => (
      <a
        href={props.href}
        target={props.target ?? undefined}
        className="text-blue-600 underline hover:text-blue-800"
        onClick={() => trackLinkClick(props.href)}
      >
        {props.children}
      </a>
    ),
  }}
/>
```

### Example: Custom Tables

```tsx
<RichText
  content={content.body?.json}
  elements={{
    table: (props) => (
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">{props.children}</table>
      </div>
    ),
    th: (props) => (
      <th className="bg-gray-100 border px-4 py-2 text-left font-semibold">
        {props.children}
      </th>
    ),
    td: (props) => (
      <td className="border px-4 py-2">{props.children}</td>
    ),
  }}
/>
```

## Step 3: Custom Leaf Renderers

Use the `leafs` prop to override how inline formatting is applied. Leaf renderers handle text-level formatting like bold, italic, and code.

### Available Leaf Types

| Leaf Type | Default HTML | Description |
|-----------|-------------|-------------|
| `bold` | `<strong>` | Bold text |
| `italic` | `<em>` | Italic text |
| `underline` | `<u>` | Underlined text |
| `strikethrough` | `<s>` | Strikethrough text |
| `code` | `<code>` | Inline code |

### Example: Custom Leaf Formatting

```tsx
<RichText
  content={content.body?.json}
  leafs={{
    bold: (props) => (
      <strong className="font-black text-gray-900">{props.children}</strong>
    ),
    italic: (props) => (
      <em className="italic text-gray-700">{props.children}</em>
    ),
    code: (props) => (
      <code className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono text-red-600">
        {props.children}
      </code>
    ),
  }}
/>
```

## Step 4: Handling Code Blocks

For documentation or technical content, you may need proper code block rendering. Use a combination of custom `pre` and `code` elements.

### Basic Code Block Styling

```tsx
<RichText
  content={content.body?.json}
  elements={{
    pre: (props) => (
      <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto my-4">
        {props.children}
      </pre>
    ),
    code: (props) => (
      <code className="font-mono text-sm">{props.children}</code>
    ),
  }}
/>
```

### The decodeHtmlEntities Prop

By default, `decodeHtmlEntities` is `true`, which decodes HTML entities like `&lt;` to `<`. For documentation or code-heavy content, set it to `false` to preserve entities as-is:

```tsx
<RichText
  content={content.body?.json}
  decodeHtmlEntities={false}
  elements={{
    pre: (props) => (
      <pre className="code-block">{props.children}</pre>
    ),
  }}
/>
```

**When to use `decodeHtmlEntities={false}`**:
- Documentation pages with code samples
- Technical content where HTML entities must display literally
- Content that contains intentional entity references

**When to keep the default (`true`)**:
- Marketing content
- Blog posts
- General editorial content

## Step 5: Combining Elements and Leafs

You can provide both `elements` and `leafs` for full control over rich text rendering:

```tsx
<RichText
  content={content.body?.json}
  elements={{
    'heading-two': (props) => (
      <h2 className="text-3xl font-bold border-b pb-2 mb-4">{props.children}</h2>
    ),
    paragraph: (props) => (
      <p className="text-lg leading-relaxed mb-4">{props.children}</p>
    ),
    link: (props) => (
      <a
        href={props.href}
        className="text-accent underline"
        target={props.target ?? undefined}
      >
        {props.children}
      </a>
    ),
    quote: (props) => (
      <blockquote className="border-l-4 border-accent pl-4 italic my-6">
        {props.children}
      </blockquote>
    ),
  }}
  leafs={{
    bold: (props) => (
      <strong className="font-bold">{props.children}</strong>
    ),
    code: (props) => (
      <code className="bg-gray-100 px-1 rounded font-mono text-sm">
        {props.children}
      </code>
    ),
  }}
/>
```

## Fallback Behavior

Unknown or unrecognized elements render as `<span>` by default. This is a safe fallback that prevents rendering errors. If you encounter elements that are not rendering as expected:

1. Check the element type name in the rich text JSON data
2. Add a custom element handler for that type
3. Unknown elements will not cause errors or break the page

## SVG Content

SVG markup is not supported in the `RichText` component. If editors need to include SVG content:
- Use image assets instead of inline SVG
- Create a custom element handler that maps to an image component
- Store SVGs as DAM assets and reference them via content references

## Integration API Considerations

Content created via the Integration API bypasses editor validation. This means rich text from the API may contain unexpected markup or element structures. When consuming API-authored content:
- Use custom element handlers to handle edge cases
- Test with actual API content during development
- Add fallback rendering for unexpected element types

## RichText vs dangerouslySetInnerHTML

The `RichText` component is recommended over `dangerouslySetInnerHTML`:

| Feature | RichText | dangerouslySetInnerHTML |
|---------|----------|------------------------|
| XSS Safety | Safe by default | Vulnerable to XSS |
| Custom rendering | Full control via elements/leafs | Requires post-processing |
| Preview support | Works with preview attributes | Works with preview attributes |
| Flexibility | Granular element overrides | All-or-nothing HTML |

Use `dangerouslySetInnerHTML` only when you specifically need the HTML representation and accept the security implications:

```tsx
<div {...pa('body')} dangerouslySetInnerHTML={{ __html: content.body?.html ?? '' }} />
```

## Common Patterns

### Blog Content

```tsx
<RichText
  content={content.body?.json}
  elements={{
    'heading-two': (props) => (
      <h2 className="blog-heading">{props.children}</h2>
    ),
    paragraph: (props) => (
      <p className="blog-paragraph">{props.children}</p>
    ),
    quote: (props) => (
      <blockquote className="blog-quote">{props.children}</blockquote>
    ),
  }}
/>
```

### Documentation with Code

```tsx
<RichText
  content={content.body?.json}
  decodeHtmlEntities={false}
  elements={{
    pre: (props) => (
      <pre className="doc-code-block">{props.children}</pre>
    ),
    code: (props) => (
      <code className="doc-inline-code">{props.children}</code>
    ),
  }}
/>
```

### Marketing Content with Tracked Links

```tsx
<RichText
  content={content.body?.json}
  elements={{
    link: (props) => (
      <a
        href={props.href}
        target={props.target ?? undefined}
        rel={props.target === '_blank' ? 'noopener noreferrer' : undefined}
        onClick={() => analytics.trackClick(props.href)}
      >
        {props.children}
      </a>
    ),
  }}
/>
```

## Summary

1. Import `RichText` from `@optimizely/cms-sdk/react/richText`
2. Pass `content.propertyName?.json` to the `content` prop
3. Use `elements` to override block-level and structural element rendering
4. Use `leafs` to override inline text formatting
5. Set `decodeHtmlEntities={false}` for code-heavy or documentation content
6. Unknown elements safely fall back to `<span>`
7. Prefer `RichText` over `dangerouslySetInnerHTML` for safety and customization

## Additional Resources

### Related Skills

- **`optimizely-model`** - Creating content types with `richText` properties
- **`optimizely-model-react`** - React component generation with `RichText` integration
- **`optimizely-experience-composition`** - Using rich text elements within visual builder experiences
