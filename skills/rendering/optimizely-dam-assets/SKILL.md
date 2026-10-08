---
name: optimizely-dam-assets
description: This skill should be used when the user asks to "render images from CMS", "handle DAM assets", "show responsive images", "get image srcset", "get alt text from CMS", "render videos from DAM", "handle file downloads", "fix DAM image not loading", "configure Next.js for DAM images", "use damAssets", or mentions Digital Asset Management, image renditions, or media assets from Optimizely CMS.
---

# Optimizely DAM Assets

This skill teaches how to work with Digital Asset Management (DAM) assets from Optimizely CMS, including rendering responsive images, handling videos and files, and configuring Next.js for DAM image optimization.

## When to Use This Skill

Use this skill when the user wants to:
- Render responsive images from CMS content
- Get alt text from DAM image assets
- Build srcset for responsive image loading
- Handle different asset types (image, video, file)
- Use Next.js Image component with DAM assets
- Fix DAM images not loading in Next.js

## Prerequisites

1. The Optimizely SDK installed (`@optimizely/cms-sdk`)
2. Content types with image or media properties (use the `optimizely-model` skill)
3. A React component for the content type (use the `optimizely-model-react` skill)

## Step 1: Using damAssets

The `damAssets()` function creates pre-configured helpers for working with DAM assets. Pass the content object and it returns a set of utilities with automatic preview token handling.

```tsx
import { damAssets } from '@optimizely/cms-sdk';
import { getPreviewUtils } from '@optimizely/cms-sdk/react/server';

const { getSrcset, getAlt, isDamImageAsset, isDamVideoAsset, isDamRawFileAsset, getDamAssetType, isDamAsset } = damAssets(content);
```

### Returned Helpers

| Helper | Returns | Purpose |
|--------|---------|---------|
| `getSrcset(contentRef)` | `string` | Builds responsive srcset from renditions, deduplicates widths, adds preview tokens |
| `getAlt(contentRef, fallback?)` | `string` | Gets alt text: AltText property, then fallback, then empty string |
| `isDamImageAsset(contentRef)` | `boolean` | Type guard for image assets |
| `isDamVideoAsset(contentRef)` | `boolean` | Type guard for video assets |
| `isDamRawFileAsset(contentRef)` | `boolean` | Type guard for raw file assets |
| `getDamAssetType(contentRef)` | `'image' \| 'video' \| 'file' \| 'unknown'` | Returns the asset type string |
| `isDamAsset(contentRef)` | `boolean` | Validates any DAM asset exists |

## Step 2: Rendering Responsive Images

### Getting the Image URL

Use `src()` from `getPreviewUtils` to get the image URL with preview token support:

```tsx
const { pa, src } = getPreviewUtils(content);
const { getSrcset, getAlt } = damAssets(content);
```

### Complete Image Pattern (Native HTML)

```tsx
import { ContentProps, damAssets } from '@optimizely/cms-sdk';
import { getPreviewUtils } from '@optimizely/cms-sdk/react/server';

type Props = {
  content: ContentProps<typeof HeroContentType>;
};

export default function Hero({ content }: Props) {
  const { pa, src } = getPreviewUtils(content);
  const { getSrcset, getAlt } = damAssets(content);
  const imageUrl = src(content.heroImage);

  return (
    <section>
      <h1 {...pa('title')}>{content.title}</h1>
      {content.heroImage && imageUrl && (
        <img
          src={imageUrl}
          srcSet={getSrcset(content.heroImage)}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          alt={getAlt(content.heroImage, 'Hero image')}
          width={800}
          height={400}
        />
      )}
    </section>
  );
}
```

### Complete Image Pattern (Next.js Image)

For Next.js projects, use the `Image` component for automatic optimization:

```tsx
import Image from 'next/image';
import { ContentProps, damAssets } from '@optimizely/cms-sdk';
import { getPreviewUtils } from '@optimizely/cms-sdk/react/server';

type Props = {
  content: ContentProps<typeof CardContentType>;
};

export default function Card({ content }: Props) {
  const { pa, src } = getPreviewUtils(content);
  const { getAlt } = damAssets(content);
  const imageUrl = src(content.thumbnail);

  return (
    <div>
      <h2 {...pa('title')}>{content.title}</h2>
      {imageUrl && (
        <Image
          src={imageUrl}
          alt={getAlt(content.thumbnail, 'Card thumbnail')}
          width={400}
          height={300}
        />
      )}
    </div>
  );
}
```

## Step 3: Alt Text Handling

The `getAlt()` function follows a priority chain:

1. **AltText property** on the DAM image asset (set by editors in the media library)
2. **Fallback string** you provide as the second argument
3. **Empty string** if neither exists

```tsx
const { getAlt } = damAssets(content);

// With fallback
const alt = getAlt(content.heroImage, 'Decorative hero image');

// Without fallback (returns empty string if no AltText on asset)
const alt = getAlt(content.heroImage);
```

Always provide a meaningful fallback for accessibility unless the image is purely decorative.

## Step 4: Type Guards for Mixed Asset Types

When a content property can reference different types of media (images, videos, files), use type guards to render each appropriately.

### TypeScript Narrowing with Type Guards

Each type guard narrows the TypeScript type, unlocking type-specific properties:

- `isDamImageAsset(ref)` unlocks: `Renditions`, `AltText`, `Width`, `Height`, `FocalPoint`
- `isDamVideoAsset(ref)` unlocks: `Renditions`, `AltText`
- `isDamRawFileAsset(ref)` unlocks: `Url`, `Title`, `Description`, `MimeType`

### Conditional Rendering with Type Guards

```tsx
import { ContentProps, damAssets } from '@optimizely/cms-sdk';
import { getPreviewUtils } from '@optimizely/cms-sdk/react/server';

type Props = {
  content: ContentProps<typeof MediaBlockContentType>;
};

export default function MediaBlock({ content }: Props) {
  const { pa, src } = getPreviewUtils(content);
  const { getSrcset, getAlt, isDamImageAsset, isDamVideoAsset, isDamRawFileAsset } = damAssets(content);
  const mediaUrl = src(content.media);

  return (
    <div {...pa('media')}>
      {content.media && isDamImageAsset(content.media) && mediaUrl && (
        <img
          src={mediaUrl}
          srcSet={getSrcset(content.media)}
          sizes="(max-width: 768px) 100vw, 50vw"
          alt={getAlt(content.media, 'Media content')}
        />
      )}

      {content.media && isDamVideoAsset(content.media) && mediaUrl && (
        <video controls>
          <source src={mediaUrl} />
          <p>{getAlt(content.media, 'Video content')}</p>
        </video>
      )}

      {content.media && isDamRawFileAsset(content.media) && mediaUrl && (
        <a href={mediaUrl} download>
          Download file
        </a>
      )}
    </div>
  );
}
```

### Using getDamAssetType for Switch-Case

For cleaner conditional logic, use `getDamAssetType()` which returns `'image' | 'video' | 'file' | 'unknown'`:

```tsx
const { getDamAssetType, getSrcset, getAlt } = damAssets(content);
const mediaUrl = src(content.media);

function renderMedia() {
  if (!content.media || !mediaUrl) return null;

  switch (getDamAssetType(content.media)) {
    case 'image':
      return (
        <img
          src={mediaUrl}
          srcSet={getSrcset(content.media)}
          sizes="100vw"
          alt={getAlt(content.media)}
        />
      );
    case 'video':
      return (
        <video controls>
          <source src={mediaUrl} />
        </video>
      );
    case 'file':
      return <a href={mediaUrl} download>Download</a>;
    default:
      return null;
  }
}
```

### Validating Any DAM Asset

Use `isDamAsset()` to check if a content reference points to any valid DAM asset before attempting to render:

```tsx
const { isDamAsset } = damAssets(content);

{content.media && isDamAsset(content.media) && (
  <div>Asset exists and is valid</div>
)}
```

## Step 5: Next.js Image Configuration

When using Next.js `Image` component with DAM assets, you must add the DAM hostname to `remotePatterns` in `next.config.ts` (or `next.config.mjs`). Without this, Next.js blocks external image loading.

### Add DAM Hostname to next.config.ts

```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.cms.optimizely.com',
      },
      {
        protocol: 'https',
        hostname: '*.cg.optimizely.com',
      },
    ],
  },
};

export default nextConfig;
```

**Common hostnames to allow**:
- `*.cms.optimizely.com` for CMS-hosted assets
- `*.cg.optimizely.com` for Content Graph delivered assets

Adjust the hostname patterns to match your specific CMS instance URL. For example, if your CMS is at `https://acme.cms.optimizely.com`, you can use the wildcard pattern above or the specific hostname `acme.cms.optimizely.com`.

### Troubleshooting: Images Not Loading

If Next.js Image shows an error like "Invalid src prop" or images fail to load:

1. **Check the hostname**: Run the dev server and check the browser console for the exact URL being requested
2. **Add the correct hostname** to `remotePatterns` in `next.config.ts`
3. **Restart the dev server** after updating `next.config.ts` (required for config changes)
4. **Verify the URL format**: Make sure `src()` returns a valid URL by logging it

## Complete Example: Image Gallery

A full example rendering multiple DAM images in a gallery:

```tsx
import Image from 'next/image';
import { ContentProps, damAssets } from '@optimizely/cms-sdk';
import { getPreviewUtils } from '@optimizely/cms-sdk/react/server';

type Props = {
  content: ContentProps<typeof GalleryContentType>;
};

export default function Gallery({ content }: Props) {
  const { pa, src } = getPreviewUtils(content);
  const { getSrcset, getAlt, isDamImageAsset } = damAssets(content);

  return (
    <section>
      <h2 {...pa('title')}>{content.title}</h2>
      <div {...pa('images')}>
        {(content.images ?? []).map((image, index) => {
          const imageUrl = src(image);
          if (!imageUrl || !isDamImageAsset(image)) return null;

          return (
            <figure key={index}>
              <Image
                src={imageUrl}
                alt={getAlt(image, `Gallery image ${index + 1}`)}
                width={600}
                height={400}
              />
            </figure>
          );
        })}
      </div>
    </section>
  );
}
```

## Summary

1. Use `damAssets(content)` to get pre-configured helpers with automatic preview token handling
2. Use `src()` from `getPreviewUtils` to get the image URL
3. Use `getSrcset()` for responsive images with multiple renditions
4. Use `getAlt()` with a fallback for accessible alt text
5. Use type guards (`isDamImageAsset`, `isDamVideoAsset`, `isDamRawFileAsset`) for conditional rendering
6. Use `getDamAssetType()` for switch-case patterns
7. Add DAM hostnames to `remotePatterns` in `next.config.ts` for Next.js Image

## Additional Resources

### Related Skills

- **`optimizely-model`** - Creating content types with `contentReference` properties for media
- **`optimizely-model-react`** - React component generation with image rendering patterns
- **`optimizely-richtext-rendering`** - Rendering rich text content that may reference media assets
