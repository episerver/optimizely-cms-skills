# CMS React API Mapping: Remko SDK → Content JS SDK

Complete mapping of `@remkoj/optimizely-cms-react` symbols to their
`@optimizely/cms-sdk` equivalents. Every row is grounded in the real exports
of each package (source: `@remkoj/optimizely-cms-react`, target:
`@optimizely/cms-sdk`), read 2026-09-11.

## Prerequisite — React 19 / Next 14 (do this first)

> **`@optimizely/cms-sdk` requires React ≥19 and Next ≥14.** This is declared in
> the target's `package.json` (`peerDependencies: { react: ">=19.0.0", next: ">=14.0.0" }`)
> and is **not** stated anywhere in the target docs — so it is easy to miss until
> installs fail. Many real Remko apps run **React 18** (the `cms-saas-vercel-demo`
> reference app is on 18.3.1). **You cannot install the target SDK on a React-18
> app.** Upgrade the framework **before** touching component code:
>
> 1. `react` and `react-dom` to `^19`, `@types/react`/`@types/react-dom` to `^19`.
> 2. `next` to `≥14` (React 19 support is best on Next 15 — verify against the app's Next version).
> 3. Resolve React-19 breaking changes (e.g. `useRef` now requires an argument, stricter `ref` typing, removed legacy APIs) and get a clean build.
> 4. Only then proceed with the component migration below.
>
> Treat this as **step 0** of the whole migration, not part of any single
> component conversion.

## Component factory and registration

The Remko factory pattern (create instance, register dictionaries) becomes a
single declarative registration call.

| Remko symbol (subpath) | signature | @optimizely equivalent | migration note |
|---|---|---|---|
| `DefaultComponentFactory` (`./rsc`) | `class DefaultComponentFactory implements ComponentFactory` | `initReactComponentRegistry({ resolver })` | The factory class + `registerAll` pattern is replaced by a single `initReactComponentRegistry({ resolver: { ContentTypeKey: Component } })` call in the root layout. See `setup-and-di.md`. |
| `ComponentFactory` (`./rsc`) | `interface ComponentFactory` (factory interface) | — no direct equivalent | The factory abstraction is removed. Component registration is declarative via `initReactComponentRegistry({ resolver })`. |
| `registerAll()` (`./rsc` factory method) | `factory.registerAll(dict)` | `initReactComponentRegistry({ resolver })` | Remko's `registerAll(cmsComponents)` becomes a single `resolver` object passed to `initReactComponentRegistry`. See `setup-and-di.md`. |
| `RichTextComponentDictionary` (`./rsc`) | `const RichTextComponentDictionary: ComponentTypeDictionary` | — no direct equivalent | **No registration needed**. The rich-text node renderers are built into the `RichText` component (`@optimizely/cms-sdk/react/richText`). Do NOT register a rich-text dictionary. See `10-richtext-component-react.md`. |
| `UndefinedComponentFactory` (`./rsc`) | `class UndefinedComponentFactory` (error factory) | — no direct equivalent | Not needed. The target SDK handles missing components internally. |

## Server components and rendering (RSC surface)

The Remko `./rsc` subpath becomes the target's `./react/server`.

| Remko symbol (subpath) | signature | @optimizely equivalent | migration note |
|---|---|---|---|
| `OptimizelyComponent` (`./rsc`) | `function OptimizelyComponent({ contentLink, … })` (RSC) | `OptimizelyComponent` (`./react/server`) | Remko's `OptimizelyComponent` (with `contentLink` + `ctx` props) → target `OptimizelyComponent` (with `content` prop). Signature changed: Remko takes a `contentLink` + `ServerContext`; target takes fetched `content` directly. See below for `CmsContent`. |
| `CmsContent` (`./rsc`) | `function CmsContent({ contentLink, ctx, … })` (RSC) | `OptimizelyComponent` (`./react/server`) | Remko's `CmsContent` (fetch-and-render by `contentLink`) is replaced by the target's `OptimizelyComponent` (render pre-fetched `content`). The target does NOT auto-fetch — call `getClient().getContent(…)` or `getContentByPath(…)` yourself, then pass the result to `OptimizelyComponent`. |
| `ServerContext` (`./rsc`) | `class ServerContext({ factory, client, mode })` | `withAppContext` + `getContext` / `setContext` (`./react/server`) | Remko's explicit `ServerContext` object threaded through pages → target's request-scoped context. Wrap pages in `withAppContext`, populate context via `setContext`, read via `getContext`. See `setup-and-di.md`. |

## Client components

The Remko `.` subpath (client re-exports) becomes the target's `./react/client`.

| Remko symbol (subpath) | signature | @optimizely equivalent | migration note |
|---|---|---|---|
| `Version` (`.`) | `const Version: string` | — no direct equivalent | Version constant not exposed. Check `package.json` or docs if needed. |
| `Errors` (`.`) | error types (re-export) | — no direct equivalent (not a public export) | The target's `OptimizelyReactError` class is internal (thrown by `OptimizelyComponent`), not exported from any public subpath. Catch errors with a standard `try/catch` or a React error boundary; do not import an error type. |
| `Utils` (`.`) | utility re-exports | — no direct equivalent | Most client utility functions are internal. Specific needs require case-by-case checking. |

## Component-authoring types (the vocabulary you actually write)

This is the highest-volume, highest-friction part of the migration. Almost every
CMS component in a Remko app is typed against `CmsComponent<Fragment>` and its
family. The target uses a **different type model**: components are typed with
`ContentProps<typeof YourContentType>` over a **hand-authored `contentType()`**
object, and they receive a single `content` prop (already-fetched, typed data)
instead of Remko's `{ contentLink, data, layoutProps, ctx }` bundle. These are
**not drop-in renames** — the shapes differ. See the worked example at the end.

| Remko symbol (subpath) | shape | @optimizely equivalent | migration note |
|---|---|---|---|
| `CmsComponent<T>` (`.`) | `type CmsComponent<T = DocumentNode, L = Record<string,any>>` — a component that must also carry `getDataQuery`/`getDataFragment`; its props are `CmsComponentProps<T, L>` | **A plain component typed `{ content: ContentProps<typeof XxxContentType> }`** | The single most-used symbol. Remko couples the component to a **GraphQL fragment** (`T`) and attaches data-fetching statics. The target **decouples** them: fetching is done by `GraphClient` upstream, and the component just renders a typed `content` prop. Drop `getDataQuery`/`getDataFragment` entirely; replace `T` (a codegen fragment) with `typeof XxxContentType` (your `contentType()` object). |
| `CmsComponentProps<T, L>` (`.`) | `{ contentLink, data: T, inEditMode?, layoutProps?: L, editProps?, ctx?: GenericContext }` | `{ content: ContentProps<typeof XxxContentType>, displaySettings?: ContentProps<typeof XxxDisplayTemplate> }` | The prop bundle collapses: `data` → `content` (typed by your content type, not a fragment); `layoutProps` → `displaySettings` (typed by a `displayTemplate()`); `contentLink`/`inEditMode`/`editProps`/`ctx` are handled by the framework (`OptimizelyComponent` + request-scoped context), not passed as props. |
| `WithGqlFragment<C, D>` (`.`) | `C & { getDataFragment, validateFragment? }` — binds a component to its GraphQL fragment | — **no direct equivalent (by design)** | The whole "component carries its own fragment" mechanism is gone. The target derives the shape from your `contentType()` schema, so there is nothing to bind. Delete the HOC/type; do not look for a replacement. |
| `CmsLayoutComponent<T, L>` (`.`) | `ReactComponentType<CmsComponentProps<T, L>>` — component type for VisualBuilder nodes/layouts | A component typed `{ content: ContentProps<typeof XxxContentType>, displaySettings?: ContentProps<typeof XxxDisplayTemplate> }` | Same collapse as `CmsComponent`. Layout/section/experience nodes are authored the same way as any other component and rendered through `OptimizelyComponent` / `OptimizelyComposition`. See the `optimizely-experience-composition` skill for structure/section nodes. |
| `GenericContext` (`.`) | interface `{ client?, factory, locale?, inEditMode, inPreviewMode, isDevelopment, isDebug, isDebugOrDevelopment, editableContent?, editableContentIsExperience? }` | `getContext()` return (`ContextData`) from `@optimizely/cms-sdk/react/server` | Remko threads a `ctx: GenericContext` prop through components. The target makes context **request-scoped**: call `getContext()` inside the component/page instead of receiving a `ctx` prop. Populate it with `setContext()` and wrap the page in `withAppContext`. `factory` has no analogue (registration is declarative); `client` comes from `getClient()`; `inEditMode`/`inPreviewMode` are on the `getContext()` result. See `setup-and-di.md`. |
| `LayoutProps<T>` (`./components`) | `{ type, layoutType: string, template: T['key'] \| null, settings: LayoutPropsSetting<T['settings']>[] }` — VisualBuilder display-settings bundle | **typed `displaySettings?: ContentProps<typeof XxxDisplayTemplate>` prop** | **Different mechanism, not a rename.** Remko carries settings as an array you read with `readSetting`/`extractSettings`. The target defines display settings with **`displayTemplate()`** and hands them to the component as an already-typed `displaySettings` object read with plain optional chaining (`displaySettings?.color`). See the `optimizely-display-templates` skill and docs `9-display-settings.md`. |
| `LayoutPropsSettingKeys<T>` (`./components`) | union of the setting keys | `keyof ContentProps<typeof XxxDisplayTemplate>` | The key union comes for free from the typed `displaySettings` object. No dedicated helper type needed. |
| `LayoutPropsSettingValues<T>` (`./components`) | value type for a given setting key | the property type on `ContentProps<typeof XxxDisplayTemplate>` | As above — index the typed `displaySettings` type instead of a helper. |
| `NodeInput` (`./components`, rich-text) | `string \| RichTextNode \| StringNode` | — no direct equivalent (internal) | Rich-text node input typing is internal to the target `RichText` component. Author custom renderers with `ElementProps` / `LeafProps` from `@optimizely/cms-sdk/react/richText` instead. See the Rich text section below. |
| `TypedNode` (`./components`, rich-text) | node with `type: string` + scalar attrs + optional `children` | `ElementProps` (`./react/richText`) for custom element renderers | Where you inspected `TypedNode` to render rich-text elements, use the target's `elements` prop with `ElementProps`-typed renderers. |
| `isNode` / `isComponentNode` / `isStructureNode` / `isComponentNodeOfType` (`./rsc`, VisualBuilder) | node type guards for composition | — no direct equivalent (internal) | Composition node dispatch is internal to `OptimizelyComponent` / `OptimizelyComposition`. You should not need to branch on node type by hand; render nodes through those components. If you have genuinely custom composition logic, isolate it and document it — there is no public guard to import. |

## Rich text

The Remko `./components` subpath becomes the target's `./react/richText`.

| Remko symbol (subpath) | signature | @optimizely equivalent | migration note |
|---|---|---|---|
| `RichText` (`./components`) | `function RichText({ text, … })` | `RichText` (`./react/richText`) | Component renamed to accept `content` prop (not `text`). Signature: `<RichText content={richTextField?.json} />`. See docs `10-richtext-component-react.md`. |
| `DefaultComponents` (`./components`) | default rich-text node renderers | — no direct equivalent (built-in) | Built into the target `RichText` component. Do NOT register. Customize via the `elements` prop if needed. |
| `createHtmlComponent` (`./components`) | `function createHtmlComponent(…)` | `createHtmlComponent` (`./react/richText`) | Available for custom element creation if needed. Signature may differ; verify against target docs. |
| `extractSettings` / `readSetting` (`./components`) | `readSetting(layoutProps, key, default?)` returns one setting value; `extractSettings(layoutProps)` returns a `{ key: value }` map of all settings | **Typed `displaySettings` prop + optional chaining** | These exist because Remko stores display settings as an **array** that needs a lookup helper. The target hands you a **typed object**, so the helpers vanish: `readSetting(layoutProps, 'color', 'default')` → `displaySettings?.color ?? 'default'`; `extractSettings(layoutProps)` → just use `displaySettings` (it already is the map). Define the available settings with `displayTemplate()`. See the recipe row below and docs `9-display-settings.md`. |

## No direct equivalent

The following Remko symbols have **no public equivalent** in `@optimizely/cms-sdk`.
Stop and document usage; do not invent a replacement.

### Factory / registration internals

| Remko symbol | purpose | recommended migration |
|---|---|---|
| `ComponentFactory` interface | Factory abstraction for registering components | **No direct equivalent**. Registration is declarative: `initReactComponentRegistry({ resolver: { Article } })` in the root layout. See `setup-and-di.md`. |
| `UndefinedComponentFactory` | Error factory for missing components | **No direct equivalent**. The SDK handles missing components internally. |
| `EmptyComponentHandle` | Placeholder for empty/missing components | **No direct equivalent**. Not needed — missing components render a default fallback. |
| `getFactory()` | Retrieve cached factory instance | **No direct equivalent**. No factory instance to retrieve. Components are registered once via `initReactComponentRegistry`. |

### Server context internals

| Remko symbol | purpose | recommended migration |
|---|---|---|
| `getServerContext()` | Retrieve the shared server context | **No direct equivalent**. Use `getContext()` from `./react/server` to read request-scoped context. See `setup-and-di.md`. |
| `updateSharedServerContext()` | Update the global server context | **No direct equivalent**. Use `setContext()` from `./react/server` to write request-scoped context. See `setup-and-di.md`. |
| `serverContextAware()` | HOC to inject server context | **No direct equivalent**. Wrap pages in `withAppContext` and read context via `getContext()`. |
| `fromTransferrableContext()` / `isTransferrableContext()` | Serialize/deserialize server context | **No direct equivalent**. Not applicable — context is request-scoped, not serialized. |

### Client context internals

| Remko symbol | purpose | recommended migration |
|---|---|---|
| `ClientContextInstance` | Client-side context implementation | **No direct equivalent**. Client-side context wiring is internal. |
| `clientContextAware()` | HOC to inject client context | **No direct equivalent**. Not needed for typical server-component rendering. |
| `useOptimizelyCms()` | Hook to access CMS context | **No direct equivalent**. Server components use `getContext()` directly. Client components needing CMS data should receive it as props. |
| `OptimizelyCms` | Context provider component | **No direct equivalent**. Not needed — the SDK provides context internally. |

### Component composition internals

| Remko symbol | purpose | recommended migration |
|---|---|---|
| `OptimizelyComposition` | Low-level composition/node renderer | `OptimizelyComposition` (`./react/server`) exists, but typical usage is via `OptimizelyComponent`. Check target docs if low-level composition logic is needed. |
| `CmsContentArea` (plain) | ContentArea renderer that maps over an array of content-area items and renders each | **Map + `OptimizelyComponent`** | Recipe: a content-area property is typed as an array on your `content` prop. Render it by mapping and delegating each item to `OptimizelyComponent`: `{content.mainArea?.map((item) => <OptimizelyComponent key={item._metadata.key} content={item} />)}`. There is no dedicated `CmsContentArea` component — the array-of-items rendering is done inline with the same `OptimizelyComponent` you use everywhere. For full experiences/sections use `OptimizelyComposition` (see the `optimizely-experience-composition` skill). |
| `CmsContentArea` **with `itemWrapper` / `noWrapper`** | advanced props: `itemWrapper` wraps each rendered item in an element; `noWrapper` suppresses the outer wrapper | **inline element per item / drop the prop** | These advanced props are **dropped by a bare `.map()` and must be re-expressed by hand**. `itemWrapper={El}` → render `El` around each mapped item: `{content.area?.map((item) => <div className="col" key={item._metadata.key}><OptimizelyComponent content={item} /></div>)}`. `noWrapper` has **no target analogue** — the inline map adds no wrapper to begin with, so it is a no-op you delete. Other Remko `CmsContentArea` props (`className` on the outer wrapper, `variant`) likewise become plain JSX you author around the map. |
| `CmsEditable` **Mode A** (field/attribute wrapper: `cmsFieldName="…"`) | Server wrapper injecting `data-epi-*` attributes around a single field for in-context (on-page) editing | **Framework-owned — remove the wrapper** | Recipe: delete `<CmsEditable cmsFieldName="…">` wrappers. The target injects edit/preview attributes automatically when the component is rendered via `OptimizelyComponent` inside a page wrapped in `withAppContext` and the request is in preview mode (`getContext()?.inPreviewMode`). You do **not** hand-author `data-epi-*` attributes. If a specific element needs an edit marker the framework did not add, stop and consult docs `7-live-preview.md` — do not reimplement the Remko attribute logic. See the `optimizely-preview` skill. |
| `CmsEditable` **Mode B** (render wrapper: `as={Component} data={…} forwardCtx={…}`) | Renders a (often client) component and **bridges a curated set of server→client props** across the RSC boundary | **explicit `<Component …/>` with hand-picked props — NOT deletable, NOT a spread** | This is the load-bearing distinction: `as=` means `CmsEditable` is *rendering a component*, not just decorating a field. It selectively forwards props (not the whole `data` object) so a server component can hand data to a client component. Replace with an explicit render passing **only the props the child consumed**: `<Carousel data={content} inEditMode={getContext()?.inPreviewMode} />`. Do **not** blanket-delete (you lose the render) and do **not** `{...content}` spread (you leak/serialize the wrong shape across the boundary). Categorize every `CmsEditable` occurrence as Mode A vs Mode B **before** editing — a find-and-delete pass corrupts Mode B sites. |

### Utility and helper functions

| Remko symbol | purpose | recommended migration |
|---|---|---|
| `getContentById()` / `getContentByPath()` | Fetch content helpers | **Graph client methods** (`GraphClient.getContent()` / `getContentByPath()`), not React component helpers. Import from `@optimizely/cms-sdk` (root), not the React surface. See the `graph-client` migration skill. |
| `resolveComponent()` / `resolveContentType()` | Component/type resolution | — no direct equivalent (internal) | Component resolution is handled internally by `OptimizelyComponent`. Do not call directly. |
| `contentLinkToRequestVariables()` | Convert ContentLink to GraphQL variables | — no direct equivalent | The target SDK uses typed content keys/paths, not `ContentLink` structures. See the `graph-client` migration skill. |
| `isDebug()` / `isDevelopment()` | Environment checks | — no direct equivalent | Use `process.env.NODE_ENV === 'development'` or custom env vars. |
| Node type guards (`isNode`, `isComponentNode`, `isStructureNode`, `isComponentNodeOfType`) | Type guards for VisualBuilder composition nodes | — no direct equivalent (internal) | See the **Component-authoring types** section above. Node dispatch is internal to `OptimizelyComponent` / `OptimizelyComposition`; render nodes through those. Note: Remko's VisualBuilder `isElementNode` is a **deprecated alias** of `isComponentNode`, and rich-text has **no** `isElementNode` at all — do not port either. |
| `extractSettings()` / `readSetting()` | display-settings lookup helpers over `LayoutProps` | **typed `displaySettings` prop** | See the concrete recipe in the **Rich text** table row above and the **Component-authoring types** section: `readSetting(lp, 'k', d)` → `displaySettings?.k ?? d`; `extractSettings(lp)` → `displaySettings`. Settings are declared with `displayTemplate()`. |
| `createHtmlComponent()` (beyond basic usage) | Advanced HTML component factory | `createHtmlComponent` (`./react/richText`) exists but is advanced. Prefer standard React components unless you need custom element wiring. |

### Types and interfaces

Most Remko types have no direct target equivalent because the composition/factory
pattern changed. Key types:

| Remko type | purpose | recommended migration |
|---|---|---|
| `ComponentFactory` | Factory interface | **No direct equivalent**. Use `initReactComponentRegistry({ resolver })`. |
| `ServerContext` | Server context type | **No direct equivalent**. Context is request-scoped; read/write via `getContext()` / `setContext()`. |
| `ComponentTypeDictionary` | Type for component registration objects | **No direct equivalent**. The `resolver` object in `initReactComponentRegistry({ resolver })` is a plain object literal `{ [key: string]: ComponentType }`. |
| `CmsComponentProps`, `CmsContentProps`, etc. | Component prop types | **No direct equivalent**. See the **Component-authoring types** section above and the **worked example** below. Props become `{ content: ContentProps<typeof YourContentType>, displaySettings?: ContentProps<typeof YourDisplayTemplate> }`. |
| `RichTextProps` | RichText component props | `RichTextProps` (`./react/richText`) — target exports this. Import from `@optimizely/cms-sdk/react/richText`. |

## Worked example — one component, end to end

This is the atomic unit of the migration: ~90% of the work is converting
fragment-typed components into `contentType()` + `ContentProps` components. Do
this once by hand, understand each moving part, then repeat it per component.

### Before — Remko (fragment-typed component)

Two files feed one component: a `.graphql` fragment (codegen input) and the
component itself, typed over the **generated** fragment type.

`ArticleHero.graphql` (codegen input — one of the 45 `.graphql` files):

```graphql
fragment ArticleHeroData on ArticleHero {
  heading
  subheading
  body {
    json
    html
  }
}
```

`ArticleHero.tsx` (component typed over the generated `ArticleHeroDataFragment`):

```tsx
import { CmsComponent } from '@remkoj/optimizely-cms-react'
import { RichText } from '@remkoj/optimizely-cms-react/components'
import { ArticleHeroDataFragmentDoc, type ArticleHeroDataFragment } from '@/gql/graphql'

// data: T is the codegen fragment type; getDataFragment binds the component to it.
export const ArticleHeroComponent: CmsComponent<ArticleHeroDataFragment> = ({ data }) => {
  return (
    <section>
      <h1>{data.heading}</h1>
      {data.subheading ? <p>{data.subheading}</p> : null}
      <RichText content={data.body?.json} />
    </section>
  )
}

// Codegen-era binding: tells the factory which fragment to request for this type.
ArticleHeroComponent.getDataFragment = () => ['ArticleHeroData', ArticleHeroDataFragmentDoc]

export default ArticleHeroComponent
```

### After — Content JS SDK (schema object + `ContentProps`)

The `.graphql` fragment is **deleted**. Its field list is re-expressed as a
hand-authored `contentType()` object — that object is now both the schema **and**
the source of the component's prop type. There is no codegen, no fragment doc,
and no `getDataFragment`.

`ArticleHero.contentType.ts` (replaces `ArticleHero.graphql`):

```ts
import { contentType } from '@optimizely/cms-sdk'

export const ArticleHeroContentType = contentType({
  key: 'ArticleHero',
  baseType: '_component',
  displayName: 'Article Hero',
  properties: {
    heading: { type: 'string' },
    subheading: { type: 'string' },
    body: { type: 'richText' },
  },
})
```

`ArticleHero.tsx` (typed over the `contentType()` object, not a fragment):

```tsx
import { type ContentProps } from '@optimizely/cms-sdk'
import { RichText } from '@optimizely/cms-sdk/react/richText'
import { ArticleHeroContentType } from './ArticleHero.contentType'

// The prop is `content`, typed as ContentProps<typeof YourContentType>.
type Props = { content: ContentProps<typeof ArticleHeroContentType> }

export default function ArticleHero({ content }: Props) {
  return (
    <section>
      <h1>{content.heading}</h1>
      {content.subheading ? <p>{content.subheading}</p> : null}
      <RichText content={content.body?.json} />
    </section>
  )
}
```

Register the component against the same `key` (see `setup-and-di.md`).
Note the two different import subpaths — the content-type registry is a **root**
export; the React component registry lives under `/react/server`:

```ts
import { initContentTypeRegistry } from '@optimizely/cms-sdk'
import { initReactComponentRegistry } from '@optimizely/cms-sdk/react/server'
import { ArticleHeroContentType } from './ArticleHero.contentType'
import ArticleHero from './ArticleHero'

initContentTypeRegistry([ArticleHeroContentType])
initReactComponentRegistry({ resolver: { ArticleHero } })
```

### What changed, line by line

| Remko | Content JS SDK |
|---|---|
| `ArticleHero.graphql` fragment | `ArticleHero.contentType.ts` — hand-authored `contentType()` |
| `ArticleHeroDataFragment` (codegen type) | `ContentProps<typeof ArticleHeroContentType>` |
| prop `data: T` | prop `content` |
| `data.heading` | `content.heading` |
| `RichText content={data.body?.json}` (Remko `./components`) | `RichText content={content.body?.json}` (`@optimizely/cms-sdk/react/richText`) |
| `Component.getDataFragment = …` | **deleted** — no fragment binding; registry maps `key → component` |
| GraphQL field `body { json html }` | property `body: { type: 'richText' }` (fetch shape is SDK-managed) |
| display settings via `layoutProps` + `readSetting` | optional `displaySettings` prop + optional chaining (see the **Component-authoring types** section) |

If the component also read display settings (`layoutProps` / `extractSettings`),
add a `displayTemplate()` and a second prop:
`displaySettings?: ContentProps<typeof ArticleHeroDisplayTemplate>`, read via
`displaySettings?.key ?? 'default'`. Register it with `initDisplayTemplateRegistry`.

> **Scale note.** In the demo this pattern repeats across **45 `.graphql` files**
> feeding **35 consumer files**. Deleting codegen is not a one-line swap — it is
> re-authoring the typed-data layer one `contentType()` at a time and rewiring
> every consumer to the `content` prop. Budget accordingly. See the
> `optimizely-remko-graph-functions-to-content-js` skill for the codegen side.

## Related references

- Package/import mapping: `../_shared-references/package-and-import-mapping.md`
- Setup, channel init, and DI/registration: `../_shared-references/setup-and-di.md`
- Auth & environment variables: `../_shared-references/auth-and-env-mapping.md`
