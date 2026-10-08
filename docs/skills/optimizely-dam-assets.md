# Optimizely DAM Assets

Work with Digital Asset Management (DAM) assets from Optimizely CMS, including rendering responsive images with srcset, extracting alt text, handling videos and file downloads, and configuring Next.js for DAM image optimization.

## When to Use

Use this skill when you want to:
- Render responsive images from CMS content with srcset and sizes
- Get alt text from DAM image assets for accessibility
- Handle different asset types (images, videos, downloadable files)
- Use the Next.js `Image` component with DAM-hosted assets
- Fix DAM images not loading in a Next.js project
- Understand the `damAssets` helper and its type guards

## Trigger Phrases

Say any of these to activate the skill:
- "Render images from CMS"
- "Handle DAM assets"
- "Show responsive images"
- "Get image srcset"
- "Get alt text from CMS"
- "Render videos from DAM"
- "Handle file downloads"
- "Fix DAM image not loading"
- "Configure Next.js for DAM images"
- "Use damAssets"

Any mention of Digital Asset Management, image renditions, or media assets from Optimizely CMS will also trigger this skill.

## Usage Example

```
You: "Add a responsive hero image to my Hero component using the heroImage property"

Agent: [Uses optimizely-dam-assets skill]
- Imports damAssets from @optimizely/cms-sdk
- Calls damAssets(content) to get getSrcset, getAlt, and type guard helpers
- Uses src() from getPreviewUtils to get the image URL with preview token support
- Renders an <img> tag with src, srcSet, sizes, and alt attributes
- Adds null checks for content.heroImage and imageUrl before rendering
- If Next.js is detected, uses the Image component and checks next.config.ts
  for the required remotePatterns entry
```

## What It Generates

- `damAssets(content)` calls that return pre-configured helpers with automatic preview token handling
- Responsive `<img>` tags with `src`, `srcSet`, `sizes`, and `alt` attributes
- Next.js `Image` component usage with proper `width`, `height`, and `alt`
- Alt text extraction with a fallback chain (DAM AltText property, then your fallback, then empty string)
- Type guard checks (`isDamImageAsset`, `isDamVideoAsset`, `isDamRawFileAsset`) for conditional rendering of mixed media
- `getDamAssetType()` switch-case patterns for cleaner multi-type rendering
- `next.config.ts` updates to allow DAM hostnames in `remotePatterns`

## Key Concepts

### The damAssets Helper

Call `damAssets(content)` once per component to get all the helpers you need:

| Helper | What It Does |
|--------|-------------|
| `getSrcset(ref)` | Builds a responsive srcset string from DAM renditions |
| `getAlt(ref, fallback?)` | Returns alt text from the asset, your fallback, or empty string |
| `isDamImageAsset(ref)` | Type guard: true if the reference is an image |
| `isDamVideoAsset(ref)` | Type guard: true if the reference is a video |
| `isDamRawFileAsset(ref)` | Type guard: true if the reference is a downloadable file |
| `getDamAssetType(ref)` | Returns `'image'`, `'video'`, `'file'`, or `'unknown'` |
| `isDamAsset(ref)` | Returns true if the reference is any valid DAM asset |

### Image URL via src()

Use `src()` from `getPreviewUtils(content)` to get the image URL. This handles preview token injection automatically:

```tsx
const { pa, src } = getPreviewUtils(content);
const imageUrl = src(content.heroImage);
```

### Next.js Configuration

When using the Next.js `Image` component, you must add DAM hostnames to `remotePatterns` in `next.config.ts`. Without this, Next.js blocks external image loading. Common patterns to allow:

- `*.cms.optimizely.com`
- `*.cg.optimizely.com`

After updating the config, restart the dev server for changes to take effect.

## Prerequisites

- The `@optimizely/cms-sdk` package installed
- Content types with image or media properties (created via `optimizely-model`)
- A React component for the content type (created via `optimizely-model-react`)

## Related Skills

- [`optimizely-model-react`](optimizely-model-react.md) -- generating React components that render images and media
- [`optimizely-richtext-rendering`](optimizely-richtext-rendering.md) -- rendering rich text content that may appear alongside media
- [`optimizely-experience-composition`](optimizely-experience-composition.md) -- using image elements within visual builder experiences
