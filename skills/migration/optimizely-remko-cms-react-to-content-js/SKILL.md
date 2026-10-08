---
name: optimizely-remko-cms-react-to-content-js
description: >-
  This skill should be used when the user asks to migrate off
  "@remkoj/optimizely-cms-react", replace DefaultComponentFactory,
  swap the Remko component factory / RSC rendering for the official
  "@optimizely/cms-sdk" React surface, "migrate optimizely-cms-react",
  convert RichTextComponentDictionary to the official SDK, move Remko
  CmsContent / OptimizelyComponent to the Content JS SDK React server
  components, or fix React component registration after switching SDKs.
---

# Migrate @remkoj/optimizely-cms-react to @optimizely/cms-sdk

Guide the user through migrating from the community **Remko SDK**
(`@remkoj/optimizely-cms-react`) to the official **Content JS SDK**
(`@optimizely/cms-sdk`), covering package replacement, component factory
migration, server/client component separation, rich-text rendering, and
per-component API swaps.

This skill handles the **React rendering surface** — the component factory,
server components (RSC), client components, and rich-text rendering. Complete
the `optimizely-remko-graph-client-to-content-js` migration first (the Graph
client is the foundation for fetching content).

## Scope & Teardown Order (applies to every skill in this suite)

Three cross-cutting rules govern the whole migration:

- **Optimizely One is out of scope (carve-out).**
  `@remkoj/optimizely-one-nextjs` (ODP + Recs + visitor-group personalization +
  site search) has **no target mapping** and is a **known residual**: it is
  explicitly permitted to remain installed after migration. "Remove all
  `@remkoj/*`" does **not** apply to it — do not strip it, and do not treat its
  presence as an incomplete migration.
- **`@remkoj/optimizely-cms-api` is a conditional residual.** Most of it
  migrates (management → `@optimizely/cms-cli`; published reads →
  `@optimizely/cms-sdk` `getClient()`), but content write/CRUD, changesets, and
  runtime OAuth are **honest gaps** with no official equivalent. Keep the
  package installed (or rewrite those paths to raw Integration API REST) **if**
  the project uses any of them; strip it only after confirming it does not.
- **Do not global-delete the `@remkoj/*` packages.** They are interdependent;
  removing them in the wrong order transiently breaks the build. Follow the
  staged teardown: client → codegen/functions → content-type registry →
  display-template + React registries → components → pages/preview → remove
  packages.

All three are specified in full — including the exact `yarn remove` command that
omits `optimizely-one-nextjs` unconditionally and stages `optimizely-cms-api`
conditionally — in the **"Scope carve-out"**, **"Conditional residual"**, and
**"Removal order"** sections of
`../_shared-references/package-and-import-mapping.md`. Read them before removing
any package.

## Replace / Retain / Remove — classify before you touch code

The official Optimizely migration guide frames every touched surface as one of
three buckets. Apply this classification **before** starting Step 1 — the
mappings in Step 5 assume the site has already landed in **Replace**:

| Bucket | Definition | Action |
|--------|------------|--------|
| **Replace** | Standard CMS responsibility currently done via Remko (factory, `CmsContent`, `ServerContext`, `RichText`) | Follow Steps 1–6 below |
| **Retain** | App-specific behaviour that happens to use a Remko helper (a custom rich-text node, a bespoke content-area filter) | Preserve the behaviour; re-implement without the Remko import |
| **Remove** | Infrastructure that only existed because Remko required it (`RichTextComponentDictionary` registration, `getDataFragment` statics, `readSetting` helpers) | Delete outright |

See `../_shared-references/customer-artifacts-and-coexistence.md` for the full
framework and the official guide reference.

## Coexistence with other Remko surfaces

Skills in this suite are landed one at a time. Until each sibling migration
completes, its symbols remain load-bearing:

- **`ctx.client` from `GenericContext` stays typed as `IOptiGraphClient`**
  until this skill's migration runs. The graph-client skill deliberately
  leaves it alone — do NOT retype it early from the graph-client migration.
  `@remkoj/optimizely-cms-react` still owns `GenericContext` and therefore
  owns the `ctx.client` type until it is torn out here.
- **Fragment types (`CmsComponent<FragmentType>`) resolve through codegen**
  until the graph-functions skill runs. The `contentType()` rewrites in Step
  5 assume you are willing to move off fragment-typed component props; if
  the codegen migration is deferred, the `WithContainerKey<T>` wrapper (Step
  5d) is the seam that lets both patterns coexist per file.
- **Rendering hybrid trees** — a page that mixes SDK-migrated blocks with
  Remko-still blocks is expected mid-migration. `<OptimizelyComponent>`
  routes only through the `initReactComponentRegistry` resolver; a Remko
  factory-registered block will not render through it unless also
  re-registered in the resolver. Plan the migration by content-type group,
  not by file.

See `../_shared-references/customer-artifacts-and-coexistence.md` §Coexistence
for the full rules.

## When to Use This Skill

- User wants to migrate from `@remkoj/optimizely-cms-react` to the official
  `@optimizely/cms-sdk` React surface
- User asks to replace `DefaultComponentFactory`, `registerAll`, or
  `RichTextComponentDictionary` with the official SDK
- User asks to swap `CmsContent` or `OptimizelyComponent` (Remko RSC) for the
  official SDK server components
- User asks about migrating `ServerContext` to the official SDK context wiring
- User asks how to register React components for CMS content types
- User encounters component registration errors after switching SDKs
- User asks about migrating rich-text rendering from Remko to the official SDK
- User wants a pre-migration assessment of `@remkoj/optimizely-cms-react`
  usage before starting the migration
- User asks about server vs client component boundaries after migrating to
  the official SDK

## Steps

### Step 1: Assess Current Usage

**Discovery: customer artifacts — check BEFORE proceeding.** Real Remko
installs rarely match the reference architecture. Run the discovery in
`../_shared-references/customer-artifacts-and-coexistence.md` to catalogue:

- **Patches on `@remkoj/optimizely-cms-react`** (`patches/` folder,
  `pnpm.patchedDependencies`, yarn `resolutions`) — each patch encodes a
  behaviour the customer's team believed had to survive a swap. Do not swap
  the package until each patch is reproduced, upstreamed, or explicitly
  accepted as regression.
- **Custom wrappers around Remko types** — grep for exports layered on top
  of Remko imports (see `WithContainerKey<T>` pattern in Step 5d). Wrappers
  usually carry business logic that must survive; only the imported type
  substrate moves.
- **Forked / patched codegen tooling** — signals partial migration will
  need coordination with the `optimizely-remko-graph-functions-to-content-js`
  skill (fragment types feed `CmsComponent<FragmentType>` in this skill).

Then scan the project to understand migration scope.

1. **Detect `@remkoj/optimizely-cms-react` imports**:
   ```bash
   grep -r "from '@remkoj/optimizely-cms-react" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" .
   ```

2. **Scan for key symbols**:
   - `DefaultComponentFactory` / `ComponentFactory` — factory creation
   - `registerAll()` — component registration
   - `RichTextComponentDictionary` — rich-text node renderers (do NOT migrate
     this — the target has a built-in `RichText` component)
   - `CmsContent` / `OptimizelyComponent` (RSC) — server component rendering
   - `ServerContext` — server context creation and threading
   - `RichText` (`./components`) — rich-text component usage
   - `createHtmlComponent`, `extractSettings`, `readSetting` — CMS-styles
     helpers (deprecated in target)

3. **Check factory registration** — find `factory.ts` or similar files that
   create a `DefaultComponentFactory` and call `registerAll(cmsComponents)` +
   `registerAll(RichTextComponentDictionary)`.

4. **Check server context usage** — find `api.ts` or similar files that create
   a `ServerContext` and thread it through pages (e.g.,
   `publishedContext = new ServerContext({ factory, client, mode: 'public' })`).

5. **Check component files** — identify CMS components that are registered via
   the factory (e.g., `Article.tsx`, `Hero.tsx`) to understand how many
   components need migration.

6. **Categorize migration effort**:
   - **Minimal**: Only a few CMS components, standard factory pattern, no
     custom rich-text renderers, no CMS-styles helpers
   - **Moderate**: Many CMS components or custom rich-text nodes (need to
     verify if target `RichText` component covers them)
   - **Significant**: Custom factory logic, advanced composition, or heavy use
     of deprecated CMS-styles helpers

**If the user only asked for assessment, stop here and report.** Do not
proceed to migration steps.

### Step 2: Swap Packages

Remove the Remko package and add the official SDK.

**See `../_shared-references/package-and-import-mapping.md` for the complete
package mapping.**

```bash
# Remove community SDK
yarn remove @remkoj/optimizely-cms-react

# Add official SDK (if not already present from graph-client migration)
yarn add @optimizely/cms-sdk
```

If the project also uses other `@remkoj` packages (`optimizely-cms-nextjs`,
`optimizely-graph-functions`, etc.), those will be migrated in separate steps —
see the related skills below. For now, only remove `optimizely-cms-react`.

### Step 3: Migrate Component Factory Registration

**See `../_shared-references/setup-and-di.md` for the complete before/after
wiring.**

The Remko app has **one** `DefaultComponentFactory`. The target replaces it with
**three** registries, so two of them are net-new wiring you must add, not
translate. `setup-and-di.md` has the full table; the short version:

| Registry | Import subpath | Replaces |
|---|---|---|
| `initContentTypeRegistry([...])` | `@optimizely/cms-sdk` (**root**) | net-new — schemas (were codegen fragments) |
| `initReactComponentRegistry({ resolver })` | `@optimizely/cms-sdk/react/server` | `DefaultComponentFactory` + `registerAll` |
| `initDisplayTemplateRegistry([...])` | `@optimizely/cms-sdk` (**root**) | net-new — carries the variant/style discriminator |

**Before — Remko (`components/factory.ts`):**

```ts
import 'server-only';
import {
  type ComponentFactory,
  DefaultComponentFactory,
  RichTextComponentDictionary,
} from '@remkoj/optimizely-cms-react/rsc';
import cmsComponents from './cms';

export const factory: ComponentFactory = new DefaultComponentFactory();
factory.registerAll(RichTextComponentDictionary);
factory.registerAll(cmsComponents);

export const setupFactory = () => factory;
export default setupFactory;
```

**After — Content JS SDK (root `layout.tsx`), all three registries side by side:**

```ts
import Article, { ArticleContentType } from '@/components/Article';
import ArticleCard from '@/components/ArticleCard';
import { ArticleCardTemplate } from '@/components/ArticleCard/displayTemplate';
import Hero, { HeroContentType } from '@/components/Hero';
import {
  initContentTypeRegistry,
  initDisplayTemplateRegistry,
} from '@optimizely/cms-sdk';
import { initReactComponentRegistry } from '@optimizely/cms-sdk/react/server';

// 1. Content types (schema) — ROOT export.
initContentTypeRegistry([ArticleContentType, HeroContentType]);

// 2. Display templates (variant/style discriminator) — ROOT export.
//    Omit only if the app has no variants.
initDisplayTemplateRegistry([ArticleCardTemplate]);

// 3. React renderers — ./react/server. Replaces DefaultComponentFactory +
//    registerAll. Colon/tag keys route variants (see below).
initReactComponentRegistry({
  resolver: {
    Article,                     // default renderer for the Article type
    'Article:card': ArticleCard, // variant renderer, selected via tag="card"
    Hero,
  },
});
```

**Critical migration notes:**

1. **`initContentTypeRegistry` is a ROOT export** of `@optimizely/cms-sdk` (not
   `./react/server`). It registers the content-type schemas (distinct from the
   React renderer registry).

2. **`initReactComponentRegistry` is exported from `./react/server`**. It
   registers the React components for each content type key.

3. **`initDisplayTemplateRegistry` is a ROOT export** of `@optimizely/cms-sdk`.
   It is net-new wiring — a Remko app has no equivalent call. Register one
   `displayTemplate()` object per variant/style (Step 5 shows how to author
   one). Skip this call only if the app truly has no variants.

4. **`RichTextComponentDictionary` has NO registration equivalent.** The target
   ships a built-in `RichText` component at
   `@optimizely/cms-sdk/react/richText` (docs `10-richtext-component-react.md`)
   with default node renderers. Do NOT register a rich-text dictionary. If you
   need custom rich-text nodes, use the `elements` prop on `RichText`.

5. The `resolver` object keys are content-type keys (e.g., `"Article"`)
   mapped to components — the same idea as `registerAll(cmsComponents)`, but
   declarative and framework-owned.

**Variant registration (the array → object trap):** Remko's registry is an
**array** of `{ type, component, variant? }` entries *precisely because one
content type can register more than once* under different variants:

```ts
// Remko — two entries for the same type, distinguished by variant.
{ type: 'ArticleCard', variant: 'featured', component: ArticleCardFeatured },
{ type: 'ArticleCard',                       component: ArticleCard },
```

A plain object literal keyed by content type **cannot hold two `ArticleCard`
keys** — one silently overwrites the other, and you lose a renderer with a green
type-check. Do **not** flatten the array to one key per type. The variant
discriminator does not disappear; it moves onto **display templates**, and the
resolver routes to it via a **colon key** or a **nested tag map**:

```ts
// Form 1 — flat colon keys: "<ContentTypeKey>:<tag>".
initReactComponentRegistry({
  resolver: {
    ArticleCard: ArticleCard,               // default (no tag)
    'ArticleCard:featured': ArticleCardFeatured, // variant
  },
});

// Form 2 — nested tag map (clearer when a type has several variants).
initReactComponentRegistry({
  resolver: {
    ArticleCard: {
      default: ArticleCard,
      tags: { featured: ArticleCardFeatured },
    },
  },
});
```

Each variant also needs a `displayTemplate()` registered via
`initDisplayTemplateRegistry([...])`, and the renderer is selected at render time
with `<OptimizelyComponent content={item} tag="featured" />`. See Step 5 for the
`displayTemplate()` authoring recipe.

### Step 4: Migrate Server Context Wiring

**See `../_shared-references/setup-and-di.md` for the complete before/after.**

Remko constructs a `ServerContext` from the factory + client + mode and threads
it through pages (`publishedContext` in `api.ts`). The target replaces the
explicit context object with request-scoped context: wrap the page in
`withAppContext`, render with `OptimizelyComponent`, and read/write context via
`getContext()` / `setContext()` (all from `@optimizely/cms-sdk/react/server`).

**Before — Remko (`api.ts`):**

```ts
import { ServerContext } from '@remkoj/optimizely-cms-react/rsc';
import { factory } from './components/factory';
import { client } from './client'; // your Graph client

// Explicit server context object, threaded through the app.
export const publishedContext = new ServerContext({
  factory,
  client,
  mode: 'public',
});
```

**After — Content JS SDK (catch-all page, e.g. `app/[...slug]/page.tsx`):**

```tsx
import { getClient } from '@optimizely/cms-sdk';
import {
  OptimizelyComponent,
  withAppContext,
} from '@optimizely/cms-sdk/react/server';

type Props = { params: Promise<{ slug: string[] }> };

export async function Page({ params }: Props) {
  const { slug } = await params;
  const client = getClient();
  const content = await client.getContentByPath(`/${slug.join('/')}/`);

  return <OptimizelyComponent content={content[0]} />;
}

// Provides request-scoped context (replaces the shared ServerContext object).
export default withAppContext(Page);
```

**After — reading/writing context in nested components (replaces threading `publishedContext`):**

```tsx
import { getContext, setContext } from '@optimizely/cms-sdk/react/server';

// Populate once per request — call inside the page, where `content` is in scope:
export async function Page({ params }: Props) {
  const { slug } = await params;
  const content = await getClient().getContentByPath(`/${slug.join('/')}/`);
  setContext({
    currentContent: content[0],
    locale: content[0]?._metadata?.locale,
    type: content[0]?.__typename,
    key: content[0]?._metadata?.key,
  });
  return <OptimizelyComponent content={content[0]} />;
}

// Read anywhere in the tree — no prop drilling, no ServerContext instance:
export function MyComponent() {
  const context = getContext();
  const locale = context?.locale ?? 'en-US';
  const isPreview = !!context?.preview_token;
  return <div>Locale: {locale}</div>;
}
```

#### Step 4a: Mid-render context / client swap (architectural, no drop-in)

Some Remko apps build a **different** `ServerContext` mid-render to overlay a
distinct Graph client for a subtree — typical use case: a page runs its main
query against the current preview client, then swaps in a stable public
client to fetch shared global-layout data whose preview token has expired.

A common shape is a `buildDefaultLayoutRenderContext` helper (invoked from
a handful of specialised page components such as `AuthorPage.tsx` or
`CompanyPage.tsx`) that constructs a fresh `ServerContext` and passes it as
`ctx={contentCtx}` to a nested `CmsContentArea`.

**The SDK has no equivalent seam.** `withAppContext` is a per-request
singleton — writing a new context value with `setContext(...)` before rendering
a subtree leaks to siblings and to the rest of the request. Recognise this as
an **architectural** decision, not a mechanical rewrite. Two supported
workarounds:

- **Explicit client prop threading.** Instantiate the alternate client at the
  page level, then thread it as an explicit `client` prop down into the
  subtree that needs it. The nested components accept a `client: GraphClient`
  prop and call typed fetch methods directly, bypassing `getContext()` for
  that data.
- **Pre-fetch at the page, pass resolved data down.** Instead of handing a
  different *client* to the subtree, do the alternate fetch at the page and
  pass **resolved data** into the subtree as props. This is often cleaner
  when the alternate-client scope is small (a single global layout query,
  not a whole content area).

Document the choice per site — the affected pages plus any downstream
blocks that render inside them (e.g., `AuthorDocListBlock` /
`CompanyDocListBlock`) all need the same decision applied consistently.

#### Step 4b: Non-React helpers that consume `ctx`

`getContext()` only works in **React server-component scope**. It cannot be
called from:

- Plain runtime service functions that today accept `ctx` as a parameter
  (common examples: `getPeople({ ctx })`, `getCollectionBlockResults(...)`,
  `documentsHelpers`, `enrichDocsWithAttribution`).
- Client components that receive `ctx` from a server component parent (a
  typical shape: `SiteChromeClient` receiving `ctx` from a server
  `SiteChrome`).

For these, the migration pattern is **explicit parameter threading, not
`getContext()`**. Two options:

- Change the function signature from `({ ctx })` to `({ client })` and have
  the calling server component pass `getClient()` (or the per-call preview
  token). The function stays pure with respect to request scope.
- If the function needs the preview token specifically, add a
  `previewToken?: string` parameter and let the caller pass
  `getContext()?.preview_token` from server scope.

Do NOT rewrite these helpers to call `getContext()` internally — it will
throw or return `undefined` outside a server-component request.

### Step 5: Migrate Per-Component Code

Update each CMS component file to use the official SDK imports and patterns.

**Before — Remko component (server component, e.g. `Article.tsx`):**

```tsx
import { type CmsComponent } from '@remkoj/optimizely-cms-react';
import { RichText } from '@remkoj/optimizely-cms-react/components';

// Remko component shape (uses GraphQL fragment or data query)
export const Article: CmsComponent<ArticleDataFragment> = ({ data }) => {
  return (
    <article>
      <h1>{data.heading}</h1>
      <RichText text={data.body} />
    </article>
  );
};

// Remko GraphQL fragment (used by factory for auto-fetching)
Article.getDataFragment = () => ['fragment ArticleData on Article { … }'];
```

**After — Content JS SDK component:**

```tsx
import { contentType, ContentProps } from '@optimizely/cms-sdk';
import { RichText } from '@optimizely/cms-sdk/react/richText';

export const ArticleContentType = contentType({
  key: 'Article',
  baseType: '_page',
  properties: {
    heading: { type: 'string' },
    body: { type: 'richText' },
  },
});

type Props = {
  content: ContentProps<typeof ArticleContentType>;
};

export default function Article({ content }: Props) {
  return (
    <article>
      <h1>{content.heading}</h1>
      <RichText content={content.body?.json} />
    </article>
  );
}
```

**Critical migration notes:**

1. **No GraphQL fragments.** The target uses typed content models (via
   `contentType()`), not GraphQL fragments. The `ArticleContentType` defines
   the schema and is registered via `initContentTypeRegistry([…])`.

2. **`content` prop, not `data`.** The target passes the fetched content
   object as the `content` prop. No `getDataFragment` method.

3. **`RichText` prop changed.** Remko takes `text={data.body}`. The target
   takes `content={content.body?.json}` (the `.json` field from the rich-text
   property).

4. **Import paths changed.** `@remkoj/optimizely-cms-react` →
   `@optimizely/cms-sdk`; `@remkoj/optimizely-cms-react/components` →
   `@optimizely/cms-sdk/react/richText`.

5. **`WithContainerKey<T>` and similar structural wrappers preserve.** If
   the customer has a local generic like
   `type WithContainerKey<T> = T & { containerKey?: string }` layered on a
   Remko type (a common home for this is a `remkojExt.ts` wrapper around
   `ContentAreaItemDefinition`), the migration pattern is to keep the
   wrapper and change only the wrapped type. The augmentation itself
   (spread + optional field) is content-type-agnostic and does not depend
   on Remko runtime behaviour, so it composes cleanly with the SDK's
   `ContentProps`:

   ```ts
   // Before — Remko substrate
   import type { ContentAreaItemDefinition } from '@remkoj/optimizely-cms-react/rsc';
   type WithContainerKey<T> = T & { containerKey?: string };
   type Item = WithContainerKey<ContentAreaItemDefinition>;

   // After — SDK substrate; wrapper unchanged
   import type { ContentProps } from '@optimizely/cms-sdk';
   import { XxxContentType } from './XxxContentType';
   type WithContainerKey<T> = T & { containerKey?: string };
   type Item = WithContainerKey<ContentProps<typeof XxxContentType>>;
   ```

   The `WithContainerKey` name and the runtime spread logic that reads
   `item.containerKey` both survive verbatim.

#### Step 5a: Components with display settings / variants

If a Remko component read `layoutProps` (via `readSetting` / `extractSettings`)
or was registered more than once with a `variant`, author a `displayTemplate()`
alongside its `contentType()` and take a second `displaySettings` prop.

**Before — Remko (variant read via `readSetting`):**

```tsx
import { type CmsComponent } from '@remkoj/optimizely-cms-react';
import { readSetting } from '@remkoj/optimizely-cms-react/components';

export const ArticleCard: CmsComponent<ArticleCardDataFragment, StylesLayout> = ({
  data,
  layoutProps,
}) => {
  const color = readSetting(layoutProps, 'color', 'default');
  return <article className={`card-${color}`}>{data.heading}</article>;
};
```

**After — Content JS SDK.** `ArticleCard/displayTemplate.ts`:

```ts
import { displayTemplate } from '@optimizely/cms-sdk';

export const ArticleCardTemplate = displayTemplate({
  key: 'ArticleCardStyles',
  // The content-type key this template applies to.
  baseType: 'ArticleCard',
  displayName: 'Article Card Styles',
  settings: {
    color: {
      editor: 'select',
      choices: { default: { displayName: 'Default' }, dark: { displayName: 'Dark' } },
    },
  },
});
```

`ArticleCard.tsx` (reads `displaySettings` with plain optional chaining):

```tsx
import { type ContentProps } from '@optimizely/cms-sdk';
import { ArticleCardContentType } from './ArticleCard.contentType';
import { ArticleCardTemplate } from './displayTemplate';

type Props = {
  content: ContentProps<typeof ArticleCardContentType>;
  displaySettings?: ContentProps<typeof ArticleCardTemplate>;
};

export default function ArticleCard({ content, displaySettings }: Props) {
  const color = displaySettings?.color ?? 'default'; // replaces readSetting
  return <article className={`card-${color}`}>{content.heading}</article>;
}
```

Register the template in `initDisplayTemplateRegistry([ArticleCardTemplate])`
and route variants via colon/tag keys in the resolver (Step 3). Do **not**
collapse two variant entries to one resolver key.

#### Step 5b: `CmsEditable` — two modes, only one is deletable

`CmsEditable` has **two distinct usages**. Categorize each occurrence before
touching it (the demo has 94 of them).

- **Mode A — field/attribute wrapper** (`<CmsEditable cmsFieldName="heading">`):
  emits `data-epi-*` edit attributes around a field. **Framework-owned — delete
  the wrapper.** The target injects edit attributes automatically when the
  component renders through `OptimizelyComponent` in a preview request.

  ```tsx
  // Before
  <CmsEditable cmsFieldName="heading"><h1>{data.heading}</h1></CmsEditable>
  // After — just the element; framework adds the edit marker.
  <h1>{content.heading}</h1>
  ```

- **Mode B — render wrapper** (`<CmsEditable as={SomeComponent} …>`): renders a
  (often client) component **and bridges a curated set of server→client props**.
  This is **not** a passthrough spread and is **not** deletable. Replace it with
  an explicit render of the target component, passing only the props it needs:

  ```tsx
  // Before — Remko render wrapper
  <CmsEditable as={Carousel} data={data} forwardCtx={ctx} />
  // After — explicit render; hand-pick the props (NOT {...data})
  <Carousel data={content} inEditMode={getContext()?.inPreviewMode} />
  ```

  Document each Mode B site — the prop set is component-specific. Do **not**
  spread the whole content object; carry across only what the child consumed.

#### Step 5c: ContentArea with wrappers (`noWrapper` / `itemWrapper`)

A plain content area maps to `OptimizelyComponent` inline (see the mapping ref).
Remko's advanced `CmsContentArea` props do **not** survive a bare `.map()`:

- **`itemWrapper`** — Remko wraps each item in an element. Re-express it as the
  element you render around each mapped item:

  ```tsx
  {content.mainArea?.map((item) => (
    <div className="col" key={item._metadata.key}>
      <OptimizelyComponent content={item} />
    </div>
  ))}
  ```

- **`noWrapper`** — Remko suppresses its own wrapper. There is **no target
  analogue** because the inline `.map()` adds no wrapper to begin with; it is a
  no-op you simply drop.

#### Step 5d: Visual Builder experience / structure nodes

Remko branched on node type with `isNode` / `isComponentNode` /
`isStructureNode`. Those guards are **internal** in the target — render
experiences through `OptimizelyComposition` and let it dispatch:

```tsx
import { getClient } from '@optimizely/cms-sdk';
import {
  OptimizelyComposition,
  setContext,
} from '@optimizely/cms-sdk/react/server';

export async function ExperiencePage({ path }: { path: string }) {
  const content = await getClient().getContentByPath(path);
  const experience = content[0];
  setContext({
    currentContent: experience,
    locale: experience?._metadata?.locale,
    type: experience?.__typename,
    key: experience?._metadata?.key,
  });
  // OptimizelyComposition walks the experience's grid/rows/columns/elements.
  return <OptimizelyComposition nodes={experience?.composition?.nodes ?? []} />;
}
```

**`OptimizelyComposition` prop shape changed (`node` → `nodes`).** Remko's
component took a single `node` prop pointing at the whole composition
subtree: `<OptimizelyComposition node={x} />`. The SDK's signature is
plural: `<OptimizelyComposition nodes={x.nodes} />`. This is not merely a
guard drop; every call site (typically in experience components like
`BlankExperience/index.tsx` and `StartPageExperience/index.tsx`) must pass
the `.nodes` array, not the composition object itself. Grep for
`<OptimizelyComposition` and verify each site.

**Inline replacements for `Utils` helpers.** The Remko `Utils` namespace
is not exported by the SDK. The two members typically in use:

- `Utils.isNonEmptyString(v)` → inline `typeof v === 'string' && v.length > 0`
- `Utils.normalizeContentType(types)` → inline
  `Array.isArray(types) ? types.filter(t => typeof t === 'string' && t.length > 0) : []`

  Remko's `normalizeContentType(types, true)` accepts an optional second
  argument that biases ordering toward the most-concrete type first. For
  the common downstream usage (feeding a `Set` and calling `.has(...)` for
  membership checks — e.g., a `resolvePreviewChromeMode.ts`-style module)
  ordering does not affect behaviour and the argument can be omitted.
  Verify your call sites: if any consume the array in **iteration order**
  (e.g., picking the first match), preserve concrete-first ordering by
  reading the Remko implementation once and inlining the same sort.

Do not import a guard from a shared file — inline the one-liner per
callsite. There are typically only 1–2 of them per app.

### Step 6: Verify Migration

1. **TypeScript compilation check**:
   ```bash
   npx tsc --noEmit
   ```
   Fix any remaining import errors or type mismatches.

2. **Build the app**:
   ```bash
   yarn build
   ```

3. **Runtime smoke test** — start the app and verify components render:
   ```bash
   yarn dev
   ```
   Navigate to a page that uses a migrated component (e.g., an Article page)
   and confirm it renders correctly.

4. **Check for dual-React issues** — if you see errors like "invalid hook
   call" or "multiple copies of React", ensure the project has only one React
   version installed:
   ```bash
   yarn why react
   ```
   Remove duplicate React installs if found.

5. **Verify rich-text rendering** — if the project uses custom rich-text
   nodes, check that the built-in `RichText` component covers them. If not,
   use the `elements` prop to customize (docs
   `10-richtext-component-react.md`).

CRITICAL: Do not report migration complete until `yarn build` succeeds and the
runtime smoke test confirms components render.

## Common Pitfalls

1. **Server vs client component boundary** — The target's
   `@optimizely/cms-sdk/react/server` exports are server-only (they import
   `'server-only'`). Client components must import from
   `@optimizely/cms-sdk/react/client`. If you see errors like "server-only
   module imported into client component", move the import to a server
   component or use the client subpath.

2. **Factory registration timing** — `initReactComponentRegistry` must be
   called in the root layout **before** any component renders. If you see
   errors like "component not found" or "undefined component", confirm the
   registration happens in `layout.tsx` and is not deferred.

3. **Dual-React duplication** — If you see "invalid hook call" or "multiple
   copies of React" errors, the project has duplicate React installs. Run
   `yarn why react` and remove duplicates. This is common when migrating from
   Remko because the Remko packages pin a specific React version.

4. **`RichTextComponentDictionary` has no registration equivalent** — Do NOT
   try to register a rich-text dictionary. The target ships a built-in
   `RichText` component (`@optimizely/cms-sdk/react/richText`) with default
   node renderers (docs `10-richtext-component-react.md`). If you need custom
   rich-text nodes, use the `elements` prop on `RichText`, not a dictionary
   registration.

5. **`RichText` prop changed** — Remko's `RichText` takes `text={data.body}`.
   The target takes `content={content.body?.json}` (the `.json` field). Do not
   pass the raw `body` property.

6. **`CmsContent` auto-fetching removed** — Remko's `CmsContent` fetches
   content by `contentLink` internally. The target's `OptimizelyComponent`
   does NOT auto-fetch — call `getClient().getContent(…)` or
   `getContentByPath(…)` yourself, then pass the result to
   `OptimizelyComponent`. Do not expect auto-fetching.

7. **`ServerContext` is not a class** — Remko's `ServerContext` is a class you
   instantiate (`new ServerContext({ … })`). The target has no `ServerContext`
   class. Wrap pages in `withAppContext` and use `getContext()` /
   `setContext()` for request-scoped context. Do not try to instantiate a
   context object.

8. **`initContentTypeRegistry` is a ROOT export** — Do NOT import
   `initContentTypeRegistry` from `./react/server`. It is a root export of
   `@optimizely/cms-sdk`. The correct import is
   `import { initContentTypeRegistry } from '@optimizely/cms-sdk'`.

9. **`resolver` object keys are content-type keys, not component names** — The
   `resolver` object in `initReactComponentRegistry({ resolver })` maps
   content-type keys (e.g., `"Article"`) to components. The keys must match
   the `key` field in the `contentType({ key: '…' })` definition, not the
   React component name (though by convention they often match).

10. **ContentArea rendering changed** — Remko's `CmsContentArea` is replaced
    by an inline `.map()` over the content-area array + `OptimizelyComponent`
    per item. There is no drop-in `CmsContentArea`. Advanced props do not
    carry over automatically: `itemWrapper` becomes the element you render
    around each mapped item; `noWrapper` has **no analogue** (the inline map
    adds no wrapper anyway — drop it). See Step 5c.

11. **`CmsEditable` is two components in one — do not blanket-delete** —
    Mode A (`cmsFieldName="…"`, field/attribute wrapper) is framework-owned:
    delete it. Mode B (`as={Component} …`, render wrapper) renders a component
    and bridges curated server→client props: it is **not** a spread and **not**
    deletable — replace it with an explicit `<Component …/>` passing only the
    props the child used. Categorize every occurrence first (Step 5b). A
    find-and-delete on all `CmsEditable` silently drops Mode B renders.

12. **Do not flatten variant registrations** — Remko registers one content type
    multiple times via an **array** with `variant`. A resolver **object** cannot
    hold two keys for the same type — the second overwrites the first with a
    green type-check, dropping a renderer. Carry every variant across as a
    colon key (`'Type:tag'`) or nested tag map, register each variant's
    `displayTemplate()`, and select at render with `tag="…"` (Step 3, Step 5a).

## Related Skills

- `optimizely-remko-graph-client-to-content-js` — Migrate `@remkoj/optimizely-graph-client` (Graph client, fetching) — **complete this first**
- `optimizely-remko-cms-nextjs-to-content-js` — Migrate `@remkoj/optimizely-cms-nextjs` (Next.js integration, preview/OPE)
- `optimizely-remko-graph-functions-to-content-js` — Migrate `@remkoj/optimizely-graph-functions` (codegen)
- `optimizely-remko-cms-cli-to-content-js` — Migrate `@remkoj/optimizely-cms-cli` (`opti-cms` → `optimizely-cms-cli`)
- `optimizely-remko-graph-cli-to-content-js` — Migrate `@remkoj/optimizely-graph-cli` (`opti-graph` → `optimizely-cms-cli`)
- `optimizely-remko-cms-api-to-content-js` — Migrate `@remkoj/optimizely-cms-api` (Integration API client; straddle skill, do last)

**Shared references (read first)**:

- `../_shared-references/package-and-import-mapping.md` — Package/import subpath mapping
- `../_shared-references/auth-and-env-mapping.md` — Environment variables + CMS-55679 gotcha
- `../_shared-references/setup-and-di.md` — Channel/client init + factory registration + context wiring
- `../_shared-references/customer-artifacts-and-coexistence.md` — Patches, wrappers, forked codegen discovery + Replace/Retain/Remove framework + coexistence rules

## References

- **Official Optimizely migration guide** — *Migrating from Remko.J to the
  Optimizely CMS JavaScript SDK*. Source of the Replace / Retain / Remove
  framing at the top of this skill and the "assess, don't rebuild"
  positioning. See
  `../_shared-references/customer-artifacts-and-coexistence.md` for the
  full reference.
- **Optimizely CMS JavaScript SDK repo** (official) —
  https://github.com/episerver/content-js-sdk
- **Optimizely CMS SDK + Next.js 16 starter** (primary practical example
  for the target architecture demonstrated in this skill) —
  https://github.com/episerver/content-js-sdk/tree/main/samples/nextjs-template
- **Direct-Graph Next.js 15 starter** (Szymon Uryga; supplementary — useful
  when deciding what should stay as direct-Graph code and what should move
  into the SDK) —
  https://github.com/SzymonUryga/optimizely-graph-nextjs-starter
