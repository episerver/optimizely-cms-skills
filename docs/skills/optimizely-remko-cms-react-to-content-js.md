# Remko CMS React to Content JS SDK Migration

Migrate the community **Remko CMS React** package (`@remkoj/optimizely-cms-react`) to the official **Content JS SDK** (`@optimizely/cms-sdk`). This skill owns the **React rendering surface** — the component factory, server/client components, and rich-text rendering. Complete the [`optimizely-remko-graph-client-to-content-js`](optimizely-remko-graph-client-to-content-js.md) migration first; the Graph client is the foundation for fetching content.

## When to Use

Use this skill when you want to:
- Replace `@remkoj/optimizely-cms-react` with `@optimizely/cms-sdk`
- Replace `DefaultComponentFactory` + `registerAll()` with the three SDK registries
- Convert `RichTextComponentDictionary` to the built-in `RichText` component
- Swap `CmsContent` / `OptimizelyComponent` (Remko RSC) for the SDK server components
- Migrate `ServerContext` to request-scoped `withAppContext` / `getContext()` / `setContext()`
- Rewrite per-component code from GraphQL fragments to typed `contentType()` models
- Handle variants, `CmsEditable`, and `ContentArea` wrapper props correctly

## Trigger Phrases

Say any of these to activate the skill:
- "Migrate optimizely-cms-react"
- "Replace DefaultComponentFactory"
- "Convert RichTextComponentDictionary"
- "Swap CmsContent / OptimizelyComponent for the official SDK"
- "Migrate ServerContext to the Content JS SDK"
- "Register React components for CMS content types"
- "Fix component registration after switching SDKs"

## Usage Example

```
You: "Migrate our @remkoj/optimizely-cms-react component factory to the official SDK"

Agent: [Uses optimizely-remko-cms-react-to-content-js skill]
- Scans for DefaultComponentFactory, registerAll, RichTextComponentDictionary,
  CmsContent, ServerContext, CmsEditable, and content-area usage
- Swaps the package for @optimizely/cms-sdk
- Replaces the one factory with three registries: initContentTypeRegistry (ROOT),
  initReactComponentRegistry (./react/server), initDisplayTemplateRegistry (ROOT)
- Rewrites components from CmsComponent<Fragment> + getDataFragment to
  contentType() + content prop
- Converts RichText text={data.body} to content={content.body?.json}
- Preserves variant registrations as colon/tag keys (never flattened)
```

```
You: "How do I handle the CmsEditable wrappers when migrating?"

Agent: [Uses optimizely-remko-cms-react-to-content-js skill]
- Explains CmsEditable has two modes that must be categorized first
- Mode A (cmsFieldName="…" field wrapper) is framework-owned — delete it
- Mode B (as={Component} render wrapper) bridges server→client props —
  replace with an explicit render, hand-picking props (never {...data})
```

## What It Handles

- **Usage detection** — Scans for the factory, RSC components, rich-text dictionary, context, `CmsEditable`, and content-area patterns
- **Package swap** — Removes the community package, adds `@optimizely/cms-sdk`
- **Registry migration** — Replaces one `DefaultComponentFactory` with three registries (two are net-new wiring)
- **Context migration** — Replaces the `ServerContext` class with `withAppContext` + `getContext()` / `setContext()`
- **Per-component rewrite** — GraphQL fragments → `contentType()` schemas; `data` prop → `content` prop
- **Variant integrity** — Carries the variant array across as colon keys / nested tag maps (never flattened to one key)
- **Honest gaps** — `RichTextComponentDictionary` has no registration equivalent (built-in `RichText`); `CmsContent` auto-fetching is removed

## Method Mapping Quick Reference

| Remko (`@remkoj/optimizely-cms-react`) | Content JS SDK (`@optimizely/cms-sdk`) |
|-----------------------------------------|-----------------------------------------|
| `DefaultComponentFactory` + `registerAll()` | `initReactComponentRegistry({ resolver })` (`./react/server`) |
| content-type schemas (were codegen fragments) | `initContentTypeRegistry([...])` (**root**) |
| variant discriminator (registry `variant`) | `initDisplayTemplateRegistry([...])` (**root**) + colon/tag keys |
| `RichTextComponentDictionary` | — no equivalent (built-in `RichText`, `./react/richText`) |
| `CmsContent` / `OptimizelyComponent` (auto-fetch) | `OptimizelyComponent` (no auto-fetch — you fetch) |
| `ServerContext` class | `withAppContext` + `getContext()` / `setContext()` |
| `CmsComponent<Fragment>` + `getDataFragment` | `contentType()` + `content` prop |
| `RichText text={data.body}` | `RichText content={content.body?.json}` |
| `readSetting` / `extractSettings` | `displayTemplate()` + `displaySettings` prop |

## Important Notes

- **One factory becomes three registries.** `initContentTypeRegistry` and `initDisplayTemplateRegistry` are **root** exports; `initReactComponentRegistry` is from `./react/server`. Two of the three are net-new wiring, not a translation of the old factory.
- **Do not flatten variant registrations.** Remko's registry is an **array** so one content type can register multiple times under different variants. A plain object keyed by type silently overwrites — you lose a renderer with a green type-check. Carry each variant as a colon key (`'Type:tag'`) or nested tag map, register a `displayTemplate()`, and select at render with `tag="…"`.
- **`RichTextComponentDictionary` has no registration equivalent.** The SDK ships a built-in `RichText` at `@optimizely/cms-sdk/react/richText`. Do not register a dictionary; use the `elements` prop for custom nodes.
- **`RichText` prop changed.** Remko takes `text={data.body}`; the SDK takes `content={content.body?.json}` (the `.json` field).
- **`CmsContent` no longer auto-fetches.** `OptimizelyComponent` does not fetch by `contentLink` — call `getClient().getContent(…)` / `getContentByPath(…)` yourself, then pass the result.
- **`ServerContext` is not a class.** There is no `new ServerContext({...})`. Wrap pages in `withAppContext`; read/write via `getContext()` / `setContext()`.
- **`CmsEditable` is two components in one.** Mode A (field/attribute wrapper) is framework-owned — delete it. Mode B (render wrapper) bridges curated server→client props — replace with an explicit render. A blanket find-and-delete silently drops Mode B renders.
- **Watch for dual-React.** Remko packages pin a React version; after the swap, `yarn why react` and remove duplicates if you see "invalid hook call".

## Related Skills

- [`optimizely-remko-graph-client-to-content-js`](optimizely-remko-graph-client-to-content-js.md) — Migrate the Graph client / fetching (**complete this first**)
- [`optimizely-remko-cms-nextjs-to-content-js`](optimizely-remko-cms-nextjs-to-content-js.md) — Migrate Next.js pages, preview, and publish handlers (build after this)
- [`optimizely-remko-graph-functions-to-content-js`](optimizely-remko-graph-functions-to-content-js.md) — Migrate GraphQL codegen to runtime query generation
- [`optimizely-model-react`](optimizely-model-react.md) — Authoring React components for the official SDK
- [`optimizely-richtext-rendering`](optimizely-richtext-rendering.md) — Rich-text rendering with the official SDK
